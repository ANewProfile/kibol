from qbreader import Sync as qbr

sync_client = qbr()

tossup = sync_client.random_tossup()[0]
print(tossup.question_sanitized)
print(tossup.answer_sanitized)
