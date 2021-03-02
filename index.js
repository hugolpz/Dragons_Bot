const Wikiapi= require('wikiapi');
const logins = require('./logins.js');
const fetch  = require('node-fetch');
const langs  = require('./languages.js');


// var newContent = `\nHi, I'm Dragons Bot ! I plan to upload lists and others maintenances.`;

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

var extract = function(text,start,end){ return text.split('\n').slice(start, end).join('\n'); };

// edit page: method 2
(async () => {
	// Connect
	const targetWiki = new Wikiapi;
	//await targetWiki.login('Dragons Bot@Dragons_Bot', 'omgjsomafo9qf0815t2ai8ktjdkbv6mr', 'https://www.lingualibre.org/api.php');
	await targetWiki.login(logins.lili.user, logins.lili.pass, 'https://www.lingualibre.org/api.php');
    for(i=0;i<langs.length;i++){
		// Load text
		lang = langs[i],
		iso  = lang.iso,
		file = lang.file; 
		const url = 'https://raw.githubusercontent.com/lingua-libre/unilex/master/data/frequency/'+file+'.txt'
		const response = await fetch(url);
		const text = await response.text();
		console.log('Fetch: Done.');

		for(j=0;j<ranges.length;j++){
			// Split text, define pagename
			var start = ranges[j][0]
				end   = ranges[j][1]
				sample= extract(text,+start,+end);
			// Define pages
			var listPage= 'List:'+iso+'/UNILEX-'+start+'-'+end,
				listTalk= 'List_talk:'+iso+'/UNILEX-'+start+'-'+end;

			// Print list
			await targetWiki.edit_page(listPage, function(page_data) {
				console.log('pagedata',page_data)
				return sample;
			}, {bot: 1, nocreate: 0, minor: 1});
			console.log('Edit page: Done.');
			
			// Print list_talk
			await targetWiki.edit_page(listTalk, function(page_data) {
				console.log('pagedata',page_data)
				return `== Source ==\n{{UNILEX license|`+iso+`}}`;
			}, {bot: 1, nocreate: 0, minor: 1});	
			console.log('Edit talk: Done.');
		}
	}
})();



