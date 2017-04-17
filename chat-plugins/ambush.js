"use strict";

const TURN_DURATION = 1750;
const VARIABLE_WAIT_DURATION = 3000;
const MIN_WAIT_DURATION = 2000;

class AmbushGame extends Rooms.botGame {
    constructor (room) {
        super(room);
        
        this.gameId = "ambush";
        this.gameName = "Ambush";
        
        this.answerCommand = "special";
        this.allowJoins = true;
        
        this.state = "signups";
        
        this.playerObject = AmbushGamePlayer;
    }
    
    onStart() {
        if (this.userList.length < 2 || this.state !== "signups") return;
        this.state = "started";
        
        this.prepTurn();
    }
    
    postPlayerList() {
        let pl = this.userList.sort().map(u => this.users[u].name);
        
        this.sendRoom(`Players (${this.userList.length}): ${pl.join(", ")}`);
    }
    
    prepTurn() {
        this.state = "wait";
        this.postPlayerList();
        this.sendRoom("Ready...");
        this.timer = setTimeout(() => {
            this.initTurn();
        }, Math.random() * VARIABLE_WAIT_DURATION + MIN_WAIT_DURATION);
    }
    
    initTurn() {
        this.state = "fire";
        this.sendRoom("**FIRE!**");
        
        this.timer = setTimeout(() => {
            let shot = this.userList.filter(u => this.users[u].shot).map(u => this.users[u].name);
            if (shot.length) this.sendRoom(`${shot.join(", ")} ${(shot.length > 1 ? "were" : "was")} killed!`);
            else this.sendRoom("No one died!");
            this.pruneUserList();
            if (this.state !== "ended") this.prepTurn();
        }, 2500);
    }
    
    onFire(user, target) {
        let player = this.users[user.userid];
        if (this.state === "wait") {
            // fired too early ha!
            player.shield = 2;
        }
        if (this.state !== "fire" || toId(target) === "constructor") return;
        let targetPlayer = this.users[toId(target)];
        
        // validate that there is a valid target, that there is a valid player, and that the player hasn't shot yet and isnt dead.
        if (!player || !targetPlayer || player.shield || player.shot || targetPlayer.userid === player.userid) return; // no self shooting smh
        
        player.activateShield();
        
        if (targetPlayer.shield === 1 || targetPlayer.shot) return; // valid that the target has not died, and the target does not have a shield
        
        targetPlayer.shot = true;
    }
    
    pruneUserList() {
        for (let i in this.users) {
            if (this.users[i].shot) {
                delete this.users[i];
                this.userList.splice(this.userList.indexOf(i), 1);
            } else {
                this.users[i].resetShield();
            }
            if (Object.keys(this.users).length === 1) return this.onEnd(true);
        }
    }
    
    onEnd(win) {
        this.state = "ended";
        if (win) {
            let winner = this.users[this.userList[0]];
            this.sendRoom(`Congratulations to ${winner.name} for winning the game of ambush!`);
        }
        
        this.destroy();
    }
}

class AmbushGamePlayer extends Rooms.botGamePlayer {
    constructor (user, game) {
        super(user, game);
        
        this.shield = 0;
        this.shot = false;
    }
    
    activateShield() {
        this.shield = 1;
    }
    
    resetShield() {
        this.shield = 0;
    }
}

exports.commands = {
    ambush: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if(room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new AmbushGame(room);
        this.send("A new game of Ambush is starting. ``" + room.commandCharacter[0] + "join`` to join the game.");
    },
    
    ambushstart: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "ambush") return false;
        room.game.onStart();
    },
    ambushplayers: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "ambush") return false;
        room.game.postPlayerList();
    },
    ambushend: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "ambush") return false;
        room.game.onEnd();
        this.send("The game of ambush was forcibly ended.");
    },
    
    ambushjoin: function (target, room, user) {
        if (!room || !room.game || room.game.gameId !== "ambush") return false;
        room.game.onJoin(user);
    },
    ambushleave: function (target, room, user) {
        if (!room || !room.game || room.game.gameId !== "ambush") return false;
        room.game.onLeave(user);
    },
    
    fire: function (target, room, user) {
        if (!room || !room.game || room.game.gameId !== "ambush") return false;
        room.game.onFire(user, target);
    },
};