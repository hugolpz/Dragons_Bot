// <nowiki>
/**
 * UploadToCommons.js
 * MediaWiki userscript for batch uploading Lingua Libre pronunciation files to Wikimedia Commons
 * 
 * @author Lingua Libre Team
 * @version 1.0.0
 * @license CC0-1.0
 * 
 * Installation: Copy to commons.wikimedia.org/wiki/User:{YourUsername}/common.js
 * Usage: Click the Lingua Libre icon in the top navigation bar
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        API_URL: 'https://commons.wikimedia.org/w/api.php',
        CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for large files
        MAX_RETRIES: 3,
        LOGO_URL: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lingualibre-logo-no-text.svg',
    };

    // License mappings
    const LICENSES = {
        'CC0': {
            qid: 'Q6938433',
            template: 'cc-zero',
            name: 'CC0 1.0 Universal Public Domain Dedication'
        },
        'CCBYSA': {
            qid: 'Q18199165',
            template: 'cc-by-sa-4.0',
            name: 'CC BY-SA 4.0'
        }
    };

    // State management
    let uploadState = {
        files: [],
        currentIndex: 0,
        uploadedCount: 0,
        failedCount: 0,
        csrfToken: null
    };

    /**
     * Extract file properties from Lingua Libre filename
     * Adapted from front-end/src/utils/filename-to-data.js
     */
    function filenameToProperties(filename, uploader, date = '') {
        try {
            // Remove "File:" prefix if present
            const cleanFilename = filename.replace(/^File.LL/, 'LL');
            
            
            // Extract language QID and ISO code - handle both spaces and underscores
            const langMatch = cleanFilename.match(/LL-(Q\d+)[_\s]*\((\w+)\)/);
            if (!langMatch) {
                throw new Error('Invalid Lingua Libre filename format');
            }
            
            const langQid = langMatch[1];
            const langIso = langMatch[2];
            
            // Determine media type
            const isWav = cleanFilename.endsWith('.wav');
            const mediaType = isWav ? 'audio/wav' : 'video/webm';
            
            // Remove language part and extension - handle both spaces and underscores
            const remainder = cleanFilename
                .replace(/^LL-Q\d+[_\s]*\(\w+\)-/, '')
                .replace(/\.(wav|webm)$/, '');
            
            // Handle speaker names with underscores, spaces, and parentheses
            // The uploader name may appear as:
            // 1. Just the uploader: -uploader-word
            // 2. Speaker with uploader in parens: -speaker_(uploader)-word or -speaker (uploader)-word
            
            let speaker, transcription, qualifier = null;
            
            // Try to find uploader in parentheses first (format: speaker_(uploader) or speaker (uploader))
            const uploaderInParens = remainder.match(new RegExp(`[_\\s]\\(${uploader}\\)`));
            
            if (uploaderInParens) {
                // Format: speaker_(uploader)-transcription or speaker (uploader)-transcription
                const parts = remainder.split(uploaderInParens[0]);
                speaker = parts[0].replace(/^-/, '');
                transcription = parts[1].replace(/^\)-/, '').replace(/^-/, '');
            } else {
                // Split by uploader name directly
                const parts = remainder.split(uploader);
                
                if (parts.length === 1) {
                    // Format: -transcription or speaker-transcription
                    const singlePart = parts[0];
                    if (singlePart.startsWith('-')) {
                        // Uploader is speaker
                        speaker = uploader;
                        transcription = singlePart.substring(1);
                    } else {
                        // Extract speaker and transcription
                        const lastDash = singlePart.lastIndexOf('-');
                        speaker = singlePart.substring(0, lastDash);
                        transcription = singlePart.substring(lastDash + 1);
                    }
                } else if (parts.length === 2) {
                    // Format: speaker (uploader)-transcription or speaker_(uploader)-transcription
                    speaker = parts[0].replace(/^-/, '').replace(/[_\s]\($/, '');
                    transcription = parts[1].replace(/^\)-/, '').replace(/^-/, '');
                }
            }
            
            // Extract qualifier if present (text in parentheses at end)
            const qualifierMatch = transcription.match(/\((.+?)\)$/);
            if (qualifierMatch) {
                qualifier = qualifierMatch[1];
            }
            
            return {
                P31: 'Q108167708',      // instance of: pronunciation
                P407: langQid,          // language of work
                P9533: transcription,   // transcription
                iso639_3: langIso,      // ISO 639-3 code
                P10893: uploader,       // recordist
                P10894: speaker,        // spoken by
                P10135: date,           // recording date
                P1163: mediaType,       // media type
                qualifier: qualifier
            };
        } catch (error) {
            console.error('Error parsing filename:', filename, error);
            return null;
        }
    }

    /**
     * Get CSRF token for API requests
     */
    async function getCsrfToken() {
        if (uploadState.csrfToken) {
            return uploadState.csrfToken;
        }

        const response = await fetch(CONFIG.API_URL + '?' + new URLSearchParams({
            action: 'query',
            meta: 'tokens',
            type: 'csrf',
            format: 'json'
        }));
        
        const data = await response.json();
        uploadState.csrfToken = data.query.tokens.csrftoken;
        return uploadState.csrfToken;
    }

    /**
     * Generate wikitext for file description page
     */
    function generateWikitext(properties, license, additionalText = '') {
        const today = new Date();
        const dateStr = properties.P10135 || today.toISOString().split('T')[0];
        const licenseTemplate = LICENSES[license].template;
        
        return `== {{int:filedesc}} ==
{{Lingua Libre record
| speaker       = ${properties.P10894}
| speakerId     = 
| speakerGender = 
| author        = [[User:${properties.P10893}|${properties.P10893}]]
| languageId    = ${properties.P407}
| transcription = ${properties.P9533}
| qualifier     = ${properties.qualifier || ''}
| date          = ${dateStr}
}}

${additionalText}

== {{int:license-header}} ==
{{${licenseTemplate}}}

[[Category:Lingua Libre pronunciation]]
[[Category:Pronunciation recordings by ${properties.P10893}]]
`;
    }

    /**
     * Upload a single file to Commons
     * 
     * CRITICAL BUG FIX: Based on official MediaWiki API documentation example.
     * We use XMLHttpRequest with FormData following the exact pattern from the official docs.
     * 
     * The bug was that mw.Api().upload() internally mangles the file parameter.
     * Solution: Use raw XMLHttpRequest POST with FormData, exactly like the Node.js example.
     * 
     * Reference: https://www.mediawiki.org/wiki/API:Upload#Sample_code
     */
    async function uploadFile(file, properties, license, additionalText) {
        console.log('=== UPLOAD DEBUG START ===');
        console.log('1. File object received:', file);
        console.log('2. File name:', file.name);
        console.log('3. File type:', file.type);
        console.log('4. File size:', file.size);
        console.log('5. File instanceof File:', file instanceof File);
        console.log('6. File instanceof Blob:', file instanceof Blob);
        
        // Verify we can read the file as blob
        try {
            const arrayBuffer = await file.arrayBuffer();
            console.log('7. File arrayBuffer size:', arrayBuffer.byteLength);
            console.log('8. First 20 bytes:', new Uint8Array(arrayBuffer.slice(0, 20)));
        } catch (e) {
            console.error('ERROR: Cannot read file as arrayBuffer:', e);
        }
        
        return new Promise(async (resolve, reject) => {
            try {
                const wikitext = generateWikitext(properties, license, additionalText);
                const targetFilename = file.name;
                
                // Get CSRF token
                const token = await getCsrfToken();
                console.log('9. CSRF token obtained:', token.substring(0, 20) + '...');
                
                // Create FormData
                const formData = new FormData();
                
                // Add API parameters
                formData.append('action', 'upload');
                formData.append('filename', targetFilename);
                formData.append('ignorewarnings', '1');
                formData.append('token', token);
                formData.append('format', 'json');
                
                // Add optional parameters
                if (wikitext) {
                    formData.append('text', wikitext);
                }
                if (additionalText) {
                    formData.append('comment', 'Batch upload of Lingua Libre pronunciation files');
                }
                
                // CRITICAL: Add file
                console.log('10. Adding file to FormData...');
                console.log('11. File object before append:', file);
                formData.append('file', file, file.name);
                
                // Debug: Check what FormData contains
                console.log('12. FormData entries:');
                for (let [key, value] of formData.entries()) {
                    if (key === 'file') {
                        console.log(`   ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes, ${value.type})` : value);
                    } else if (key === 'text') {
                        console.log(`   ${key}: [wikitext, ${value.length} chars]`);
                    } else {
                        console.log(`   ${key}: ${value}`);
                    }
                }
                
                // Use XMLHttpRequest
                const xhr = new XMLHttpRequest();
                
                xhr.open('POST', CONFIG.API_URL, true);
                xhr.withCredentials = true;
                
                // Monitor upload progress
                xhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        console.log(`13. Upload progress: ${percentComplete.toFixed(2)}% (${e.loaded}/${e.total} bytes)`);
                    }
                });
                
                xhr.onload = function() {
                    console.log('14. XHR onload - Status:', xhr.status);
                    console.log('15. Response:', xhr.responseText.substring(0, 500));
                    
                    if (xhr.status === 200) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            console.log('16. Parsed result:', result);
                            
                            if (result.upload && result.upload.result === 'Success') {
                                console.log('=== UPLOAD SUCCESS ===');
                                resolve({
                                    success: true,
                                    filename: targetFilename,
                                    pageId: result.upload.pageid
                                });
                            } else if (result.error) {
                                console.error('=== UPLOAD ERROR ===', result.error);
                                reject(new Error(result.error.info || result.error.code));
                            } else if (result.upload && result.upload.warnings) {
                                console.error('=== UPLOAD WARNINGS ===', result.upload.warnings);
                                const warnings = Object.keys(result.upload.warnings);
                                reject(new Error('Upload warnings: ' + warnings.join(', ')));
                            } else {
                                console.error('=== UPLOAD FAILED ===', result);
                                reject(new Error('Upload failed: ' + JSON.stringify(result)));
                            }
                        } catch (parseError) {
                            console.error('=== PARSE ERROR ===', parseError);
                            reject(new Error('Failed to parse response: ' + parseError.message));
                        }
                    } else {
                        console.error('=== HTTP ERROR ===', xhr.status, xhr.statusText);
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                };
                
                xhr.onerror = function() {
                    console.error('=== NETWORK ERROR ===');
                    reject(new Error('Network error during upload'));
                };
                
                xhr.ontimeout = function() {
                    console.error('=== TIMEOUT ERROR ===');
                    reject(new Error('Upload timeout'));
                };
                
                // Send the FormData
                console.log('17. Sending XMLHttpRequest...');
                xhr.send(formData);
                console.log('18. XMLHttpRequest sent');
                
            } catch (error) {
                console.error('=== EXCEPTION ===', error);
                reject(new Error(error.message || 'Upload failed'));
            }
        });
    }

    /**
     * Create and inject the UI button
     */
    function createButton() {
        const rightNav = document.getElementById('right-navigation');
        if (!rightNav) {
            console.error('Could not find #right-navigation element');
            return;
        }

        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'lingualibre-upload_batches');
        nav.innerHTML = `
            <div id="p-lingualibre-upload" class="vector-menu vector-menu-tabs mw-portlet mw-portlet-views">
                <div class="vector-menu-content">
                    <ul class="vector-menu-content-list">
                        <li class="mw-list-item mw-list-item-js vector-tab-noicon" 
                            id="userjs-lingualibre-upload_batches" 
                            title="Upload Lingua Libre files [Alt+Shift+L]" 
                            accesskey="l">
                            <a href="#" id="ll-upload-trigger">
                                <img src="${CONFIG.LOGO_URL}" 
                                     style="height:28px; vertical-align:middle; margin-top:-4px;" 
                                     alt="Lingua Libre" />
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        `;

        rightNav.prepend(nav);

        document.getElementById('ll-upload-trigger').addEventListener('click', function(e) {
            e.preventDefault();
            openUploadModal();
        });
    }

    /**
     * Create and open the upload modal
     */
    function openUploadModal() {
        // Remove existing modal if present
        const existing = document.getElementById('ll-upload-modal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'll-upload-modal';
        modal.innerHTML = `
            <div class="ll-modal-overlay">
                <div class="ll-modal-container">
                    <div class="ll-modal-header">
                        <h2>
                            <img src="${CONFIG.LOGO_URL}" style="width:24px; height:24px; vertical-align:middle; margin-right:8px;" />
                            Upload Lingua Libre Files to Commons
                        </h2>
                        <button class="ll-modal-close" id="ll-modal-close">&times;</button>
                    </div>
                    
                    <div class="ll-modal-body">
                        <div class="ll-form-group">
                            <label for="ll-file-input">
                                <strong>Select Lingua Libre files (.wav or .webm)</strong>
                            </label>
                            <input type="file" 
                                   id="ll-file-input" 
                                   multiple 
                                   accept=".wav,.webm" 
                                   class="ll-file-input" />
                            <p class="ll-help-text">
                                Files must follow the Lingua Libre naming convention: 
                                <code>LL-Q{langQid} ({iso})-{speaker}-{transcription}.wav</code>
                            </p>
                            <div id="ll-file-list" class="ll-file-list"></div>
                        </div>

                        <div class="ll-form-group">
                            <label for="ll-additional-text">
                                <strong>Additional categories or templates</strong>
                            </label>
                            <textarea id="ll-additional-text" 
                                      class="ll-textarea" 
                                      rows="3" 
                                      placeholder="[[Category:Your Category]]&#10;{{Your Template}}"></textarea>
                            <p class="ll-help-text">Optional wikitext to add to all file description pages</p>
                        </div>

                        <div class="ll-form-group">
                            <label for="ll-license-select">
                                <strong>License</strong>
                            </label>
                            <select id="ll-license-select" class="ll-select">
                                <option value="CC0">CC0 1.0 (Public Domain)</option>
                                <option value="CCBYSA">CC BY-SA 4.0</option>
                            </select>
                        </div>

                        <div id="ll-upload-progress" class="ll-upload-progress" style="display:none;">
                            <div class="ll-progress-bar">
                                <div class="ll-progress-fill" id="ll-progress-fill"></div>
                            </div>
                            <p class="ll-progress-text" id="ll-progress-text">Uploading: 0 / 0</p>
                        </div>

                        <div id="ll-upload-results" class="ll-upload-results" style="display:none;"></div>
                    </div>
                    
                    <div class="ll-modal-footer">
                        <button id="ll-upload-button" class="ll-button ll-button-primary" disabled>
                            Upload to Commons
                        </button>
                        <button id="ll-cancel-button" class="ll-button ll-button-secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        attachModalEventListeners();
        injectStyles();
    }

    /**
     * Handle file selection
     */
    async function handleFileSelection(event) {
        // CRITICAL: Prevent any event bubbling that MediaWiki might intercept
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        const files = Array.from(event.target.files);
        console.log('=== FILE SELECTION DEBUG ===');
        console.log('Selected files:', files);
        
        // DEBUG: Check FIRST file immediately
        if (files.length > 0) {
            const firstFile = files[0];
            console.log('FIRST FILE DEBUG:');
            console.log('  Name:', firstFile.name);
            console.log('  Size:', firstFile.size);
            console.log('  Type:', firstFile.type);
            console.log('  Last Modified:', new Date(firstFile.lastModified));
            
            // Read first 50 bytes IMMEDIATELY
            try {
                const slice = firstFile.slice(0, 50);
                const buffer = await slice.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                console.log('  First 50 bytes (raw):', bytes);
                console.log('  First 50 bytes (ASCII):', String.fromCharCode(...bytes));
                console.log('  First 50 bytes (hex):', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
                
                // CHECK: Is this HTML or audio?
                const isHTML = bytes[0] === 60 && bytes[1] === 33; // <!
                if (isHTML) {
                    alert('⚠️ CRITICAL BUG DETECTED!\n\n' +
                          'The browser is replacing your local file with HTML from Commons.\n\n' +
                          'This is likely caused by:\n' +
                          '1. MediaWiki UploadWizard interference\n' +
                          '2. A similar filename already existing on Commons\n' +
                          '3. Browser security policy\n\n' +
                          'WORKAROUND: Try renaming your file to something unique that doesn\'t exist on Commons yet.');
                    fileList.innerHTML = '<p class="ll-error">❌ Browser replaced your file with HTML. Please rename your file and try again.</p>';
                    uploadButton.disabled = true;
                    return;
                }
            } catch (e) {
                console.error('ERROR reading file:', e);
            }
        }
        
        const fileList = document.getElementById('ll-file-list');
        const uploadButton = document.getElementById('ll-upload-button');
        
        fileList.innerHTML = '';
        uploadState.files = [];

        const username = mw.config.get('wgUserName');
        const llFiles = files.filter(file => /^LL-.*\.(wav|webm)$/i.test(file.name));

        if (llFiles.length === 0) {
            fileList.innerHTML = '<p class="ll-error">❌ No Lingua Libre files found. Files must match pattern: LL-Q*.(wav|webm)</p>';
            uploadButton.disabled = true;
            return;
        }

        let validCount = 0;
        llFiles.forEach(file => {
            const properties = filenameToProperties(file.name, username);
            
            const fileItem = document.createElement('div');
            fileItem.className = 'll-file-item';
            
            if (properties) {
                validCount++;
                uploadState.files.push({ file, properties });
                fileItem.innerHTML = `
                    <span class="ll-file-status">✓</span>
                    <span class="ll-file-name">${file.name}</span>
                    <span class="ll-file-meta">${properties.P407} - ${properties.P9533} (${(file.size / 1024).toFixed(1)} KB)</span>
                `;
                fileItem.className += ' ll-file-valid';
            } else {
                fileItem.innerHTML = `
                    <span class="ll-file-status">✗</span>
                    <span class="ll-file-name">${file.name}</span>
                    <span class="ll-file-meta ll-error">Invalid filename format</span>
                `;
                fileItem.className += ' ll-file-invalid';
            }
            
            fileList.appendChild(fileItem);
        });

        uploadButton.disabled = validCount === 0;
        
        if (validCount > 0) {
            const summary = document.createElement('p');
            summary.className = 'll-file-summary';
            summary.textContent = `✓ ${validCount} valid file(s) ready to upload`;
            fileList.insertBefore(summary, fileList.firstChild);
        }
    }

    /**
     * Attach event listeners to modal elements
     */
    function attachModalEventListeners() {
        const fileInput = document.getElementById('ll-file-input');
        const uploadButton = document.getElementById('ll-upload-button');
        const cancelButton = document.getElementById('ll-cancel-button');
        const closeButton = document.getElementById('ll-modal-close');

        // Use capture phase to intercept event before MediaWiki can
        fileInput.addEventListener('change', handleFileSelection, true);
        uploadButton.addEventListener('click', startUpload);
        cancelButton.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);

        // Close on overlay click
        document.querySelector('.ll-modal-overlay').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    /**
     * Start the upload process
     */
    async function startUpload() {
        const uploadButton = document.getElementById('ll-upload-button');
        const cancelButton = document.getElementById('ll-cancel-button');
        const progressDiv = document.getElementById('ll-upload-progress');
        const resultsDiv = document.getElementById('ll-upload-results');
        const license = document.getElementById('ll-license-select').value;
        const additionalText = document.getElementById('ll-additional-text').value;

        uploadButton.disabled = true;
        cancelButton.textContent = 'Close';
        progressDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        resultsDiv.innerHTML = '';

        uploadState.currentIndex = 0;
        uploadState.uploadedCount = 0;
        uploadState.failedCount = 0;

        const results = [];

        for (let i = 0; i < uploadState.files.length; i++) {
            const { file, properties } = uploadState.files[i];
            uploadState.currentIndex = i + 1;
            
            updateProgress();

            try {
                const result = await uploadFile(file, properties, license, additionalText);
                uploadState.uploadedCount++;
                results.push({
                    filename: file.name,
                    success: true,
                    pageId: result.pageId
                });
            } catch (error) {
                uploadState.failedCount++;
                results.push({
                    filename: file.name,
                    success: false,
                    error: error.message
                });
            }

            updateProgress();
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        displayResults(results);
        uploadButton.disabled = false;
    }

    /**
     * Update progress bar
     */
    function updateProgress() {
        const progressFill = document.getElementById('ll-progress-fill');
        const progressText = document.getElementById('ll-progress-text');
        const total = uploadState.files.length;
        const current = uploadState.currentIndex;
        const percentage = (current / total) * 100;

        progressFill.style.width = percentage + '%';
        progressText.textContent = `Uploading: ${current} / ${total} (${uploadState.uploadedCount} successful, ${uploadState.failedCount} failed)`;
    }

    /**
     * Display upload results
     */
    function displayResults(results) {
        const resultsDiv = document.getElementById('ll-upload-results');
        resultsDiv.style.display = 'block';

        let html = '<h3>Upload Results</h3>';
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        if (successful.length > 0) {
            html += `<div class="ll-results-section ll-results-success">
                <h4>✓ Successfully uploaded (${successful.length})</h4>
                <ul>`;
            successful.forEach(r => {
                html += `<li><a href="/wiki/File:${encodeURIComponent(r.filename)}" target="_blank">${r.filename}</a></li>`;
            });
            html += '</ul></div>';
        }

        if (failed.length > 0) {
            html += `<div class="ll-results-section ll-results-failed">
                <h4>✗ Failed uploads (${failed.length})</h4>
                <ul>`;
            failed.forEach(r => {
                html += `<li>${r.filename}: <span class="ll-error">${r.error}</span></li>`;
            });
            html += '</ul></div>';
        }

        resultsDiv.innerHTML = html;
    }

    /**
     * Close the modal
     */
    function closeModal() {
        const modal = document.getElementById('ll-upload-modal');
        if (modal) {
            modal.remove();
        }
        uploadState = {
            files: [],
            currentIndex: 0,
            uploadedCount: 0,
            failedCount: 0,
            csrfToken: null
        };
    }

    /**
     * Inject CSS styles
     */
    function injectStyles() {
        if (document.getElementById('ll-upload-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'll-upload-styles';
        style.textContent = `
            .ll-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .ll-modal-container {
                background: white;
                border-radius: 8px;
                max-width: 700px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .ll-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #eaecf0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ll-modal-header h2 {
                margin: 0;
                font-size: 20px;
                display: flex;
                align-items: center;
            }

            .ll-modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #72777d;
                padding: 0;
                width: 32px;
                height: 32px;
                line-height: 1;
            }

            .ll-modal-close:hover {
                color: #000;
            }

            .ll-modal-body {
                padding: 24px;
            }

            .ll-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #eaecf0;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .ll-form-group {
                margin-bottom: 24px;
            }

            .ll-form-group label {
                display: block;
                margin-bottom: 8px;
                color: #202122;
            }

            .ll-file-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #a2a9b1;
                border-radius: 2px;
            }

            .ll-textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #a2a9b1;
                border-radius: 2px;
                font-family: monospace;
                font-size: 13px;
            }

            .ll-select {
                width: 100%;
                padding: 8px;
                border: 1px solid #a2a9b1;
                border-radius: 2px;
            }

            .ll-help-text {
                margin-top: 8px;
                font-size: 13px;
                color: #72777d;
            }

            .ll-help-text code {
                background: #f8f9fa;
                padding: 2px 4px;
                border-radius: 2px;
            }

            .ll-file-list {
                margin-top: 16px;
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #eaecf0;
                border-radius: 4px;
                padding: 8px;
            }

            .ll-file-summary {
                font-weight: bold;
                color: #14866d;
                margin-bottom: 12px;
                padding: 8px;
                background: #d5fdf4;
                border-radius: 4px;
            }

            .ll-file-item {
                display: flex;
                align-items: center;
                padding: 8px;
                margin-bottom: 4px;
                border-radius: 4px;
            }

            .ll-file-valid {
                background: #f8f9fa;
            }

            .ll-file-invalid {
                background: #fee7e6;
            }

            .ll-file-status {
                margin-right: 12px;
                font-weight: bold;
                font-size: 16px;
            }

            .ll-file-valid .ll-file-status {
                color: #14866d;
            }

            .ll-file-invalid .ll-file-status {
                color: #d33;
            }

            .ll-file-name {
                flex: 1;
                font-family: monospace;
                font-size: 13px;
            }

            .ll-file-meta {
                font-size: 12px;
                color: #72777d;
                margin-left: 12px;
            }

            .ll-error {
                color: #d33;
            }

            .ll-button {
                padding: 8px 16px;
                border: 1px solid #a2a9b1;
                border-radius: 2px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            }

            .ll-button-primary {
                background: #36c;
                color: white;
                border-color: #36c;
            }

            .ll-button-primary:hover:not(:disabled) {
                background: #447ff5;
                border-color: #447ff5;
            }

            .ll-button-primary:disabled {
                background: #c8ccd1;
                border-color: #c8ccd1;
                cursor: not-allowed;
            }

            .ll-button-secondary {
                background: white;
                color: #202122;
            }

            .ll-button-secondary:hover {
                background: #f8f9fa;
            }

            .ll-upload-progress {
                margin-top: 24px;
            }

            .ll-progress-bar {
                height: 24px;
                background: #eaecf0;
                border-radius: 4px;
                overflow: hidden;
            }

            .ll-progress-fill {
                height: 100%;
                background: #36c;
                transition: width 0.3s ease;
            }

            .ll-progress-text {
                margin-top: 8px;
                text-align: center;
                font-weight: bold;
            }

            .ll-upload-results {
                margin-top: 24px;
            }

            .ll-results-section {
                margin-bottom: 16px;
                padding: 16px;
                border-radius: 4px;
            }

            .ll-results-success {
                background: #d5fdf4;
                border-left: 4px solid #14866d;
            }

            .ll-results-failed {
                background: #fee7e6;
                border-left: 4px solid #d33;
            }

            .ll-results-section h4 {
                margin: 0 0 12px 0;
            }

            .ll-results-section ul {
                margin: 0;
                padding-left: 20px;
            }

            .ll-results-section li {
                margin-bottom: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize the userscript
     */
    function init() {
        const wgDBname = mw.config.get('wgDBname');
        // const wgRightPageName = /^Commons:Lingua Libre/.test(mw.config.get('wgPageName'));
        const wgUserName = mw.config.get('wgUserName');

        if (wgDBname !== 'commonswiki' && wgDBname !== 'metawiki') {
            if (!wgUserName) {
                console.log('UploadToCommons: User not logged in');
            }
            return;
        }
        console.log('🎸 Lingualibre_upload_batches');


        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createButton);
        } else {
            createButton();
        }
    }

    // Start the script
    init();

})();
// </nowiki>
