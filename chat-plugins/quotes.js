"use strict";

Config.settableCommands.quotes = true;

exports.commands = {
    q: "quote",
    quote: function (target, room, user) {
        if (!room || !this.can("quotes")) return false;
        let quotes = Object.keys(Db("quotes").get(room.id, {}));
        if (!quotes.length) return false;
        
        let id = parseInt(target);
        
        let quote = id && quotes[id - 1] ? quotes[id - 1] : quotes[Math.floor(Math.random() * quotes.length)];
        
        this.send(quote);
    },
    
    addquote: function (target, room, user) {
        if (!room || !this.can("quotes")) return false;
        
        if (Db("quotes").has([room.id, target])) return this.send("The quote already exists.");
        
        Db("quotes").set([room.id, target], 1);
        this.send("Added a new quote.");
    },
    
    deletequote: "delquote",
    delquote: function (target, room, user) {
        if (!room || !this.can("quotes")) return false;
        
        if (parseInt(target)) {
            let id = parseInt(target);
            let quotes = Object.keys(Db("quotes").get(room.id, {}));
            if (!quotes[id - 1]) return this.send("Invalid quote ID.");
            
            target = quotes[id - 1];
        }
        
        if (!Db("quotes").has([room.id, target])) return this.send("The quote does not exists.");
        
        Db("quotes").delete([room.id, target]);
        this.send("Deleted the quote.");
    },
    
    quotes: function (target, room, user) {
        if (!room) {
            if (!Rooms.rooms.has(toId(target, true))) return this.send("Invalid room.");
            room = Rooms.get(target);
        }
        
        if (!user.can("quotes", room)) return false;
        let quotes = Object.keys(Db("quotes").get(room.id, {}))
            .map((q, i) => (i + 1) + ". " + q);
        
        Tools.uploadToHastebin(quotes.join("\n\n"), link => this.send("Quotes for " + room.name + ": " + link));
    }
}
