// this is where all the standard game commands are put
'use strict';

exports.commands = {
    join: function(target, room, user) {
        if (!room || !room.game) return false;
        if (room.game.onJoin) room.game.onJoin(user);
    },
    "guess": "g",
    g: function(target, room, user) {
        if (!room || !room.game || room.game.answerCommand !== "standard") return false;
        if (room.game.onGuess) room.game.onGuess(user, target);
    },
    leave: function(target, room, user) {
        if (!room || !room.game) return false;
        if (room.game.onLeave) room.game.onLeave(user);
    },
    players: function(target, room, user) {
        if (!room || !this.can("games") || !room.game) return false;
        if (room.game.postPlayerList) room.game.postPlayerList();
    },
    score: function(target, room, user) {
        if (!room || !this.can("games") || !room.game) return false;
        if (room.game.getScoreBoard) this.send(room.game.getScoreBoard());
    },
    start: function(target, room, user) {
        if (!room || !this.can("games") || !room.game) return false;
        if (room.game.onStart) room.game.onStart();
    },
    end: function(target, room, user) {
        if (!room || !this.can("games") || !room.game) return false;
        if (room.game.onEnd) {
            room.game.onEnd();
            this.send("The game has been ended.");
        }
    },
    skip: function(target, room, user) {
        if (!room || !this.can("games") || !room.game) return false;
        let gameId = room.game.gameId;
        this.parse("/" + gameId + "skip");
    },
    repost: function(target, room, user) {
        if (!room || !this.can("games") || !room.game) return false;
        let gameId = room.game.gameId;
        this.parse("/" + gameId + "repost");
    },
    signups: function(target, room, user) {
        if (!room || !this.can("games")) return false;
        if (!target) this.parse("/help signups");
        
        let arg;
        [target, arg] = target.split(",").map(p => p.trim());
        
        let gameId = Monitor.games[toId(target)];
        if (!gameId) return this.send("Invalid game.");
        
        this.parse("/" + gameId + (arg ? " " + arg : ""));
    },
};