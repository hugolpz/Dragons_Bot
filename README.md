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

### Current script
* `create-Lingualibre-lists-unilex.js`: fetch url or read locally available unilex-extended's data, uses the gentle ramp's ranges to picks sections, write them to LinguaLibre as lists. Add license to talkpage, recommendation to ''Category:Speakers_of_{iso}''
  * input: json with iso6390-3 and filenames.

### Wishlist
* `edit-Commons-wikitext.js` : edit wikitext on Commons files to fix them, mainly their templates and categories.
  * input: target category, regex.
* `edit-Lingualibre-wikitext.js` : edit wikitext on Lingualibre pages to fix them, mainly lists or users.
  * input: target category, regex.
* `edit-Commons-filename.js` : rename files on Commons.
  * input: target commons category, regex.
* `edit-Lingualibre-Qitem.js` : edit one or a set of Qitems on Lingualibre to fix them.
  * input: list of target items, property, value or  
