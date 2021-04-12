const config = require('../config.json');
const vosk = require('vosk');
const { Readable, Writable } = require('stream');
const { Mixer } = require('audio-mixer');
const EventEmitter = require('events');
const { ReactionUserManager } = require('discord.js');


const models = config.models.map(path => new vosk.Model(path));

module.exports.UserAudioParser = class extends EventEmitter{
    constructor(con, user) {
        super();
        this.parsers = models.map(model => new vosk.Recognizer({ model: model, sampleRate: 48000.0 }));
        this.audio = con.con.receiver.createStream(user, { mode: 'pcm', end: 'manual' });
        this.user = user;
        this.con = con;
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
                    this.emit('text', this, a)
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