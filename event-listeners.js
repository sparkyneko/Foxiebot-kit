"use strict";

class EventListener {
    constructor() {
        this.listeners = {};
        this.count = 0;
    }
    
    // add a permanent listener.
    on(msgType, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        
        if (!Array.isArray(msgType)) msgType = [msgType];
        
        options = Object.assign({
            repeat: true,
            room: true,
            msgType: msgType,
            callback: callback,
            pattern: null,
        }, options);
        
        return this.addListener(options);
    }
    
    // add a one time listener
    listen(msgType, options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        
        if (!Array.isArray(msgType)) msgType = [msgType];
        
        options = Object.assign({
            repeat: 1,
            room: true,
            msgType: msgType,
            callback: callback,
            pattern: null,
        }, options);
        
        return this.addListener(options);
    }
    
    
    addListener(options) {
        this.count++;
        let id = "listener-" + this.count;
        
        options.id = id;
        
        this.listeners[id] = options;
        return options;
    }
    
    removeListener(id) {
        delete this.listeners[id];
    }
    
    // where data is fed into the event listener.
    onEvent(room, msgType, message) {
        for (let i in this.listeners) {
            let options = this.listeners[i];
            
            // past tests
            if (!options.msgType.includes(msgType)) continue;
            if (options.room !== true && options.room !== room.id) continue;
            if (options.pattern && !options.pattern.test(message)) continue;
            
            options.callback(i, room, msgType, message);
            
            if (options.repeat === true) continue;
            options.repeat--;
            
            if (!options.repeat) this.removeListener(i);
        }
    }
}

module.exports = new EventListener();