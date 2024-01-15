// PURPOSE: For a given a category, gets the list of pages, edits existing content.
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
    const list = await targetWiki.categorymembers('Category:Dragons Bot HSK');

    // Loop on targets
    for(i=0;i<list.length;i++){
        console.log(list[i]);
        var currPage = list[i]; // target page's page_data
        
        // Page exist ?
        var pageData = await targetWiki.page(currPage.title, {});
        
        if(pageData.wikitext!=='') {

            //Edit page, replace string:
            await targetWiki.edit_page(currPage.title, function(page_data) {
                return `{{Speedy|Request by creator or bot master; speedy on test file. ~~~~}}`;         // <------- regex match and replacement
            }, {bot: 1, nocreate: 1, minor: 1, summary: 'ShufaBot test: edit'});
            console.log('Done.');
        }

    }
})();