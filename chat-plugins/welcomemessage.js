"use strict";

// load welcome messages for rooms.
if (!Rooms.joinEvent) {
    Rooms.joinEvent = {};
    
    let data = Db("welcomemessage").object();
    
    for (let roomid in data) {
        loadJoinPhrase(roomid);
    }
}

function loadJoinPhrase(roomid) {
    Events.on(["j", "J"], {room: roomid}, (id, room, type, msg) => {
        let user = Users.get(msg);
        if (user.welcomeCooldown && user.welcomeCooldown[room.id]) return;
        
        let phrase = Db("welcomemessage").get([room.id, user.userid], null);
        if (phrase) {
            room.send(null, phrase);

            if (!user.welcomeCooldown) user.welcomeCooldown = {};
            user.welcomeCooldown[room.id] = true;
        }
    });
    Rooms.joinEvent[roomid] = true;
}


exports.commands = {
    "wm": "welcomemessage",
    "joinphrase": "welcomemessage",
    "welcomemessage": function (target, room, user) {
        if (!this.can("welcomemessage")|| !room) return false;
        if (!target) {
            if (Db("welcomemessage").get([room.id, user.userid])) return this.send("Your current message for this room is: " + Db("welcomemessage").get([room.id, user.userid]));
            return false;
        }
        if (target === "off") {
            Db("welcomemessage").delete([room.id, user.userid]);
            return this.send("Your welcome message has been removed");
        }
        target.trim();
        if (/^(\/|\!)(?!me\b|mee\b).+?/i.test(target)) return this.send("Sorry the only command accepted for these messages is /me");
        Db("welcomemessage").set([room.id, user.userid], target);
        this.send("Your welcome message has been set to: " + target);
        if (!Rooms.joinEvent[room.id]) {
            loadJoinPhrase(room.id);
        }
    },
};
