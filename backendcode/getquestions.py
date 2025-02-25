import requests

def get_tossup():
    data = {
        "difficulty": [1, 2, 3, 4, 5, 6],
        "powermarkOnly": True,
    }
    tossup = requests.get("https://qbreader.org/api/random-tossup", params=data).json()["tossups"][0]
    return tossup

def get_bonuses():
    bonus = requests.get("https://qbreader.org/api/random-bonus").json()

    leadin = bonus["leadin_sanitized"]
    q1 = bonus["parts_sanitized"][0]
    q2 = bonus["parts_sanitized"][1]
    q3 = bonus["parts_sanitized"][2]
    a1 = bonus["answers"][0]
    a2 = bonus["answers"][1]
    a3 = bonus["answers"][2]

    return leadin, q1, q2, q3, a1, a2, a3

if __name__ == '__main__':
    tossup = get_tossup()
    print(tossup)
    bonus = get_bonuses()
    print(bonus)
