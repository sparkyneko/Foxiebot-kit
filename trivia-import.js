"use strict";

const TriviaManager = require('./trivia-manager');

global.fs = require("fs");

const Trivia = new TriviaManager("data/trivia.json");

let data = fs.readFileSync("triviatemp.txt").toString().split("\n");

for (let i = 0; i < data.length; i += 2) {
    let question = data[i];
    let answer = data[i + 1].split(",");
    
    Trivia.addQuestion(question, answer);
}

Trivia.write();