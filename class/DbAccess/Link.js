const { Comparaison } = require("./Comparaison");
const { Field } = require("./Field");

module.exports.Link = class {   
    static createManyToOne(dst, option) {
        let ret = new Field((option && option.name) || 'ID_' + dst.name, 'INTEGER NOT NULL');
        ret.dst = dst;
        ret.postInit = (field) => {
            dst.links.push({
                name:(option && option.link_dest_name) || 'get' + field.table.name,
                getter: (row) => {
                    return field.table.findAll(new Comparaison(field, '=', row.id));
                }
            })
            
            field.table.links.push({
                name: (option && option.link_name) || 'get' + dst.name,
                getter: (row) => {
                    return dst.get(row['_'+field.name]);
                }
            });
        }
        return ret;
    }
}