const nanoid = require('nanoid');
const config = require('./config.json');
const fs = require('fs');
const request = require('request');
const { Client, Intents, MessageEmbed } = require('discord.js');
const path = require('path');
const { ConnectionList } = require('./class/ConnectionList');
const { db } = require('./class/db');
const { MemeTable } = require('./class/Meme');
const { Comparaison } = require('./class/Comparaison');
const { ParserManager } = require('./class/ParserManager');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });


db.run("CREATE TABLE IF NOT EXISTS MEME_TRIGER(ID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, ID_SONG INTEGER NOT NULL, TRIGER TEXT NOT NULL);")

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

ParserManager.ontext = (text, userid, guildid) => {
    console.log(text);
    db.get(`SELECT
                MEME_SONG.ID,
                MEME_TRIGER.TRIGER
            FROM
                MEME_SONG
            INNER JOIN MEME_TRIGER ON (MEME_SONG.ID = MEME_TRIGER.ID_SONG)
            WHERE MEME_SONG.SERVER = ?2 AND (?1 LIKE '% ' || MEME_TRIGER.TRIGER || ' %'
                OR ?1 LIKE '% ' || MEME_TRIGER.TRIGER
                OR ?1 LIKE MEME_TRIGER.TRIGER || ' %'
                OR ?1 LIKE MEME_TRIGER.TRIGER)
            ORDER BY length(MEME_TRIGER.TRIGER) DESC`, text, guildid.toString(), async (err, row) => {
        if (err) {
            console.log('select ' + err);
        }
        if (row) {
            MemeTable.get(row.ID).then(meme=>{
                console.log('---TRIGERR---');
                console.log(row.TRIGER);
                console.log(text);
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
                meme.update().then(() => {
                    message.channel.send('I DID IT ONII-CHAN COMMAND UPDATED');
                });
            }
            else {
                meme.path = fileName;
                meme.cmd = param[1];
                meme.server = message.guild.id.toString();
                meme.update().then(() => {
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
        message.channel.send(await embedMeme(offset)).then(newMessage => {
            newMessage.react('⬅️')
                .then(() => { newMessage.react('➡️') });

            const colector = newMessage.createReactionCollector((reaction, user) => {
                return (reaction.emoji.name === '⬅️' || reaction.emoji.name === '➡️') && user.id === message.author.id;
            }, { idle: 300000 });

            colector.on('collect', (reaction, user) => {
                if (reaction.emoji.name === '⬅️') {
                    offset -= 10;
                } else if (reaction.emoji.name === '➡️') {
                    offset += 10;
                }
                if (offset < 0) {
                    offset = 0;
                } // TODO if offset too big
                embedMeme(offset).then(embed => newMessage.edit(embed).then(() => {
                    newMessage.reactions.removeAll()
                    newMessage.react('⬅️')
                        .then(() => { newMessage.react('➡️') });
                }));
            });

            colector.on('end', collected => {
                newMessage.delete();
            });
        });
    }
});

client.once('ready', () => {
    console.log('Ready!');
});

client.login(config.token);