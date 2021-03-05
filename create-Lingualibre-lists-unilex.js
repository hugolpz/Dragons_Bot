const Wikiapi= require('wikiapi');
const fetch  = require('node-fetch');
const fs     = require('fs');
const logins = require('./logins.js');
const langs  = require('./languages.js');

// Edit login credentials
var USER = logins.lili.user,
	PASS = logins.lili.pass,
	API  = logins.lili.api;

// Sugar data and tools
var ranges = [
	[ '00001', '00200' ],
	[ '00201', '01000' ],
	[ '01001', '02000' ],
	[ '02001', '05000' ], 
	[ '05001', '10000' ],
	[ '10001', '15000' ],
	[ '15001', '20000' ],
	[ '20001', '25000' ],
	[ '25001', '30000' ],
	[ '30001', '35000' ],
	[ '35001', '40000' ],
	[ '40001', '45000' ],
	[ '45001', '50000' ] 
];
var extract = function(text, start, end) {
	start<1?start=1:start=start;
	return text.split('\n').slice(start-1, end).join('\n');
};
var messageTest = `\nHi, I'm a Bot ! I plan to upload lists and others maintenances.`;
var pagesEdited = {
	listPages: [],
	listTalks: [],
	categories: []
};

// edit page: method 2
(async () => {
	// Connect
	const targetWiki = new Wikiapi;
	await targetWiki.login(USER, PASS, API);

	// For all languages in `./languages.js`
    for(i=0;i<langs.length;i++){
		// Load text
		lang = langs[i],
		iso  = lang['iso639-3'],
		Iso  = lang['iso639-3'][0].toUpperCase() + lang['iso639-3'].slice(1),
		limit= lang['corpus-limit'] || 5000,
		file = lang.file; 
//		const url = 'https://raw.githubusercontent.com/hugolpz/unilex-extended/master/frequency-sorted-hash/'+file+'.txt'
//		const response = await fetch(url);
//		const text = await response.text();
		const path = '../unilex-extended/frequency-sorted-hash/'+file+'.txt';
		var text = fs.readFileSync(path,'utf8').replace(/[\r\n]$/gm,"");
			text = extract(text,1,limit);    // extract + remove end-of-file line jump
		console.log('Fetch: Done.');

		// For each item in `ranges`
		for(j=0;j<ranges.length;j++){
			// Split text, define pagename
			var start = ranges[j][0],
				end   = ranges[j][1],
				sample= extract(text,+start,+end),
				lines= sample.split('\n').length;

			if(sample!==''){
				// Define pages
				var listPage= `List:${Iso}/Most_used_words,_UNILEX_${j+1}:_words_${start}_to_${end}`,
					listTalk= `List_talk:${Iso}/Most_used_words,_UNILEX_${j+1}:_words_${start}_to_${end}`,
					category= `Category:Speakers_in_${iso}`;
				// Attack message
				console.log(listPage + ' ***************************** */')
				console.log('Length for '+start+'-'+end+' : '+lines,'.\t Total words provided : ', +start-1+lines)

				// Print list to page
				await targetWiki.edit_page(listPage, function(page_data) {
					return sample;
				}, {bot: 1, minor: 1, summary: 'test edit'});
				console.log('Edit page: Done.');
				
				// Print list_talk
				await targetWiki.edit_page(listTalk, function(page_data) {
					return `== Source ==\n{{UNILEX license|`+iso+`}}`;
				}, {bot: 1, minor: 1, summary: 'test edit'});	
				console.log('Edit talkpage: Done.');

				// Print list_talk
				await targetWiki.edit_page(category, function(page_data) {
					return `{{recommended lists|code=${Iso}|public=beginners and teachers|series=unilex}}}}`;
				}, {bot: 1, minor: 1, summary: 'test edit'});	
				console.log('Category: Done.');

				// Records pagesEdited
				pagesEdited.listPages.push(listPage);
				pagesEdited.listTalks.push(listTalk);
				pagesEdited.categories.push(category);
			}
		}
	}
	console.log(pagesEdited)
})();



