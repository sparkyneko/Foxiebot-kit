"use strict";

if (!Monitor.wmInitialized) {
    Events.on(['j', 'J'], (id, room, type, message) => {
        const user = Users.get(message);
        const wm = Db('wm').get(room.id);

        if (!wm || wm.disabled || !wm.message || Db('ignorewm').has(user.userid)) return false;
        user.sendTo(wm.message);
    });
    Monitor.wmInitialized = true;
}

exports.commands = {
    welcome: 'wm',
    wm: function (target, room, user) {
        if (!this.can('set')) return false;
        const [cmd, ...bits] = target.split(' ');
        
        if (cmd === 'ignore') {
            Db('ignorewm').set(user.userid, true);
            this.send('You are now ignoring welcome messages.')
        } else if (cmd === 'unignore') {
            Db('ignorewm').delete(user.userid);
            this.send("You are no longer ignoring welcome messages.");
        }
        
        if (cmd === 'disable' || cmd === 'off') {
            Db('wm').set([room.id, 'disabled'], true);
            this.send('The welcome message has been disabled.');
        } else if (cmd === 'on' || cmd === 'enable') {
            Db('wm').delete([room.id, 'disabled']);
            this.send('The welcome message has been enabled.');
        } else if (cmd === 'view') {
            this.send('The welcome message is: ' + Db('wm').get([room.id, 'message'], 'not set yet.'));
        } else if (cmd === 'set') {
            Db('wm').set([room.id, 'message'], bits.join(' ').trim());
            Db('wm').delete([room.id, 'disabled']);
            this.send('The welcome message has been set.');
        }
    },
};