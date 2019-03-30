const UserSchema = require('../schema/User');
module.exports = class ItemCategory {
    constructor(args={}, config={}) {
        this._collectionName = "users"

        this.collection = Db.collection(this._collectionName);
        this.collection.createIndex( { "email": 1 }, { unique: true } )
        this.schema = new UserSchema()
    }
}