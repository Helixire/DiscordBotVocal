const nanoid = require('nanoid');
const vosk = require('vosk');
const { Readable, Writable } = require('stream');
const { Mixer } = require('audio-mixer');
const sqlite3 = require('sqlite3');
const config = require('./config.json');
const fs = require('fs');
const request = require('request');
const { Client, Intents } = require('discord.js');
const path = require('path');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });

const db = new sqlite3.Database(config.dbName);
const model = new vosk.Model("Model");

db.run("CREATE TABLE IF NOT EXISTS MEME_SONG(ID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, PATH TEXT NOT NULL, CMD TEXT NOT NULL, SERVER TEXT NOT NULL);");

const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url)
            .pipe(fs.createWriteStream(path))
            .on('close', callback)
    })
};

client.on('message', async message => {
    param = message.content.split(' ');
    //if talk directly to onii-chan he don't crash
    if (!message.guild) return;
    if (param[0] == "!listen") {
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
            message.member.voice.channel.members.each((user, id) => {
                if (user.user.bot) {
                    return;
                }
                console.log('init stream');
                let mixer = new Mixer({
                    channels: 1,
                    bitDepth: 16,
                    sampleRate: 48000,
                });
                let discordInput = mixer.input({
                    channels: 2,
                    bitDepth: 16,
                    sampleRate: 48000,
                });

                const rec = new vosk.Recognizer({ model: model, sampleRate: 48000.0 });
                const audio = connection.receiver.createStream(user, { mode: 'pcm', end: 'manual' });

                console.log('end init stream');
                const parserWriter = new Writable({
                    write(chunk, encoding, callback) {
                        rec.acceptWaveform(chunk);
                        let empty = true;
                        for (let i = 0; i < chunk.length; i++) {
                            if (chunk[i]) {
                                empty = false;
                                break;
                            }
                        }
                        if (empty) {
                            console.log(rec.finalResult());
                        }
                        callback();
                    }
                });
                mixer.pipe(parserWriter);
                audio.pipe(discordInput);
            })
        }
    }
    else if (param[0] == '!addmeme') {
        fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        while (fs.existsSync(fileName)) {
            fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        }
        download(param[2], fileName, () => {
            db.get('SELECT ID, PATH FROM MEME_SONG WHERE CMD = ? and SERVER = ?', param[1], message.guild.id.toString(), (error, row) => {
                if (error) {
                    console.log(error);
                }
                if (row) {
                    fs.unlink(row.PATH, (error) => {
                        if (error) {
                            console.log(error);
                        }
                    });
                    db.run('UPDATE MEME_SONG SET PATH = ? WHERE ID = ?', fileName, row.ID);
                }
                else {
                    db.run('INSERT INTO MEME_SONG (PATH, CMD, SERVER) VALUES(?, ?, ?)', fileName, param[1], message.guild.id.toString());
                }
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
                const connection = await message.member.voice.channel.join();
                console.log(row['PATH']);
                const dispatcher = connection.play(row['PATH'], { volume: 0.5 });
                dispatcher.on('finish', () => {
                    console.log('Finished playing!');
                    dispatcher.destroy();
                    connection.disconnect();
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