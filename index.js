const config = require('./config.json');
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });


client.on('message', async message => {
    //if talk directly to onii-chan he don't crash
    if (!message.guild) return;
    if (message.content === '!aniki') {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
            const dispatcher = connection.play('C:/Users/lordk/Documents/git/DiscordBotVocal/meme/run.mp3');
            dispatcher.setVolume(0.5); // half the volume
            dispatcher.on('finish', () => {
                console.log('Finished playing!');
                dispatcher.destroy();
                connection.disconnect();
            });

        }
        else {
            message.channel.send('You need to join a voice channel first!');
        }
    }
});

client.once('ready', () => {
    console.log('Ready!');
});

client.login(config.token);