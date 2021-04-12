module.exports.Field = class {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }

    addString() {
        return this.name + ' ' + this.type;
    }
}