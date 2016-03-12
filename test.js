// var request = require('request');
// var rhyme = process.argv[2];
// request('https://api.datamuse.com/words?rel_syn=' +rhyme, function (error, response, body) {
//   if (!error && response.statusCode == 200) {
//         console.log(JSON.parse(body));
//         return JSON.parse(body);
//       }
//   });
var request = require('request');
var syllable = require('syllable'); //Syllable count Use case: syllable(phrase)
var moby = require('moby'); //Thesaurus Use case: moby.search(word)

var word = process.argv[2];
var topic = process.argv[3];


function wordCorrelator(word, topic) {
  var synomomList = moby.search(topic);
  console.log(synomomList.length);
}

wordCorrelator(word, topic);
