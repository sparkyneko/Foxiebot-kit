"use strict";

class TriviaManager {
    constructor(file) {
        this.questions = [];
        this.file = file;
        this.load();
    }
    
    isEmpty() {
        return this.questions.length <= 0;
    }
    
    load() {
		fs.readFile(this.file, 'utf8', (err, content) => {
			if (err && err.code === 'ENOENT') return false; // file doesn't exist (yet)
			if (err) return console.log(`ERROR: Unable to load trivia questions: ${err}`);

			this.questions = JSON.parse(content);
		});
    }
    
    write() {
		fs.writeFile(this.file, JSON.stringify(this.questions), err => {
			if (err) console.log(`ERROR: Failed to write to trivia file - ${err}`);
		});
    }
    
    getQuestion() {
        return this.questions[Math.floor(this.questions.length * Math.random())];
    }
    
    findQuestion(str) {
        return this.questions.find(q => q.question === str);
    }
    
    addQuestion(question, answers) {
        this.questions.push({question: question, answers: answers});
        return this;
    }
    
    removeQuestion(str) {
        let loops = this.questions.length;
        for (let i = 0; i < loops; i++) {
            if (this.questions[i].question === str) {
                this.questions.splice(i, 1);
                return this;
            }
        }
        return this;
    }
    
    allQuestions() {
        return this.questions.slice(0);
    }
}

module.exports = TriviaManager;