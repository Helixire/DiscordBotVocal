const { Field } = require('./Field');

const Comparaison = class {
    constructor(val1, cmp, val2, param) {
        this.param = [];
        let param1 = this.stringParam(val1, param);
        this.string = (param1) ?  `${param1} ${cmp} ${this.stringParam(val2, param)}` : this.stringParam(val2, param);
    }

    stringParam(val, param) {
        if (!val) {
            return null;
        }
        if (val instanceof Comparaison) {
            this.param.push(...val.param);
            return (param && param.noPretensies) ? val.toString() : '(' + val.toString() + ')';
        }
        if (val instanceof Field) {
            return (param && param.noTable) ? val.name : `${val.table.name}.${val.name}`;
        }
        this.param.push(val);
        return '?';
    }

    toString() {
        return this.string;
    }

}

module.exports.Comparaison = Comparaison;