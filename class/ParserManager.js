const os = require('os');
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
            let proc = fork('./class/UserAudioParser');
            proc.on('error', (err) => {
                console.log(err);
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

    handleMessage(message) {
        if (message.type === "text") {
            this.ontext(message.text);
        }

    }

    add(con, id) {
        if (this.users.has(id)) {
            return;
        }
        let smallest = this.process.reduce((ret, val, key)=>{
            if (!ret) {
                return [val, key];
            }
            if (ret[0] > val) {
                return [val, key];
            }
        }, null);
        console.log(con);
        console.log(con.sockets.ws, con.sockets.idp)
        smallest[1].send({type:'add', audio:audio, user:id.user.id});
        this.process.set(smallest[1], smallest[0] + 1);
        this.users.set(id, smallest[1]);
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