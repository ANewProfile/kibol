from flask import Flask, request
from flask_cors import CORS, cross_origin

# Import python scripts
import getquestions as gc
import answerchecker as ac

# Import other modules
import json
import requests


app = Flask(__name__)  # Create Flask app
CORS(app, resources={r"/tossup": {"origins": "http://127.0.0.1:5500"}})
app.config['CORS_HEADERS'] = 'Content-Type'

rooms = {
    'public': 0
}  # List of active rooms


@app.route('/tossup', methods=['GET'])  # Random tossup
@cross_origin(origin='127.0.0.1',headers=['Content-Type','Authorization'])
def tossup():
    tossup = gc.get_tossup()  # Get tossup
    return json.dumps(tossup)

@app.route('/bonus', methods=['GET'])  # Random bonus
@cross_origin(origin='127.0.0.1',headers=['Content-Type','Authorization'])
def bonus():
    bonus = gc.get_bonuses()  # Get bonuses
    return json.dumps(bonus)

@app.route('/checkanswer', methods=['GET'])  # Check answer
@cross_origin(origin='127.0.0.1',headers=['Content-Type','Authorization'])
def checkanswer():
    question_id = request.args.get('questionid')  # get question id from query 
    question_obj = requests.get("https://qbreader.org/api/tossup-by-id", params={'id': question_id}).json()['tossup']  # get question object from API

    correct_ans = question_obj['answer']  # get correct answer from question_obj
    user_input = request.args.get('guess')  # get user input from query
    print('user input:', user_input)

    return json.dumps(ac.check_answer(user_input, correct_ans))

@app.route('/checkroomexists', methods=['GET'])  # Check if room exists
@cross_origin(origin='127.0.0.1', headers=['Content-Type', 'Authorization'])
def checkroomexists():
    room_id = request.args.get('roomid')  # get room id from query
    if rooms.__contains__(room_id):
        return json.dumps({'exists': True, 'users': rooms[room_id]})
    else:
        return json.dumps({'exists': False})


if __name__ == '__main__':
    app.run(debug=True)
