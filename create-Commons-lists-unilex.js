import fs from 'fs';
import logins from './logins.js';
import languages from './data/languages.js';
import { createSession, editPage } from './m3api-utils.js';

const filesRoot = '../unilex-extended/frequency-sorted-hash/';
// const filesRoot = 'https://raw.githubusercontent.com/hugolpz/unilex-extended/master/frequency-sorted-hash/';
// const filesRoot = '../unilex-extended/mr/';

const ranges = [
	['00001', '05000'],
	['05001', '10000'],
	['10001', '15000'],
	['15001', '20000'],
	['20001', '25000'],
	['25001', '30000'],
	['30001', '35000'],
	['35001', '40000'],
	['40001', '45000'],
	['45001', '50000'],
];

const extract = function(text, start, end) {
	const safeStart = start < 1 ? 1 : start;
	return text.split('\n').slice(safeStart - 1, end).join('\n');
};

const quality = function(max, current) {
	if (max < 10000) return 'D';
	if (max < 50000 && current < 20000) return 'C';
	if (max < 50000 && current >= 20000) return 'D';
	if (max >= 50000 && current < 20000) return 'B';
	if (max >= 50000 && current >= 20000) return 'C';
	return '';
};

const addSections = function(text, groupSize = 500) {
	if (!text) return text;
	const lines = text.split('\n');
	const chunks = [];
	for (let i = 0; i < lines.length; i += groupSize) {
		chunks.push(`\n\n== ${i + 1}-${i + groupSize} ==\n${lines.slice(i, i + groupSize).join('\n')}`);
	}
	return chunks.join('');
};

const getFileContent = async function(path, limit) {
	let text = '';
	if (path.includes('http://') || path.includes('https://')) {
		const response = await fetch(path);
		text = await response.text();
	} else {
		const raw = fs.readFileSync(path, 'utf8').replace(/[\r\n]$/gm, '');
		text = extract(raw, 1, limit);
	}
	console.log(text !== '' ? 'Get file content: Done.' : 'Get file content: Failed.');
	return text;
};

const pagesEdited = {
	listPages: [],
	listTalks: [],
	categories: [],
};

(async () => {
	const targetWiki = await createSession(logins.commons);

	for (let i = 0; i < languages.length; i++) {
		const FILE = languages[i];
		const iso = FILE['iso639-3'];
		const Iso = iso[0].toUpperCase() + iso.slice(1);
		const file = `${FILE.file}.txt`;
		const textMaxLength = (await getFileContent(filesRoot + file, 100000)).split('\n').length;
		const limit = FILE['corpus-limit'] && textMaxLength > FILE['corpus-limit'] * 1.5 ? FILE['corpus-limit'] : 15000;
		console.log('FILE file: ------------------- ', file);
		const text = await getFileContent(filesRoot + file, limit);

		for (let j = 0; j < ranges.length; j++) {
			const start = ranges[j][0];
			const end = ranges[j][1];
			const sample = extract(text, +start, +end);
			const lines = sample.split('\n').length;

			if (sample !== '' && file.search('-') === -1) {
				const listPage = `Commons:Lingua_Libre/List/${Iso}/Unilex_common_words_${j + 1}`;
				const soFar = +start - 1 + lines;
				const rating = quality(textMaxLength, soFar);

				console.log(`${listPage} ***************************** * /`);
				console.log(`Length for ${start}-${end} : ${lines}.\t Total words provided : `, soFar);

				await editPage(
					targetWiki,
					listPage,
					() => `{{Lingua Libre list
|quality=${rating}
|method=frequency
|items=word
|dictionary=false
}}

${addSections(sample, 500)}

== License ==
{{Unicode License|author=UNILEX|version=3.0|url=https://github.com/unicode-org/unilex/blob/main/LICENSE}}
`,
					{ minor: true, summary: `Create list of common words for speakers of language [[:en:ISO 639:${iso}]].` },
				);
				pagesEdited.listPages.push(listPage);
				console.log('Edit page: Done.');
			}
		}

		const listCategory = `Category:Lingua Libre list/${iso}`;
		await editPage(
			targetWiki,
			listCategory,
			() => `{{Lingua Libre lists category}}\n{{Lingua Libre list suggestions|code=${Iso}|public=beginners, teachers, wikimedians}}`,
			{ minor: true, summary: `Create or update category for lists of words or phrases in [[:en:ISO 639:${iso}]].` },
		);
		pagesEdited.categories.push(listCategory);
		console.log('✅ : Category>List by language');
	}

	console.log(pagesEdited);
})();
