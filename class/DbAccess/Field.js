let Field = class {
    constructor(name, type, option) {
        this.name = name;
        this.type = type;
        this.isId = option && option.isId;
        this.isVirtual = option && option.isVirtual;
    }

    init(table) {
        this.table = table;
        if (this.postInit) {
            this.postInit(this);
        }
    }

    addString() {
        return this.name + ' ' + this.type;
    }
}

module.exports.Field = Field;