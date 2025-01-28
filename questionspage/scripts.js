import answerChecker from "qb-answer-checker";

var question = "For 10 points, name this creator of Better QBReader.";
var answer = "<b><u>Theo</u> Chen</b>";
var questionArray = question.split(" ");
var reading = false;
var buzzing = false;


get_tossup = () => {
    fetch('http://127.0.0.1:5000/tossup')
        .then(response => response.json())
        .then(data => {
            return {
                "question": data[0],
                "answer_sanitized": data[1],
                "answer": data[3],
            }
        })
        .catch(error => console.error('Error:', error));
}

get_bonus = () => {
    fetch('http://127.0.0.1:5000/bonus')
        .then(response => response.json())
        .then(data => {
            return {
                "leadin": data[0],
                "q1": data[1],
                "q2": data[2],
                "q3": data[3],
                "a1": data[4],
                "a2": data[5],
                "a3": data[6],
            };
        }
        )
        .catch(error => console.error('Error:', error));
}


$(document).ready(() => {
    $('#answer-container').hide();

    var print = (words, i) => {
        if (reading) {
            var question_elm = $('#question');
            question_elm.append(words[i] + " ");

            if (i < words.length - 1) {
                setTimeout(() => print(words, i + 1), 150);
            }
        }
    }

    var readQuestion = () => {
        reading = true;
        print(questionArray, 0);
    }

    var userBuzz = () => {
        buzzing = true;
        reading = false;
        console.log('BEEEEP');

        // Show the answer container
        $('#answer-container').show();

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                var directive = answerChecker.checkAnswer(answer, $('#answer-container').val());
                console.log(directive);
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