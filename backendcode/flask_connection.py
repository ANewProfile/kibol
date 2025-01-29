# Import flask.Flask and flask.request
from flask import Flask, request
from flask_cors import CORS, cross_origin

# Import python scripts
import getquestions as gc
import answerchecker as ac

# Import other modules
import json
import requests


app = Flask(__name__)  # Create Flask app
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/tossup')  # Random tossup
@cross_origin()
def tossup():
    tossup = gc.get_tossup()  # Get tossup
    return json.dumps(tossup)

@app.route('/bonus')  # Random bonus
@cross_origin()
def bonus():
    bonus = gc.get_bonuses()  # Get bonuses
    return json.dumps(bonus)

@app.route('/checkanswer', methods=['GET'])  # Check answer
@cross_origin()
def checkanswer():
    question_id = request.args.get('questionid')  # get question id from query 
    print("GETTING QUESTION ID", question_id)
    question_obj = requests.get("https://qbreader.org/api/tossup-by-id", params={'id': question_id}).json()['tossup']  # get question object from API

    correct_ans = question_obj['answer']  # get correct answer from question_obj
    user_input = request.args.get('guess')  # get user input from query
    print("GETTING USER INPUT AND ANSWERS")
    print(correct_ans, user_input)

    return json.dumps(ac.check_answer(user_input, correct_ans))
