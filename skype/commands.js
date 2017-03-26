"use strict";

let db = Monitor.statistics.database;
const Graph = require("../graph");

module.exports = {
    reload: function (target, convo, user) {
        if (user.userid !== "sparkychildcharlie") return false;
        log("info", user.name + " (" + user.userid + ") reloaded the skype bot.");
        SkypeBot.reload();
        SkypeBot.send(convo, "Reloaded commands.")
    },
    
    js: function (target, convo, user) {
        if (user.userid !== "sparkychildcharlie") return false;
        let result;
        try {
            result = eval(target);
            SkypeBot.send(convo, result);
        } catch (e) {
            SkypeBot.send(convo, "ERROR: " + e);
        }
    },
    
    authenticate: function (target, convo, user) {
        let [id, key] = target.split(",").map(p => p.trim());
        id = toId(id);
        if (db("auth-keys").has([id, "authenticated", convo])) return SkypeBot.send(convo, "This convo is already authenticated for statistics in " + id + ".");
        
        if (db("auth-keys").get([id, "key"], null) !== key) return SkypeBot.send(convo, "Invalid key.");
        
        db("auth-keys").set([id, "authenticated", convo], true);
        db("auth-keys").delete([id, "key"]).write();
        
        SkypeBot.send(convo, "Authenticated.");
    },
    
    userstats: function (target, convo, user) {
        let room;
        [room, target] = target.split(",").map(p => p.trim());
        room = toId(room, true);
        target = toId(target);
        
        if (!db("auth-keys").has([room, "authenticated", convo])) return SkypeBot.send(convo, "Access denied.");
        
        if (!target) return this.parse("/help userstats");
        
        Monitor.statistics.runSearch("userstats", room, target).then(data => {
            Graph(data, {
                maxBars: 40,
                title: "User statistics for '" + toId(target) + "' in " + room,
            }).then(graph => {
                Tools.uploadToHastebin(graph, link => {
                    SkypeBot.send(convo, link);
                });
            }).catch(err => {
                SkypeBot.send(convo, "GRAPH ERROR: " + err);
                console.log(err.stack);
            });
        }).catch(err => {
            SkypeBot.send(convo, "SEARCH ERROR: " + err);
            console.log(err.stack);
        });
    },
    
    usertimezone: function (target, convo, user) {
        let room;
        [room, target] = target.split(",").map(p => p.trim());
        room = toId(room, true);
        target = toId(target);
        
        if (!db("auth-keys").has([room, "authenticated", convo])) return SkypeBot.send(convo, "Access denied.");
        
        if (!target) return this.parse("/help usertimezone");
        
        Monitor.statistics.runSearch("timezone", room, target).then(data => {
            Graph(data, {
                maxBars: 40,
                title: "Timezone statistics for '" + toId(target) + "' in " + room,
            }).then(graph => {
                Tools.uploadToHastebin(graph, link => {
                    SkypeBot.send(convo, link);
                });
            }).catch(err => {
                SkypeBot.send(convo, "GRAPH ERROR: " + err);
                console.log(err.stack);
            });
        }).catch(err => {
            SkypeBot.send(convo, "SEARCH ERROR: " + err);
            console.log(err.stack);
        });
    },
    
    roomstats: function (target, convo, user) {
        let room;
        [room, target] = target.split(",").map(p => p.trim());
        room = toId(room, true);
        
        if (!db("auth-keys").has([room, "authenticated", convo])) return SkypeBot.send(convo, "Access denied.");
        
        if (!target) return this.parse("/help roomstats");
        
        Monitor.statistics.runSearch("roomstats", room, target).then(data => {
            Graph(data, {
                maxBars: 40,
                title: "Room statistics for '" + room + "' on " + target,
                sort: "values",
            }).then(graph => {
                Tools.uploadToHastebin(graph, link => {
                    SkypeBot.send(convo, link);
                });
            }).catch(err => {
                SkypeBot.send(convo, "GRAPH ERROR: " + err);
                console.log(err.stack);
            });
        }).catch(err => {
            SkypeBot.send(convo, "SEARCH ERROR: " + err);
            console.log(err.stack);
        });
    },
    statshelp: function (target, convo, user) {
        SkypeBot.send(convo, "Stats guide: http://pastebin.com/iZCBbynu");
    },
};
