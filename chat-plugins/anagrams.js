"use strict";

exports.game = "anagrams";
exports.aliases = ["anag", "anags"];

class AnagramGame extends Rooms.botGame {
    constructor (room, scorecap) {
        super(room);
        
        this.targetPokemon = null;
        this.anagram = null;
        this.allowJoins = false;
        this.gameId = "anagrams";
        this.gameName = "Anagrams";
        this.roundNumber = 0;
        this.scorecap = Math.abs(parseInt(scorecap) || 5);
        this.init();
    }
    
    init () {
        this.state = "started";
        if (this.scorecap <= 0) this.scorecap = 5;
        this.sendRoom("A new game of Anagrams is starting. Use ``" + this.room.commandCharacter[0] + "g`` to guess the Pokémon. First to " + this.scorecap + " points wins.");
        this.initRound();
    }
    
    onGuess (user, answer) {
        if (!answer || toId(answer) !== toId(this.targetPokemon)) return;
        if (!(user.userid in this.users)) {
            this.users[user.userid] = new Rooms.botGamePlayer(user);
            this.users[user.userid].points = 0;
            this.userList.push(user.userid);
        }
        this.users[user.userid].points++;
        if (this.users[user.userid].points >= this.scorecap) {
            this.sendRoom(user.name + " has won the game!");
            Leaderboard.onWin("anagrams", this.room, user.userid, this.scorecap).write();
            this.destroy();
            return;
        }
        this.sendRoom(user.name + " got the correct answer - ``" + this.targetPokemon + "`` - and has " + this.users[user.userid].points + " points.");
        this.initRound();
    }
    
    initRound () {
        this.roundNumber++;
        this.determineQuestion();
        this.sendRoom("Round " + this.roundNumber + " | " + this.anagram + ".");
    }
    
    determineQuestion () {
        this.targetPokemon = Tools.shuffle(Object.keys(Tools.Words))[0];
        this.anagram = Tools.shuffle(this.targetPokemon.replace(/\W/g, "").toLowerCase().split("")).join(", ") + " [" + Tools.Words[this.targetPokemon] + (this.targetPokemon.match(/\W/g) ? ", " + (this.targetPokemon.match(/\W/g).length + 1) + " words" : "") + "]";
    }
    
    getScoreBoard () {
        let self = this;
        return "Points: " + Object.keys(this.users).sort().map((u) => {
            return self.users[u].name + " (" + self.users[u].points + ")";
        }).join(", ");
    }
}

exports.commands = {
    anagrams: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if(room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new AnagramGame(room, target);
    },
    anagramsscore: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "anagrams") return false;
        this.send(room.game.getScoreBoard());
    },
    anagramsskip: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "anagrams") return false;
        this.send("The correct answer was: " + room.game.targetPokemon);
        room.game.initRound();        
    },
    anagramsrepost: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "anagrams") return false;
        this.send("Repost - Round " + room.game.roundNumber + " | " + room.game.anagram + ".");
    },
};