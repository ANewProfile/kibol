const checkAnswer = (correct, answer) => {
    answerChecker = require("qb-answer-checker");
    return answerChecker.checkAnswer(correct, answer);
}
