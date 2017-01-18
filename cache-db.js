/**
 * 
 * CACHE_DB
 * 
 * A JSON database with easy multi-level setting, and timed writes
 * This is useful for:
 * - large files.
 * - files that are rapidly written to in succession.
 * - ability to quickly close and open a new database file.
 * 
 * All data is cached until the writing stage is triggered.
 * 
 * ## To initiate
 * ==============
 * let cachedb = require("./cachedb");
 * let db = new cachedb();
 * db.load("test"); // loads test.js, returns db object for chaining.
 * 
 * ## To set change default write interval
 * db.setTimer(60000); // will write now, then once again in 60000 milliseconds, returns db object for chaining
 * 
 * ## To set data
 * ==============
 * db.set(["love", "is", "awesome"], true); // {"love":{"is":{"awesome":true}}}
 * // This always returns the db object for chaining
 * 
 * ## To get data
 * ==============
 * db.get(["love", "is", "awesome", "not"], false); // false
 * 
 * ## To delete something in the cache
 * ===================================
 * db.delete(["love", "is", "awesome", "not"]); // returns db object for chaining
 * 
 * ## To check if a key exists
 * ===========================
 * db.has(["love", "is", "awesome", "not"]); // checks if the destination exists, returns a falsy value
 * 
 * ## To close a database
 * db.close(); // writes to file clears timers, clears cache and closes the database
 * 
 * ## To DELETE a database
 * db.drop(); // same as close, except if you have a database loaded, this will delete the file
 * 
 * This module can be used just as a easy set JSON object as well.  Simply dont set a destination
 * for the database to write to.
 * 
 */

"use strict";

const fs = require('graceful-fs');

class CacheDB {
	constructor () {
	    this.interval = 30000;  // default at 30 seconds
	    this.dir = null;
		
	    this.cache = {};
	    this.changes = false;
	    this.writeInterval = setInterval(() => this.write(), this.interval);
	}
	
	load(dir) {
	    if (this.dir) this.close();
	    
	    dir = dir + ".json";
	    
	    if (!fs.existsSync(dir)) fs.writeFileSync(dir, "{}");
	    try {
	        this.cache = JSON.parse(fs.readFileSync(dir));
	    } catch (e) {
	        console.log("ERROR LOADING DATABASE: " + dir + "\n\n" + e.stack);
	        return this;
	    }
	    this.dir = dir;
	    this.temp = dir.replace(/\.json$/i, "_.json");
	    return this;
	}
	
        setTimer(value) {
            if (value === this.interval) return false;
            this.write();
    
            this.interval = value;
            clearInterval(this.writeInterval);
            if (value === false) return this;
        
            // restart timer
            this.writeInterval = setInterval(() => this.write(), this.interval);
            return this;
        }
	
	write() {
		if (this.dir && this.changes) {
			// write in the temporary directory first
		    fs.writeFile(this.temp, JSON.stringify(this.cache), err => {
		    	if (err) {
		    		return console.log("ERROR WRITING TO FILE: " + err);
		    	}
		    	// if success, rename the file.
		    	fs.rename(this.temp, this.dir, err => {
		    		if (err) {
		    			return console.log("ERROR RENAMING FILE: " + err);
		    		}
		    		this.changes = false;
		    	});
		    });
		}
	}
	
	getCache(path) {
		// will always return err{} if path not found
		if (typeof path === "string") path = [path]; // stick it into an array
		
		let stage = Object.assign({}, this.cache);
		let repeats = path.length;
		for (let i = 0; i < repeats; i++) {
			let p = path[i];
			if (!stage[p]) return null;
			if (i === repeats - 1) {
				// special treatment - set the value
				return stage[p];
			}
			stage = stage[p];
		}
	}
	
	get(path, defaultValue) {
	    if (!path) return null;
		if (typeof path === "string") path = [path]; // stick it into an array
		let cache = this.getCache(path);
		return cache || defaultValue;
	}
	
	set(path, value) {
		if (!path) return false;
		if (typeof path === "string") path = [path]; // stick it into an array
		
		// navigate to the right level of the object and save value in the cache
		let stage = this.cache;
		let repeats = path.length;
		for (let i = 0; i < repeats; i++) {
			let p = path[i];
			if (i === repeats - 1) {
				// special treatment - set the value
				stage[p] = value;
				this.changes = true;
				return this;
			}
			if (!Object.isObject(stage[p]) || !stage[p] ) stage[p] = {};
			stage = stage[p];
		}
		return this;
	}
	
	has(path) {
		if (typeof path === "string") path = [path]; // stick it into an array
		return this.getCache(path) !== null || Db("mondb").has(path);
	}
	
	delete(path) {
		// will always return null if path not found
		if (typeof path === "string") path = [path]; // stick it into an array
		
		let stage = this.cache;
		let repeats = path.length;
		for (let i = 0; i < repeats; i++) {
			let p = path[i];
			if (i === repeats - 1) {
				// special treatment - set the value
				delete stage[p];
				this.changes = true;
				return true;
			}
			if (!stage[p]) return null;
			stage = stage[p];
		}
		return this;
	}

	drop() {
	    let dir = this.dir;
	    
	    // close database first
	    this.close();
	    
	    // drop the file
	    if (dir) fs.unlinkSync(dir);
	}
	
	close() {
		this.write();
	    this.cache = {};
		clearInterval(this.writeInterval);
		this.writeInterval = null;
		this.dir = null;
	}
}

module.exports = CacheDB;
