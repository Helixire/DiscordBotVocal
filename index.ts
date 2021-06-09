const nanoid = require('nanoid');
const config = require('./config.json');
const fs = require('fs');
const request = require('request');
const { Client, Intents, MessageEmbed } = require('discord.js');
const path = require('path');
const { ConnectionList } = require('./class/ConnectionList');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });
import { PrismaClient } from '@prisma/client'


const prisma = new PrismaClient()


const download = (url: string, path: string , callback : ()=>void) => {
    request.head(url, (err: string, res: any, body: any) => {
        request(url)
            .pipe(fs.createWriteStream(path))
            .on('close', callback)
    })
};

const embedMeme = async (offset: number) => {
    return prisma.sound.findMany({
        skip: offset,
        take: 10,
    }).then(memes => {
        return new MessageEmbed()
            .setTitle('Choose your meme')
            .setColor('#DAF7A6')
            .addField(`Page ${Math.floor(offset / 10) + 1}`, memes.map(meme => '```' + meme.cmd + '```').join(''));
    });
}

const embedMemeInfo = (meme: any) => {
    var lastCall = 'never played';
    if (meme.last_call) {
        lastCall = meme.last_call.toISOString().replace(/T/, '\n').replace(/\..+/, '');
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

const play = async function (sound: any, chanel?: any) {
    if (!sound.last_call) {
        sound.last_call = 0;
    }

    if (Date.now() - sound.last_call.getTime() >= 100000) {
        console.log('Start playing ' + sound.cmd);
        let played = await ConnectionList.getConnection(sound.server).playSound(sound.path, chanel);
        if (played) {
            prisma.sound.update({
                data: {
                    last_call: Date(),
                    number_played : {
                        increment: 1
                    }
                },
                where: {
                    id: sound.id
                }
            })
        }
    }
}

ConnectionList.ontext = (data: any) => {
    let text = data.result.filter((word: any) => word.conf > 0.5).map((v: any) =>v.word).join(' ');
    console.log(text);
    prisma.sound.findFirst({
        where: {
            OR: [
                {
                    trigers: {
                        some: {
                            triger: text
                        }
                    }
                },
                {
                    trigers: {
                        some: {
                            triger : {
                                contains: text + ' '
                            }
                        }
                    }
                },
                {
                    trigers: {
                        some: {
                            triger : {
                                contains: ' ' + text + ' '
                            }
                        }
                    }
                },
                {
                    trigers: {
                        some: {
                            triger : {
                                contains: ' ' + text
                            }
                        }
                    }
                },
            ]
        }
    }).then((row: any) => {
        console.dir(row, { depth: null })
        if (row) {
            play(row)
        }
    });
}

//Gestion des co et deco des utilisateur vocaux
client.on('voiceStateUpdate', (oldState: any, newState: any) => {
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
client.on('message', async (message: any) => {
    try {
    let param = message.content.split(' ');
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
        let fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        while (fs.existsSync(fileName)) {
            fileName = path.join(config.saveFolder, nanoid.nanoid() + '.mp3');
        }
        console.log('Start download ' + param[1]);
        download(param[2], fileName, async () => {
            await prisma.sound.upsert({
                create: {
                    cmd: param[1],
                    server: message.guild.id.toString(),
                    path: fileName,
                },
                update: {
                    path: fileName,
                },
                where: {
                    cmd_server: {
                        cmd: param[1],
                        server: message.guild.id.toString(),
                    }
                }
            })
            message.channel.send('I DID IT ONII-CHAN COMMAND UPDATED');
        });
    }
    else if (param[0] == config.prefix + 'aniki' && param[1]) {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voice.channel) {
            let meme = await prisma.sound.findUnique({
                    where: {
                        cmd_server: {
                            cmd: param[1],
                            server: message.guild.id.toString(),
                        }
                    }
                });
            if (!meme) {
                message.channel.send('Tasukete kure comando inconnue !');
                return;
            }
            play(meme, message.member.voice.channel);
        }
        else {
            message.channel.send('You need to join a voice channel first!');
        }
    } else if (param[0] == config.prefix + 'bye') {
        ConnectionList.disconnect(message.guild.id);
    } else if (param[0] == config.prefix + 'link' && param[1] && param[2]) {
        let meme = await prisma.sound.findUnique({
                where: {
                    cmd_server: {
                        cmd: param[1],
                        server: message.guild.id.toString(),
                    }
                }
            });
        if (!meme) {
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
        await prisma.sound.update({
            where: {
                id: meme.id
            },
            data: {
                trigers: {
                    connectOrCreate: {
                        where: {
                            triger: trigger
                        },
                        create: {
                            triger: trigger
                        }
                    }
                }
            }
        });
        message.channel.send("Link connected !");
    } else if (param[0] == config.prefix + 'list') {
        let offset = 0;
        message.channel.send(await embedMeme(offset)).then((newMessage: any) => {
            newMessage.react('⬅️')
                .then(() => { newMessage.react('➡️') });

            const colector = newMessage.createReactionCollector((reaction: any, user: any) => {
                return (reaction.emoji.name === '⬅️' || reaction.emoji.name === '➡️') && user.id === message.author.id;
            }, { idle: 300000 });

            colector.on('collect', (reaction: any, user: any) => {
                if (reaction.emoji.name === '⬅️') {
                    offset -= 10;
                } else if (reaction.emoji.name === '➡️') {
                    offset += 10;
                }
                if (offset < 0) {
                    offset = 0;
                } // TODO if offset too big
                embedMeme(offset).then((embed: any) => newMessage.edit(embed).then(() => {
                    newMessage.reactions.removeAll()
                    newMessage.react('⬅️')
                        .then(() => { newMessage.react('➡️') });
                }));
            });

            colector.on('end', (collected: any) => {
                newMessage.delete();
            });
        });
    }
    else if (param[0] == config.prefix + 'info' && param[1]) {
        const meme = await prisma.sound.findUnique({
            where: {
                cmd_server: {
                    cmd: param[1],
                    server: message.guild.id.toString(),
                }
            }
        })
        if (!meme) {
            message.channel.send('Baka Aniki ! Commande not found !');
            return;
        }
        let listInfo = embedMemeInfo(meme)
        let infoMessage = await message.channel.send(listInfo[0]);
        infoMessage.react('❌');
        let delmsgAudio = await message.channel.send(listInfo[1]);
        const infoCollector = infoMessage.createReactionCollector((reaction: any, user: any) => {
            return (reaction.emoji.name === '❌' && user.id === message.author.id)
        }, { idle: 300000 });
        infoCollector.on('collect', (reaction: any, user: any) => {
            if (reaction.emoji.name === '❌') {
                prisma.sound.delete({where:{id:meme.id}});
                infoMessage.delete();
                delmsgAudio.delete();

                message.channel.send('I DID IT ONII-CHAN MEME IS DELETED');
            }
        })
        infoCollector.on('end', (collected: any)=> {
            infoMessage.delete();
            delmsgAudio.delete();
        })
    }
    } catch(error :any) {
        console.log(error);
    }

});

client.once('ready', () => {
    console.log('Ready!');
});

client.login(config.token);