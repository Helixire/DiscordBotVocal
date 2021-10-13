DiscordBotVocal

This is a NodeJs application that do voice recognition on discord to start Meme

Requirement:

- node
- postgres

getting started:

- npm install
- copy configExample.json to config.json
- modify config.json to your needs
- create a file .env with your database url connection inside
- npx prisma generate
- npx prisma migrate deploy
- npm run dev

.env file content:
DATABASE_URL="postgresql://user:pass@localhost:5432/yourDatabaseName"
