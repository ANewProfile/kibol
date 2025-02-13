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
            // console.error('Error:', error);
            console.log("unsuccessful")
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
    var startedReading = false;
    var reading = false;
    var buzzing = false;
    var wordindex = 0;
    var beforePower = true;
    var questionId;
    var answer;

    var userBuzz = () => {
        buzzing = true;
        reading = false;
        var actionsElm = $('#actions');
        actionsElm.prepend("<p>buzzed</p>");
        var answerElm = $('#answer');
        
        // Show the answer container
        $('#answer-container').show();

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                checkAnswer(questionId, $('#answer-input').val(), function (data) {
                    var directive = data["directive"];
                    var directedPrompt = data["directedPrompt"];
                    console.log(directive, directedPrompt);
                    console.log(data["answer"]);
                    
                    if (directive === "accept") {
                        // Hide answer container
                        $('#answer-container').hide();
                        
                        // Tell the user they answered correctly
                        var answered = `Answered: ${$('#answer-input').val()}`;
                        actionsElm.prepend(`<p>${answered}</p>`);
                        if (beforePower) {
                            actionsElm.prepend("<p>Answered correctly for 15 points</p>");
                        } else {
                            actionsElm.prepend("<p>Answered correctly for 10 points</p>");
                        }
                        answerElm.html(answer);

                        reading = false;
                        startedReading = false;
                        $('#question').html(question);
                        console.log("added " + question + " to page");

                        buzzing = false;
                    } else if (directive === "prompt") {
                        // Tell the user they need to prompt
                        var answered = `Answered: ${$('#answer-input').val()}`;
                        actionsElm.prepend(`<p>${answered}</p>`);
                        actionsElm.prepend("<p>prompted</p>");
                        if (directedPrompt) {
                            var prompt = `Prompt: ${directedPrompt}`
                            actionsElm.prepend(`<p>${prompt}</p>`);
                        }
                    } else if (directive === "reject") {
                        // Hide answer container
                        $('#answer-container').hide();

                        // Tell the user they answered incorrectly
                        var answered = `Answered: ${$('#answer-input').val()}`;
                        actionsElm.prepend(`<p>${answered}</p>`);
                        actionsElm.prepend("<p>Answered incorrectly for no penalty</p>");
                        answerElm.html(answer);

                        reading = false;
                        startedReading = false;
                        $('#question').html(question);
                        console.log("added " + question + " to page");

                        buzzing = false;
                    }
                });
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'n') {
            if (!startedReading) {
                getTossup(function (tossup) {
                    var question = tossup["question"];
                    answer = tossup["answer"];
                    questionId = tossup["_id"];
                    var questionArray = question.split(" ")

                    var print = (words) => {
                        if (reading) {
                            var questionElm = $('#question');
                            if (words[wordindex]) {
                                if (words[wordindex] === "(*)") { beforePower = false; }
                                else { questionElm.append(words[wordindex] + " "); }
                            }
                            wordindex += 1;
                
                            if (wordindex < words.length) {
                                setTimeout(() => print(words), 200);
                            } else {
                                reading = false;
                                buzzable = true;
                            }
                        }
                    }
                
                    var readQuestion = () => {
                        startedReading = true;
                        reading = true;
                        wordindex = 0;
                
                        $('#question').html("")
                        $('#answer').html("")
                
                        var actionsElm = $('#actions');
                        actionsElm.prepend("<p>started reading</p>");
                
                        print(questionArray);
                    }
            
                    readQuestion()
                });
            }
        } else if (event.key === ' ') {
            if (!buzzing) { if(reading) { userBuzz() } }
            else if (buzzing) { console.log('already buzzing') }
            else if (!reading) { console.log('not reading question') }
        }
    })
});
