## DiscordBotVocal

### Requirement:

- node
- postgres

### Getting started:

- npm install
- copy configExample.json to config.json
- modify config.json to your needs
- create your .env file [here](#.env-file-content:)
- npx prisma generate
- npx prisma migrate dev
- create your https cert files [here](#generate-https-cert-files)
- npm run dev

### .env file content:
NEXTAUTH_URL=https://localhost:3000
DATABASE_URL="postgresql://user:pass@localhost:5432/yourDatabaseName"
DISCORD_ID=number
DISCORD_SECRET=secret

(https://discord.com/developers/applications/  in your application Oauth2 tab)

### Generate https cert files
- install mkcert https://github.com/FiloSottile/mkcert#installation
- mkcert -install
- mkcert localhost
- move both the files (*.pem, -key*.pem) in https_cert
- make sure the files are named localhost-key.pem and localhost.pem

