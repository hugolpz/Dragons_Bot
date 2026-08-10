// PURPOSE: Edits Lingua Libre pages by replacing a pattern in existing content.
import logins from './logins.js';
import { createSession, editPage } from './m3api-utils.js';

const matchPattern = '';
const replacePattern = '';

(async () => {
	const targetWiki = await createSession(logins.lili);

	await editPage(
		targetWiki,
		'User:Yug',
		({ wikitext }) => wikitext.replace(matchPattern, replacePattern),
		{ nocreate: true, minor: true, summary: 'Fix' },
	);
})();
