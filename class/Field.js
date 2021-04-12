module.exports.Field = class {
    constructor(name, type, option) {
        this.name = name;
        this.type = type;
        this.isId = option && option.isId;
    }

    addString() {
        return this.name + ' ' + this.type;
    }
}