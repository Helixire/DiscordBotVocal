const { db } = require('./db');

const Row = class {
    constructor(table) {
        this.table = table;
    }

    update() {
        return this.table.update(this);
    }
}

module.exports.Row = Row;

module.exports.Table = class {
    constructor(name, fields, rowtype) {
        this.name = name;
        this.fields = fields;
        this.rowconstruct = rowtype || Row;
        this.init();
    }

    init() {
        let ret = [];
        for (let field of this.fields.values()) {
            ret.push(field.addString());
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
                if (rows.find((elem) => { return elem.name == field.name })) {
                    return;
                }
                db.run(`ALTER TABLE ${this.name} ADD ${field.addString()}`);
            });
        });
    }

    get(id) {
        return this.find({
            toString: () => { return "ID = ?" },
            param: [id]
        })
    }

    find(comparaisons) {
        return db.getP(`SELECT * FROM ${this.name}${(comparaisons) ? ` WHERE ${comparaisons.toString()}` : ''}`, (comparaisons.param) ? [...comparaisons.param] : [])
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
            (comparaisons && comparaisons.param) ? [...comparaisons.param] : [])
            .then(rows => {
                return rows.map(row=>this.parserow(row));
            });
    }

    update(row) {
        if (!row.id) {
            return this.insert(row);
        }

        let param = [];
        let fieldsParam = [];
        this.fields.forEach((v, k) => {
            if (k != 'id') {
                param.push(row[k]);
                fieldsParam.push(v.name + ' = ?');
            }
        });
        param.push(row.id);
        return db.runP(`UPDATE ${this.name} SET ${fieldsParam.join(', ')} WHERE ID = ?`, param); // TODO Gestion d'erreur
    }

    newRow() {
        return new this.rowconstruct(this);
    }

    parserow(row) {
        let ret = this.newRow();
        if (row) {
            this.fields.forEach((field, key) => {
                ret[key] = row[field.name];
            });
        }
        return ret;
    }

    insert(row) {
        let fieldsName = [];
        let param = [];
        this.fields.forEach((v, k) => {
            if (k != 'id') {
                param.push(row[k]);
                fieldsName.push(v.name);
            }
        });
        return db.runP(`INSERT INTO ${this.name} (${fieldsName.join(',')}) VALUES (${Array.from('?'.repeat(this.fields.size - 1)).join(',')})`, param).then(obj => {
            row.id = obj.lastID;
            console.log(row, obj);
        });
    }
}