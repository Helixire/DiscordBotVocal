const config = require('../config.json');
const vosk = require('vosk');
const { Collection } = require('discord.js');

const models = config.models.map(path => new vosk.Model(path));


let UserParser = class {
    constructor(user, guild) {
        this.user = user;
        this.guild = guild;
        this.parsers = models.map(model => new vosk.Recognizer({ model: model, sampleRate: 48000.0 }));   
    }

    parse(chunk) {
        // if (!this.parsing) {
        //     return;
        // }
        this.parsers.forEach((rec) =>{
            rec.acceptWaveform(chunk);
        })
        let empty = 0;
        for (let i = 0; i < chunk.length; i++) {
            if (chunk[i]) {
                empty = 0;
            }
            ++empty;
        }
        if (empty > 100) {
            this.parsers.forEach((rec) =>{
                let a  = rec.finalResult();
                if (a.text) {
                    process.send({type:'text', text:a, user:this.user, guild:this.guild});
                }
            });
        }
    }
}

const users = new Collection();

process.on('message', (msg)=>{
    console.log('msg', msg);
    if (msg.type === 'add') {
        users.set(msg.user, new UserParser(msg.user, msg.guild));
    }
    else if (msg.type === 'remove') {
        let audio = users.get(msg.user);
        if (audio) {
            audio.free();
            users.delete(msg.user);
        }
    }
    else if (msg.type === 'parse') {
        users.get(msg.user).parse(msg.chunk);
    }
});

process.send({type:'ready'});