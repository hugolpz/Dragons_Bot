/**
 * Wikilife Observation Tracker Userscript (Foraging Module)
 * Adds a button to main namespace articles to append the page title and QID
 * to the user's specific subpage list.
 */

// Configuration
const TARGET_PAGE_PREFIX = 'User:';
const LOGGED_IN_USERNAME = mw.config.get('wgUserName');
const TARGET_PAGE_SUFFIX = '/WikiDex'; 

// Emojis for the button sequence
const EMOJIS = ['🌰', '🌱', '🌻', '🐿'];

// Check necessary conditions (logged in and main namespace)
if (LOGGED_IN_USERNAME && mw.config.get('wgNamespaceNumber') === 0) {
    
    // --- UI Setup and Trigger ---
    $(function() {
        const $button = $('<a>')
            .attr('id', 'wikilife-tracker-btn')
            .attr('title', 'Track this species')
            .css({
                'margin-left': '10px',
                'cursor': 'pointer',
                'font-size': '20px',
                'display': 'inline-block',
                'vertical-align': 'middle',
                'line-height': '1'
            })
            .html(EMOJIS[3]) // Start with the visible emoji: 🐿️
            .click(triggerAction);
        
        // Append the button next to the page title
        $('#firstHeading').append($button);
    });
    
    // --- Button Sequence Animator ---
    function animateButton($btn) {
        $btn.css('pointer-events', 'none'); // Disable clicking during animation
        
        // Sequence of emojis (🌰, 🌱, 🌻) for 1 second each
        let step = 0;
        const interval = setInterval(() => {
            if (step < 3) {
                $btn.html(EMOJIS[step]);
                step++;
            } else {
                clearInterval(interval);
                $btn.html(EMOJIS[3]); // Reset to 🐿️
                $btn.css('pointer-events', 'auto'); // Re-enable clicking
            }
        }, 1000);
    }
    
    // --- Actions ---
    async function triggerAction(event) {
        event.preventDefault();
        const $btn = $(this);
        animateButton($btn);
        
        try {
            const pageTitle = mw.config.get('wgPageName').replace(/_/g, ' ');
            const qid = await getWikidataQID(pageTitle);
            
            if (!qid) {
                throw new Error("Could not retrieve Wikidata QID.");
            }
            
            const username = LOGGED_IN_USERNAME;
            const appendText = `\n# ${pageTitle} (${qid})`;
            
            await appendToUserList(username, appendText);
            
            // Success feedback
            $btn.attr('title', 'Success!');
            console.log(`Successfully appended: ${appendText.trim()} to ${TARGET_PAGE_PREFIX}${username}${TARGET_PAGE_SUFFIX}`);

        } catch (error) {
            console.error('Wikilife Tracker Error:', error);
            // Error feedback
            $btn.html('❌').css('color', 'red');
            setTimeout(() => $btn.html(EMOJIS[3]).css('color', 'inherit'), 3000);
            $btn.attr('title', 'Error: check console.');
        }
    }
    
    // API Helpers (must be defined locally or globally accessible)
    async function getWikidataQID(title) {
        const api = new mw.Api();
        const data = await api.get({
            action: 'query',
            prop: 'pageprops',
            titles: title,
            format: 'json',
            ppprop: 'wikibase_item'
        });
        const page = Object.values(data.query.pages)[0];
        return page.pageprops && page.pageprops.wikibase_item;
    }

    async function appendToUserList(username, text) {
        const api = new mw.Api();
        const pageTitle = `${TARGET_PAGE_PREFIX}${username}${TARGET_PAGE_SUFFIX}`;

        await api.postWithToken('edit', {
            action: 'edit',
            title: pageTitle,
            appendtext: text,
            summary: `Tracking new species: ${mw.config.get('wgPageName')}`,
            minor: true
        });
    }

}
// Do not include the closing </pre> tag
