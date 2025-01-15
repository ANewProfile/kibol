answerChecker = require("qb-answer-checker");

var returnDirective = (correct, answer) => {
    return answerChecker.checkAnswer(correct, answer);
}
