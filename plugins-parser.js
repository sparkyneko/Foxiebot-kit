'use strict';
const plugins = exports.Plugins = {
    random: function (base, start, decimals) {
        decimals = parseInt(decimals) || 0;
        start = parseInt(start) || 0;
        base = parseInt(base) || 0;
        
        let diff = Math.abs(base - start);
        
        let res = Math.random() * diff + (start > base ? base : start);
        return res.toFixed(decimals);
    },
    
    runCustomCommand: function (target, room, user, customCommand, pm, levelsDeep) {
        let parts = target.split(",").map(p => p.trim());
        
        this.canBroadcast = user.hasRank(room, customCommand.rank);
        
        customCommand.text.forEach(text => {
            let reply = text
                // custom arguments 
                // the entire thing
                .replace(/{arg}/g, target)
                .replace(/{arg\[(?:(?!\]\}).)+\]}/g, m => {
                    if (m.includes(",")) {
                        let subparts = m.match(/\[(?:(?!\]\}).)+\]/)[0].slice(1, -1).split(",");
                        let [min, max, joiner] = subparts;
                        
                        min = parseInt(min);
                        max = parseInt(max);
                    
                        if (!min) min = 0;
                        if (isNaN(max)) max = parts.length;
                        
                        joiner = joiner.replace(/^\s(?!$)/, "");
                        
                        if (!joiner) joiner = ", ";
                        
                        return parts.slice(min, max).join(joiner);
                    } else {
                        let index = m.replace(/[^0-9]/g, "");
                        return parts[index] || "";
                    }
                })
                
                // preset randoms
                .replace(/{choose\[(?:(?!\]\}).)+\]}/g, m => {
                    let subparts = m.match(/\[(?:(?!\]\}).)+\]/)[0].slice(1, -1).split(",").map(p => p.trim());

                    return subparts[Math.floor(Math.random() * subparts.length)] || ""; 
                })
                .replace(/{rand\[(?:(?!\]\}).)+\]}/g, m => {
                    let subparts = m.match(/\[(?:(?!\]\}).)+\]/)[0].slice(1, -1).split(",").map(p => p.trim());
                    return plugins.random(...subparts);
                })
                
                // preset randoms
                .replace(/{pick}/g, m => {
                    return parts[Math.floor(Math.random() * parts.length)];
                })

                // users
                .replace(/{by}/g, user.name)
                .replace(/{arg\/by}/g, target || user.name);
                
            if (/^{parse}/i.test(reply)) {
                let cmd = reply
                    .replace(/^{parse}[\s]?/i, "");
                return this.parse(cmd);
            }
            
            this.send(removeCommand(reply));
        });
    },
};
