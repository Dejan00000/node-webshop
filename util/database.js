/////////////////
// Not used!!!!!!
/////////////////


const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;


const mongoConnect = (callback) => {
    MongoClient.connect(
        'mongodb+srv://dejan:dejansapic123@cluster0.trlcs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority')
        .then(client => {
            console.log('Connected');
            _db = client.db()
            callback();
        })
        .catch(err => {
            console.log(err);
            throw err;
        });
};

const getDb = () => {
    if (_db) return _db;
    throw "No database found";
}

exports.mongoConnect = mongoConnect;
exports.getDb = getDb