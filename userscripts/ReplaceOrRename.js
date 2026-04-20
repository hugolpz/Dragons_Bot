// ==UserScript==
// @name        Lingua Libre Rename or Replace Tool (RoR)
// @namespace   http://lingualibre.org/
// @match       https://commons.wikimedia.org/*
// @grant       none
// @description Given a list of pages or a category, mass rename and replace wikitext for pages in that list.
// ==/UserScript==

(function (mw, $) {
    'use strict';

    // Add portlet link
    const link = mw.util.addPortletLink('p-tb', '#', '🦊 Rename Or Replace (RoR)', 't-lr-replace', 'Mass rename or wikitext replace');

    $(link).on('click', function (e) {
        e.preventDefault();
        showReplaceModal();
    });

    function showReplaceModal() {
        mw.loader.using(['oojs-ui-windows', 'mediawiki.api', 'mediawiki.widgets']).then(function () {
            
            // Define the Modal Layout
            function ReplaceModal(config) {
                ReplaceModal.super.call(this, config);
            }
            OO.inheritClass(ReplaceModal, OO.ui.ProcessDialog);

            ReplaceModal.static.name = 'replaceModal';
            ReplaceModal.static.title = 'Mass rename or wikitext replace';
            ReplaceModal.static.actions = [
                { action: 'run', label: 'Run', flags: ['primary', 'progressive'] },
                { label: 'Close', flags: 'safe' }
            ];

            ReplaceModal.prototype.initialize = function () {
                ReplaceModal.super.prototype.initialize.apply(this, arguments);
                this.content = new OO.ui.PanelLayout({ padded: true, expanded: false });

                this.createWidgets();
                this.setupEventHandlers();
                this.buildLayout();
                
                this.$body.append(this.content.$element);
            };

            // Create all UI widgets
            ReplaceModal.prototype.createWidgets = function () {
                // Action Type Selection
                this.actionType = new OO.ui.RadioSelectWidget({
                    items: [
                        new OO.ui.RadioOptionWidget({ data: 'content', label: 'Replace wikitext', selected: true }),
                        new OO.ui.RadioOptionWidget({ data: 'rename', label: 'Rename wikipage' })
                    ]
                });

                // Source Type Selection
                this.sourceType = new OO.ui.RadioSelectWidget({
                    items: [
                        new OO.ui.RadioOptionWidget({ data: 'cat', label: 'From Category', selected: true }),
                        new OO.ui.RadioOptionWidget({ data: 'list', label: 'Manual List (one per line)' })
                    ]
                });

                // Input fields
                this.sourceInput = new OO.ui.TextInputWidget({ placeholder: 'Category:Lingua Libre help' });
                this.listInput = new OO.ui.MultilineTextInputWidget({ 
                    placeholder: 'File:Image1.png\nFile:Image_2.png', 
                    rows: 5 
                });
                this.listInput.toggle(false);

                this.matchInput = new OO.ui.MultilineTextInputWidget({ 
                    placeholder: 'Text to find...\nCan be multiple lines or regex pattern', 
                    rows: 3 
                });
                this.replaceInput = new OO.ui.MultilineTextInputWidget({ 
                    placeholder: 'Replacement text...\nCan be multiple lines or use $1, $2 for regex groups', 
                    rows: 3 
                });
                this.commentInput = new OO.ui.TextInputWidget({ value: 'Change wikitext with correct content' });

                // Regex mode checkbox
                this.regexModeCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: false
                });

                // Leave redirect checkbox (only for rename action)
                this.leaveRedirectCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: true,
                    disabled: true
                });

                // Log output
                this.logOutput = $('<div style="margin-top: 15px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 0.9em; border: 1px solid #ddd; padding: 5px;"></div>');
            };

            // Setup event handlers
            ReplaceModal.prototype.setupEventHandlers = function () {
                // Toggle between category and list input
                this.sourceType.on('select', (item) => {
                    const isCat = item.getData() === 'cat';
                    this.sourceInput.toggle(isCat);
                    this.listInput.toggle(!isCat);
                });

                // Update comment and checkbox based on action type
                this.actionType.on('select', (item) => {
                    const isRename = item.getData() === 'rename';
                    const comment = isRename
                        ? 'Change filename with correct convention' 
                        : 'Change wikitext with correct content';
                    this.commentInput.setValue(comment);
                    this.leaveRedirectCheckbox.setDisabled(!isRename);
                    // Disable regex mode for rename action (simpler pattern matching)
                    this.regexModeCheckbox.setDisabled(isRename);
                    if (isRename) {
                        this.regexModeCheckbox.setSelected(false);
                    }
                });
            };

            // Build the layout
            ReplaceModal.prototype.buildLayout = function () {
                this.content.$element.append(
                    new OO.ui.FieldLayout(this.actionType, { 
                        label: $('<h4>').text('Action').css({ margin: '0 0 5px 0', fontSize: '1.1em' }), 
                        align: 'top' 
                    }).$element,
                    new OO.ui.FieldLayout(this.sourceType, { 
                        label: $('<h4>').text('Source').css({ margin: '0 0 5px 0', fontSize: '1.1em' }), 
                        align: 'top' 
                    }).$element,
                    this.sourceInput.$element,
                    this.listInput.$element,
                    new OO.ui.FieldLayout(this.matchInput, { 
                        label: $('<h4>').text('Match Text').css({ margin: '0 0 5px 0', fontSize: '1.1em' }), 
                        align: 'top' 
                    }).$element,
                    new OO.ui.FieldLayout(this.replaceInput, { 
                        label: $('<h4>').text('Replace With').css({ margin: '0 0 5px 0', fontSize: '1.1em' }), 
                        align: 'top' 
                    }).$element,
                    new OO.ui.FieldLayout(this.regexModeCheckbox, { 
                        label: 'Use Regular Expression', 
                        align: 'inline',
                        help: 'Enable regex pattern matching with capture groups ($1, $2, etc.)'
                    }).$element,
                    new OO.ui.FieldLayout(this.commentInput, { 
                        label: $('<h4>').text('Edit Summary').css({ margin: '0 0 5px 0', fontSize: '1.1em' }), 
                        align: 'top' 
                    }).$element,
                    new OO.ui.FieldLayout(this.leaveRedirectCheckbox, { 
                        label: 'Leave a redirect', 
                        align: 'inline',
                        help: 'Only available for rename action'
                    }).$element,
                    $('<h4>').text('Logs').css({ margin: '0 0 5px 0', fontSize: '1.1em' }),
                    this.logOutput
                );
            };

            ReplaceModal.prototype.getActionProcess = function (action) {
                if (action === 'run') {
                    return new OO.ui.Process(() => this.startMigration());
                }
                return ReplaceModal.super.prototype.getActionProcess.call(this, action);
            };

            // Helper method to log messages
            ReplaceModal.prototype.log = function (message, type = 'info') {
                const styles = {
                    success: 'color:green;',
                    error: 'color:red;',
                    warning: 'color:gray;',
                    info: ''
                };
                this.logOutput.append(`<div style="${styles[type] || ''}">${message}</div>`);
            };

            // Helper method to get pages from source
            ReplaceModal.prototype.getPages = async function (api) {
                if (this.sourceType.findSelectedItem().getData() === 'cat') {
                    const catName = this.sourceInput.getValue();
                    let allPages = [];
                    let continueParam = {};
                    
                    // Fetch all pages using continuation
                    do {
                        const params = {
                            action: 'query',
                            list: 'categorymembers',
                            cmtitle: catName,
                            cmlimit: 500,
                            ...continueParam
                        };
                        
                        const res = await api.get(params);
                        
                        if (res.query && res.query.categorymembers) {
                            allPages = allPages.concat(res.query.categorymembers.map(p => p.title));
                        }
                        
                        // Check if there are more results
                        if (res.continue) {
                            continueParam = res.continue;
                            this.log(`📄 Fetched ${allPages.length} pages, continuing...`, 'info');
                        } else {
                            continueParam = null;
                        }
                    } while (continueParam);
                    
                    this.log(`✅ Total pages fetched: ${allPages.length}`, 'info');
                    return allPages;
                } else {
                    return this.listInput.getValue().split('\n').filter(p => p.trim() !== '');
                }
            };

            // Helper method to process escape sequences
            ReplaceModal.prototype.processEscapeSequences = function (text) {
                return text
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\r/g, '\r')
                    .replace(/\\\\/g, '\\');
            };

            // Helper method to perform text replacement
            ReplaceModal.prototype.replaceText = function (text, matchText, replaceText, useRegex = false) {
                if (useRegex) {
                    try {
                        // Create regex with global and multiline flags
                        const regex = new RegExp(matchText, 'gm');
                        return text.replace(regex, replaceText);
                    } catch (err) {
                        // If regex is invalid, throw error with helpful message
                        throw new Error(`Invalid regex pattern: ${err.message}`);
                    }
                } else {
                    // Simple string replacement
                    return text.split(matchText).join(replaceText);
                }
            };

            // Process rename action
            ReplaceModal.prototype.processRename = async function (api, pages, matchText, replaceText, summary, useRegex) {
                const noRedirect = !this.leaveRedirectCheckbox.isSelected();
                
                for (const title of pages) {
                    try {
                        // Check if pattern matches (regex or simple string)
                        const hasMatch = useRegex 
                            ? new RegExp(matchText).test(title)
                            : title.includes(matchText);
                        
                        if (!hasMatch) {
                            this.log(`➖ ${title} (No match in title)`, 'warning');
                            continue;
                        }

                        const newTitle = this.replaceText(title, matchText, replaceText, useRegex);
                        
                        await api.postWithToken('csrf', {
                            action: 'move',
                            from: title,
                            to: newTitle,
                            reason: summary,
                            movetalk: true,
                            movesubpages: true,
                            noredirect: noRedirect
                        });
                        
                        this.log(`✅ Renamed: ${title} → ${newTitle}`, 'success');
                    } catch (err) {
                        this.log(`❌ ${title} (Error: ${err.message || 'Move failed'})`, 'error');
                    }
                }
            };

            // Process content replacement action
            ReplaceModal.prototype.processContentReplace = async function (api, pages, matchText, replaceText, summary, useRegex) {
                for (const title of pages) {
                    try {
                        const pageRes = await api.get({
                            action: 'query',
                            prop: 'revisions',
                            titles: title,
                            rvprop: 'content',
                            rvslots: 'main'
                        });

                        const page = Object.values(pageRes.query.pages)[0];
                        if (!page.revisions) {
                            throw new Error('No content');
                        }

                        const content = page.revisions[0].slots.main['*'];
                        
                        // Check if pattern matches (regex or simple string)
                        const hasMatch = useRegex 
                            ? new RegExp(matchText, 'gm').test(content)
                            : content.includes(matchText);
                        
                        if (!hasMatch) {
                            this.log(`➖ ${title} (No match)`, 'warning');
                            continue;
                        }

                        const newContent = this.replaceText(content, matchText, replaceText, useRegex);
                        
                        await api.postWithToken('csrf', {
                            action: 'edit',
                            title: title,
                            text: newContent,
                            summary: summary,
                            bot: true
                        });
                        
                        this.log(`✅ ${title}`, 'success');
                    } catch (err) {
                        this.log(`❌ ${title} (Error: ${err.message || 'Move failed'})`, 'error');
                    }
                }
            };

            // Main migration method
            ReplaceModal.prototype.startMigration = async function () {
                const api = new mw.Api();
                const useRegex = this.regexModeCheckbox.isSelected();
                
                // Only process escape sequences if NOT using regex mode
                let matchText = this.matchInput.getValue();
                let replaceText = this.replaceInput.getValue();
                
                if (!useRegex) {
                    matchText = this.processEscapeSequences(matchText);
                    replaceText = this.processEscapeSequences(replaceText);
                }
                
                const summary = this.commentInput.getValue();
                const actionMode = this.actionType.findSelectedItem().getData();

                this.logOutput.empty();
                this.log('⏳ Initializing...');
                
                if (useRegex) {
                    this.log(`🔍 Using regex mode`, 'info');
                }

                try {
                    const pages = await this.getPages(api);
                    
                    if (pages.length === 0) {
                        this.log('⚠️ No pages found.', 'warning');
                        return;
                    }

                    if (actionMode === 'rename') {
                        await this.processRename(api, pages, matchText, replaceText, summary, useRegex);
                    } else {
                        await this.processContentReplace(api, pages, matchText, replaceText, summary, useRegex);
                    }
                    
                    this.log('<b>Done!</b>');
                } catch (err) {
                    this.log(`❌ ${err.message || 'Failed to fetch category'}`, 'error');
                }
            };

            const windowManager = new OO.ui.WindowManager();
            $(document.body).append(windowManager.$element);
            const modal = new ReplaceModal({ size: 'large' });
            windowManager.addWindows([modal]);
            windowManager.openWindow(modal);
        });
    }

})(mediaWiki, jQuery);