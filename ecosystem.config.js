module.exports = {
  apps : [{
    script: 'index.js',
    name: 'imouto'
  }],

  deploy : {
    production : {
      user : process.env.SERVER_USER,
      host : process.env.SERVER_IP,
      port : process.env.SERVER_PORT,
      ref  : 'origin/master',
      repo : 'https://github.com/sauvag-c/DiscordBotVocal.git',
      path : process.env.SERVER_PATH,
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
