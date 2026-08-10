// PURPOSE: For a given category, gets the list of pages, edits existing content.
import logins from './logins.js';
import { createSession, getCategoryMembers, editPage } from './m3api-utils.js';

const USER = logins.commons.user;

(async () => {
	const targetWiki = await createSession(logins.commons);
	console.log(`Username ${USER} is connected!`);

	const list = await getCategoryMembers(targetWiki, 'ShufaBot test: upload');

	for (let i = 0; i < list.length; i++) {
		const currPage = list[i];
		console.log(currPage);

		const result = await editPage(
			targetWiki,
			currPage.title,
			({ wikitext }) => wikitext.replace(/ShufaBot test/g, 'ShufaBot tests'),
			{ bot: true, nocreate: true, minor: true, summary: 'ShufaBot test: edit' },
		);

		console.log(result?.skipped ? 'Skipped (no change).' : 'Done.');
	}
})();
