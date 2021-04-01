// PURPOSE: For a given a category, gets the list of pages, edits existing content.
const Wikiapi= require('wikiapi');
const logins = require('./logins-ShufaBot.js');

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
    const list = await targetWiki.categorymembers('ShufaBot test: upload');

    // Loop on targets
    for(i=0;i<list.length;i++){
        console.log(list[i]);
        var currPage = list[i], // target page's page_data
            title= currPage.title,
            text= currPage.text;
        // Page exist ?
        let pageData = await targetWiki.page(title, {});
        
        if(pageData.wikitext!=='') {

            //Edit page, replace string:
            await targetWiki.edit_page(title, function(page_data) {
                return page_data.wikitext.replace(/toto/g,'')         // <------- regex match and replacement
                    + `\n[[Category:ShufaBot test: edit]]`;
            }, {bot: 1, nocreate: 1, minor: 1, summary: 'ShufaBot test: edit'});
            console.log('Done.');
        }

    }
})();