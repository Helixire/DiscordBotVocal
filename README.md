DiscordBotVocal

Requierment:
- node

getting started:
- npm install
- copy configExample.json to config.json
- modify config.json to your needs
- npm index.js

config.js :
 {
	"prefix": "!",
	"token": "TOKEN",
  "saveFolder":"meme",
  "dbName":"memeDB.db",
  "models" : [
    "Model/fr",
    "Model/en"
  ]
}

- prefix is the prefix of the command
- token is your discord app token
- saveFolder is where the audio will be saved
- dbName is the filepath of the sqlLite database (it will be created if it does not exist)
- models is the models that are going to be used for the vocal recognition

Model https://alphacephei.com/vosk/models
