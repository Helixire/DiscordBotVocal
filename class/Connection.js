const { UserAudioParser } = require('./UserAudioParser');

module.exports.Connection = class {
    constructor() {
        this.audio = new Map();
        this.con = null
        this.onText = null;
        this.playing = false;
        this.listening = false;
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

    ontext(funct) {
        this.audio.forEach((audio) => {
            audio.on('text', funct);
        })
        this.onText = funct;
    }

    async playSound(path, channel) {
        if (this.playing) {
            return false;
        }
        if (!(await this.getCon(channel))) {
            return false;
        }
        this.playing = true;
        this.audio.forEach((a) => {
            a.setParsing(false);
        })
        const dispatcher = this.con.play(path);
        dispatcher.on('finish', () => {
            console.log('Finished playing!');
            this.playing = false;
            this.audio.forEach((a) => {
                a.setParsing(true);
            })
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
        let ret = new UserAudioParser(this, member);
        if (this.onText) {
            ret.on('text', this.onText);
        }
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
