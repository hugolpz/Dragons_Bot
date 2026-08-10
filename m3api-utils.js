import Session, { set } from 'm3api/node.js';
import { login as loginBotPassword } from 'm3api-botpassword/index.js';

const DEFAULT_SESSION_PARAMS = {
	formatversion: 2,
	errorformat: 'plaintext',
	maxlag: 5,
};

function getApiTarget(apiUrl) {
	if (!apiUrl) {
		throw new Error('Missing MediaWiki API URL.');
	}
	return apiUrl;
}

export async function createSession(loginConfig) {
	const { user, pass, api, oauthAccessToken } = loginConfig;
	const session = new Session(
		getApiTarget(api),
		DEFAULT_SESSION_PARAMS,
		{
			userAgent: 'dragons-bot-m3api-migration',
			...(oauthAccessToken ? { accessToken: oauthAccessToken } : {}),
		},
	);

	if (!oauthAccessToken) {
		if (!user || !pass) {
			throw new Error('Missing bot credentials: set user/pass or oauthAccessToken.');
		}
		await loginBotPassword(session, user, pass);
	}

	return session;
}

function normalizeCategoryTitle(category) {
	if (!category) {
		throw new Error('Category title is required.');
	}
	return category.startsWith('Category:') ? category : `Category:${category}`;
}

export async function getCategoryMembers(session, category) {
	const cmtitle = normalizeCategoryTitle(category);
	const members = [];

	for await (const response of session.requestAndContinue({
		action: 'query',
		list: set('categorymembers'),
		cmtitle,
		cmlimit: 'max',
	})) {
		members.push(...(response?.query?.categorymembers || []));
	}

	return members;
}

export async function getPageWikitext(session, title) {
	const response = await session.request({
		action: 'query',
		titles: title,
		prop: set('revisions'),
		rvprop: set('content'),
		rvslots: set('main'),
	});

	const page = response?.query?.pages?.[0];
	if (!page || page.missing) {
		return '';
	}

	return page?.revisions?.[0]?.slots?.main?.content || '';
}

export async function editPage(session, title, transform, options = {}) {
	const currentWikitext = await getPageWikitext(session, title);
	const nextWikitext = await transform({ title, wikitext: currentWikitext });

	if (typeof nextWikitext !== 'string') {
		throw new Error(`Edit transform for "${title}" must return a string.`);
	}

	if (nextWikitext === currentWikitext) {
		return { skipped: true };
	}

	return session.request({
		action: 'edit',
		title,
		text: nextWikitext,
		summary: options.summary || 'Bot edit',
		bot: true,
		nocreate: options.nocreate ? true : undefined,
		minor: options.minor ? true : undefined,
	}, {
		method: 'POST',
		tokenType: 'csrf',
	});
}

export async function movePage(session, from, to, options = {}) {
	return session.request({
		action: 'move',
		from,
		to,
		reason: options.reason || 'Bot move',
		noredirect: options.noredirect ? true : undefined,
		movetalk: options.movetalk ? true : undefined,
		ignorewarnings: options.ignorewarnings ? true : undefined,
	}, {
		method: 'POST',
		tokenType: 'csrf',
	});
}
