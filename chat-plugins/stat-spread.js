"use strict";

const ROUND_WAIT = 3000;
const ROUND_DURATION = 15000;

exports.game = "statspread";
exports.aliases = ["stat", "ss"];

function objectValues (obj) {
    return Object.keys(obj).map(k => obj[k]);
}

class StatspreadGame extends Rooms.botGame {
    constructor(room, scorecap) {
        super(room);
        
        this.gameId = "statspread";
        this.gameName = "Stat Spread";
        
        this.answers = [];
        this.spread = null;
        
        this.answered = false;
        
        this.scorecap = Math.abs(parseInt(scorecap) || 5);
        this.round = 0;
        
        this.onInit();
    }
    
    onInit() {
        this.sendRoom(`A new game of Stat Spread is starting. Use \`\`${this.room.commandCharacter[0]}g [answer]\`\` to submit your answer. First to ${this.scorecap} points wins!`);
        
        this.onInitRound();
    }
    
    onInitRound() {
        clearTimeout(this.timer);
        this.round++;
        this.answered = false;
        this.determineSpread();
        this.postSpread();
        this.timer = setTimeout(() => {
            this.sendRoom(`Time's up! The correct answer${(this.answers.length > 1 ? "s are" : " is")}: ${this.answers.join(", ")}`);
            this.timer = setTimeout(() => this.onInitRound(), ROUND_WAIT);
        }, ROUND_DURATION);
    }
    
    determineSpread() {
        let random = Tools.shuffle(Object.keys(Tools.Pokedex))[0];
        this.spread = objectValues(Tools.Pokedex[random].baseStats);
        this.bst = this.spread.reduce((a, b) => a + b, 0);
        this.spread = this.spread.join(" / ");
        
        this.answers = Object.keys(Tools.Pokedex).filter(p => objectValues(Tools.Pokedex[p].baseStats).join(" / ") === this.spread).map(p => Tools.Pokedex[p].species);
    }
    
    postSpread() {
        this.sendRoom(`Round ${this.round} | ${this.spread} [BST: ${this.bst}]`);
    }
    
    getScoreBoard() {
        return "Points: " + Object.keys(this.users).sort().map((u) => {
            return this.users[u].name + " (" + this.users[u].points + ")";
        }).join(", ");
    }
    
    onGuess(user, target) {
        target = toId(target);
        if (!this.answers.map(p => toId(p)).includes(target) || this.answered) return;
        
        clearTimeout(this.timer);
        this.answered = true;
        if (!(user.userid in this.users)) {
            this.users[user.userid] = new Rooms.botGamePlayer(user);
            this.users[user.userid].points = 0;
            this.userList.push(user.userid);
        }
        
        let player = this.users[user.userid];
        player.points++;
        
        this.sendRoom(`${user.name} got the right answer and has ${player.points} points!${this.answers.length > 1 ? ` Possible Answers: ${this.answers.join(", ")}` : ""}`);
        
        if (this.scorecap <= player.points) {
            this.onEnd(player);
        } else {
            this.timer = setTimeout(() => this.onInitRound(), ROUND_WAIT);
        }
    }
    
    onEnd(winner) {
        if (winner) {
            this.sendRoom(`Congratulations to ${winner.name} for winning the game of Stat Spread!`);
            
            Leaderboard.onWin("statspread", this.room, winner.userid, this.scorecap).write();
        }
        this.destroy();
    }
}

exports.commands = {
    statspread: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if (room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new StatspreadGame(room, target);
    },
    
    statspreadrepost: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "statspread") return false;
        room.game.postSpread();
    },
    
    statspreadskip: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "statspread") return false;
        this.send(`The correct answer${(room.game.answers.length > 1 ? "s are" : " is")}: ${room.game.answers.join(", ")}`);
        room.game.onInitRound();
    },
}

