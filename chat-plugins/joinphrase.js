"use strict";

const COOLDOWN_DURATION = 5 * 60000;

if (!Monitor.joinphraseInitialized) {
    Events.on(["j", "J"], (id, room, type, msg) => {
        let user = Users.get(msg);
        if (user.welcomeCooldown && user.welcomeCooldown[room.id] && user.welcomeCooldown[room.id] > Date.now()) return;
        
        let phrase = Db("joinphrase").get([room.id, user.userid], null);
        if (phrase) {
            room.send(null, phrase);

            if (!user.welcomeCooldown) user.welcomeCooldown = {};
            user.welcomeCooldown[room.id] = Date.now() + COOLDOWN_DURATION;
        }
    });
    Monitor.joinphraseInitialized = true;
}

exports.commands = {
    "jp": 'joinphrase',
    "joinphrase": function (target, room, user) {
        if (!this.can("joinphrase")|| !room) return false;
        if (!target) {
            if (Db("joinphrase").get([room.id, user.userid])) return this.send("Your current message for this room is: " + Db("joinphrase").get([room.id, user.userid]));
            return false;
        }
        if (target === "off") {
            Db("joinphrase").delete([room.id, user.userid]);
            return this.send("Your join phrase has been removed");
        } else if (target === 'clearall') {
            if (!this.can('set')) return this.send('Only room owners can clear all join phrases from a room.');
            Db("joinphrase").delete([room.id]);
            return this.send('All join phrases have been cleared from this room.');
        }
        target.trim();
        if (/^(\/|\!)(?!me\b|mee\b).+?/i.test(target)) return this.send("Sorry the only command accepted for these messages is /me");
        Db("joinphrase").set([room.id, user.userid], target);
        this.send("Your join phrase has been set to: " + target);
    },
};
