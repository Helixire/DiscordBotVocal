const config = require('../config.json');
const vosk = require('vosk');
const { Mixer } = require('audio-mixer');
const EventEmitter = require('events');
const { Collection } = require('discord.js');

const models = config.models.map(path => new vosk.Model(path));

let UserAudioParser = class {
    constructor(audio) {
        this.parsers = models.map(model => new vosk.Recognizer({ model: model, sampleRate: 48000.0 }));
        this.audio = audio;
        this.parsing = true;
        this.mixer = new Mixer({
            channels: 1,
            bitDepth: 16,
            sampleRate: 48000,
        });
        this.discordInput = this.mixer.input({
            channels: 2,
            bitDepth: 16,
            sampleRate: 48000,
        });

        this.mixer.on('data', (chunk)=> {
            this.parsepacket(chunk);
        })
        this.audio.pipe(this.discordInput);
    }

    setParsing(parse) {
        this.parsing = parse;
    }

    parsepacket(chunk) {
        if (!this.parsing) {
            return;
        }
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
                    process.send({type:'text', text:a});
                }
            });
        }
    }

    free() {
        console.log('free UserAudioParser');
        this.removeAllListeners();
        this.mixer.removeAllListeners();
        this.audio.unpipe(this.discordInput);
        this.parsers.forEach((parser)=> {
            console.log('free Parser')
            parser.free();
        });
        this.parsers = [];
        this.audio = null;
    }
}

const users = new Collection();

process.on('message', (msg)=>{
    console.log('msg', msg);
    if (msg.type === 'add') {
        users.set(msg.user, new UserAudioParser(msg.audio.createStream(member, { mode: 'pcm', end: 'manual' })));
    }
    else if (msg.type === 'remove') {
        let audio = users.get(msg.user);
        if (audio) {
            audio.free();
            users.delete(id);
        }
    }
});

process.send({type:'ready'});