**LiList Bot** is a WikiAPI JS bot to upload local list files onto LinguaLibre.org

### Dependencies
* nodejs
* npm
* git

### Install
```bash
git clone git@github.com:hugolpz/LiListsBot.git   # clone repository
npm install                                       # install dependencies
```

### Requirements
```bash
wiki=https://commons.wikimedia.org                # Define your wiki
google-chrome ${wiki}/wiki/Special:CreateAccount  # Create bot account, open in browser, follow instructions.
google-chrome ${wiki}/wiki/Special:BotPasswords   # Create a bot-password and bot-pasword-alias, follow instructions.
```

Create `./logins.js` with logins and api url for your target wiki(s), example:
```js
module.exports = {
	commons: {
		user: 'bot-pasword-alias',
		pass: 'bot-password',
		api : 'https://commons.wikimedia.org/api.php'
	},
	lili: {
		user: 'bot-pasword-alias2',
		pass: 'bot-password2',
		api : 'https://lingualibre.org/api.php'
	},
};
```

### Run
Edit logins credential `USER`, `PASS` and `API` to call the right values from `./logins.js`.

Hack code according to your needs, then :
```bash
node create-Lingualibre-lists-unilex.js              # run unilex lists uploader.
```

### Roles
`create-Lingualibre-lists-unilex.js`: fetch url or read locally `unilex-extended` data, then according to gentle ramp approach's ranges picks section, write them to LinguaLibre. Add license to talkpage, recommendation to `Category:Speakers of {iso}`
* input: `languages.js` with iso6390-3 and filenames.
`create-Lingualibre-list-unilex-by-letters.js` : given one language, fetch url or read locally `unilex-extended` data sorted and split by letters, write them to LinguaLibre. Add license to talkpage.
* input: iso code.
`edit-Commons-filename.js` : rename files on Commons.
* input: target commons category, regex.
`edit-Commons-wikitext.js` : target category, regex.
`edit-Lingualibre-Qitem.js` : target item(s), propertie to edit, value or function defining value to submit.
`edit-Lingualibre-wikitext.js` : target category, regex.
