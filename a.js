var APIKEY = 'a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5';
var request = require('request');
var async = require('async');
var word;


async.waterfall([
  function(cb) {
  request('http://api.wordnik.com:80/v4/words.json/randomWord?hasDictionaryDef=false&includePartOfSpeech=noun&minCorpusCount=0&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5', function (error, response, body) {
    if (!error && response.statusCode == 200) {
          word = (JSON.parse(body)).word;
          console.log('randomword', word);
          cb(null, word);
        }
        else {
          cb(null, 'wind');
        }
  })
},
function(word, cb){
  request('https://api.datamuse.com/words?rel_rhy=' +word, function (error, response, body) {
    if (!error && response.statusCode == 200) {
          console.log(JSON.parse(body)[0].word);
          cb(null, JSON.parse(body)[0]);
        }
        else {
          cb(null, 'wind');
        }
    });
}],function(err,data){
  console.log(err);
});
