const nanoid = require('nanoid');
const config = require('./config.json');
const fs = require('fs');
const request = require('request');
const { Client, Intents, MessageEmbed } = require('discord.js');
const path = require('path');
const { ConnectionList } = require('./class/ConnectionList');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });
const { db } = require('./class/DbAccess/db');
const { MemeTable } = require('./class/Meme');
const { Comparaison } = require('./class/DbAccess/Comparaison');
const { TrigerTable } = require('./class/Trigger');

const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url)
            .pipe(fs.createWriteStream(path))
            .on('close', callback)
    })
};

const embedMeme = async (offset) => {
    return MemeTable.findAll(null, 10, offset).then(memes => {
        return new MessageEmbed()
            .setTitle('Choose your meme')
            .setColor('#DAF7A6')
            .addField(`Page ${Math.floor(offset / 10) + 1}`, memes.map(meme => '```' + meme.cmd + '```').join(''));
    });
}

const embedMemeInfo = (meme) => {
    var lastCall = 'never played';
    if (meme.last_call) {
        var date = new Date(null);
        date.setSeconds(meme.last_call);
        lastCall = date.toISOString().replace(/T/, '\n').replace(/\..+/, '');
    }
    return [new MessageEmbed()
        .setTitle(meme.cmd)
        .setColor('#fed42d')
        .addField('Last call', lastCall, true)
        .addField('Played', meme.number_played, true),
    {
        files: [{
            attachment: meme.path,
            name: meme.cmd + '.mp3'
        }]
    }]
}

ConnectionList.ontext = (data) => {
    let text = data.result.filter(word => word.conf > 0.5).map(v=>v.word).join(' ');
    console.log(text);
    db.get(`SELECT
                MEME_SONG.ID,
                MEME_TRIGER.TRIGER
            FROM
                MEME_SONG
            INNER JOIN MEME_TRIGER ON (MEME_SONG.ID = MEME_TRIGER.ID_SONG)
            WHERE ?1 LIKE '% ' || MEME_TRIGER.TRIGER || ' %'
                OR ?1 LIKE '% ' || MEME_TRIGER.TRIGER
                OR ?1 LIKE MEME_TRIGER.TRIGER || ' %'
                OR ?1 LIKE MEME_TRIGER.TRIGER`, text, (err, row) => {
        if (err) {
            console.log('select ' + err);
        }
        if (row) {
            MemeTable.get(row.ID).then(meme => {
                console.log('---TRIGERR---');
                console.log(row.TRIGER);
                console.log(data);
                meme.play();
            });
        }
    });
}

//Gestion des co et deco des utilisateur vocaux
client.on('voiceStateUpdate', (oldState, newState) => {
    let connection = ConnectionList.getConnection(oldState.guild.id);

    if (!connection.con) {
        return;
    }

    // Si l'utilisateur a changer de channel
    if (oldState.channelID != newState.channelID) {
        if (oldState.channelID && newState.channelID && newState.member.user.id == client.user.id) { // If moove BOT manualy
            connection.startParser(newState.channel);
        }
        else if (oldState.channelID == connection.con.channel.id) { //Deco
            connection.removeAudioUser(oldState.member);
        }
        else if (newState.channelID == connection.con.channel.id) { //Co
            connection.addAudioUser(oldState.member);
        }
    }
});

// Gestion des messages
client.on('message', async message => {
    param = message.content.split(' ');
    //if talk directly to onii-chan he don't crash
    if (!message.guild) return;
    if (param[0] == config.prefix + "listen") {
        if (message.member.voice.channel) {
            ConnectionList.getConnection(message.guild.id).startParser(message.member.voice.channel);
        }
    }
    else if (param[0] == config.prefix + 'addmeme' && param[1] && (param[2] || message.attachments.size)) {
        if (!param[2] && message.attachments.size) {
            param.push(message.attachments.values().next().value.url);
        }
        fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        while (fs.existsSync(fileName)) {
            fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        }
        console.log('Start download ' + param[1]);
        download(param[2], fileName, async () => {
            let meme = await MemeTable.find(new Comparaison(
                new Comparaison(MemeTable.fields.get('cmd'), '=', param[1]), 'and',
                new Comparaison(MemeTable.fields.get('server'), '=', message.guild.id.toString()))
            );
            if (meme.id) {
                fs.unlink(meme.path, (error) => {
                    if (error) {
                        console.log(error);
                    }
                });
                meme.path = fileName;
                meme.save().then(() => {
                    message.channel.send('I DID IT ONII-CHAN COMMAND UPDATED');
                });
            }
            else {
                meme.path = fileName;
                meme.cmd = param[1];
                meme.server = message.guild.id.toString();
                meme.save().then(() => {
                    message.channel.send('I DID IT ONII-CHAN');
                });
            }
        });
    }
    else if (param[0] == config.prefix + 'aniki' && param[1]) {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            let meme = await MemeTable.find(new Comparaison(
                new Comparaison(MemeTable.fields.get('cmd'), '=', param[1]), 'and',
                new Comparaison(MemeTable.fields.get('server'), '=', message.guild.id.toString()))
            );
            if (!meme.id) {
                message.channel.send('Tasukete kure comando inconnue !');
                return;
            }
            meme.play(message.member.voice.channel);
        }
        else {
            message.channel.send('You need to join a voice channel first!');
        }
    } else if (param[0] == config.prefix + 'bye') {
        ConnectionList.disconnect(message.guild.id);
    } else if (param[0] == config.prefix + 'link' && param[1] && param[2]) {
        let meme = await MemeTable.find(new Comparaison(
            new Comparaison(MemeTable.fields.get('cmd'), '=', param[1]), 'and',
            new Comparaison(MemeTable.fields.get('server'), '=', message.guild.id.toString()))
        );
        if (!meme.id) {
            message.channel.send('Baka Aniki ! Commande not found !');
            return;
        }
        let trigger = ''
        for (let i = 2; i < param.length; i++) {
            if (trigger.length) {
                trigger += ' ';
            }
            trigger += param[i];
        }
        db.run("INSERT INTO MEME_TRIGER (ID_SONG, TRIGER) VALUES (?, ?)", meme.id, trigger, () => {
            message.channel.send("Link connected !");
        });
    } else if (param[0] == config.prefix + 'list') {
        let offset = 0;
        message.channel.send(await embedMeme(offset)).then(async (newMessage) => {
            let count = await MemeTable.count(new Comparaison(MemeTable.fields.get('server'), '=', message.guild.id.toString()));
            if ((count / 10) > 1) {
                newMessage.react('➡️');
            }
            const colector = newMessage.createReactionCollector((reaction, user) => {
                return (reaction.emoji.name === '⬅️' || reaction.emoji.name === '➡️') && user.id === message.author.id;
            }, { idle: 300000 });

            colector.on('collect', (reaction, user) => {
                if (reaction.emoji.name === '⬅️') {
                    offset -= 10;
                } else if (reaction.emoji.name === '➡️') {//gestion si last page
                    offset += 10;
                }
                if (offset < 0) {
                    offset = 0;
                } // TODO if offset too big
                embedMeme(offset).then(embed => newMessage.edit(embed).then(() => {
                    newMessage.reactions.removeAll()
                    if (offset != 0) {
                        newMessage.react('⬅️')
                            .then(() => {
                                if ((offset + 10) < count) {
                                    newMessage.react('➡️');
                                }
                            });
                    }
                    if (offset == 0) {
                        newMessage.react('➡️');
                    }
                }));
            });

            colector.on('end', collected => {
                newMessage.delete();
            });
        });
    }
    else if (param[0] == config.prefix + 'info' && param[1]) {
        MemeTable.find(new Comparaison(
            new Comparaison(MemeTable.fields.get('cmd'), '=', param[1]), 'and',
            new Comparaison(MemeTable.fields.get('server'), '=', message.guild.id.toString()))
        ).then((meme) => {
            if (!meme.id) {
                message.channel.send('Baka Aniki ! Commande not found !');
                return;
            }
            let listInfo = embedMemeInfo(meme)
            message.channel.send(listInfo[0]).then(async (infoMessage) => {
                infoMessage.react('❌');
                let delmsgAudio = await message.channel.send(listInfo[1]);
                const infoFilter = (reaction, user) => {
                    return (reaction.emoji.name === '❌' && user.id === message.author.id)
                };
                const infoCollector = infoMessage.createReactionCollector(infoFilter, { idle: 300000 });
                infoCollector.on('collect', (reaction, user) => {
                    if (reaction.emoji.name === '❌') {
                        meme.delete();
                        infoMessage.delete();
                        delmsgAudio.delete();

                        message.channel.send('I DID IT ONII-CHAN MEME IS DELETED');
                    }
                })
                infoCollector.on('end', collected => {
                    infoMessage.delete();
                    delmsgAudio.delete();

                })
            });
        });


    }
});

client.once('ready', () => {
    console.log('Ready!');
});

client.login(config.token);