import Wikiapi from 'wikiapi';
import fetch from 'node-fetch';
import fs from 'fs';
import logins from './logins.js';
import languages from './data/languages.js';

// console.log(languages)

// Edit login credentials
var USER = logins.commons.user,
	PASS = logins.commons.pass,
	API  = logins.commons.api;

const filesRoot = '../unilex-extended/frequency-sorted-hash/';
//const filesRoot = 'https://raw.githubusercontent.com/hugolpz/unilex-extended/master/frequency-sorted-hash/';
//const filesRoot = '../unilex-extended/mr/';

// Sugar data and tools
var ranges = [
	[ '00001', '05000' ],
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
	// console.log(typeof text);
	// console.log(text);
	start<1?start=1:start=start;
	return text.split('\n').slice(start-1, end).join('\n');
};

var quality = function(max, current) {
	if (max < 10000) return "D";
	if (max < 50000 && current < 20000) return "C";
	if (max < 50000 && current >= 20000) return "D";
	if (max >= 50000 && current < 20000) return "B";
	if (max >= 50000 && current >= 20000) return "C";
	return "";
};

var addSections = function(text, groupSize) {
	groupSize = groupSize || 500;
	if (!text) return text;
	const lines = text.split('\n');
	const chunks = [];
	for (let i = 0; i < lines.length; i += groupSize) {
		chunks.push(`\n\n== ${i+1}-${i+groupSize} ==\n` + lines.slice(i, i + groupSize).join('\n'));
	}
	return chunks.join('');
};

// Get file content from url or local directory
var getFileContent = function(path, limit){
	var text = '';
	if(path.search("http://") !== -1 || path.search("https://") !== -1 ){
		(async () => {
			const response = await fetch(path);
			text = await response.text();
		})();
	}
	else {
		const raw = fs.readFileSync(path,'utf8').replace(/[\r\n]$/gm,""); // remove end-of-file line jump
		text = extract(raw,1,limit);    // extract
	}
	const message= text!==''? 'Get file content: Done.': 'Get file content: Failed.';
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
    for(let i=0;i<languages.length;i++){
		// Load text
		const FILE = languages[i];
		const iso  = FILE['iso639-3'];
		const Iso  = FILE['iso639-3'][0].toUpperCase() + FILE['iso639-3'].slice(1),
			textMaxLength = getFileContent(filesRoot+file, 100000).split('\n').length,
			limit= FILE['corpus-limit'] && textMaxLength>FILE['corpus-limit']*1.5 ? FILE['corpus-limit'] : 15000,
			file = FILE['file']+'.txt';
		console.log('FILE file: ------------------- ',file)
		const base = file.replace('.txt','');
		const text = getFileContent(filesRoot+file, limit);


		// For each item in `ranges`
		for(let j=0;j<ranges.length;j++){
			// Split text, define pagename
			var start = ranges[j][0],
				end   = ranges[j][1],
				sample= extract(text,+start,+end),
				lines= sample.split('\n').length;

			if(sample!=='' && file.search("-" == -1)){
				// Define pages
				//var listPage= `List:${Iso}/Letter_${base}-${j+1}`,
				//	listTalk= `List_talk:${Iso}/Letter_${base}-${j+1}`;
				var listPage= `Commons:Lingua_Libre/List/${Iso}/Unilex_common_words_${j+1}`,
					listTalk= `Commons_talk:Lingua_Libre/List/${Iso}/Unilex_common_words_${j+1}`,
					category= `Category:Voice_contributors_by_language/ISO_639:${iso}`;
				
				var soFar = +start-1+lines;
				var rating = quality(textMaxLength, soFar);
				// Attack message
				console.log(listPage + ' ***************************** * /')
				console.log('Length for '+start+'-'+end+' : '+lines,'.\t Total words provided : ', soFar)
  
				// Print list to page
				await targetWiki.edit_page(listPage, function(page_data) {
					const wikitext = `{{Lingua Libre list
|quality=${rating}
|method=frequency
|items=word
|dictionary=false
}}

`+addSections(sample, 500)+`

== License ==
{{Unicode License|author=UNILEX|version=3.0|url=https://github.com/unicode-org/unilex/blob/main/LICENSE}}
`;
					return wikitext;
				}, {bot: 1, minor: 1, summary: `Create list of common words for speakers of language [[:en:ISO 639:${iso}]].`});
				pagesEdited.listPages.push(listPage);
				console.log('Edit page: Done.');
				
				/* Print list_talk
				await targetWiki.edit_page(listTalk, function(page_data) {
					// {{UNILEX license}} {{LinguaLex licence}}
					return `{{Unicode License|author=UNILEX|version=3.0|url=https://github.com/unicode-org/unilex/blob/main/LICENSE}}`;
				}, {bot: 1, minor: 1, summary: `Create talk page with categorizing template for ${iso}`});	
				pagesEdited.listTalks.push(listTalk);
				console.log('Edit talkpage: Done.');
				*/

			}
		}

	/*
		// Print category (doesn't save if content == submition)
		await targetWiki.edit_page(category, function(page_data) {
			return `{{Voice contributor category|${iso}}}\n{{Lingua Libre list suggestions|code=${Iso}|public=beginners, teachers, wikimedians}}`;
		}, {bot: 1, minor: 1, summary: `Create page for speakers of [[:en:ISO 639:${iso}]].`});
		pagesEdited.categories.push(category);	
		console.log('✅ : Category>Voice');
	*/
 
		// Print category (doesn't save if content == submition)
		const listCategory = `Category:Lingua Libre list/${iso}`;
		await targetWiki.edit_page(listCategory, function(page_data) {
			return `{{Lingua Libre lists category}}\n{{Lingua Libre list suggestions|code=${Iso}|public=beginners, teachers, wikimedians}}`;
		}, {bot: 1, minor: 1, summary: `Create or update category for lists of words or phrases in [[:en:ISO 639:${iso}]].`});
		pagesEdited.categories.push(listCategory);	
		console.log('✅ : Category>List by language');
		
	}
	console.log(pagesEdited)
})();



