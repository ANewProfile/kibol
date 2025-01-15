import getquestions as gq
import checkanswer as ca


if __name__ == '__main__':
    question_sanitized, answer_sanitized, question, answer = gq.get_tossup()
    print(question_sanitized)
    guess = input('What is your guess? ')

    correct = ca.get_directive(answer_sanitized, guess)
    print(correct)
