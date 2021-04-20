const { Field } = require('./DbAccess/Field');
const { Link } = require('./DbAccess/Link');
const { Table } = require('./DbAccess/Table');
const { MemeTable } = require('./Meme');
const { Collection } = require('discord.js');

module.exports.TrigerTable = new class extends Table {
    constructor() {
        super("MEME_TRIGER", new Collection([
            ['triger', new Field('TRIGER', 'TEXT NOT NULL')],
            ['id_meme', Link.createManyToOne(MemeTable, {name:'ID_SONG', link_dest_name:'getTrigers', link_name:'getMeme'})]
        ]));
    }
}