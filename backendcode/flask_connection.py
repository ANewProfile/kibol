from flask import Flask
import getquestions as gc
import json

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

@app.route('/tossup')
def tossup():
    tossup = gc.get_tossup()
    return json.dumps(tossup)

@app.route('/bonus')
def bonus():
    bonus = gc.get_bonuses()
    return json.dumps(bonus)
