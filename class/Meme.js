const { db } = require('./db');
const { Field } = require('./Field');
const { Table, Row } = require('./Table');
const { ConnectionList } = require('./ConnectionList');

const Meme = class extends Row {
    constructor(table) {
        super(table);
    }

    async play(chanel) {
        if (Math.floor(Date.now() / 1000) - this.last_call >= 100) {
            console.log('Start playing ' + this.cmd);
            let played = await ConnectionList.getConnection(this.server).playSound(this.path, chanel);
            if (played) {
                this.last_call = Math.floor(Date.now() / 1000);
                this.number_played += 1;
                this.update();
            }
        }
    }
}

module.exports.MemeTable = new class extends Table {
    constructor() {
        super("MEME_SONG", new Map([
            ['id', new Field('ID', 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL')],
            ['path', new Field('PATH', 'TEXT NOT NULL')],
            ['cmd', new Field('CMD', 'TEXT NOT NULL')],
            ['server', new Field('SERVER', 'TEXT NOT NULL')],
            ['last_call', new Field('LAST_CALL', 'INTEGER')],
            ['number_played', new Field('NUMBER_PLAYED', 'INTEGER DEFAULT 0')],
        ]), Meme);
    }
}
