"use strict";

const HANGMAN_POST_INTERVAL = 8000;

exports.game = "hangman";

class HangmanGame extends Rooms.botGame {
    constructor(room) {
        super(room);
        
        this.gameId = "hangman";
        this.gameName = "Hangman";
        this.answer = Tools.shuffle(Object.keys(Tools.Words))[0];
        this.answerId = toId(this.answer);
        this.category = Tools.Words[this.answer];
        
        this.maxWrongs = Math.ceil(toId(this.answer).length / 2) + 2;
        
        this.lastPost = 0;
        this.postQueue = false;
        
        this.guesses = [];
        
        this.postPuzzle();
    }
    
    buildPuzzle() {
        let puzzle = this.answer.split("").map(l => {
            // spaces and symbols are shown
            if (l === " ") return "/";
            if (!/[0-9a-z]/i.test(l)) return l;
            
            if (this.guesses.includes(toId(l))) return l;
            return "_";
        }).join(" ");
        return puzzle;
    }
    
    postPuzzle(forcePost) {
        if (this.postQueue && !forcePost) return false;
        
        let now = Date.now();
        if (now - this.lastPost < HANGMAN_POST_INTERVAL) {
            this.postQueue = true;
            this.timer = setTimeout(() => {
                this.postPuzzle(true);
            }, HANGMAN_POST_INTERVAL - (now - this.lastPost) + 100);
            return;
        }
        
        this.lastPost = now;
        this.postQueue = false;
        this.sendRoom(`${this.buildPuzzle()} | ${this.category} | ${this.getIncorrectGuesses().join(" ")}`);
    }
    
    getIncorrectGuesses() {
        return this.guesses.filter(g => this.answer.toLowerCase().indexOf(g) === -1 || g.length > 1);
    }
    
    onGuess(user, target) {
        target = toId(target);
        if (this.guesses.includes(target)) return false;
        
        this.guesses.push(target);
        
        if (target.length > 1) {
            if (this.answerId === target) return this.onEnd(user);
        } else {
            if (!this.buildPuzzle().includes("_")) return this.onEnd(user);
        }
        if (this.getIncorrectGuesses().length >= this.maxWrongs) {
            this.sendRoom(`Oh no! The man has been hung.  The correct answer was ${this.answer}.`);
            this.onEnd();
            return;
        }
        this.postPuzzle();
    }
    
    onEnd(winner) {
        if (winner) {
            Leaderboard.onWin("hangman", this.room, winner.userid).write();
            this.sendRoom(`${winner.name} has gotten the correct answer - ${this.answer}!`);
        }
        
        this.destroy();
    }
}

exports.commands = {
    hangman: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if (room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new HangmanGame(room);
    },
    
    hangmanrepost: function (target, room, user) {
        if (!room || !room.game || room.game.gameId !== "hangman") return false;
        room.game.postPuzzle();
    },
};
