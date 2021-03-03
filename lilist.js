const Wikiapi= require('wikiapi');
const fetch  = require('node-fetch');
const logins = require('./logins.js');
const langs  = require('./languages.js');

// Edit login credentials
var USER = logins.lili.user,
	PASS = logins.lili.pass,
	API  = logins.lili.api;

// Sugar data and tools
var ranges = [
	[ '00001', '01000' ],
	[ '01001', '05000' ],/* 
	[ '05001', '10000' ],
	[ '10001', '15000' ],
	[ '15001', '20000' ],
	[ '20001', '25000' ],
	[ '25001', '30000' ],
	[ '30001', '35000' ],
	[ '35001', '40000' ],
	[ '40001', '45000' ],
	[ '45001', '50000' ] */
];
var extract = function(text, start, end) {
	start<1?start=1:start=start;
	return text.split('\n').slice(start-1, end).join('\n');
};
var messageTest = `\nHi, I'm a Bot ! I plan to upload lists and others maintenances.`;


// edit page: method 2
(async () => {
	// Connect
	const targetWiki = new Wikiapi;
	await targetWiki.login(USER, PASS, API);

	// For all languages in `./languages.js`
    for(i=0;i<langs.length;i++){
		// Load text
		lang = langs[i],
		iso  = lang.iso,
		Iso  = lang.iso[0].toUpperCase() + lang.iso.slice(1),
		file = lang.file; 
		const url = 'https://raw.githubusercontent.com/lingua-libre/unilex/master/data/frequency/'+file+'.txt'
		const response = await fetch(url);
		const text = await response.text();
		console.log('Fetch: Done.');

		// For each item in `ranges`
		for(j=0;j<ranges.length;j++){
			// Split text, define pagename
			var start = ranges[j][0],
				end   = ranges[j][1],
				sample= extract(text,+start,+end);
			if(sample!==''){
				// Define pages
				var listPage= 'User:Yug/List:'+Iso+'/UNILEX-'+start+'-'+end,
					listTalk= 'User:Yug/List_talk:'+Iso+'/UNILEX-'+start+'-'+end;

				// Print list to page
				await targetWiki.edit_page(listPage, function(page_data) {
					console.log('pagedata',page_data)
					return sample;
				}, {bot: 1, minor: 1, summary: 'test edit'});
				console.log('Edit page: Done.');
				
				// Print list_talk
				await targetWiki.edit_page(listTalk, function(page_data) {
					console.log('pagedata',page_data)
					return `== Source ==\n{{UNILEX license|`+iso+`}}`;
				}, {bot: 1, minor: 1, summary: 'test edit'});	
				console.log('Edit talk: Done.');
			}
		}
	}
})();



