// PURPOSE: Script renames targets following hand-coded patters.
const Wikiapi= require('wikiapi');
const logins = require('./logins.js');

// Login credentials from .login*.js
var USER = logins.commons.user,
	PASS = logins.commons.pass,
	API  = logins.commons.api;

(async () => {
    // Connect
    const targetWiki = new Wikiapi;
    await targetWiki.login(USER, PASS, API);
    console.log(`Username ${USER} is connected !`);

    // List of targets
    const list = await targetWiki.categorymembers('Files_supported_by_Wikimedia_France_-_Elix'); // 'ShufaBot test: upload');

    // Loop on targets
    for(i=0;i<[list[0]].length;i++){
        console.log(list[i]);
        var currPage = list[i]; // target page's page_data

        // Page exist ?
        let pageData = await targetWiki.page(currPage.title, {});
        
        if(pageData.wikitext!=='') {

            //Edit filename and move (twice):
            var initialTitle=currPage.title,
                newTitle=initialTitle.replace(/.ogv/gi,'.webm'),             // <------- regex match and replacement to change name via pattern
                reason='Test: prepare renaming file for category.',
                revertReason='Test: prepare renaming file, revert.';
            console.log(initialTitle,newTitle);
            try{
                // Rename with method `.move_page(curr,new, {options})`
                result = await targetWiki.move_page(initialTitle, newTitle, { reason: reason, noredirect: true, movetalk: true, ignorewarnings: true });
            }catch(e){console.error(e);}
            /* 
            try{
                // Revert rename with method `.move_to(newname, {options})`
                await targetWiki.page(newTitle);
                result = await targetWiki.move_to(initialTitle, { reason: revertReason, noredirect: true, movetalk: true });
            }catch(e){ console.error(e); }   // catch error message if any
            */
            console.log('Done.');
        }
    }
})();
