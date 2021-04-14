const { ParserManager } = require('./ParserManager');

module.exports.Connection = class {
    constructor(guild) {
        this.guild = guild;
        this.con = null
        this.playing = false;
        this.listening = false;
    }

    clean() {
        this.listening = false;
        ParserManager.sweep(this.guild);
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
        // this.audio.forEach((a) => {
        //     a.setParsing(false);
        // })
        const dispatcher = this.con.play(path);
        dispatcher.on('finish', () => {
            console.log('Finished playing!');
            this.playing = false;
            // this.audio.forEach((a) => {
            //     a.setParsing(true);
            // })
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
        if (member.user.bot) {
            return;
        }
        ParserManager.add(this.con, member);
        console.log('hi ' + member.displayName);
    }

    removeAudioUser(member) {
        ParserManager.remove(member);
    }

    async startParser(channel) {
        if (!(await this.getCon(channel))) {
            return;
        }
        console.log('startParser')
        this.listening = true;
        for (let member of this.con.channel.members.values()) {
            this.addAudioUser(member);
        }
    }
}
