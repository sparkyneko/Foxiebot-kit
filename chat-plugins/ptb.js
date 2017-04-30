"use strict";

const BASE_TURN_DURATION = 10000;
const VARIABLE_TURN_DURATION = 6000;

const BASE_WAIT_DURATION = 3000;
const VARIABLE_WAIT_DURATION = 2000;

exports.game = "passthebomb";
exports.aliases = ["ptb", "bomb"];

class PassthebombGame extends Rooms.botGame {
    constructor (room) {
        super (room);
        
        this.gameId = "passthebomb";
        this.gameName = "Pass The Bomb";
        
        this.answerCommand = "special";
        this.allowJoins = true;
        
        this.state = "signups";
        
        this.turn = 1;
        this.allowRenames = false;
        this.sendRoom("A new game of Pass the bomb is starting. ``" + this.room.commandCharacter[0] + "join`` to join the game.");
    }
    
    getRandomPlayer() {
        return this.userList[Math.floor(Math.random() * this.userList.length)];
    }
    
    findBomb() {
        return this.userList.find(u => this.users[u].hasBomb);
    }
    
    onStart() {
        if (this.userList.length < 2 || this.state !== "signups") return false;
        this.sendRoom(`When you have the bomb, you can use \`\`${this.room.commandCharacter[0]}toss [player]\`\` to pass someone else the bomb.`);
        this.state = "started";
        this.startingPlayers = this.userList.length;
        
        this.onPrepTurn();
    }
    
    onPrepTurn() {
        let pl = this.buildPlayerList();
        this.sendRoom(`Turn ${this.turn++} | Players (${pl.count}): ${pl.players}`);
        
        this.timer = setTimeout(() => {
            this.onInitTurn();
        }, VARIABLE_WAIT_DURATION * Math.random() + BASE_WAIT_DURATION);
    }
    
    onInitTurn() {
        let bombTarget = this.getRandomPlayer();
        this.users[bombTarget].hasBomb = true;
        this.sendRoom(`The bomb was handed to ${this.users[bombTarget].name}!`);
        this.timer = setTimeout(() => {
            this.onTurnEnd();
        }, VARIABLE_TURN_DURATION * Math.random() + BASE_TURN_DURATION);
    }
    
    onTurnEnd() {
        let bomb = this.findBomb();
        
        this.sendRoom(`Boom! ${this.users[bomb].name} has been eliminated!`);
        this.eliminate(bomb);
        
        if (this.userList.length > 1) this.onPrepTurn();
        else this.onEnd(true);
    }
    
    onBomb(user, target) {
        let player = this.users[user.userid];
        let targetPlayer = this.users[toId(target)];
        
        if (!player || !player.hasBomb || !targetPlayer) return false;
        
        player.hasBomb = false;
        targetPlayer.hasBomb = true;
    }
    
    onEnd(win) {
        if (win) {
            let winner = this.users[this.userList[0]];
        
            Leaderboard.onWin("passthebomb", this.room, winner.userid, this.startingPlayers);
            this.sendRoom(`Congratulations to ${winner.name} for winning the game!`);
        }
        this.destroy()
    }
    
    eliminate(player) {
        this.userList.splice(this.userList.indexOf(player.userid), 1);
        delete this.users[player.userid];
    }
}

exports.commands = {
    passthebomb: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if (room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new PassthebombGame(room);
    },
    
    toss: function (target, room, user) {
        if (!room || !room.game || room.game.gameId !== "passthebomb") return false;
        room.game.onBomb(user, target);
    },
};