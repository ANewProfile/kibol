import requests

def check_answer(user_input, correct_ans):
    url = "https://qbreader.org/api/check-answer"
    data = {
        "givenAnswer": user_input,
        "answerline": correct_ans
    }
    api_return = requests.get(url, params=data).json()
    directive = api_return["directive"]
    directedPrompt = api_return["directedPrompt"] if directive == "prompt" else None
    return {"directive": directive, "directedPrompt": directedPrompt, "answer": correct_ans}