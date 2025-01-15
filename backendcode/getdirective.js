import { answerChecker } from "/node_modules/qb-answer-checker";

const checkAnswer = (correct, answer) => {
    return answerChecker.checkAnswer(correct, answer);
}
