var syllable = require('syllable');
var syllableCount = 0;
var _ = require('lodash');
var arg = process.argv[2];

var wordList = arg.split(' ');
_.each( wordList, function(word){
  syllableCount += syllable(word);
})

console.log(syllableCount);
