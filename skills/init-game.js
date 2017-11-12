'use strict';

// jquery initialization
var request = require('request');
const API_URL = "https://api.ciscospark.com/v1/";
const CHARSET = "application/json; charset=utf-8";


module.exports = function (controller) {
    var players_waiting = [];

    function getHeaders() {
        return {
            "Content-type": CHARSET,
            "Authorization": "Bearer " + process.env.SPARK_TOKEN
        };
    }


    function startGame() {
        console.info("Start game...");
        var options = {
            url: API_URL + "/rooms",
            headers: getHeaders()
        };
        request(options, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                console.log(info);
            } else {
                console.log("Error: " + error);
            }
        });
    }

    function createRoom() {
        var options = {
            url: API_URL + "rooms",
            headers: getHeaders(),
            form: {
                "title": "New Game"
            }
        };
        request.post(options, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                console.log(info);
                var user1 = players_waiting.pop();
                console.log("Add: " + user1);
                addPersonToRoom(user1, info.id);

                var user2 = players_waiting.pop();
                console.log("Add: " + user2);
                addPersonToRoom(user2, info.id);
            } else {
                console.log("Error: " + error);
                console.log("Response: " + response.statusCode);
            }
        });
    }

    function addPersonToRoom(personId, roomId) {
        var options = {
            url: API_URL + "memberships",
            headers: getHeaders(),
            form: {
                "roomId" : roomId,
                "personId" : personId
            }
        };
        request.post(options, function(error, response, body) {
            if(!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                console.log(info);
            } else {
                console.log("Error: " + error);
                console.log("Response: " + response.statusCode);
            }
        });
    }


    controller.hears(["match"], "direct_message,direct_mention", function (bot, message) {
        bot.startConversation(message, function(err, convo) {
            convo.addQuestion("Would you like to play tic tac toe?", [
                {
                    pattern: bot.utterances.yes,
                    callback: function(response, convo) {
                        console.log("Yes Response: " + response);
                        var user = response.original_message.personId;
                        players_waiting.push(user)
                        console.log("Player in queue: " + players_waiting);
                        if (players_waiting.length >= 2) {
                            createRoom();
                        }
                        convo.next();
                    }
                },
                {
                    pattern: bot.utterances.no,
                    callback: function(response, convo) {
                        console.log(response);
                        startGame();
                        convo.say('Maybe later.');
                        convo.next();
                    }
                },
                {
                    default: true,
                    callback: function(response, convo) {
                        convo.repeat();
                        convo.next();
                    }
                }
            ], {}, 'default');
        });
    });
};
