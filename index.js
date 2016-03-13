'use strict';

var request = require('request');
var syllable = require('syllable'); //Syllable count Use case: syllable(phrase)
var moby = require('moby'); //Thesaurus Use case: moby.search(word)
var _ = require('lodash');
var num2text = require('num2text');
var ddb = require('dynamodb').ddb({ accessKeyId: 'AKIAJAAV4J67C33OOHFA', secretAccessKey: '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'});
var async = require('async');

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

/**
 * When editing your questions pay attention to your punctuation. Make sure you use question marks or periods.
 * Make sure the first answer is the correct one. Set at least 4 answers, any extras will be shuffled in.
 *
 * Use Case -- Two player Haiku Battle
 *
 * User:  Alexa, open rap battle
 * Alexa: Welcome to Rap Battle! Your topic is SPRING.... Player one, get ready to give the first five syllable line of
 *        a Haiku about SPRING, three... two... one, you're on!
 * User:  Days melt fear away
 * Alexa: Very good, Player two, Get ready to give the second seven syllable line, three... two... one... you're up!
 * User:  Warm my insides and my mind
 * Alexa: Very good, Player one, Get ready to rhyme with the third five syllable line, three... two.. one... you're
 *        rhyming!
 * User:  Calm water feels kind
 * Alexa: Very good. Here is your Haiku: "Days melt fear away"... "Warm my insides and my mind"... "Calm water
 *        feels kind".
 *
 *
 * Use Case - Multi Users Haiku Battle
 *
 *
 * User:  Alexa, open rap battle
 * Alexa: Welcome to Rap Battle! How many players are there?
 * User:  Two
 * Alexa: Player 1, what is your name?
 * User:  Josh
 * Alexa: Welcome Josh, you have not played before. Player 2, what is your name?
 * User:  Samuel
 * Alexa: Welcome Samuel, you ranking is MASTER RAPPER. The top is SPRING... Josh, get ready to give your first..... etc.
 *
 * Scoring: 1 point for correct syllables, 2 points for correct syllables and rhyming.
 */
exports.handler = function (event, context) {
    try {
        // console.log("event.session.application.applicationId=" + event.session.application.applicationId);
        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

//     if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.05aecccb3-1461-48fb-a008-822ddrt6b516") {
//         context.fail("Invalid Application ID");
//      }

        if (event.session.new) {
            initSession(event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e + ", Stack " + e.stack);
    }
};

/**
 * Called when the session starts.
 */
function initSession(session) {
    if (!session.attributes) {
        session.attributes = {};
    }
    session.attributes.playerCount = 0;
    session.attributes.players = [];
    session.attributes.currentLine = 0;
    session.attributes.retries = 0;
    session.attributes.rapTopic = null;
    console.log("RAP TOPIC2 is " + session.attributes.rapTopic);
    session.attributes.score = 0;
    session.attributes.userHaiku = [];
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);
    initSession(session);
    getWelcomeResponse(session, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {


    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    console.log("onIntent "+intentName+", rapLine "+getRapLine(intent)+" requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    // dispatch custom intents to handlers here
    if (isStartOverIntent(intent)) {
        console.log("StartOverIntent");
        initSession(session);
        getWelcomeResponse(session, callback);
    }
    else if (isInspireMeIntent(session, intent)) {
        console.log("InspireMeIntent");
        retrieveHaiku(session, callback);
    }
    else if (getPlayerNumberIntent(session, intent)) {
        console.log("PlayerNumberIntent");
        handlePlayerCountRequest(getPlayerNumberIntent(session, intent), session, callback);
    }
    else if (getPlayerNameIntent(session, intent)) {
        console.log("PlayerNameIntent");
        handlePlayerNameRequest(getPlayerNameIntent(session, intent), session, callback);
    }
    else {
        console.log("AnswerRequest");
        handleAnswerRequest(intent, session, callback);
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

// ------- Skill specific business logic -------

function generateTopic() {
    var randomIndex = Math.floor(Math.random() * _topics.length) + 0;
    return _topics[randomIndex];
}

var CARD_TITLE = "Haiku Battle"; // Be sure to change this for your skill.

function getWelcomeResponse(session, callback) {
    if (!parseInt(session.attributes.playerCount)) {
        generatePlayerCountMessage(false, session, callback);
    }
    else if (parseInt(session.attributes.playerCount) > 0
        && session.attributes.players.length < parseInt(session.attributes.playerCount)) {
        generateNextPlayerMessage(false, session, callback)
    }
    else {
        generateTopicMessage(false, session, callback)
    }
}

function calculateRapScore(haiku, cb) {
    request.post({
        url: 'http://ec2-52-91-212-182.compute-1.amazonaws.com:80',
        json: {
            line: haiku
        }
    }, function(err, res, body) {
        if (err) {
            cb(null,0);
        } else {
            var score  =  _.sum(_.flatten(_.flatten(body.data))) / body.data.length / body.data.length;
            cb(null, score);
        }
    });
}

function retrieveHaiku(session, callback) {
    async.waterfall([
        function(cb){
            ddb.getItem('Haiku', 0, null, {}, function(err, res, cap) {
                cb(err,res);
            });
        },
        function(item, cb){
            var rand_id = Math.floor(Math.random() * (item.lastID - 1)) + 1;
            ddb.getItem('Haiku', rand_id, null, {}, function(err, res, cap) {
                cb(err,res);
            })
        }
    ],function(err, data){
        if (err) {
            callback(session, buildSpeechletResponse(CARD_TITLE, 'You are on your own', '', true));
        } else {
            callback(session, buildSpeechletResponse(CARD_TITLE, data.haiku, data.haiku, true));
        }
    });
}

function handlePlayerCountRequest(count, session, callback) {
    var speechOutput;
    session.attributes.playerCount = count;
    if (session.attributes.playerCount > 10) {
        speechOutput = "This is a big party, only the 10 best rappers can play. How many players are there?";
    }
    else if (session.attributes.playerCount <= 0) {
        speechOutput = "Sounds like no one wants to play! How many players are there?";
    }
    else {
        if (session.attributes.players.length == session.attributes.playerCount) {
            generateTopicMessage(false ,session, callback);
        }
        else {
            generateNextPlayerMessage(false, session, callback);
        }
    }
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}

function handlePlayerNameRequest(name, session, callback) {
    // Do we know how many players there are?
    // Do we already have enough players?
    // Response is always going to be be "Welcome XXXX, you are a new player", or "Welcome XXX, your ranking is XXXX"

    // If we already have enough players, we are going to increase the number of players and add them to the end.
    session.attributes.players = session.attributes.players ? session.attributes.players : [];
    if (session.attributes.playerCount && session.attributes.players.length >= getPlayerCount(session)) {
        session.attributes.playerCount = session.attributes.players.length + 1;
    }
    var user = getUserObject(session, name);
    user.timesPlayed += 1;
    session.attributes.players.push(user);

    if(!session.attributes.playerCount) {
        generatePlayerCountMessage(true, session, callback);
    } else if (session.attributes.players.length < getPlayerCount(session)) {
        generateNextPlayerMessage(true, session, callback);
    } else {
        generateTopicMessage(true, session, callback);
    }
}

function generatePlayerCountMessage(greetPlayer, session, callback) {
    var speechOutput;
    if (greetPlayer){
        var players = session.attributes.players;
        if (players.length) {
            var previousPlayer = players[players.length - 1];
            speechOutput = "Welcome " + previousPlayer.name + ". ";
        }
    }
    else {
        speechOutput = 'Welcome to Haiku Battle! ';
    }
    if (session.attributes.players.length) {
        var plural = session.attributes.players.length ? 'player' : 'players';
        speechOutput += '<break time="1s">' + session.attributes.players.length + ' '+plural+'  gave their name so far.<break time="1s">';
    }
    speechOutput += "How many players are there?";
    session.attributes.speechOutput = speechOutput;
    session.attributes.repromptText = speechOutput;
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}

function generateTopicMessage(greetPlayer, session, callback) {
    var speechOutput = "";
    if (greetPlayer) {
        var players = session.attributes.players;
        var previousPlayer = players[players.length - 1];
        speechOutput += "Welcome " + previousPlayer.name + ". ";
    }
    session.attributes.rapTopic = generateTopic();
    console.log("RAP TOPIC is " + session.attributes.rapTopic);
    session.attributes.currentLine = 1;
    var user = getPlayerWithLine(session, 1);
    speechOutput += 'Your topic is <break time=".5s"/>' + session.attributes.rapTopic + '. '+user.name+ ' get ready to give the ' +
            'first five beat line of a Haiku about <break time=".25s"/>' + session.attributes.rapTopic
            + '. Three <break time=".5s"/> two <break time=".5s"/> one, you\'re on!';
    var repromptText = "The topic is " + session.attributes.rapTopic;

    session.attributes.speechOutput = speechOutput;
    session.attributes.repromptText = repromptText;
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, false));
}

function generateNextPlayerMessage(greetPlayer, session, callback) {
    var players = session.attributes.players;
    var speechOutput = "";
    if (greetPlayer) {
        var previousPlayer = players[players.length-1];
        speechOutput += "Welcome " + previousPlayer.name + ". ";
    }
    speechOutput += "Player " + (players.length + 1) + " , what is your name?";
    session.attributes.speechOutput = speechOutput;
    session.attributes.repromptText = speechOutput;
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}

function getRankingDescription(player) {
    if (player.score < 5) {
        return "bug";
    }
    else if (player.score < 10) {
        return "dog"
    }
    else if (player.score < 20) {
        return "wolf"
    }
    else if (player.score < 40) {
        return "human"
    }
    else if (player.score < 80) {
        return "computer"
    }
    else {
        return "alien"
    }
}

function handleAnswerRequest(intent, session, callback) {
    if (!session.attributes || !session.attributes.currentLine) {
        console.log("Game not in progress");
        getWelcomeResponse(session, callback)
    }
    else {
        // Do we need to ryhme?
        // What do we need to rhyme with?
        // How many beats do we need for the line?
        // What's the score?
        // Are we done the rap?
        var targetBeats;
        var successOutput;
        if (session.attributes.currentLine == 1) {
            targetBeats = 5;
            var user = getPlayerWithLine(session, 2);
            successOutput = 'Right on! ' + user.name + ' get ready to give the next seven beat line, ' + '<break time="0.5s"/> Three <break time="0.5s"/> two <break time="0.5s"/> one, you\'re up!'
        } else if (session.attributes.currentLine == 2) {
            targetBeats = 7;
            var user = getPlayerWithLine(session, 3);
            successOutput = 'Very good. '+user.name+ ' get ready to rhyme with the next five beat line, ' + '<break time="0.5s"/> Three <break time="0.5s"/> two <break time="0.5s"/> one, you\'re rhyming!'
        }
        else if (session.attributes.currentLine == 3) {
            targetBeats = 5;
        }
        var rapLine = getRapLine(intent);
        if (countSyllables(rapLine) != targetBeats) {
            if (session.attributes.retries == 0) {
                session.attributes.retries = 1;
                tryAgainWrongBeats(targetBeats, countSyllables(rapLine), session, callback);
            }
            else {
                var speechOutput = "You used <break time='0.5s'/>"+countSyllables(rapLine)+"<break time='0.5s'/> beats. <break time='1s'/> You need more practice.";
                callback(session.attributes, buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, true));
            }
            return;
        }
        session.attributes.userHaiku.push(rapLine);
        session.attributes.score += 1;
        var repromptText = "Rap topic is " + session.attributes.rapTopic;

        if (session.attributes.currentLine == 3) {
            successOutput = 'Here is your haiku. <break time="1s"/>';
            _.each(session.attributes.userHaiku, function(result) {
                successOutput += iterateLine(result) + '<break time="1s"/>';
            });
            checkRhyme(session.attributes.userHaiku[1], rapLine, function(success) {
                var speechOutput;
                if (success) {
                    session.attributes.score += 1;
                    speechOutput = 'Very good!' + successOutput + '. Your combined score is: ' + session.attributes.score + '!';
                }
                else {
                    speechOutput = 'Missed the rhyme, try it next time! ' + successOutput + '. Your combined score is: ' + session.attributes.score + '!';
                }
                session.attributes.speechOutput = speechOutput;
                session.attributes.repromptText = repromptText;
                session.attributes.currentLine++;
                session.attributes.retries = 0;
                return callback(session.attributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, true));
            });
        }
        else {
            session.attributes.speechOutput = successOutput;
            session.attributes.repromptText = repromptText;
            session.attributes.currentLine++;
            session.attributes.retries = 0;
            callback(session.attributes, buildSpeechletResponse(CARD_TITLE, successOutput, repromptText, false));
        }
    }
}

function tryAgainWrongBeats(targetBeats, actualBeats, session, callback) {
    var speechOutput = getRandomNegativeDescription() + '. You needed ' + targetBeats + ' beats but you said ' + actualBeats;
    var reprompt = 'The topic is ' + session.attributes.rapTopic;
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
}

function getRandomNegativeDescription() {
    var descriptions = ['That was foo foo gazy', 'You must be tweaking', 'That was huff'];
    var randomIndex = Math.floor(Math.random() * descriptions.length) + 0;
    return descriptions[randomIndex];
}

/**
 * @param scoreCallback function(err, score)
 */
function checkScore(session, scoreCallback) {
        async.waterfall([
            function(cb){
                calculateRapScore(session.attributes.userHaiku,cb),
                function(score, cb) {
                    ddb.getItem('Haiku', 0, null, {}, function(err, res, cap) {
                        cb(err,res,score);
                    });
                },
                function(item, score){
                    var storeItem = {
                        id: item.lastID,
                        haiku: session.attributes.userHaiku.join(','),
                        score: score || 0
                    };
                    ddb.putItem('Haiku',storeItem, {}, function(err, res, cap) {
                        cb(err, score);
                    });
                }
            }
        ], scoreCallback);
}

/**
 * @param rhymeCallback function(success/Boolean)
 */
function checkRhyme(targetLine, currentLine, rhymeCallback) {
    var target = getLast(targetLine);
    var check = getLast(currentLine);
    rhymeLookup(target, function (result) {
        for (var i = 0; i < result.length; i++) {
            if (result[i].word == check) {
                rhymeCallback(true);
                return;
            }
        }
        rhymeCallback(false)
    });
}

function getLast(wordString) {
    var words = wordString.split(' ');
    for( var i = words.length - 1; i >= 0; i--) {
        if (!_.isEmpty(words[i])) {
            return words[i];
        }
    }
    return '';
}

function getFirst(wordString) {
    var words = wordString.split(' ');
    for( var i = 0; i < words.length; i++) {
        if (!_.isEmpty(words[i])) {
            return words[i];
        }
    }
    return '';
}


//function handleGetHelpRequest(intent, session, callback) {
//    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
//    // if there is one in progress, or provide the option to start another one.
//
//    // Set a flag to track that we're in the Help state.
//    session.attributes.userPromptedToContinue = true;
//
//    // Do not edit the help dialogue. This has been created by the Alexa team to demonstrate best practices.
//
//    var speechOutput = "I will give you a random topic, try your best to rap about it. I'll drop the beat for you.",
//        repromptText = "To respond, start by saying a sentence about the topic. "
//        + "Would you like to keep playing?";
//        var shouldEndSession = false;
//    callback(session.attributes,
//        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
//}
//
//function handleFinishSessionRequest(intent, session, callback) {
//    // End the session with a "Good bye!" if the user wants to quit the game
//    callback(session.attributes,
//        buildSpeechletResponseWithoutCard("Good bye!", "", true));
//}

function countSyllables(line) {
  var syllableCount = 0;
  var wordList = line.split(' ');
  _.each(wordList, function(word){
    syllableCount += syllable(word);
  })
  return syllableCount;
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: '<speak>' + output + '</speak>'
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "SSML",
                ssml: '<speak>' + repromptText + '</speak>'
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

/**
 * @param callback Called with [{"word":"address","score":1398,"numSyllables":2},...]
 */
function rhymeLookup(rhyme, callback) {
  //This function takes in an word input and returns a JSON of words that rhyme with the input word
  //Params of JSON include word, number of variables, and how closely the word rhymes with input word
  request('https://api.datamuse.com/words?rel_rhy=' +rhyme, function (error, response, body) {
    if (!error && response.statusCode == 200) {
          callback(JSON.parse(body));
        }
    });
}

/**
 * @return string of words, like "the rain in spain is fain"
 */
function getRapLine(intent) {
    var wordList = getTextInput(intent).split(' ');
    var literalWord = '';
    _.each(wordList, function(word){
      if(parseInt(word)){
        literalWord += num2text.translate(parseInt(word)) + ' ';
      } else {
        literalWord += word + ' ';
      }
    });

    return literalWord;
}

function getTextInput(intent) {
    if(!intent.slots) {
        return "";
    }
    if(intent.slots.FiveSyllableLine && intent.slots.FiveSyllableLine.value) {
        return intent.slots.FiveSyllableLine.value;
    } else if(intent.slots.SevenSyllableLine && intent.slots.SevenSyllableLine.value) {
        return intent.slots.SevenSyllableLine.value;
    }
    return "";
}

function iterateLine(rapLine) {
    return rapLine.replace(/\s/g, '<break time="0.35s"/>');
}

/**
 * @return Known players for the given sessionId.
 *         [
 *          "John: {
 *              name: "John",
 *              allTimeScore: 10
 *          }
 *         ]
 *         Uses database to get them.
 */
function getKnownPlayers(session) {
    return {};
}

function getUserObject(session, name) {
    var players = getKnownPlayers(session);
    var player = players[name];
    if (player) {
        return player;
    }
    if (session.attributes && session.attributes.players) {
        for (var i = 0; i < session.attributes.players.length; i++) {
            if (session.attributes.players[i].name == name) {
                return session.attributes.players[i];
            }
        }
    }
    return {
        name: name,
        allTimeScore: 0,
        timesPlayed: 0
    }
}

function getPlayerCount(session) {
    return parseInt(session.attributes.playerCount);
}

/**
 * @returns User who's turn it is.
 */
function getPlayerWithLine(session, line) {
    return session.attributes.players[(line-1) % session.attributes.players.length];
}

/**
 * @return true the intent should be interpreted as a PlayerNameIntent, false if it should not be.
 */
function isStartOverIntent(intent) {
    var text = getTextInput(intent);
    var startOvers = ['start', 'start game', 'new game', 'start', 'start new game', 'start over' ];
    return startOvers.indexOf(text) != -1;
}

function isInspireMeIntent(session, intent) {
    if (parseInt(session.attributes.currentLine) > 0) {
        return false;
    }
    var text = getTextInput(intent);
    return text == "inspire me";
}


/**
 * @return Number count if the intent should be interpreted as a PlayerNumberIntent, null if it should not be.
 */
function getPlayerNumberIntent(session, intent) {
    if (session.attributes.playerCount || isStartOverIntent(intent)) {
        return null;
    }
    var text = getTextInput(intent);
    var words = text.split(' ');
    if (words.length == 1 && !isNaN(parseInt(words[0]))) {
        return parseInt(words[0]);
    }
    return 0;
}

/**
 * @return Name if the intent should be interpreted as a PlayerNameIntent, null if it should not be.
 */
function getPlayerNameIntent(session, intent) {
    if ((parseInt(session.attributes.playerCount) > 0
         && session.attributes.players.length >= parseInt(session.attributes.playerCount))
        || isStartOverIntent(intent)
        || getPlayerNumberIntent(session, intent)) {
        console.log("IS_PLAYER_NAME2 session.attributes.players.length "+session.attributes.players.length + "parseInt(session.attributes.playerCount)" + parseInt(session.attributes.playerCount)+ "isStartOverIntent(intent)" + isStartOverIntent(intent) + "getPlayerNumberIntent(session, intent)" + getPlayerNumberIntent(session, intent));
        return null;
    }
    console.log("IS_PLAYER_NAME1");
    var text = getTextInput(intent);
    if (text.indexOf("my name is") == 0) {
        console.log("IS_PLAYER_NAME2.1" + text);
        text = text.substr("my name is".length);
    }
    else if (text.indexOf("is my name") != -1 && text.indexOf("is my name") == (text.length - "is my name".length)) {
        console.log("IS_PLAYER_NAME3" + text);
        text = text.substr(0, text.length - "is my name".length);
    }
    console.log("IS_PLAYER_NAME4" + text);
    var exists = getFirst(text)
    if (exists) {
        console.log("IS_PLAYER_NAME5" + exists);
        return text;
    }
    console.log("IS_PLAYER_NAME6" + exists);
    return null;
}


