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

Create `./logins.js` with logins and api url for your target wiki(s):

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
Edit index.js according to YOUR needs. Then :
```bash
node index.js                                     # run main script
```
