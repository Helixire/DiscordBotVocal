const { Mixer } = require('audio-mixer');
const { ParserManager } = require('./ParserManager');

module.exports.
UserAudioParser = class {
    constructor(audio, member) {
        ParserManager.add(member);
        this.audio = audio;
        this.member = member;
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
            ParserManager.parse(chunk, this.member);
        })
        this.audio.pipe(this.discordInput);
    }

    setParsing(parse) {
        this.parsing = parse;
    }

    free() {
        console.log('free UserAudioParser');
        this.mixer.removeAllListeners();
        this.audio.unpipe(this.discordInput);
        ParserManager.remove(this.member);
        this.audio = null;
    }
}