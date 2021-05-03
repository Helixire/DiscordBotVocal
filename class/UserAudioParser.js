const vosk = require('vosk');
const config = require('../config.json');

const models = config.models.map(path => new vosk.Model(path));

module.exports.UserAudioParser = class {
    constructor(audio, ontext) {
        this.ontext = ontext;
        this.audio = audio;
        this.parsers = models.map(model => {return {parser:new vosk.Recognizer({ model: model, sampleRate: 48000.0 }), str:0}});
        this.audio.on('data', (chunk)=> {
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
        let chunkMono = Buffer.alloc(chunk.length / 2);

        for (let i = 0; i < chunkMono.length; ++i) {
            chunkMono[i] = chunk[i * 2] / 2 + chunk[i * 2 + 1] / 2;
        }
        this.parsers.forEach((rec) =>{
            rec.parser.acceptWaveform(chunkMono);
            // let a = rec.parser.partialResult();
            // if (a.partial) {
            //     a = a.partial.substring(rec.str, this.nth_ocurrence(a.partial, ' ', 3));
            //     if (a) {
            //         this.ontext(a, rec);
            //         console.log(a);
            //     }
            // }
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
                let a  = rec.parser.finalResult();
                if (a.text) {
                    this.ontext(a.text, rec);
                    rec.str = 0;
                }
            });
        }
    }

    free() {
        console.log('free UserAudioParser');
        this.audio = null;
    }
}