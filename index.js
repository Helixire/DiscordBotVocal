const nanoid = require('nanoid');
const sqlite3 = require('sqlite3');
const config = require('./config.json');
const fs = require('fs');
const request = require('request');
const { Client, Intents } = require('discord.js');
const path = require('path');
const { freemem } = require('os');
const { Connection } = require('./class/Connection');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });

const db = new sqlite3.Database(config.dbName);

db.run("CREATE TABLE IF NOT EXISTS MEME_SONG(ID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, PATH TEXT NOT NULL, CMD TEXT NOT NULL, SERVER TEXT NOT NULL);");

const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url)
            .pipe(fs.createWriteStream(path))
            .on('close', callback)
    })
};

const connections = {}

const getConnection = (guild) => {
    if (!(guild in connections)) {
        connections[guild] = new Connection();
    }
    return connections[guild];
}

const disconnect = (guild) => {
    let connection = connections[guild];
    if (connection) {
        connection.clean();
        connections[guild] = null;
    }
}


client.on('message', async message => {
    param = message.content.split(' ');
    //if talk directly to onii-chan he don't crash
    if (!message.guild) return;
    if (param[0] == "!listen") {
        if (message.member.voice.channel) {
            getConnection(message.guild.id).startParser(message.member.voice.channel);
        }
    }
    else if (param[0] == '!addmeme') {
        fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        while (fs.existsSync(fileName)) {
            fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        }
        download(param[2], fileName, () => {
            db.get('SELECT ID FROM MEME_SONG WHERE CMD = ? and SERVER = ?', param[1], message.guild.id.toString(), (error, row) => {
                if (error) {
                    console.log(error);
                }
                if (row) {
                    db.run('UPDATE MEME_SONG SET PATH = ? WHERE ID = ?', fileName, row['ID']);
                }
                else {
                    db.run('INSERT INTO MEME_SONG (PATH, CMD, SERVER) VALUES(?, ?, ?)', fileName, param[1], message.guild.id.toString());
                }
                message.channel.send('I DID IT ONII-CHAN');
            });

        })

    }
    else if (param[0] == '!aniki') {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            db.get('SELECT PATH FROM MEME_SONG WHERE CMD = ? AND SERVER = ?', param[1], message.guild.id.toString(), async (error, row) => {
                if (error) {
                    message.channel.send('YAMETE la Y a des blempro dans la DB !');
                    return;
                }
                if (!row) {
                    message.channel.send('Tasukete kure comando inconnue !');
                    return;
                }
                const connection = getConnection(message.guild.id)
                const link = await connection.getCon(message.member.voice.channel);
                const dispatcher = link.play(row['PATH'], { volume: 0.5 });
                dispatcher.on('finish', () => {
                    console.log('Finished playing!');
                    dispatcher.destroy();
                    if (!connection.listening()) {
                        disconnect(message.guild.id);
                    }
                });
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