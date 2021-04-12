
const sqlite3 = require('sqlite3');
const config = require('../config.json');

let db = new sqlite3.Database(config.dbName);

db.runP = function (...param) {
    return new Promise((resolve, reject) => {
        db.run(...param, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

db.getP = function (...param) {
    return new Promise((resolve, reject) => {
        db.get(...param, function (err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.allP = function (...param) {
    return new Promise((resolve, reject) => {
        db.all(...param, function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports.db = db;