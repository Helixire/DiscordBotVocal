import { GuildMember, Snowflake, VoiceChannel, VoiceConnection } from 'discord.js';
import { UserAudioParser } from './UserAudioParser'

export class Connection {
    audio: Map<Snowflake, UserAudioParser> = new Map<Snowflake, UserAudioParser>();
    con: VoiceConnection | null = null;
    playing: boolean = false;
    listening: boolean = false;
    parsing: boolean = true;
    ontext: ((data:any)=>void) | null = null;

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

    async playSound(path: string, channel?: VoiceChannel) {
        if (this.playing || !this.con) {
            return false;
        }
        if (!(await this.getCon(channel))) {
            return false;
        }
        this.playing = true;
        this.parsing = false;
        const dispatcher = this.con.play(path);
        dispatcher.on('finish', () => {
            console.log('Finished playing !');
            this.playing = false;
            this.parsing = true;
            dispatcher.destroy();
            if (!this.listening) {
                this.disconnect();
            }
        });
        return true;
    }

    async getCon(channel?: VoiceChannel) {
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
        }
        return this.con;
    }

    addAudioUser(member: GuildMember) {
        if (!this.listening || member.user.bot || this.audio.has(member.user.id) || !this.con) {
            return;
        }
        let ret = new UserAudioParser(this.con.receiver.createStream(member, { mode: 'pcm', end: 'manual' }), this.ontext);
        console.log('hi ' + member.displayName);
        this.audio.set(member.user.id, ret);
    }

    removeAudioUser(member: GuildMember) {
        let audio = this.audio.get(member.user.id);

        if (audio) {
            audio.free();
            this.audio.delete(member.user.id);
            console.log('bye ' + member.displayName);
        }
    }

    async startParser(channel: VoiceChannel) {
        if (!(await this.getCon(channel)) || !this.con) {
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
