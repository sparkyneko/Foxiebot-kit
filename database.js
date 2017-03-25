"use strict";
const cache = require("./cache-db");
const fs = require("graceful-fs");

function Database (path, spawnOptions) {
    let databases = {};
    let options = spawnOptions || {};
    
    // load the files and the directory
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    
    fs.readdir(path, files => {
        if (!files) return; // nothing intialized!
        files.forEach(f => spawndb(f));
    });
    
    function spawndb(id) {
        if (databases[id]) return;
        let db = new cache();
        db.load(path + "/" + id);
        if (options.timer) db.setTimer(spawnOptions.timer);
        databases[id] = db;
    }

    // the actual database
    function db (id) {
        if (!databases[id]) spawndb(id);
        return databases[id];
    }

    db.write = function () {
        for (let i in databases) {
            databases[i].write();
        }
    };
    
    db.keys = function() {
        return Object.keys(databases);
    }
    
    db.hasKey = function (id) {
        return id in databases;
    };
    
    db.config = function (id, value) {
        options[id] = value;
    };
    
    db.drop = function (id) {
        if (!this.hasKey(id)) return;
        databases[id].drop();
        delete databases[id]; // do not track anymore
    };
    
    db.spawn = spawndb;

    return db;
}

module.exports = Database;
