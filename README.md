DiscordBotVocal

Requierment:
- node

getting started:
- npm install
- copy configExample.json to config.json
- modify config.json to your needs
- create a file .env with your database url connection inside
- npm run dev

config.js :
 {
	"prefix": "!",
	"token": "TOKEN",
  "saveFolder":"meme",
  "models" : [
    "Model/fr",
    "Model/en"
  ]
}

- prefix is the prefix of the command
- token is your discord app token
- saveFolder is where the audio will be saved
- models is the models that are going to be used for the vocal recognition

Model https://alphacephei.com/vosk/models


.env:
DATABASE_URL="postgresql://user:pass@localhost:5432/imouto"