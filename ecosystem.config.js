module.exports = {
  apps : [{
    script: 'npm run prod',
    name: 'imouto'
  }],

  deploy : {
    production : {
      user : process.env.SERVER_USER,
      host : process.env.SERVER_IP,
      port : process.env.SERVER_PORT,
      key: 'deploy.key',
      ref  : 'origin/master',
      repo : 'https://github.com/sauvag-c/DiscordBotVocal.git',
      path : process.env.SERVER_PATH,
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
