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
            onSessionStarted({requestId: event.request.requestId}, event.session);
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
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    if (!session.attributes) {
        session.attributes = {};
    }
    session.attributes.playerCount = 0;
    session.attributes.players = [];
    session.attributes.currentLine = 0;
    session.attributes.rapTopic = null;
    session.attributes.score = 0;
    session.attributes.userHaiku = [];
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(session, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {


    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    console.log("onIntent "+intentName+", requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest(intent, session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(intent, session, callback);
        }
    }

    // dispatch custom intents to handlers here
    if ("RapLine" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("PlayerNameIntent" === intentName) {
        handlePlayerNameRequest(intent, session, callback);
    } else if("PlayerNumberIntent" === intentName) {
        handlePlayerCountRequest(intent, session, callback);
    } else if ("InspireIntent" === intentName) {
        retrieveHaiku(session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent " + intentName;
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

var CARD_TITLE = "Rap Battle"; // Be sure to change this for your skill.

function getWelcomeResponse(session, callback) {
    // Clear players.
    session.attributes.players = [];
    generatePlayerCountMessage(false, session, callback);
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
            callback(session, buildSpeechletResponse(CARD_TITLE, 'Something went wrong', '', true));
        } else {
            callback(session, buildSpeechletResponse(CARD_TITLE, data.haiku, 'Do you want to hear another one?', false));
        }
    });
}

function handlePlayerCountRequest(intent, session, callback) {
    var speechOutput;
    if (!isValidNumber(intent)) {
        speechOutput = "You don't know what a number is? You are funny! How many players are there?";
    } else {
        session.attributes.playerCount = parseInt(intent.slots.Count.value);
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
    }
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
}

function handlePlayerNameRequest(intent, session, callback) {
    // Do we know how many players there are?
    // Do we already have enough players?
    // Response is always going to be be "Welcome XXXX, you are a new player", or "Welcome XXX, your ranking is XXXX"

    if (!isValidName(intent)) {
        //Award points based on what the user said here
        var reprompt = session.attributes.speechOutput;
        var speechOutput = "Your name is not from Planet Earth.";
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
    } else {
        // If we already have enough players, we are going to increase the number of players and add them to the end.
        session.attributes.players = session.attributes.players ? session.attributes.players : [];
        if (session.attributes.playerCount && session.attributes.players.length >= getPlayerCount(session)) {
            session.attributes.playerCount = session.attributes.players.length + 1;
        }
        var user = getUserObject(session, intent.slots.Name.value);
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
}

function generatePlayerCountMessage(greetPlayer, session, callback) {
    var speechOutput;
    if (greetPlayer){
        var players = session.attributes.players;
        var previousPlayer = players[players.length - 1];
        var welcomeMessage;
        if (previousPlayer.timesPlayed > 1) {
            welcomeMessage = "your ranking is " + getRankingDescription(previousPlayer);
        } else {
            welcomeMessage = "you have not played before";
        }
        speechOutput = "Welcome " + previousPlayer.name + ", " + welcomeMessage + ". ";
    }
    else {
        speechOutput = 'Welcome to Rap Battle! ';
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
        var welcomeMessage;
        if (previousPlayer.timesPlayed > 1) {
            welcomeMessage = "your ranking is " + getRankingDescription(previousPlayer);
        } else {
            welcomeMessage = "you have not played before";
        }
        speechOutput = "Welcome " + previousPlayer.name + ", " + welcomeMessage + ". ";
    }
    var rapTopic = generateTopic();

    session.attributes.currentLine = 1;
    var user = getPlayerWithTurn(session);
    speechOutput += 'Your topic is ' + rapTopic + '. '+user.name+ ' get ready to give the ' +
            'first five syllable line of a Haiku about ' + rapTopic
            + '. Three <break time=".5s"/> two <break time=".5s"/> one, you\'re on!';
    var repromptText = "The topic is " + rapTopic;

    session.attributes.speechOutput = speechOutput;
    session.attributes.repromptText = repromptText;
    callback(session.attributes,
        buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, false));
}

function generateNextPlayerMessage(greetPlayer, session, callback) {
    var players = session.attributes.players;
    var speechOutput = "";
    if (greetPlayer) {
        var welcomeMessage;
        var previousPlayer = players[players.length-1];
        if (previousPlayer.timesPlayed > 1) {
            welcomeMessage = "your ranking is " + getRankingDescription(previousPlayer);
        }
        else {
            welcomeMessage = "you have not played before";
        }
        speechOutput += "Welcome " + previousPlayer.name + ", " +welcomeMessage + ". ";
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
    var speechOutput = "";
    var sessionAttributes = {};
    var gameInProgress = session.attributes && session.attributes.rapTopic;
    var answerSlotValid = isValidRap(session, intent);
    var userGaveUp = intent.name === "DontKnowIntent";
    var score;
    if (!gameInProgress) {
        // If the user responded with an answer but there is no game in progress, ask the user
        // if they want to start a new game. Set a flag to track that we've prompted the user.
        sessionAttributes.userPromptedToContinue = true;
        speechOutput = "There is no game in progress. Do you want to start a new game? ";
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
    } else if (!answerSlotValid && !userGaveUp) {
	      //Award points based on what the user said here
        speechOutput = 'That is not how a haiku works. Your line needs to have 5 syllables but it has ' + countSyllables(getRapLine(intent)) + ' syllables.';
        if(session.attributes.currentLine == 1) {
          speechOutput = 'That is not how a haiku works. Your line needs to have 7 syllables but it has ' + countSyllables(getRapLine(intent)) + ' syllables.';

        }
        var reprompt = 'The topic is ' + session.attributes.rapTopic;
        callback(session.attributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, reprompt, false));
    } else {
        // They have given us a rap line, and we need to know what line we are on.
        var rapLine = getRapLine(intent),
            successResult = '',
            endSession = false;
        session.attributes.userHaiku.push(rapLine);
        session.attributes.currentLine++;
        successResult = getTextForNextLine(session.attributes);
        //'Very good. Here is your Haiku: <break time="0.5s"/>' + iterateLine(getRapLine(intent));
        var repromptText = "Rap topic is " + session.attributes.rapTopic;
        speechOutput += userGaveUp ? "Go home Son" : successResult;

        if(session.attributes.currentLine >= 3) {
            speechOutput += 'Very good. Here is your haiku, ';
            _.each(session.attributes.userHaiku, function(result) {
                speechOutput += result + '<break time="0.25s"/>';
            });
            endSession = true;
        }

        sessionAttributes = {
            "rapTopic": session.attributes.rapTopic,
            "speechOutput": speechOutput,
            "repromptText": repromptText,
            "currentLine": session.attributes.currentLine,
            "userHaiku": session.attributes.userHaiku
        };

        if (endSession) {
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
                    };
                }
            ], function(err, score){
                if (score) {
                    sessionAttributes.score = score;
                    speechOutput += 'Your score is: ' + score + '!';
                }
                callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, endSession));
            });
        } else {
            callback(sessionAttributes, buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, endSession));
        }
    }
}

function getTextForNextLine(sessionAttributes) {
    var result = '';
    if(sessionAttributes.currentLine == 1) {
        result = 'Very good. Get ready to give the seven syllable line, ' + '<break time="0.5s"/> Three <break time="0.5s"/> two <break time="0.5s"/> one, you\'re on!'
    } else if(sessionAttributes.currentLine == 2) {
        result = 'Very good. Get ready to give the second five syllable line, ' + '<break time="0.5s"/> Three <break time="0.5s"/> two <break time="0.5s"/> one, you\'re on!'
    }

    return result;
}

function handleRepeatRequest(intent, session, callback) {
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    if (!session.attributes || !session.attributes.speechOutput) {
        getWelcomeResponse(session, callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
    // if there is one in progress, or provide the option to start another one.

    // Set a flag to track that we're in the Help state.
    session.attributes.userPromptedToContinue = true;

    // Do not edit the help dialogue. This has been created by the Alexa team to demonstrate best practices.

    var speechOutput = "I will give you a random topic, try your best to rap about it. I'll drop the beat for you.",
        repromptText = "To respond, start by saying a sentence about the topic. "
        + "Would you like to keep playing?";
        var shouldEndSession = false;
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Good bye!", "", true));
}

function isValidRap(session, intent) {
    if(session.attributes.currentLine === 1) {
      return (countSyllables(getRapLine(intent)) === 7);
    } else {
      return (countSyllables(getRapLine(intent)) === 5);
    }
}

function countSyllables(line) {
  var syllableCount = 0;
  var wordList = line.split(' ');
  _.each(wordList, function(word){
    syllableCount += syllable(word);
  })
  return syllableCount;
}

function isValidName(intent) {
    // Note: the AMAZON.US_FIRST_NAME capitalizes the name if it recognizes the name.
    //       We will let the users name themselves anything.
    return intent.slots && intent.slots.Name && intent.slots.Name.value;
}

function isValidNumber(intent) {
    var answerSlotFilled = intent.slots && intent.slots.Count && intent.slots.Count.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Count.value));
    return answerSlotIsInt;
}

// ------- Helper functions to build responses -------


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

function rhymeLookup(rhyme, callback) {
  //This function takes in an word input and returns a JSON of words that rhyme with the input word
  //Params of JSON include word, number of variables, and how closely the word rhymes with input word
  request('https://api.datamuse.com/words?rel_rhy=' +rhyme, function (error, response, body) {
    if (!error && response.statusCode == 200) {
          callback(JSON.parse(body));
        }
    });
}

function getRapLine(intent) {
    if(!intent.slots) {
        return null;
    }
    var rapLine = "";
    if(intent.slots.FiveSyllableLine && intent.slots.FiveSyllableLine.value) {
        rapLine =  intent.slots.FiveSyllableLine.value;
    } else if(intent.slots.SevenSyllableLine && intent.slots.SevenSyllableLine.value) {
        rapLine = intent.slots.SevenSyllableLine.value;
    }

    var wordList = rapLine.split(' ');
    var literalWord = '';
    _.each(wordList, function(word){
      if(parseInt(word)){
        literalWord += num2text.translate(parseInt(word)) + ' ';
      } else {
        literalWord += word + ' ';
      }
    })

    return literalWord;
}

function iterateLine(rapLine) {
    return rapLine.replace(/\s/g, '<break time="0.25s"/>');
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
function getPlayerWithTurn(session) {
    return session.attributes.players[(session.attributes.currentLine - 1) % session.attributes.players.length];
}
