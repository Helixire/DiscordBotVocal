const { UserAudioParser } = require('./UserAudioParser');

module.exports.Connection = class {
    constructor() {
        this.channel = null;
        this.audio = []
        this.con = null
    }

    clean() {
        console.log('free Connection');
        this.audio.forEach((audio)=> {
            audio.free();
        });
        this.channel = null;
        this.con.disconnect();
        this.con = null;
    }

    listening() {
        return this.audio.length
    }

    async getCon(channel) {
        if (this.channel && channel.id != this.channel.id) {
            this.clean();
        }
        if (!this.con) {
            this.channel = channel
            this.con = await channel.join();
        }
        return this.con;
    }

    async startParser(channel) {
        var chan = channel || this.channel;
        if (!chan) {
            console.log('trou duc j\'ai pas de channel')
        }
        await this.getCon(chan);
        this.audio = this.channel.members.map((user, id) => {
            if (user.user.bot) {
                return;
            }
            return new UserAudioParser(this.con, user);
        })
    }
}
