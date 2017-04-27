"use strict";

const DEFAULT_WIN_AMOUNT = 5;
const FILE_DIRECTORY = "config/leaderboard.json";
const Graph = require("../graph");

Config.settableCommands.managegames = true;

let leaderboard = {};

try {
    leaderboard = JSON.parse(fs.readFileSync(FILE_DIRECTORY));
} catch(e) { log("error", "MALFORMED JSON in leaderboard") }

global.Leaderboard = {
    settings: leaderboard.settings || {},
    data: leaderboard.data || {},
    
    getGames: function () {
        return Object.keys(Monitor.games).filter(g => Monitor.games[g] === g);
    },
    
    onConfig: function (room, game, points) {
        if (game === "constructor" || !(game in Monitor.games) || Monitor.games[game] !== game) return "Invalid game. Valid games are - " + this.getGames().join(", ") + ".";
        points = parseInt(points);
        if (!points || points < 1) return "Invalid point amount.";
        
        if (!this.settings[room.id]) this.settings[room.id] = {};
        this.settings[room.id][game] = points;
        return this;
    },
    
    write: function () {
		fs.writeFile(FILE_DIRECTORY, JSON.stringify({data: this.data, settings: this.settings}), err => {
			if (err) console.log(`ERROR: Failed to write leaderboard - ${err}`);
		});
    },
    
    getWin: function (room, game) {
        if (!this.settings[room.id]) this.settings[room.id] = {};
        let points = this.settings[room.id][game] || DEFAULT_WIN_AMOUNT;
        
        return points;
    },
    
    onWin: function (game, room, userid, multiplier) {
        let points = this.getWin(room, game);
        
        return this.givePoints(room, userid, points * (Number(multiplier) || 1));
    },
    
    getPoints: function (room, userid) {
        if (!this.data[room.id]) this.data[room.id] = {};
        
        return this.data[room.id][userid] || 0;
    },
    
    givePoints: function (room, userid, points) {
        points = parseInt(points);
        if (!points) return;
        
        if (!this.data[room.id]) this.data[room.id] = {};
        if (!this.data[room.id][userid]) this.data[room.id][userid] = 0;
        
        this.data[room.id][userid] += points;
        return this;
    },
    
    visualiseLadder: function (room, userid) {
        if (!userid) {
            return Graph(this.data[room.id] || {}, {
                showPlacement: true,
                sort: "value",
                title: `Leaderboard for '${room.name}'`,
            });
        } else {
            return new Promise((resolve, reject) => {
                let lowestScore = Infinity;
                let lastPlacement = 1;
                
                let data = Object.assign({}, this.data[room.id] || {});
                let result = Object.keys(data)
                    .sort((a, b) => data[b] - data[a])
                    .map((u, i) => {
                        let d = data[u];
                        if (d !== lowestScore) {
                            lowestScore = d;
                            lastPlacement = i + 1;
                        }
                        
                        return {
                            place: lastPlacement,
                            userid: u,
                            score: d,
                        };
                    }).find(u => u.userid === userid);
                if (!result) return resolve(`'${userid}' does not have any points on the leaderboard for '${room.name}'.`);
                resolve(`'${result.userid}' is #${result.place} on the leaderboard for '${room.name}' with ${result.score} points`);
            });
        }
    }
};

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