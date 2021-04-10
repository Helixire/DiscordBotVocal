const config = require('../config.json');
const vosk = require('vosk');
const { Readable, Writable } = require('stream');
const { Mixer } = require('audio-mixer');


const models = config.models.map(path => new vosk.Model(path));

module.exports.UserAudioParser = class {
    constructor(con, user) {
        this.parsers = models.map(model => new vosk.Recognizer({ model: model, sampleRate: 48000.0 }));
        this.audio = con.receiver.createStream(user, { mode: 'pcm', end: 'manual' });
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

    parsepacket(chunk) {
        this.parsers.forEach((rec) =>{
            rec.acceptWaveform(chunk);
        })
        let empty = true;
        for (let i = 0; i < chunk.length; i++) {
            if (chunk[i]) {
                empty = false;
                break;
            }
        }
        if (empty) {
            this.parsers.forEach((rec) =>{
                let a  = rec.finalResult();
                if (a.text) {
                    console.log(a);
                }
            });
        }
    }

    free() {
        console.log('free UserAudioParser')
        this.audio.unpipe(this.discordInput);
        this.parsers.forEach((parser)=> {
            parser.free();
        });
        this.audio = null;
    }
}