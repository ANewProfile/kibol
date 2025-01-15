const checkAnswer = require("./backendcode/getdirective.js");

var question = "For 10 points, name this creator of Better QBReader.";
var answer = "<b><u>Theo</u> Chen</b>";
var questionArray = question.split(" ");
var reading = false;
var buzzing = false;

$(document).ready(() => {
    $('#answer-container').hide();
    
    var print = (words, i) => {
        var question_elm = $('#question');
        question_elm.append(words[i] + " ");
    
        if (i < words.length - 1) {
            setTimeout(() => print(words, i + 1), 150);
        }
    }
    
    var readQuestion = () => {
        reading = true;
        print(questionArray, 0);
    }
    
    var userBuzz = () => {
        buzzing = true;
        console.log('BEEEEP');
    
        // Show the answer container
        $('#answer-container').show();

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                checkAnswer($('#answer-container').val(), answer);
            }
        })
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'n') {
            if (!reading) { readQuestion() }
        } else if (event.key === ' ') {
            if (!buzzing) { userBuzz() }
        }
    })      
})