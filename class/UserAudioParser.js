const { ParserManager } = require('./ParserManager');

module.exports.
UserAudioParser = class {
    constructor(audio, member) {
        ParserManager.add(member);
        this.audio = audio;
        this.member = member;
        this.parsing = true;

        this.audio.on('readable', (chunk)=> {
            ParserManager.parse(this.audio.read(), this.member);
        });
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