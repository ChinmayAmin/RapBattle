var _topics = [
    "pleasure",
    "trump",
    "woman",
    "drake",
    "obama",
    "canteen",
    "food",
    "fettywap",
    "bieber",
    "phones",
    "iphone",
    "android",
    "dogs",
    "cats",
    "people",
    "trekkies",
    "old people",
    "free food",
    "knees weak",
    "paris",
    "soccer",
    "leafs",
    "raptors",
    "wedding",
    "marriage",
    "holiday",
    "stealing",
    "uber",
    "glasses",
    "drinks",
    "deadpool",
    "penguin",
    "fall",
    "winter",
    "spring",
    "summer",
    "clouds",
    "chair",
    "plane",
    "toilet",
    "grass",
    "air",
    "cereal",
    "car",
    "fish",
    "tv",
    "bears",
    "flowers",
    "birds",
    "book",
    "your crush",
    "book"
];

var async = require('async');
var request = require('request');

function lookupDefinition(word, cb) {
    request('http://api.wordnik.com/v4/word.json/' + word + '/definitions?limit=200&includeRelated=true&useCanonical=false&includeTags=false&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5', function(err,res,body){
        if (err) {
            cb(err);
        } else {
            var defs = JSON.parse(body).map(function(def){
                return def.text;
            });
            cb(null,{word : word, definitions : defs});
        }
    });
}

async.mapSeries(_topics, lookupDefinition, function(err,data){
    console.log(data.reduce(function(obj, item) {
        obj[item.word] = item.definitions;
        return obj;
    },{}));
});

