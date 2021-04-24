const { fork } = require('child_process');
const { Collection } = require('discord.js');

module.exports.ParserManager = new class {
    constructor() {
        this.users = new Collection();
        this.process = new Collection();
        this.addProcess();
    }

    addProcess() {
        console.log(this.process.size);
        if (this.process.size < 2) {
            let proc = fork('./class/Parser.js');
            proc.on('error', (err) => {
                console.log('err', err);
                process.exit(1);
            });
            proc.on('message', (message) => {
                if (message.type === 'ready') {
                    this.process.set(proc, 0);
                    this.addProcess();
                    return;
                }
                this.handleMessage(message);
            });
        }
    }

    parse(chunk, member) {
        let proc = this.users.get(member);
        if (!proc) {
            return;
        }
        proc.send({type:'parse', chunk:chunk, user:member.user.id});
    }

    handleMessage(message) {
        if (message.type === "text") {
            this.ontext(message.text, message.user, message.guild);
        }

    }

    add(member) {
        if (this.users.has(member)) {
            return;
        }
        let smallest = this.process.reduce((ret, val, key)=>{
            if (!ret) {
                return [val, key];
            }
            if (ret[0] > val) {
                return [val, key];
            }
            return ret;
        }, null);
        smallest[1].send({type:'add', user:member.user.id, guild:member.guild.id});
        this.process.set(smallest[1], this.process.get(smallest[1]) + 1);
        this.users.set(member, smallest[1]);
    }

    sweep(guild) {
        this.users.sweep((proc, k)=>{
            if (k.guild.id === guild.id) {
                this.remove(k);
                this.process.set(proc, this.process.get(proc) - 1);
                return true;
            }
            return false;
        });
    }

    remove(id) {
        let proc = this.users.get(id);
        if (!proc) {
            return;
        }
        proc.send({type:'remove', user:id.users.id});
        this.user.delete(id);
        this.process.set(proc, this.process.get(proc) - 1);
    }
}