// PURPOSE: Script renames targets following hand-coded patterns.
import logins from './logins.js';
import { createSession, getCategoryMembers, getPageWikitext, movePage } from './m3api-utils.js';

const USER = logins.commons.user;

(async () => {
	const targetWiki = await createSession(logins.commons);
	console.log(`Username ${USER} is connected!`);

	const list = await getCategoryMembers(targetWiki, 'Files_supported_by_Wikimedia_France_-_Elix');

	for (let i = 0; i < [list[0]].length; i++) {
		const currPage = list[i];
		console.log(currPage);

		const pageData = await getPageWikitext(targetWiki, currPage.title);
		if (pageData === '') {
			continue;
		}

		const initialTitle = currPage.title;
		const newTitle = initialTitle.replace(/.ogv/gi, '.webm');
		const reason = 'Test: prepare renaming file for category.';

		console.log(initialTitle, newTitle);
		try {
			await movePage(targetWiki, initialTitle, newTitle, {
				reason,
				noredirect: true,
				movetalk: true,
				ignorewarnings: true,
			});
		} catch (e) {
			console.error(e);
		}

		console.log('Done.');
	}
})();
