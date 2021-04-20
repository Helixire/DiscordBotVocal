const { db } = require('./db');
const { Comparaison } = require('./Comparaison');
const { Field } = require('./Field');
const { Collection } = require('discord.js');

const Row = class {
    constructor(table) {
        this.table = table;
        this.modified = new Collection();
        this.table.fields.forEach((field, key) => {
            if (key == 'id') {
                return;
            }
            Object.defineProperty(this, key, {
                get : function () {return this['_' + field.name];},
                set : function (value) {
                    if (this['_' + field.name] != value) {
                        this.modified.set(key, true);
                        this['_' + field.name] = value;
                    }
                }
              });
        });
        Object.defineProperty(this, 'id', {
            get : function () {return this['_id'];},
            set : function (v) {console.trace("NO don't change id directly");}
        });

        this.table.links.forEach((link) => {
            this[link.name] = ()=>{
                return link.getter(this);
            }
        })
    }

    save() {
        return this.table.save(this);
    }

    delete() {
        return this.table.delete(this.id);
    }
}

module.exports.Row = Row;

module.exports.Table = class {
    constructor(name, fields, rowtype) {
        this.name = name;
        this.links = [];
        this.fields = fields;
        this.fields.set('id', new Field('ID', 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL', {isId:true}));
        this.fields.forEach(field=>field.init(this));
        this.rowconstruct = rowtype || Row;
        this.init();
    }

    init() {
        let ret = [];
        for (let field of this.fields.values()) {
            if (!field.isVirtual) {
                ret.push(field.addString());
            }
        }
        db.run(
            `
            CREATE TABLE IF NOT EXISTS MEME_TRIGER (
                ${ret.join(',')
            }
                )
            `
        );

        db.all('PRAGMA table_info(' + this.name + ')', (err, rows) => {
            if (err) {
                console.log('error finding column');
            }
            this.fields.forEach((field) => {
                if (field.isVirtual || rows.find((elem) => { return elem.name == field.name })) {
                    return;
                }
                db.run(`ALTER TABLE ${this.name} ADD ${field.addString()}`);
            });
        });
    }

    get(id) {
        return this.find(new Comparaison(this.fields.get('id'), '=', id));
    }

    find(comparaisons) {
        return db.getP(`SELECT * FROM ${this.name}${(comparaisons) ? ` WHERE ${comparaisons.toString()}` : ''}`, comparaisons && comparaisons.param || [])
            .then(row => {
                return this.parserow(row);
            });
    }

    findAll(comparaisons, limit, offset) {
        return db.allP(`
        SELECT *
        FROM ${this.name}
        ${(comparaisons) ? ` WHERE ${comparaisons.toString()}` : ''}
        ${(limit) ? ` LIMIT ${limit}
        ${(offset) ? ` OFFSET ${offset}` : ''}` : ''}`,
            comparaisons && comparaisons.param || [])
            .then(rows => {
                return rows.map(row=>this.parserow(row));
            });
    }

    save(row) {
        if (!row.id) {
            return this.insert(row);
        }

        let cmp = new Comparaison();
        this.fields.forEach((v, k) => {
            if (row.modified.get(k)) {
                cmp = new Comparaison(cmp, ',', new Comparaison(v, '=', row[k], {noTable:true}), {noPretensies:true});
            }
        });
        if (!cmp.toString()) {
            return Promise.resolve(row);
        }
        return db.runP(`UPDATE ${this.name} SET ${cmp.toString()} WHERE ID = ?`, [...cmp.param, row.id]).then(()=>{
            row.modified.clear();
            return row;
        }); // TODO Gestion d'erreur
    }

    newRow() {
        return new this.rowconstruct(this);
    }

    parserow(row) {
        let ret = this.newRow();
        if (row) {
            this.fields.forEach((field, key) => {
                if (key == 'id') {
                    ret._id = row[field.name];
                    return;
                }
                ret[key] = row[field.name];
            });
        }
        return ret;
    }

    count(comparaison) {
        return db.getP(`
        SELECT count(*) AS c
        FROM ${this.name}
        ${(comparaison) ? ` WHERE ${comparaison.toString()}` : ''}
        `, comparaison && comparaison.param || []).then((row)=>{return row.c});
    }

    delete(id) {
        return db.runP(`DELETE FROM ${this.name} WHERE ID = ?`, [id]);
    }

    insert(row) {
        let fieldsName = [];
        let param = [];
        this.fields.forEach((v, k) => {
            if (k != 'id' && !v.isVirtual) {
                param.push(row[k]);
                fieldsName.push(v.name);
            }
        });
        return db.runP(`INSERT INTO ${this.name} (${fieldsName.join(',')}) VALUES (${Array.from('?'.repeat(this.fields.size - 1)).join(',')})`, param).then(obj => {
            row._id = obj.lastID;
        });
    }
}