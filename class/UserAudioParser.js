
module.exports.UserAudioParser = class {
    constructor(audio, mixer) {
        this.audio = audio;
        this.discordInput = mixer.input({
            channels: 2,
            bitDepth: 16,
            sampleRate: 48000,
        });
        this.audio.pipe(this.discordInput);
    }

    free() {
        console.log('free UserAudioParser');
        this.audio.unpipe(this.discordInput);
        this.audio = null;
    }
}