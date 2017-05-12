"use strict";
const Graph = require("./graph");

class Leaderboard {
    constructor(file) {
        this.settings = {};
        this.data = {};
        
        this.file = file;
        
        this.load();
    }
    
    load() {
        let leaderboard = {};
        try {
            leaderboard = JSON.parse(fs.readFileSync(this.file));
        } catch(e) { log("error", "MALFORMED JSON in leaderboard") }
        this.settings = leaderboard.settings || {};
        this.data = leaderboard.data || {};
    }
    
    write() {
		fs.writeFile(this.file, JSON.stringify({data: this.data, settings: this.settings}), err => {
			if (err) console.log(`ERROR: Failed to write leaderboard - ${err}`);
		});
    }
    
    getPoints(room, userid) {
        if (!this.data[room.id]) this.data[room.id] = {};
        
        return this.data[room.id][userid] || 0;
    }
    
    givePoints(room, userid, points) {
        points = parseInt(points);
        if (!points) return;
        
        if (!this.data[room.id]) this.data[room.id] = {};
        if (!this.data[room.id][userid]) this.data[room.id][userid] = 0;
        
        this.data[room.id][userid] += points;
        return this;
    }
    
    visualiseLadder(room, userid) {
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
}

module.exports = Leaderboard;
