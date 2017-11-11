'use strict';


module.exports = function (controller) {

    // ----------------- Game Logic ------------------

    var Board = [ [null, null, null],
                    [null, null, null],
                    [null, null, null]];
    const X = 'X';
    const O = 'O';

    /*
      Makes the move on the Board.
      Returns: true if the player won the game with this move. false if he did not win. null if the game is tied after this move.
    */
    function register_move(player, row, col){
        console.assert(Board[row][col] === null);
        console.assert(player === X || player === O);
        Board[row][col] = player;

        console.assert(Board[row][col] === player);
        console.info("Registered move", player, row, col);

        // check for win
        // row
        var r = Board[row];
        if(r[0] === r[1] && r[1] === r[2]){
            return true;
        }
        // col
        if(Board[0][col] === Board[1][col] && Board[1][col] === Board[2][col]){
            return true;
        }
        // diagonals
        // Note: first !== null check makes sure that a diagonal of 3x null does not count as win.
        // left-top to right-bottom
        if(Board[0][0] !== null && Board[0][0] === Board[1][1] && Board[1][1] === Board[2][2]){
            return true;
        }
        // left-bottom to right-top
        if(Board[2][0] !== null && Board[2][0] === Board[1][1] && Board[1][1] === Board[0][2]){
            return true;
        }

        // Not a winning move
        //test tie (if there is at leas one null value in any row it is not a tie yet):
        if(Board[0].indexOf(null) >= 0 ||
            Board[1].indexOf(null) >= 0 ||
            Board[2].indexOf(null) >= 0){
            return false;  // No tie
        }else{
            return null;  // tie
        }

    }

    function convo_show_board(convo, b){
        const map = {
            'X':X, 'O':O, null:"_"
        };
        /*
        | Tables        | Are           | Cool  |
        | ------------- |:-------------:| -----:|
        | col 3 is      | right-aligned | $1600 |
        | col 2 is      | centered      |   $12 |
        | zebra stripes | are neat      |    $1 |

         */
        var s = "`"+map[b[0][0]]+"|"+map[b[0][1]]+"|"+map[b[0][2]]+"` <br/>" +
        "`"+map[b[1][0]]+"|"+map[b[1][1]]+"|"+map[b[1][2]]+"` <br/>" +
        "`"+map[b[2][0]]+"|"+map[b[2][1]]+"|"+map[b[2][2]]+"`";
        convo.say(s);
    }

    function random_int(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /*
    Returns: a random move.
    TODO this is very ugly now, and may loop forever if there is no free field to play on
     */
    function random_move(){
        console.warn(Board);
        var r = random_int(0, 2);
        var c = random_int(0, 2);
        console.warn("Board r: ", Board[r], r, c);
        while(Board[r][c] !== null){
            r = random_int(0, 2);
            c = random_int(0, 2);
        }
        return [r, c]
    }

    // ------------------- Messages -------------------

    controller.hears(["tic"], "direct_message,direct_mention", function (bot, message) {

        bot.startConversation(message, function (err, convo) {
            // Ask for a Move Thread
            convo.addQuestion("What is your move?",
                function(response, convo){
                    console.info("Board string: \n", Board);
                    const splitted = response.text.split(' ');
                    const r = splitted[0];
                    const c = splitted[1];
                    const is_win = register_move(ENEMY, r, c);
                    convo_show_board(convo, Board);
                    if (is_win){
                        convo.say("Wow you Win!");
                        convo.gotoThread('exit');
                    }else if(is_win === null){
                        // it is a tie
                        convo.say("Ohhh, It is a tie!");
                        convo.gotoThread('exit');
                    } else {
                        // No win or tie, -> the bots turn.
                        const my_move = random_move(ME);
                        convo.say("Nice Move!, I play " + my_move[0] + " " + my_move[1]);
                        const is_my_win = register_move(ME, my_move[0], my_move[1]);
                        convo_show_board(convo, Board);
                        if (is_my_win) {
                            convo.say("Haha I Win!");
                            convo.gotoThread('exit');
                        } else if (is_win === null) {
                            // it is a tie
                            convo.say("Ohhh, It is a tie!");
                            convo.gotoThread('exit');
                        } else {
                            convo.repeat();
                        }
                    }
                    convo.next();

                },
                [], "ask_move_thread");

            // enemy wins thread
            convo.addMessage("Thanks for the game!", "exit");


            // Start of conversation
            const ENEMY = X;
            const ME = O;
            convo.say("You go first.");
            convo.say("The Board is empty now");
            convo.gotoThread('ask_move_thread');

        });
    });
};