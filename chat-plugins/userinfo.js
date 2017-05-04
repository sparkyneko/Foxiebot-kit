"use strict";

const http = require("http");

function getUserInfo(userid) {
    let link = 'http://pokemonshowdown.com/users/' + userid + '.json';
    return new Promise((resolve, reject) => {
        http.get(link, res => {
            var data = '';
            res.on('data', function(part) {
                data += part;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });
    });
}

exports.commands = {
    regdate: function(target, room, user) {
        this.can("broadcast");
        
        target = toId(target) || user.userid;

        getUserInfo(target).then(data => {
            if (data.registertime === 0) return this.send("This alt is not registered.");
            
            let date = getEST(data.registertime * 1000);
            
            this.send("The userid '" + target + "' was registered on " + date + ".");
        });
    },
    
    regtime: function (target, room, user) {
        this.can("broadcast"); // permissions
        
        target = toId(target) || user.userid;
        
        getUserInfo(target).then(data => {
            if (data.registertime === 0) return this.send("This alt is not registered.");
            
            let time = new Date(getEST(data.registertime * 1000)).getTime();
            
            this.send("The userid '" + target + "' was registered " + Tools.getTimeAgo(time) + " ago.");
        });
    },
    
    rank: function (target, room, user) {
        this.can("broadcast");
        
        target = toId(target) || user.userid;
        
        getUserInfo(target).then(data => {
            let ratings = data.ratings;
            let buffer = Object.keys(ratings).map(tier => `\`\`${tier}\`\` ${Math.round(ratings[tier].elo)} / ${ratings[tier].gxe}`);
            
            if (!buffer.length) return this.send(`The user '${target}' has not played any ladder games yet.`);
            this.send(`Ladder ratings for '${target}': ` + buffer.join(" | "));
        });
    },
};
