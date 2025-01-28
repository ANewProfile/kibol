from qbreader import Sync as qbr

sync_client = qbr()

def get_tossup():
    tossup = sync_client.random_tossup()[0]

    question_sanitized = tossup.question_sanitized
    answer_sanitized = tossup.answer_sanitized
    question = tossup.question
    answer = tossup.answer

    return question_sanitized, answer_sanitized, question, answer

def get_bonuses():
    bonus = sync_client.random_bonus()[0]

    leadin = bonus.leadin_sanitized
    q1 = bonus.parts_sanitized[0]
    q2 = bonus.parts_sanitized[1]
    q3 = bonus.parts_sanitized[2]
    a1 = bonus.answers[0]
    a2 = bonus.answers[1]
    a3 = bonus.answers[2]

    return leadin, q1, q2, q3, a1, a2, a3

if __name__ == '__main__':
    tossup = get_tossup()
    print(tossup)
    bonus = get_bonuses()
    print(bonus)
