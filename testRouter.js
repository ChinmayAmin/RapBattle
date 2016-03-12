var _ = require('lodash');
var lambda_handler = require('./index.js').handler;

var args = [];

_.each(process.argv, function(val, index) {
    if (index > 1) {
        args.push(val);
    }
});

try{
    lambda_handler(JSON.parse(args[0]), JSON.parse(args[1]),true);
} catch (e) {
    console.log(e.stack);
}
