const vosk = require('vosk');
const config = require('../config.json');
const { Transform } = require('stream');

const models = config.models.map(path => new vosk.Model(path));
const SILENCE_TRESH = 20;


class ToMono extends Transform {
    _transform(chunk, encoding, callback) {
        let chunkMono = Buffer.alloc(chunk.length / 2);
        for (let i = 0; i < chunk.length / 2; i += 2) {
            //chunkMono.writeInt16LE(chunk.readInt16LE(i * 2) / 2 + chunk.readInt16LE(i * 2 + 2) / 2, i);
            chunkMono.writeInt16LE(chunk.readInt16LE(i * 2), i);
        }
        callback(null, chunkMono);
    }
}

module.exports.UserAudioParser = class {
    constructor(audio, ontext) {
        this.ontext = ontext;
        this.audio = audio;
        this.parsers = models.map(model => {return new vosk.Recognizer({ model: model, sampleRate: 48000.0 })} );
        this.transform = new ToMono();
        this.audio.pipe(this.transform);
        this.transform.on('data', chunk => {
            this.parse(chunk);
        });
    }

    nth_ocurrence(str, needle, nth) {
        for (let i=str.length;i>0;i--) {
          if (str.charAt(i) == needle) {
              if (!--nth) {
                 return i;    
              }
          }
        }
        return false;
    }

    parse(chunk) {
        let silence = 0;
        for (let i = chunk.length; i > 0 && silence < SILENCE_TRESH && !chunk[i]; --i) {
            ++silence;
        }
        this.parsers.forEach((rec) => {
            let done = rec.acceptWaveform(chunk);
            if (done || (silence == SILENCE_TRESH && chunk[0])) {
                let a = rec.finalResult();
                if (a.text) {
                    this.ontext(a);
                }
            }
        });
    }

    free() {
        console.log('free UserAudioParser');
        this.audio = null;
        this.parsers.forEach(parser=>parser.free());
    }
}