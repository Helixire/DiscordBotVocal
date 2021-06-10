const vosk = require('vosk');
const config = require('../config.json');
import { Transform } from 'stream';

const models: Array<any> = config.models.map((path: string) => new vosk.Model(path));
const SILENCE_TRESH = 20;


class ToMono extends Transform {
    _transform(chunk: Buffer, encoding: string, callback: Function) {
        let chunkMono = Buffer.alloc(chunk.length / 2);
        for (let i = 0; i < chunk.length / 2; i += 2) {
            //chunkMono.writeInt16LE(chunk.readInt16LE(i * 2) / 2 + chunk.readInt16LE(i * 2 + 2) / 2, i);
            chunkMono.writeInt16LE(chunk.readInt16LE(i * 2), i);
        }
        callback(null, chunkMono);
    }
}

export class UserAudioParser {
    ontext: ((data:any)=>void) | null = null;
    audio: any;
    parsers: Array<any>;
    transform: ToMono;


    constructor(audio: any, ontext: ((data:any)=>void) | null) {
        if (ontext) {
            this.ontext = ontext;
        }
        this.audio = audio;
        this.parsers = models.map(model => {return new vosk.Recognizer({ model: model, sampleRate: 48000.0 })} );
        this.transform = new ToMono();
        this.audio.pipe(this.transform);
        this.transform.on('data', (chunk: Buffer)=> {
            this.parse(chunk);
        });
    }

    nth_ocurrence(str: string, needle: string, nth: number) {
        for (let i=str.length;i>0;i--) {
          if (str.charAt(i) == needle) {
              if (!--nth) {
                 return i;    
              }
          }
        }
        return false;
    }

    parse(chunk: Buffer) {
        let silence = 0;
        for (let i = chunk.length; i > 0 && silence < SILENCE_TRESH && !chunk[i]; --i) {
            ++silence;
        }
        this.parsers.forEach((rec) => {
            let done = rec.acceptWaveform(chunk);
            if (done || (silence == SILENCE_TRESH && chunk[0])) {
                let a = rec.finalResult();
                if (a.text && this.ontext) {
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