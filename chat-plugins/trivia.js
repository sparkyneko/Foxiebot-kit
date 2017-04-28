"use strict";

const ROUND_DURATION = 10000;
const WAIT_DURATION = 2000;

const TRIVIA_FILE = "data/trivia.json";
const TriviaManager = require("../trivia-manager");

exports.game = "trivia";
exports.aliases = ["triv"];

const Trivia = new TriviaManager(TRIVIA_FILE);

class TriviaGame extends Rooms.botGame {
    constructor(room, scorecap) {
        super(room);
        
        this.scorecap = Math.abs(parseInt(scorecap) || 5);
        
        this.gameId = "trivia";
        this.gameName = "Trivia";
        
        this.answers = [];
        this.question = null;
        
        this.answered = false;
        this.round = 0;
        
        this.onInit();
    }
    
    onInit() {
        if (Trivia.isEmpty()) {
            this.sendRoom("There are no trivia questions loaded. Game automatically ended.");
            return this.onEnd();
        }
        this.sendRoom(`A new game of Trivia is starting! Use \`\`${this.room.commandCharacter[0]}join\`\` to join the game.  First to ${this.scorecap} points win!`);
        this.onInitRound();
    }
    
    onInitRound() {
        let entry = Trivia.getQuestion();
        this.question = entry.question;
        this.answers = entry.answers;
        this.round++;
        this.answered = false;
        
        clearTimeout(this.timer);
        
        this.sendRoom(`Round ${this.round} | ${this.question}`);
        this.timer = setTimeout(() => {
            this.sendRoom(`Time's up! The correct answer${(this.answers.length > 1 ? "s are" : " is")}: ${this.answers.join(", ")}`);
            this.timer = setTimeout(() => this.onInitRound(), WAIT_DURATION);
        }, ROUND_DURATION);
    }
    
    onGuess(user, target) {
        target = toId(target);
        if (!this.answers.map(p => toId(p)).includes(target) || this.answered) return;
        
        clearTimeout(this.timer);
        this.answered = true;
        if (!(user.userid in this.users)) {
            this.users[user.userid] = new Rooms.botGamePlayer(user);
            this.users[user.userid].points = 0;
            this.userList.push(user.userid);
        }
        
        let player = this.users[user.userid];
        player.points++;
        
        this.sendRoom(`${user.name} got the right answer and has ${player.points} points!${this.answers.length > 1 ? ` Possible Answers: ${this.answers.join(", ")}` : ""}`);
        
        if (this.scorecap <= player.points) {
            this.onEnd(player);
        } else {
            this.timer = setTimeout(() => this.onInitRound(), WAIT_DURATION);
        }
    }
    
    onEnd(winner) {
        if (winner) {
            this.sendRoom(`Congratulations to ${winner.name} for winning the game of Trivia!`);
            
            Leaderboard.onWin("trivia", this.room, winner.userid, this.scorecap);
        }
        this.destroy();
    }
    
    getScoreBoard() {
        return "Points: " + Object.keys(this.users).sort().map((u) => {
            return this.users[u].name + " (" + this.users[u].points + ")";
        }).join(", ");
    }
}

exports.commands = {
    trivia: function (target, room, user) {
        if (!room || !this.can("games")) return false;
        if (room.game) return this.send("There is already a game going on in this room! (" + room.game.gameName + ")");
        room.game = new TriviaGame(room, target);
    },
    
    triviarepost: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "statspread") return false;
        this.send(`Round ${room.game.round} | ${room.game.question}`);
    },
    
    triviaskip: function (target, room, user) {
        if (!room || !this.can("games") || !room.game || room.game.gameId !== "trivia") return false;
        this.send(`The correct answer${(room.game.answers.length > 1 ? "s are" : " is")}: ${room.game.answers.join(", ")}`);
        room.game.onInitRound();
    },
    
    addtrivia: function (target, room, user) {
        if (!user.hasBotRank("+")) return false;
        
        let [question, answers] = target.split("|").map(p => p.trim());
        if (!question || !answers) return this.send("Invalid question/answer pair.");

        answers = answers.split(",").map(p => p.trim());
        if (answers.some(a => !toId(a))) return this.send("All answers must have alphanumeric characters.");
        
        if (Trivia.findQuestion(question)) return this.send("The question already exists.");
        
        Trivia.addQuestion(question, answers).write();
        
        this.send("Added!");
    },
    
    deletetrivia: function (target, room, user) {
        if (!user.hasBotRank("%")) return false;
        if (!Trivia.findQuestion(target)) return this.send("The question does not exist.");
        
        Trivia.removeQuestion(target).write();
        
        this.send("Deleted.");
    },
    
    trivialist: function (target, room, user) {
        if (!user.hasBotRank("~")) return false;
        let questions = Trivia.allQuestions();
        
        Tools.uploadToHastebin(questions.map(q => `Question: ${q.question}\nAnswer(s): ${q.answers.join(", ")}`).join("\n\n"), 
            link => user.sendTo(`${questions.length} questions - ${link}`));
    },
}