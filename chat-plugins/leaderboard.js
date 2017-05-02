"use strict";

const DEFAULT_WIN_AMOUNT = 5;
const FILE_DIRECTORY = "config/leaderboard.json";
const Graph = require("../graph");
const LEADERBOARD = require("../leaderboard");

Config.settableCommands.managegames = true;

class MainLeaderboard extends LEADERBOARD {
    constructor(file) {
        super(file);
    }
    
    getGames() {
        return Object.keys(Monitor.games).filter(g => Monitor.games[g] === g);
    }
    
    onConfig(room, game, points) {
        if (game === "constructor" || !(game in Monitor.games) || Monitor.games[game] !== game) return "Invalid game. Valid games are - " + this.getGames().join(", ") + ".";
        points = parseInt(points);
        if (!points || points < 1) return "Invalid point amount.";
        
        if (!this.settings[room.id]) this.settings[room.id] = {};
        this.settings[room.id][game] = points;
        return this;
    }
    
    getWin(room, game) {
        if (!this.settings[room.id]) this.settings[room.id] = {};
        let points = this.settings[room.id][game] || DEFAULT_WIN_AMOUNT;
        
        return points;
    }
    
    onWin(game, room, userid, multiplier) {
        let points = this.getWin(room, game);
        
        return this.givePoints(room, userid, points * (Number(multiplier) || 1));
    }
}

global.Leaderboard = new MainLeaderboard(FILE_DIRECTORY);

exports.commands = {
    games: function (target, room, user) {
        if (!this.can("broadcast")) return false;
        
        this.send("List of games: " + Leaderboard.getGames().join(", "));
    },
    
    "lb": "leaderboard",
    leaderboard: function (target, room, user) {
        if (!room) return;
        
        let [cmd, ...arg] = target.split(" ");
        cmd = toId(cmd);
        arg = arg.join(" ");

        switch(cmd) {
            case "set":
                if (!this.can("managegames")) return false;
                
                let [key, value] = arg.split(",").map(p => p.trim());
                if (!key || !value) return this.send("Please include a game ID and a point value.");
                
                let error = Leaderboard.onConfig(room, key, value);
                if (error && typeof error === "string") return this.send("ERROR: " + error);
                
                Leaderboard.write();
                this.send(`Game '${key}' will now yield a base point reward of ${value}.`);
                break;
            case "takepoints":
            case "givepoints": 
                if (!this.can("games")) return false;
                
                let [userid, points] = arg.split(",");
                userid = toId(userid);
                points = parseInt(points);
                
                if (!userid || !points) return this.send("Please include the user and the points to be given/taken.");
                if (cmd === "takepoints") points = -points;
                
                Leaderboard.givePoints(room, userid, points).write();
                this.send(`'${userid}' has ${points > 0 ? "received" : "lost"} ${Math.abs(points)} points.`);
                break;
            case "reset":
                if (!this.can("managegames")) return false;
                
                Leaderboard.data[room.id] = {}
                Leaderboard.write();
                
                this.send("Leaderboard has been reset.");
                break;
            case "settings": 
                if (!this.can("games")) return false;
                
                let buffer = Object.keys(Leaderboard.settings[room.id] || {})
                    .map(s => `'${s}' -> ${Leaderboard.getWin(room, s)}`);
                this.send(buffer.join(", "));
                break;
            case "rank":
                this.can("broadcast");
                let targetId = toId(arg) || user.userid;
                
                Leaderboard.visualiseLadder(room, targetId).then(rank => this.send(rank));
                break;
            case "ladder":
            case "":
                this.can("broadcast");
                Leaderboard.visualiseLadder(room).then(ladder => {
                    Tools.uploadToHastebin(ladder, link => this.send(`Leaderboard for '${room.name}': ${link}`));
                });
                break;
        }
    },
};