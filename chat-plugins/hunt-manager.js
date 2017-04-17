"use strict";

exports.commands = {
    addhunt: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers") || !user.hasRank(Rooms.get("scavengers"), "+")) return this.send("The bot must be in the scavengers room for this to work. You must also have at least + in the scavengers room.");
        
        let [id, link] = target.split(", ");
        id = toId(id, true);
        link = link.trim();
        
        if (Db("hunts").has(id)) return this.send("That ID is already taken.");
        
        Db("hunts").set(id, {
            link: link,
            addedBy: user.userid,
            date: Date.now(),
            qc: [],
            views: [user.userid],
        });
        
        this.send("Added.");
    },
    
    deletehunt: "removehunt",
    removehunt: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers")) return this.send("The bot must be in the scavengers room for this to work.")
        let scav = Rooms.get("scavengers");
        if (!user.hasRank(scav, "+")) return this.send("You must be in the scavengers room, and have at least + in the scavengers room.");
        let id = toId(target, true);
        
        let targetHunt = Db("hunts").get(id, null);
        
        if (!targetHunt) return this.send("Invalid hunt.");
        
        if (!user.hasRank(scav, "%") && targetHunt.addedBy !== user.userid) return this.send("You are not permitted to remove this hunt.");
        
        Db("hunts").delete(id);
        
        this.send("Deleted.");
    },
    
    viewhunt: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers")) return this.send("The bot must be in the scavengers room for this to work.")
        let scav = Rooms.get("scavengers");
        if (!user.hasRank(scav, "+")) return this.send("You must be in the scavengers room, and have at least + in the scavengers room.");
        let id = toId(target, true);
        
        let targetHunt = Db("hunts").get(id, null);
        
        if (!targetHunt) return this.send("Invalid hunt.");
        
        if (!user.hasRank(scav, "%") && targetHunt.addedBy !== user.userid) return this.send("You are not permitted to remove this hunt.");
        
        if (!targetHunt.views.includes(user.userid)) {
            targetHunt.views.push(user.userid);
            Db("hunts").get(id, targetHunt);
        }
        
        user.sendTo(`**By**: ${targetHunt.addedBy}. **Date**: ${getEST(targetHunt.date)}. **Link**: ${targetHunt.link}. **Views** (${targetHunt.views.length}): ${targetHunt.views.join(", ")}. ${targetHunt.qc.length ? `**QCs** (${targetHunt.qc.length}): ${targetHunt.qc.join(", ")}` : ''}`);
    },
    
    qchunt: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers")) return this.send("The bot must be in the scavengers room for this to work.")
        let scav = Rooms.get("scavengers");
        if (!user.hasRank(scav, "%")) return this.send("You must be in the scavengers room, and have at least % in the scavengers room.");
        let id = toId(target, true);
        
        let targetHunt = Db("hunts").get(id, null);
        
        if (!targetHunt) return this.send("Invalid hunt.");
        
        if (!targetHunt.views.includes(user.userid)) return this.send("You cannot QC a hunt you have not seen yet.");
        if (targetHunt.qc.includes(user.userid)) return this.send("You have already QC'd this hunt");
        if (targetHunt.addedBy === user.userid) return this.send("You cannot QC your own hunts.");
        
        targetHunt.qc.push(user.userid);
        
        Db("hunts").set(id, targetHunt);
        
        this.send("QC'd.");
    },
    
    userhunts: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers")) return this.send("The bot must be in the scavengers room for this to work.")
        let scav = Rooms.get("scavengers");
        target = toId(target);
        if (!user.hasRank(scav, "%") && user.userid !== target) return this.send("The user must be in the scavengers, and have at least % in the scavengers room.");
        
        let data = Db("hunts").object();
        
        let targetHunts = Object.keys(data).filter(id => data[id].addedBy === target);
        
        this.send(`${targetHunts.length} stored hunt${targetHunts.length === 1 ? "" : "s"} by ${target}: ${targetHunts.join(", ")}`);
    },
    
    pendinghunts: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers")) return this.send("The bot must be in the scavengers room for this to work.")
        let scav = Rooms.get("scavengers");
        target = toId(target);
        if (!user.hasRank(scav, "%") && user.userid !== target) return this.send("The user must be in the scavengers, and have at least % in the scavengers room.");
        
        let data = Db("hunts").object();
        
        let targetHunts = Object.keys(data).filter(id => data[id].qc.length < 2).map(key => (data[key].qc.includes(user.userid) ? "__" : "**") + key + " [QC " + data[key].qc.length + "/2]" + (data[key].qc.includes(user.userid) ? "__" : "**"));
        
        this.send(`**Pending** (${targetHunts.length}): ${targetHunts.join(", ")}`);
    },
    
    readyhunts: function (target, room, user) {
        if (!Rooms.rooms.has("scavengers")) return this.send("The bot must be in the scavengers room for this to work.")
        let scav = Rooms.get("scavengers");
        target = toId(target);
        if (!user.hasRank(scav, "%") && user.userid !== target) return this.send("The user must be in the scavengers, and have at least % in the scavengers room.");
        
        let data = Db("hunts").object();
        
        let targetHunts = Object.keys(data).filter(id => data[id].qc.length >= 2);
        
        this.send(`**Ready** (${targetHunts.length}): ${targetHunts.join(", ")}`);
    },
    
    scavhelp: function () {
        this.send("Hunt-Manager guide: https://pastebin.com/8CbAPjLd");
    },
};