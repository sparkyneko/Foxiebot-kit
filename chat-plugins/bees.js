"use strict";

const ROUND_DURATION = 5000;
const WAIT_DURATION = 3000;

const STINGS_PER_PLAYER = 6;
const BASE_HIDE_CHANCE = 0.05;

exports.game = "bees";
exports.aliases = ["meme", "memes"];


class BeesGame extends Rooms.botGame {
    constructor(room) {
        super(room);
        
        this.gameId = "bees";
        this.gameName = "BEES";
        
        this.answerCommand = "special";
        this.state = "signups";
        this.allowJoins = true;
        
        this.round = 0;
        this.ranCount = 0;
        
        this.beesReleased = 0;
        
        this.sendRoom(`A new game of BEES is starting! Use \`\`${this.room.commandCharacter[0]}join\`\` to join the game.`);
    }
    
    onStart() {
        if (this.userList.length < 2 || this.state !== "signups") return false;
        this.state = "started";
        this.sendRoom(`Use \`\`${this.room.commandCharacter[0]}run\`\` to escape the swarm of bees.  You can choose not to run and there will be a variable chance that the bees do not notice you.`);
        
        this.startCount = this.userList.length;
        
        this.onBeforeTurn();
    }
    
    onBeforeTurn() {
        this.beesReleased = 0;
        this.round++;
        
        let pl = this.buildPlayerList();
        this.sendRoom(`Round ${this.round} | Players (${pl.count}): ${pl.players}`);
        this.timer = setTimeout(() => this.onInitTurn(), WAIT_DURATION);
    }
    
    onInitTurn() {
        this.beesReleased = 1;
        this.bigSwarm = Math.random() > 0.75;
        this.ranCount = 0;
        
        this.sendRoom(`A ${this.bigSwarm ? "big " : ""}swarm of ${["killer", "angry", "fuzzy, yellow", "bumble", "dangerous", "poisonous"][Math.floor(Math.random() * 6)]} bees has appeared!`);
        
        this.timer = setTimeout(() => this.onAfterTurn(), ROUND_DURATION);
    }
    
    onAfterTurn() {
        this.beesReleased = 0;
        let stungCount = Math.ceil(this.userList.length / 5) + (this.bigSwarm ? this.userList.length > 10 ? 2 : 1 : 0);
        
        // chance of successfully hiding
        let hideChance = (1 / this.userList.length) * 0.8;
        hideChance = hideChance < BASE_HIDE_CHANCE ? BASE_HIDE_CHANCE : hideChance;

        // count the number of people who got stung when hiding
        let hidStung = [];
        let hidSuccess = [];
        let usersRan = [];
        
        // determine those who didnt run first
        for (let u in this.users) {
            let player = this.users[u];
            let ran = player.ran + 0;
            delete player.ran;
            
            // for players who didnt run!
            if (!ran) {
                if (Math.random() <= hideChance) {
                    hidSuccess.push(player);
                    continue;
                }
                
                hidStung.push(player);
                continue;
            }

            usersRan.push({player: player, id: ran});
        }
        
        if (hidSuccess.length) this.sendRoom(`The bees did not notice ${hidSuccess.map(p => p.name).join(", ")}!`);
        
        stungCount -= hidStung.length;
        if (hidStung.length) {
            this.sendRoom(`${hidStung.map(p => p.name).join(", ")} tried to avoid the bees' attention, but they failed and got stung!`);
            hidStung.forEach(p => this.eliminate(p.userid));
        }
        
        usersRan = usersRan.sort((a, b) => a.id - b.id);
        
        if (stungCount > 0) {
            let stung = usersRan.slice(-stungCount);
            if (stung.length) {
                this.sendRoom(`${stung.map(p => p.player.name).join(", ")} ran too slowly and got stung!`);
                stung.forEach(p => this.eliminate(p.player.userid));
            }
        }
        
        // now parse win/game conditions
        if (this.userList.length === 0) {
            this.sendRoom("Everyone has been stung! The bees win!");
            this.onEnd();
        } else if (this.userList.length === 1) {
            this.onEnd(true);
        } else {
            this.onBeforeTurn();
        }
    }
    
    eliminate(userid) {
        this.userList.splice(this.userList.indexOf(userid), 1);
        delete this.users[userid];
    }
    
    onRun(user) {
        let player = this.users[user.userid];
        if (!player || !this.beesReleased || "ran" in player) return;
        
        player.ran = this.beesReleased ? ++this.ranCount : 0;
    }
    
    onEnd(winner) {
        if (winner) {
            this.sendRoom(`Congratulations to ${this.users[this.userList[0]].name} for outsmarting the bees and winning the game!`);
            
            Leaderboard.onWin("bees", this.room, this.userList[0], this.startCount);
        }
        this.destroy();
    }
}

exports.commands = {
    bees: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if (room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new BeesGame(room);
    },
    
    run: function (target, room, user) {
        if (!room || !room.game || !room.game.gameId === "bees") return false;
        room.game.onRun(user);
    },
};