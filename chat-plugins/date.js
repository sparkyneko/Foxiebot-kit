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
        this.can("say");
        
        target = toId(target) || user.userid;

        getUserInfo(target).then(data => {
            if (data.registertime === 0) return this.send("This alt is not registered.");
            
            let date = getEST(data.registertime * 1000);
            
            this.send("The userid ``" + toId(target) + "`` was registered on " + date + ".");
        });
    },
    
    regtime: function (target, room, user) {
        this.can("say"); // permissions
        
        target = toId(target) || user.userid;
        
        getUserInfo(target).then(data => {
            if (data.registertime === 0) return this.send("This alt is not registered.");
            
            let time = new Date(getEST(data.registertime * 1000)).getTime();
            
            this.send("The userid ``" + toId(target) + "`` was registered " + Tools.getTimeAgo(time) + " ago.");
        });
    },
};
