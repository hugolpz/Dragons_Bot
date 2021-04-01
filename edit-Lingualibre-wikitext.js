const Wikiapi= require('wikiapi');
const fetch  = require('node-fetch');
const fs     = require('fs');
const logins = require('./logins.js');
const langs  = require('./files-unilex-all.js');

// Edit login credentials
var USER = logins.lili.user,
	PASS = logins.lili.pass,
	API  = logins.lili.api;
    category = '';
    matchPattern = '';
    replacePattern = '';
(async () => {
    // Connect
    const targetWiki = new Wikiapi;
    await targetWiki.login(USER, PASS, API);

    // Print list to page
    await targetWiki.edit_page('User:Yug', function(page_data) {
        // console.log('pagedata',page_data)
        console.log(wiki_session)
        return page_data.replace(matchPattern,replacePattern);
    }, {bot: 1, minor: 1, summary: 'Fix'});

})();