'use strict';

const myGroupchat = function() {
	return `groupchat-${toId(Monitor.username)}-`;
};
const cache_db = require("../cache-db");

Tools.escapeHTML = function (str) {
	if (!str) return '';
	return ('' + str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/\//g, '&#x2f;');
};

Tools.unEscapeHTML = function (str) {
	if (!str) return '';
	let result = ('' + str).replace(/&#x2f;/g, '\/').replace(/&apos;/g, '\'').replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
	return result;
};

// initiate database, and listeners
if (!Monitor.groupchats) {
    log("info", "Initiating groupchats module.");
	Monitor.groupchats = {};
	Monitor.groupchats.initiating = {};

	Monitor.groupchats.db = new cache_db();
	Monitor.groupchats.db.load("config/groupchats").setTimer(false);


	Events.on(["deinit", "noinit"], (id, room, msgType) => {
		let gc = groupchatExists(room.id);
		if (!gc) return false;
		
		Monitor.groupchats.initiating[room.id] = true;
		
		// remake the room!
		send("|/makegroupchat " + gc.title);
	});

	Events.on("init", (id, room) => {
		if (!Monitor.groupchats.initiating[room.id]) return;
		delete Monitor.groupchats.initiating[room.id];
		
		// rejoining the groupchat
		let gc = groupchatExists(room.id);
		if (!gc) return false;
		
		if (gc.roomintro) room.send(null, "/roomintro " + gc.roomintro);
	});
	
	Events.on(["j", "J", "n", "N"], (id, room, msgType, msg) => {
		// rejoining the groupchat
		let gc = groupchatExists(room.id);
		if (!gc) return false;
		
		let userid = toId(msg.split("|")[0].trim());
		let rank = gc.auth[userid];

		const levels = {
		    "%": "driver",
		    "@": "mod",
		    "+": "voice",
	    };
		
		if (!rank || room.users.get(userid) === rank) return;
		room.send(null, "/room" + levels[rank] + " " + userid);
	});
}

let db = Monitor.groupchats.db;

const groupchatExists = Monitor.groupchats.exists = function (roomid) {
	if (roomid.indexOf("groupchat-") !== 0) return;
	let data = db.cache;
	
	for (let i in data) {
		let chatid = myGroupchat() + toId(db.get([i, "title"], ""));
		if (chatid === roomid) return db.get(i);
	}
	return false;
};

const groupchatOwner = Monitor.groupchats.owner = function (room, user) {
	if (!room || !user) return false;
	let gc = groupchatExists(room.id);
	
	if (gc && (gc.owner === user.userid || user.hasBotRank("~"))) return true;
	return false;
};

const setAuth = Monitor.groupchats.setAuth = function (room, id, level) {
	let gc = groupchatExists(room.id);
	id = toId(id);
	
	if (gc.auth[id] === level) return room.send(null, "ERROR: The target user is already the specified rank.");
	
	const levels = {
		"%": "driver",
		"@": "mod",
		"+": "voice",
		" ": "deauth",
	};
	
	if (!levels[level]) return false; // invalid rank.
	
	let cmd = "/room" + levels[level] + " " + id;
	
	// error and success detection
	let error = Events.listen("html", {
		pattern: /^<div class="message-error">/,
		room: room.id,
	}, (id, room, msgType, msg) => {
		room.send(null, "ERROR: " + Tools.unEscapeHTML(msg).replace(/(^<div.+?>|<\/div>$)/g, ""));
		clearListeners();
	});
	
	let success = Events.listen(["N", "n"], {
	    room: room.id,
	    pattern: new RegExp("\\" + level + id.replace(/.(?!$)/g, m => m + "[^a-z0-9]*") + "\\|", "i"),
    }, () => {
	    db.set([gc.owner, "auth", id], level).write();
	    clearListeners();
	});
	
	let timer;
	if (!room.users.has(id) || room.users.get(id) === level) {
	    timer = setTimeout(() => {
		   // no error? assume it went through.
		   db.set([gc.owner, "auth", id], level).write();
		   clearListeners();
	    }, 1500);
	}
	
	function clearListeners() {
		Events.removeListener(error.id);
		Events.removeListener(success.id);
		clearTimeout(timer);
	}
	
	room.send(null, cmd);
};

const getAuth = Monitor.groupchats.getAuth = function (room, userid) {
	let gc = groupchatExists(room.id);
	
	return gc.auth[userid] || " ";
};

function parseHastebin(url) {
	return new Promise((resolve, reject) => {
		if (url.indexOf("https://hastebin.com/raw/") !== 0 && url.indexOf("http://pastebin.com/raw/") !== 0) return resolve(url);
		
		let http_https = url.indexOf("https") === 0 ? "https" : "http";
		
		require(http_https).get(url, res => {
			let data = '';
			res.on('data', part => {
				data += part;
			});
			res.on('end', () => {
				resolve(data);
			});
			res.on('error', err => {
				reject(err);
			});
		});
	});
}

exports.commands = {
	roomintro: function (target, room, user) {
		if (!groupchatOwner(room, user) || !target) return false;
		
		parseHastebin(target).then(html => {
			// listen for error
			let htmlError = Events.listen("html", {
				pattern: /^<div class="message-error">/,
				room: room.id,
			}, (id, room, msgType, msg) => {
				this.send("ERROR: " + Tools.unEscapeHTML(msg).replace(/(^<div.+?>|<\/div>$)/g, ""));
				clearListeners();
			});
			
			// listen for success
			let introSet = Events.listen("raw", {
				pattern: /^<div class="infobox infobox-limited">/,
				room: room.id,
			}, () => {
				this.send("Roomintro set.");
				db.set([user.userid, "roomintro"], html).write();
				clearListeners();
			});
			
			function clearListeners() {
				Events.removeListener(htmlError.id);
				Events.removeListener(introSet.id);
			}
			this.send("/roomintro " + html);
		}).catch(err => {
			this.send("ERROR: " + err);
		});
	},
	
	roommod: function (target, room, user) {
		if (!groupchatOwner(room, user) || !target) return false;
		
		setAuth(room, target, "@");
	},
	
	roomdriver: function (target, room, user) {
		if (!user.hasRank(room, "@") || !groupchatExists(room.id) || !target) return false;
		
		if (getAuth(room, toId(target)) === "@" && !groupchatOwner(room, user)) return false; 
		
		setAuth(room, target, "%");
	},
	
	roomvoice: function (target, room, user) {
		if (!user.hasRank(room, "%") || !groupchatExists(room.id) || !target) return false;
		
		let targetAuth = getAuth(room, toId(target));
		
		if (targetAuth === "@" && !groupchatOwner(room, user)) return false;
		if (targetAuth === "%" && !user.hasRank(room, "@")) return false; 
		
		setAuth(room, target, "+");
	},
	
	roomdeauth: function (target, room, user) {
		if (!user.hasRank(room, "%") || !groupchatExists(room.id) || !target) return false;
		
		let targetAuth = getAuth(room, toId(target));

		if (targetAuth !== "+") return this.send("Please demote the user to voice first before completely deauthing.");
		
		setAuth(room, target, " ");
	},
	
	allowgroupchat: function (target, room, user) {
		if (!this.can("dev") || !target) return false;
		let targetId = toId(target);
		
		if (db.has(target)) return this.send("The targetuser is already allowed to request groupchats from the bot.");
		db.set(target, true).write();
		this.send("The targetuser is now allowed to request a groupchat from the bot.");
	},
	
	disallowgroupchat: function (target, room, user) {
		if (!this.can("dev") || !target) return false;
		let targetId = toId(target);
		
		if (!db.has(target)) return this.send("The targetuser has not been allowed to request groupchats.");
		db.delete(target).write();
		this.send("The targetuser is now disallowed to request a groupchat from the bot.");
	},
	
	groupchat: function (target, room, user) {
		if (!db.has(user.userid)) return this.send("Access denied.");
		
		let gc = db.get(user.userid, null);
		let gcSetup = typeof gc === "object";
		
		if (!gcSetup || target) {
			if (!gcSetup && !target) return this.send("Please include a name for the groupchat.");
			if (gcSetup) {
				let id = myGroupchat() + toId(gc.title);
				if (Rooms.rooms.has(id)) return this.send("You already have the groupchat: <<" + id + ">>.  Please wait until this expires before making a new groupchat.");
			}
			
			if (groupchatExists(myGroupchat() + toId(target))) return this.send("This groupchat title is already taken.");
			
			db.set(user.userid, {
				title: target,
				auth: {},
				owner: user.userid,
			}).write();
		}
		
		gc = db.get(user.userid); // get updated one
		let id = myGroupchat() + toId(gc.title);
		if (Rooms.rooms.has(id)) return this.send("<<" + id + ">>");
			
		let error = Events.listen("html", {room: "lobby", pattern: /\<div class\=\"message\-error\"\>/i}, (i, room, msgType, message) => {
			this.send(message.replace(/\<[^\>]+?\>/gi, ""));
			clearListeners();
		});
		
		let success = Events.listen("init", {room: id}, () => {
			this.send("Your groupchat is ready - <<" + id + ">>");
			clearListeners();
		});
		
		function clearListeners() {
			Events.removeListener(success.id);
			Events.removeListener(error.id);
		}
		
		send("|/makegroupchat " + gc.title);
	},
	
	showimage: function (target, room, user) {
		if (!groupchatOwner(room, user) || !user.hasBotRank("%")) return false;
		
		let [url, height] = target.split(",").map(p => p.trim());
		height = parseInt(height) || 400;
		
		room.send(user.userid, `!htmlbox <div style="background-image: url(${url}); background-size: contain; background-position: center; background-color: black; height: ${height}px; background-repeat: no-repeat"></div>`);
	},
};
