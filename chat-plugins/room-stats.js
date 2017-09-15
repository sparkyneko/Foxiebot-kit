"use strict";

const fs = require("fs");
const Graph = require("../graph");
const keepLogsFor = 45;

/**
 * Initiate database and logging and eventually skype counterpart
 */
if (!Monitor.statistics) {
    Monitor.statistics = {};
    
    Monitor.statistics.database = require("../database")("config/room-stats");
    
    /**
     * Set up logging for all rooms, but only do the logging in rooms that have a db key.
     */ 
    Events.on(["c", "c:"], (id, room, msgType, msg) => {
        if (!Monitor.statistics.database.hasKey(room.id)) return;
        msg = msg.replace(/(?:\|)?[0-9]+\|/i, ""); // remove timestamp

        let [user, message] = msg.split("|");
        let userid = toId(user);

        if (!userid || userid.length > 19) return; // this is a serverside message, or a faulty message

        // log non moderation counts.
        if (msg.indexOf("/log") !== 0) {
            logStat(room.id, userid);
        }
    });
    
    require("../skype/index"); // init skype component
}

let db = Monitor.statistics.database;

function logStat (roomid, userid) {
    let hours = new Date().getHours();
    let date = new Date().toLocaleDateString();
    let obj = db(roomid).get([userid, date], {});
    if (!obj[hours]) obj[hours] = 0;
        
    obj[hours]++;
    db(roomid).set([userid, date], obj);
}

/**
 * Run searches
 * 
 * This all round function allows 3 different searches, timezone, userstats and room stats
 * each calling a function from inside a promise.
 * 
 * Sorting may take some time so this prevents I/O blocking
 */
const runSearch = Monitor.statistics.runSearch = function (aspect, roomid, detail) {
    return new Promise((resolve, reject) => {
        if (!db.hasKey(roomid)) return reject("Logging not enabled for room.");
        let result;
        switch(aspect) {
            case "timezone":
                result = runTimeZoneSearch(roomid, detail);
                resolve(result);
                break;
            case "roomstats":
                result = runRoomSearch(roomid, detail);
                resolve(result);
                break;
            case "userstats":
                result = runUserSearch(roomid, detail);
                resolve(result);
                break;
            default:
                reject("Invalid search key.");
                break;
        }
    });
};

function runTimeZoneSearch (roomid, userid) {
    let data = db(roomid).get(userid);
    let stats = {};
    
    let days = 0;
    
    for (let i = 0; i < 24; i++) {
        stats[i] = 0;
    }
    for (let date in data) {
        days++;
        let dayStats = data[date];
        for (let hour in dayStats) {
            stats[hour] += dayStats[hour];
        }
    }
    
    if (days > 1) {
        for (let hour in stats) {
            stats[hour] = Math.ceil(stats[hour] / days);
        }
    }
    
    return stats;
}

function runRoomSearch(roomid, date) {
    let data = Object.assign({}, db(roomid).cache);
    
    let stats = {};
    for (let userid in data) {
        if (date && !data[userid][date]) continue;
        stats[userid] = 0;
        if (!date) {
            // total search
            for (let d in data[userid]) {
                for (let h in data[userid][d]) {
                    stats[userid] += data[userid][d][h];
                }
            }
            continue;
        } else {
            // search for that one day
            for (let hour in data[userid][date]) {
                stats[userid] += data[userid][date][hour];
            }
        }
    }
    
    return stats;
}

function runUserSearch (roomid, details) {
    let data = db(roomid).get(details, {});
    let stats = {};
    for (let d in data) {
        stats[d] = 0;
        for (let h in data[d]) {
            stats[d] += data[d][h];
        }
    }
    
    return stats;
}

function cleanStatistics () {
    // do this async to prevent any I/O blocking
    let cutoff = Date.now() - (keepLogsFor * 24 * 60 * 60000);
    Promise.resolve(
        db.keys().forEach(key => {
            let data = db(key).cache;
            for (let u in data) {
                if (u.length > 19) db(key).delete(u); // clear mistakes
                let ud = data[u];
                for (let d in ud) {
                    if (Date.parse(new Date(d)) < cutoff) db(key).delete([u, d]);
                }
            }
        })
    ).then(() => db.write());
}

setImmediate(() => cleanStatistics());

exports.commands = {
    enablelogging: function (target, room, user) {
        if (!this.can("dev")) return false;
        
        let roomid = toId(target, true);
        if (!roomid || !Rooms.rooms.has(roomid)) return this.send("Invalid room.");
        
        if (db.hasKey(roomid)) return this.send("Aggregate user statistic logging for '" + roomid + "' is already enabled.");
        
        db.spawn(roomid);
        this.send("You have enabled aggregate user statistic logging for '" + roomid + "'.");
    },
    
    disablelogging: function (target, room, user) {
        if (!this.can("dev")) return false;
        
        let roomid = toId(target, true);
        if (!roomid) return this.send("Invalid room.");
        
        if (db.hasKey(roomid)) return this.send("Aggregate user statistic logging for '" + roomid + "' is not enabled.");
        
        db.spawn(roomid);
        this.send("You have disabled aggregate user statistic logging for '" + room.id + "'.");
    },
    
    requestkey: function (target, room, user) {
        let targetRoom = Rooms.rooms.has(toId(target)) ? Rooms.get(target) : null;
        room = targetRoom || room;
        
        if (!room) return user.sendTo("Invalid room.");
        
        if (!user.hasRank(room, "#")) return this.send("Access denied.");
        
        let key = (Math.floor(Math.random() * 0xFFFFFFFFFFFFF) + 0x1000000000000).toString(16).toUpperCase();
        db("auth-keys").set([room.id, "key"], key);
        
        user.sendTo("Your authentication key pair is: " + key + ".  Use ``+authenticate " + room.id + ", " + key + "`` on skype to complete the pairing sequence.");
    },
    
    userstats: function (target, room, user) {
        if (!room) {
            [room, target] = target.split(",").map(p => p.trim());
            if (!Rooms.rooms.has(toId(room))) return this.send("Invalid room.");
            
            room = Rooms.get(room);
        }
        
        if (!user.hasRank(room, "%")) return this.send("Access denied.");
        
        if (!target) return this.parse("/help userstats");
        
        runSearch("userstats", room.id, toId(target)).then(data => {
            Graph(data, {
                maxBars: 40,
                title: "User statistics for '" + toId(target) + "' in " + room.name,
            }).then(graph => {
                Tools.uploadToHastebin(graph, link => {
                    user.sendTo(link);
                });
            }).catch(err => {
                user.sendTo("GRAPH ERROR: " + err);
                console.log(err.stack);
            });
        }).catch(err => {
            user.sendTo("SEARCH ERROR: " + err);
            console.log(err.stack);
        });
    },
    
    usertimezone: function (target, room, user) {
        if (!room) {
            [room, target] = target.split(",").map(p => p.trim());
            if (!Rooms.rooms.has(toId(room))) return this.send("Invalid room.");
            
            room = Rooms.get(room);
        }
        
        if (!user.hasRank(room, "%")) return this.send("Access denied.");
        
        if (!target) return this.parse("/help usertimezone");
        
        runSearch("timezone", room.id, toId(target)).then(data => {
            Graph(data, {
                maxBars: 40,
                title: "Timezone statistics for '" + toId(target) + "' in " + room.name,
            }).then(graph => {
                Tools.uploadToHastebin(graph, link => {
                    user.sendTo(link);
                });
            }).catch(err => {
                user.sendTo("GRAPH ERROR: " + err);
                console.log(err.stack);
            });
        }).catch(err => {
            user.sendTo("SEARCH ERROR: " + err);
            console.log(err.stack);
        });
    },
    
    roomstats: function (target, room, user) {
        if (!room) {
            [room, target] = target.split(",").map(p => p.trim());
            if (!Rooms.rooms.has(toId(room))) return this.send("Invalid room.");
            
            room = Rooms.get(room);
        }
        
        if (!user.hasRank(room, "%")) return this.send("Access denied.");
        
        runSearch("roomstats", room.id, target || null).then(data => {
            Graph(data, {
                maxBars: 40,
                title: "Room statistics for '" + room.id + "'" + (target ? " on " + target : ""),
                sort: "values",
                showPlacement: true,
            }).then(graph => {
                Tools.uploadToHastebin(graph, link => {
                    user.sendTo(link);
                });
            }).catch(err => {
                user.sendTo("GRAPH ERROR: " + err);
                console.log(err.stack);
            });
        }).catch(err => {
            user.sendTo("SEARCH ERROR: " + err);
            console.log(err.stack);
        });
    },
    statshelp: function (target, room, user) {
        this.send("Stats guide: http://pastebin.com/iZCBbynu");
    },
};
