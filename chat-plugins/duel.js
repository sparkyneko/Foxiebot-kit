"use strict";
const getFigureData = require("../pd-tools/data-downloader");

// allow settable permissions
Config.settableCommands.duel = true;

exports.commands = {
    updateduel: function (target, room, user) {
        if (!this.can("dev")) return false;
        
        if (Monitor.downloadSequence) return this.send("Please wait until the previous download sequence is finished before starting a new one.");
        Monitor.downloadSequence = true;
        this.send("Starting download sequence... this may take a few minutes.");
        
        // set delay to 300
        log("info", user.name + " has initiated a new download sequence.");
        getFigureData(300)
        .then(count => {
            Monitor.downloadSequence = false;

            Tools.uncacheTree("./pd-tools/figures.js");
            Tools.Figures = require("../pd-tools/figures");
            this.send("Downloaded and reloaded data for " + count + " figures.");
            log("info", "Download sequence complete.");
        })
        .catch(err => {
            Monitor.downloadSequence = false;
            
            this.send("Error - failed to download and reload data: " + err);
            log("info", "Download sequence failed.");
            console.log(err.stack);
        });
    },
    
    "dd": "dueldata",
    "dt": "dueldata",
    dueldata: function (target, room, user) {
        if (target.includes(",")) return this.parse("/duelmovedata " + target);
        this.can("duel"); // new permission for dueling commands - broadcast check only
        
        target = toId(target);
        
        if (!Tools.Figures[target]) return this.send("Invalid figure.");
        
        let data = Tools.Figures[target];
        let buf = `#${data.num} - **${data.mon}** [${data.types.join("/")}] [${data.rarity} - ${data.mp}MP]`;
        if (data.ability) buf += " / " + data.ability.replace(/^.+?(?=\s-\s)/, m => `**${m}**`);
        buf += " / **Moves**: " + data.moves.map(m => `${m.name} [${(m.power === 0 ? "" : (typeof m.power === "string" ? m.power : m.power + "BP") + " x ")}${m.size}]`).join(", ");
        this.send(buf);
    },
    
    dmt: "duelmovedata",
    dmd: "duelmovedata",
    duelmovedata: function (target, room, user) {
        this.can("duel"); // new permission for dueling commands - broadcast check only
        
        let [mon, move] = target.split(",").map(toId);
        
        if (!Tools.Figures[mon]) return this.send("Invalid figure.");
        
        let moves = Tools.Figures[mon].moves;
        
        let targetMove = moves.filter(m => m.id === move);
        if (!targetMove.length) return this.send("Invalid move.");
        
        let result = targetMove.map(m => {
            let buf = "**" + m.name + "**";
            buf += ` [${(m.power === 0 ? "" : (typeof m.power === "string" ? m.power : m.power + "BP") + " x ")}${m.size}`;
            if (m.desc) buf += " - " + m.desc;
            buf += "]";
            return buf;
        });
        
        this.send(result.join(", "));
    }
};
