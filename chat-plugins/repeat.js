"use strict";
exports.commands = {
    repeat: function(target, room, user) {
        if (!this.can("repeat")) return false;
        if (room.id.indexOf("groupchat-") === 0 && !user.hasBotRank("%")) return this.send("You do not have permission to use this in groupchats.");
        if (!target) return this.parse("/help repeat");
        var parts = target.split(",");
        switch (toId(parts.shift())) {
            case "set":
                if (room.repeat) return this.send("There is already a repeat in this room.");
                if (parts.length < 2) return this.parse("/help repeat");
                
                var time = Number(parts[0]);
                var message = parts.slice(1).join(",").trim();
                if (!time || isNaN(time) || time < 5) return this.send("The time must be a real number greater than 5");
                // update room.end to clear repeat;
                room.end = () => {
                    clearInterval(room.timer);
                    if (room.game) room.game.destroy();
                    if (room.repeat) clearInterval(room.repeat);
                };
                // room.repeat
                var self = this;
                room.repeat = setInterval(() => {
                    self.send(removeCommand(message).replace(/^\/\/(announce|wall)\s/i, "/announce ").replace(/^\/\/declare\s/i, "/declare "));
                }, time * 60000);
                this.send("I will be repeating that message once every " + time + " minutes.");
                break;
            case "stop":
                if (!room.repeat) return this.send("There is no repeat going on.");
                clearInterval(room.repeat);
                delete room.repeat;
                this.send("The repeat was stopped.");
                break;
            default:
                return this.parse("/help repeat");
                break;
        }
    },
};
