'use strict';

/**
 * Leads the two human Players through a game of TicTacToe
 *
 */


const X = 'X';
const O = 'O';
const EMPTY = '_';
const WIN = 'WIN';
const TIE = 'TIE';

function create_board(){
    return [[EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY]];
}

/*
  Makes the move on the Board.
  Returns: WIN if the player won the game with this move. false if he did not win. TIE if the game is tied after this move.
*/
function register_move(board, player, row, col){
    console.info(board, player, row, col);
    console.assert(board[row][col] === EMPTY);
    console.assert(player === X || player === O);

    board[row][col] = player;

    console.assert(board[row][col] === player);
    console.info("Registered move", player, row, col);

    // check for win
    // row
    var r = board[row];
    if(r[0] === r[1] && r[1] === r[2]){
        return WIN;
    }
    // col
    if(board[0][col] === board[1][col] && board[1][col] === board[2][col]){
        return WIN;
    }
    // diagonals
    // Note: first !== null check makes sure that a diagonal of 3x null does not count as win.
    // left-top to right-bottom
    if(board[0][0] !== EMPTY && board[0][0] === board[1][1] && board[1][1] === board[2][2]){
        return WIN;
    }
    // left-bottom to right-top
    if(board[2][0] !== EMPTY && board[2][0] === board[1][1] && board[1][1] === board[0][2]){
        return WIN;
    }

    // Not a winning move
    //test tie (if there is at leas one null value in any row it is not a tie yet):
    if(board[0].indexOf(EMPTY) >= 0 ||
        board[1].indexOf(EMPTY) >= 0 ||
        board[2].indexOf(EMPTY) >= 0){
        return false;  // No tie
    }else{
        return TIE;  // tie
    }

}

function board_markdown(board){
    console.assert(board);
    return  "`"+board[0][0]+"|"+board[0][1]+"|"+board[0][2]+"` <br/>" +
        "`"+board[1][0]+"|"+board[1][1]+"|"+board[1][2]+"` <br/>" +
        "`"+board[2][0]+"|"+board[2][1]+"|"+board[2][2]+"`";
}

function convo_show_board(convo, thread){
    convo.addMessage(board_markdown(convo.vars['Board']), thread);
}

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const template= "" +
    "`{{#vars.row0}}{{elem}}{{/vars.row0}}`<br/>" +
    "`{{#vars.row1}}{{elem}}{{/vars.row1}}`<br/>" +
    "`{{#vars.row2}}{{elem}}{{/vars.row2}}`<br/>" +
    "";

var request = require('request');
const API_URL = "https://api.ciscospark.com/v1/";
const CHARSET = "application/json; charset=utf-8";

function getHeaders() {
    return {
        "Content-type": CHARSET,
        "Authorization": "Bearer " + process.env.SPARK_TOKEN
    };
}

// ----------------- Controller ------------------ //
module.exports = function (controller) {

    controller.hears(["start tic"], "direct_message,direct_mention", function (bot, message) {

        bot.startConversation(message, function (err, convo) {
            //console.info(convo);
            //console.info(message);
            const roomID = convo.context['channel'];
            // get persons in room
            request.get({url: API_URL + "memberships?roomId="+roomID, headers: getHeaders()}, function(error, response, body) {
                if(!error && response.statusCode === 200) {
                    var info = JSON.parse(body);
                    console.info('info: ', info);

                    var persons = {id0: info.items[0].id, id1: info.items[1].id,
                                   name0: info.items[0].personDisplayName, name1: info.items[1].personDisplayName};
                    console.info('persons_id', persons);
                    // decide who plays what color and init Board
                    convo.setVar('idX', persons.id0);
                    convo.setVar('idO', persons.id1);
                    convo.setVar('X_player_name', persons.name0);
                    convo.setVar('O_player_name', persons.name1);
                    convo.setVar('Board', create_board());

                    // Start of conversation
                    convo.setVar('curr_player_name', convo.vars['X_player_name']);
                    convo.setVar('curr_player_color', X);
                    convo.gotoThread('start_game');
                } else {
                    console.warn("Error: " + error);
                    console.warn("Response: " + response.statusCode);
                    return null
                }
            });

            // start game preamble
            convo.addMessage("{{vars.X_player_name}} you are '"+X+"'and can move first.", "start_game");
            convo.addMessage("{{vars.O_player_name}} you are '"+O+"'", "start_game");
            convo.addMessage({text: "{{vars.curr_player_name}} must play now, The Board is empty.", action: 'ask_user_move'}, "start_game");


            // Ask User for a move

            convo.addMessage(template, 'ask_user_move');
            convo.addMessage('It is {{vars.curr_player_name}} turn now.', 'ask_user_move');
            convo.addQuestion("Please make a move", [
                {
                    pattern: "^[0|1|2] [0|1|2]",
                    callback: function (response, convo){
                        // TODO check whether from correct user
                        var Board = convo.vars['Board'];

                        const splitted = response.text.split(' ');
                        const res = register_move(Board, convo.vars['curr_player_color'], splitted[0], splitted[1]);
                        if (res === WIN){
                            convo.transitionTo('exit', 'Wow, {{vars.curr_player_name}} you Win!');
                        }else if(res === TIE){
                            // it is a tie
                            convo.transitionTo('exit', "Ohhh, It is a tie!");
                        } else {
                            // bot's turn
                            const next_color = convo.vars['curr_player_color'] === X? O : X;
                            convo.setVar('curr_player_color', next_color);
                            convo.setVar('curr_player_name', convo.vars[next_color+'_player_name']);
                            convo.gotoThread('ask_user_move');
                        }
                        convo.next();
                    }
                },
                {
                    default: true,
                    callback: function () {
                        convo.say("Could not parse the Move, please try again.");
                        convo.repeat();
                        convo.next();
                    }
                }

            ], [], 'ask_user_move');

            // update board object for the template
            convo.beforeThread('ask_user_move', function (convo, next) {
                console.info("before ask_user_move");
                const board = convo.vars['Board'];

                convo.setVar('row0', [{"elem": board[0][0]}, {"elem": board[0][1]}, {"elem": board[0][2]}]);
                convo.setVar('row1', [{"elem": board[1][0]}, {"elem": board[1][1]}, {"elem": board[1][2]}]);
                convo.setVar('row2', [{"elem": board[2][0]}, {"elem": board[2][1]}, {"elem": board[2][2]}]);
                //convo.setVar('board_string', board_html(convo.vars['Board']));
                next();
            });

            // exit
            convo.addMessage({text:"Thanks for the Game!<br>"+template, action:'completed'}, "exit");

            convo.beforeThread('exit', function (convo, next) {
                //console.info("before ask_user_move");
                const board = convo.vars['Board'];

                convo.setVar('row0', [{"elem": board[0][0]}, {"elem": board[0][1]}, {"elem": board[0][2]}]);
                convo.setVar('row1', [{"elem": board[1][0]}, {"elem": board[1][1]}, {"elem": board[1][2]}]);
                convo.setVar('row2', [{"elem": board[2][0]}, {"elem": board[2][1]}, {"elem": board[2][2]}]);
                //convo.setVar('board_string', board_html(convo.vars['Board']));
                next();
            });


        });
    });
};
