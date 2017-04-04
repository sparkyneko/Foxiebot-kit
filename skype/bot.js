"use strict";

const chars = Config.defaultCharacter;
let commands = require("./commands");

module.exports = {
    reload: function() {
        Tools.uncacheTree("./skype/commands.js");
        commands = require("./commands");
    },
    
    send: function (id, message) {
        message = message.toString(); 
        if (!message) return;
        
        // console.log(">>(" + (id) + ") " + message);
        skyweb.sendMessage(id, " " + this.htmlize(message).replace(/^[^a-z0-9]/i, m => " " + m)); // make sure there are no errors, dont start the message with a symbol
    },
    
    receive: function (message) {
        let conversationLink = message.resource.conversationLink;
        let id = conversationLink.substring(conversationLink.lastIndexOf("/") + 1);
        let user = {userid: message.resource.from.split("/v1/users/ME/contacts/8:")[1], name: message.resource.imdisplayname}; // that is the user's skype id
        let target = message.resource.content;
        // dehtmlize
        target = this.dehtml(target);
        if (!id || !target) return false; // ignore the message
        log("<<", "(" + id + ") " + user.name + " [" + user.userid + "]" + ": " + target);
        this.parse(id, user, target);
    },
    
    parse: function (id, user, message) {
        if (!chars.includes(message.charAt(0))) return;
        let [cmd, ...arg] = message.split(" ");
        cmd = toId(cmd);
        arg = arg.join(" ");
        
        if (!commands[cmd]) return;
        try {
            (typeof commands[cmd] === "string" ? commands[commands[cmd]] : commands[cmd])(arg, id, user);
        } catch (e) {
            console.log(e.stack);
            console.log("\nMESSAGE: " + message);
        }
    },
    
    dehtml: function (message) {
        if (message || typeof message !== "string") return "";
        // fix formatting
        message = message.replace(/(<(?:\/)?[a-z](?:\s.*?)?>)/g, m => {
            let match = toId(m);
            let formatting = match.charAt(0);
            if (formatting === "b") return "*"; // bold
            if (formatting === "s") return "~"; // strikethrough
            if (formatting === "i") return "_"; // italics
            return m;
        }).replace(/(<(?:\/)?ss type=\".+?\">.*<\/ss>)/g, m => {
            return "(" + m.split("\"")[1] + ")";
        });
        // deemotify
        // dehtmlize
        message = message.replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>').replace(/\&quot\;/g, '\"').replace(/\&apos\;/g, '\'').replace(/\&\#x2f\;/g, '\/').replace(/\&amp\;/g, '&');
        return message;
    },
    
    htmlize: function (string) {
        if (!string || typeof string !== "string") return ""; // error catch
        // potential (?:[^a-z0-9]|^)([\*]+)[^\*]+\1(?![a-z0-9]) // regex match for non letter or beginning of string
        string = string.replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>').replace(/\&quot\;/g, '\"').replace(/\&apos\;/g, '\'').replace(/\&\#x2f\;/g, '\/').replace(/\&amp\;/g, '&') // dehtmlize first
            .replace(/([\*]+)[^\*]+\1/g, m => { // bold
                return '<b>' + m.replace(/[\*]+/g, "").replace(/[\*]+$/g, "") + "</b>";
            }).replace(/([\_]+)[^\_]+\1/g, m => { // italics
                return '<i>' + m.replace(/^[\_]+/g, "").replace(/[\_]+$/g, "") + "</i>";
            }).replace(/([\~]+)[^\~]+\1/g, m => { // strikethrough
                return '<s>' + m.replace(/^[\~]+/g, "").replace(/[\~]+$/g, "") + "</s>";
            })
        return string;
    },
};
