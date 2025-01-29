function getTossup(cb) {
    $.ajax({
        url: 'http://127.0.0.1:5000/tossup',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            console.log("success!")
            cb(data);
        },
        error: function (error) {
            console.error('Error:', error);
        }
    });
}

var getBonus = () => {
    $.ajax({
        url: 'http://127.0.0.1:5000/bonus',
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            return {
                "leadin": data[0],
                "q1": data[1],
                "q2": data[2],
                "q3": data[3],
                "a1": data[4],
                "a2": data[5],
                "a3": data[6],
            };
        },
        error: function (error) {
            console.error('Error:', error);
        }
    });
}

var checkAnswer = (questionId, guess, cb) => {
    $.ajax({
        url: `http://127.0.0.1:5000/checkanswer`,
        type: 'GET',
        dataType: 'json',
        data: {
            "questionid": questionId,
            "guess": guess,
        },
        success: function (data) {
            cb(data);
        },
        error: function (error) {
            console.error('Error:', error);
        }
    });
}

$(document).ready(() => {
    $('#answer-container').hide();


    var tossup = getTossup(function (tossup) {

        var question = tossup["question"];
        var answer = tossup["answer"];
        var questionId = tossup["_id"];
        var questionArray = question.split(" ");

        var reading = false;
        var buzzing = false;

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

            // Show the answer container
            $('#answer-container').show();

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    checkAnswer(questionId, $('#answer-container').val(), function (data) {
                        directive = data["directive"];
                        directedPrompt = data["directedPrompt"];
                        console.log(directive, directedPrompt);
                    });
                }
            })
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'n') {
                if (!reading) { readQuestion() }
            } else if (event.key === ' ') {
                if (!buzzing) { userBuzz() }
            }
        });
    });
})