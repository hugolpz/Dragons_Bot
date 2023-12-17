const Wikiapi= require('wikiapi');
const fetch  = require('node-fetch');
const fs     = require('fs');
const logins = require('./logins.js');
const lang   = require('./languages.js');

console.log(lang)

// Edit login credentials
var USER = logins.lili.user,
	PASS = logins.lili.pass,
	API  = logins.lili.api;

const filesRoot = '../unilex-extended/frequency-sorted-hash/';
//const filesRoot = 'https://raw.githubusercontent.com/hugolpz/unilex-extended/master/frequency-sorted-hash/';
//const filesRoot = '../unilex-extended/mr/';

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
	console.log(typeof text);
	console.log(text);
	start<1?start=1:start=start;
	return text.split('\n').slice(start-1, end).join('\n');
};

// Get file content from url or local directory
var getFileContent = function(path){
	var text = '';
	if(path.search("http://") !== -1 || path.search("https://") !== -1 ){
		(async () => {
			response = await fetch(path);
			text = await response.text();
		})();
	}
	else {
		raw = fs.readFileSync(path,'utf8').replace(/[\r\n]$/gm,""); // remove end-of-file line jump
		text = extract(raw,1,limit);    // extract
	}
	message= text!==''? 'Get file content: Done.': 'Get file content: Failed.';
	console.log(message)
	return text;
};

// Log list of edited pages
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

	// For each FILE from FILES
    for(i=0;i<lang.length;i++){
		// Load text
		FILE = lang[i];
		iso  = FILE['iso639-3'],
		Iso  = FILE['iso639-3'][0].toUpperCase() + FILE['iso639-3'].slice(1),
		limit= FILE['corpus-limit'] || 5000,
		file = FILE['file']+'.txt',
		console.log('FILE file: ------------------- ',file)
		base = file.replace('.txt',''),
		text = getFileContent(filesRoot+file);

		// For each item in `ranges`
		for(j=0;j<ranges.length;j++){
			// Split text, define pagename
			var start = ranges[j][0],
				end   = ranges[j][1],
				sample= extract(text,+start,+end),
				lines= sample.split('\n').length;

			if(sample!=='' && file.search("-" == -1)){
				// Define pages
				//var listPage= `List:${Iso}/Letter_${base}-${j+1}`,
				//	listTalk= `List_talk:${Iso}/Letter_${base}-${j+1}`;
				var listPage= `List:${Iso}/Unilex_common_words_${j+1}`,
					listTalk= `List_talk:${Iso}/Unilex_common_words_${j+1}`;
					category= `Category:Speakers_in_${iso}`;
				// Attack message
				console.log(listPage + ' ***************************** */')
				console.log('Length for '+start+'-'+end+' : '+lines,'.\t Total words provided : ', +start-1+lines)

				// Print list to page
				await targetWiki.edit_page(listPage, function(page_data) {
					return sample;
				}, {bot: 1, minor: 1, summary: `Create list of words for speakers of ${iso}`});
				pagesEdited.listPages.push(listPage);
				console.log('Edit page: Done.');
				
				// Print list_talk
				await targetWiki.edit_page(listTalk, function(page_data) {
					return `{{Gentle ramp}}\n{{UNILEX license|`+iso+`}}`;
				}, {bot: 1, minor: 1, summary: `Create talk page with categorizing template for ${iso}`});	
				pagesEdited.listTalks.push(listTalk);
				console.log('Edit talkpage: Done.');

				// Print category (doesn't save if content == submition)
				await targetWiki.edit_page(category, function(page_data) {
					return `{{Speakers category|${iso}}}\n{{recommended lists|code=${Iso}|public=beginners, teachers, wikimedians}}`;
				}, {bot: 1, minor: 1, summary: `Create page for speakers of ${iso}`});
				pagesEdited.categories.push(category);	
				console.log('Category: Done.');

			}
		}
	}
	console.log(pagesEdited)
})();



