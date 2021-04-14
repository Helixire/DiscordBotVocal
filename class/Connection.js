const { UserAudioParser } = require('./UserAudioParser');
const { Collection } = require('discord.js');
const { Mixer } = require('audio-mixer');
const config = require('../config.json');
const vosk = require('vosk');

const models = config.models.map(path => new vosk.Model(path));


module.exports.Connection = class {
    constructor() {
        this.audio = new Collection();
        this.parsers = models.map(model => new vosk.Recognizer({ model: model, sampleRate: 48000.0 }));
        this.con = null
        this.onText = null;
        this.playing = false;
        this.listening = false;
        this.parsing = true;
        this.mixer = new Mixer({
            channels: 1,
            bitDepth: 16,
            sampleRate: 48000,
        });
        this.mixer.on('data', chunk=>this.parsepacket(chunk));
    }

    parsepacket(chunk) {
        if (!this.parsing) {
            return;
        }
        this.parsers.forEach((rec) =>{
            rec.acceptWaveform(chunk);
            // let a = rec.partialResult();
            // if (a.partial) {
            //     console.log(a);
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
                let a  = rec.finalResult();
                if (a.text) {
                    this.ontext(a);
                }
            });
        }
    }

    clean() {
        this.listening = false;
        this.audio.forEach((a) => {
            a.free();
        });
        this.audio.clear();
    }

    disconnect() {
        if (this.con) {
            this.clean();
            this.con.disconnect();
            this.con = null;
        }
    }

    async playSound(path, channel) {
        if (this.playing) {
            return false;
        }
        if (!(await this.getCon(channel))) {
            return false;
        }
        this.playing = true;
        this.parsing = false;
        const dispatcher = this.con.play(path);
        dispatcher.on('finish', () => {
            console.log('Finished playing!');
            this.playing = false;
            this.parsing = true;
            dispatcher.destroy();
            if (!this.listening) {
                this.disconnect();
            }
        });
        return true;
    }

    async getCon(channel) {
        if (!this.con) {
            if (!channel) {
                console.log('connard pas de con ni channel');
                return null;
            }
            this.clean();
            this.con = await channel.join();
        }
        if (channel && this.con.channel.id != channel.id) {
            this.clean();
            let n = await channel.join();
            console.log(this.con.id, n.id);
        }
        return this.con;
    }

    addAudioUser(member) {
        if (!this.listening || member.user.bot || this.audio.has(member.user.id)) {
            return;
        }
        let ret = new UserAudioParser(this.con.receiver.createStream(member, { mode: 'pcm', end: 'manual' }), this.mixer);
        console.log('hi ' + member.displayName);
        this.audio.set(member.user.id, ret);
    }

    removeAudioUser(member) {
        let audio = this.audio.get(member.user.id);

        if (audio) {
            audio.free();
            this.audio.delete(member.user.id);
            console.log('bye ' + member.displayName);
        }
    }

    async startParser(channel) {
        if (!(await this.getCon(channel))) {
            return;
        }
        if (this.audio.size) {
            return;
        }
        console.log('startParser')
        this.listening = true;
        for (let member of this.con.channel.members.values()) {
            this.addAudioUser(member);
        }
    }
}
