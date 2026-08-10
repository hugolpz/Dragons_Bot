// PURPOSE: For a given category, gets the list of pages, edits existing content.
import logins from './logins.js';
import { createSession, getCategoryMembers, editPage } from './m3api-utils.js';

const USER = logins.commons.user;
const category = 'Category:Dragons Bot HSK';

(async () => {
	const targetWiki = await createSession(logins.commons);
	console.log(`Username ${USER} is connected!`);

	const list = await getCategoryMembers(targetWiki, category);

	for (let i = 0; i < list.length; i++) {
		const currPage = list[i];
		console.log(currPage);

		const result = await editPage(
			targetWiki,
			currPage.title,
			() => '{{Speedy|Request by creator or bot master; speedy on test file. ~~~~}}',
			{ nocreate: true, minor: true, summary: 'ShufaBot test: edit' },
		);

		console.log(result?.skipped ? 'Skipped (no change).' : 'Done.');
	}
})();
