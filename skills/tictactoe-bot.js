'use strict';


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

/*
    Returns: a random move.
    TODO this is very ugly now, and may loop forever if there is no free field to play on
     */
function random_move(board){
    console.warn(board);
    var r = random_int(0, 2);
    var c = random_int(0, 2);
    while(board[r][c] !== EMPTY){
        r = random_int(0, 2);
        c = random_int(0, 2);
    }
    return [r, c]
}


const template= "Begin: <table>" +
                "<tr>{{#vars.row0}}<td>{{elem}}</td>{{/vars.row0}}<tr/>\n" +
                "<tr>{{#vars.row1}}<td>{{elem}}</td>{{/vars.row1}}<tr/>\n" +
                "<tr>{{#vars.row2}}<td>{{elem}}</td>{{/vars.row2}}<tr/>" +
                "</table>";
const template2= "" +
    "`{{#vars.row0}}{{elem}}{{/vars.row0}}`<br/>" +
    "`{{#vars.row1}}{{elem}}{{/vars.row1}}`<br/>" +
    "`{{#vars.row2}}{{elem}}{{/vars.row2}}`<br/>" +
    "";

// ----------------- Controller ------------------
module.exports = function (controller) {

    controller.hears(["^tic"], "direct_message,direct_mention", function (bot, message) {

        bot.startConversation(message, function (err, convo) {
            // decide who plays what color and init Board
            convo.setVar('ENEMY', Math.random() < 0 ? X : O);
            convo.setVar('ME', convo.vars['ENEMY'] === X ? O : X);
            convo.setVar('Board', create_board());

            // Ask User for a move
            convo.addMessage(template2, 'ask_user_move');
            convo.addQuestion("Please make a move", [
                {
                    pattern: "^[0|1|2] [0|1|2]",
                    callback: function (response, convo){
                        var Board = convo.vars['Board'];
                        var ENEMY = convo.vars['ENEMY'];

                        const splitted = response.text.split(' ');
                        const res = register_move(Board, ENEMY, splitted[0], splitted[1]);
                        if (res === WIN){
                            convo.transitionTo('exit', 'Wow you Win!');
                        }else if(res === TIE){
                            // it is a tie
                            convo.transitionTo('exit', "Ohhh, It is a tie!");
                        } else {
                            // bot's turn
                            convo.transitionTo('bots_turn', "It is my turn now.");
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

            // bots turn thread
            convo.addMessage({text: "Your Turn now.", markdown: "_Your turn now_", action: 'ask_user_move'}, 'bots_turn');

            // Before bots turn thread, bot does the move
            convo.beforeThread('bots_turn', function(convo, next) {
                var Board = convo.vars['Board'];
                var ME = convo.vars['ME'];

                const my_move = random_move(Board, ME);
                convo.say("I play " + my_move[0] + " " + my_move[1]);
                const res = register_move(Board, ME, my_move[0], my_move[1]);
                if (res === WIN) {
                    convo.transitionTo('exit', 'Haha, I Win!');
                } else if (res === TIE) {
                    // it is a tie
                    convo.transitionTo('exit', "Ohhh, It is a tie!");
                } else {
                    convo.gotoThread('ask_user_move');
                }
                next();
            });

            // exit
            convo.addMessage({text:"Thanks for the Game!<br>"+template2, action:'completed'}, "exit");

            convo.beforeThread('exit', function (convo, next) {
                console.info("before ask_user_move");
                const board = convo.vars['Board'];

                convo.setVar('row0', [{"elem": board[0][0]}, {"elem": board[0][1]}, {"elem": board[0][2]}]);
                convo.setVar('row1', [{"elem": board[1][0]}, {"elem": board[1][1]}, {"elem": board[1][2]}]);
                convo.setVar('row2', [{"elem": board[2][0]}, {"elem": board[2][1]}, {"elem": board[2][2]}]);
                //convo.setVar('board_string', board_html(convo.vars['Board']));
                next();
            });

            // Start of conversation
            if(convo.vars['ENEMY'] === X) {
                convo.transitionTo('ask_user_move', "You go first, The Board is empty now");
            }else{
                convo.transitionTo('bots_turn', "I go first.");
            }
        });
    });
};