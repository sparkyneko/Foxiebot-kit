"use strict";
const path = require("path");
const Skyweb = require("skyweb");
const fs = require("fs");

const skypeAccount = Config.skypeAccount || null;
let errorListener;

global.SkypeBot = require("./bot");

log("info", "Initiating skype...");
// connect to Skype!

function initiate () {
    global.skyweb = new Skyweb();
    if (!skypeAccount) return log("error", "No skype account found - deprecating skype feature.");
    skyweb.login(skypeAccount.name, skypeAccount.pass).then(account => {
        log("ok", "Logged in to skype as: " + account._selfInfo.displayname);
    });
    
    // friend requests?
    skyweb.authRequestCallback = function (requests) {
        requests.forEach(request => {
            skyweb.acceptAuthRequest(request.sender);
            skyweb.sendMessage("8:" + request.sender, "I accepted you!");
            log("request", "Accepted: " + request.sender);
        });
    };

    skyweb.messagesCallback = function (messages) {
        messages.forEach(message => {
            if (message.resource.from.indexOf(skypeAccount.name) === -1 && message.resource.messagetype !== "Control/Typing" && message.resource.messagetype !== "Control/ClearTyping") {
                SkypeBot.receive(message);
            }
        });
    };
    
    errorListener = (eventName, err) => {
        log("error", err);
        if (err.includes("Failed to send message") || err.includes("Failed to poll message")) {
            log("info", "Trying to login to skype again...");
            reinitiate(); // try logging in again.
        }
    };
    skyweb.on('error', errorListener); // Adding error listener 
}

function reinitiate() {
    // run the death sequence
    // remove the 2 old "listeners"
    skyweb.messagesCallback = null;
    skyweb.authRequestCallback = null;
    
    skyweb.un("error", errorListener);
    delete global.skyweb;
    
    initiate(); // a new skyweb is reborn
}

initiate();
