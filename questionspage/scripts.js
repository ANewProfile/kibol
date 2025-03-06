async function getTossup(cb) {
    const response = await fetch('http://localhost:3000/tossup');
    const fullData = await response.json();
    const readableData = fullData["tossups"][0];
    cb(readableData);
}

async function checkAnswer(questionId, guess, cb) {
    const response = await fetch(`http://localhost:3000/checkanswer?questionid=${questionId}&guess=${guess}`);
    const data = await response.json();
    cb(data);
}

function removePrefix(text, prefix) {
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length);
    }
    return text;
  }

$(document).ready(() => {
    $('#answer-container').hide();
    var startedReading = false;
    var reading = false;
    var buzzable = false;
    var buzzing = false;
    var wordindex = 0;
    var beforePower = true;
    var questionId;
    var answer;

    var userBuzz = () => {
        buzzable = false;
        buzzing = true;
        reading = false;
        var actionsElm = $('#actions');
        actionsElm.prepend("<p>buzzed</p>");
        
        // Show the answer container
        $('#answer-container').show();
    }

    document.addEventListener('keydown', (event) => {
        if (!buzzing) { return; }

        if (event.key === 'Enter') {
            checkAnswer(questionId, $('#answer-input').val(), function (data) {
                var actionsElm = $('#actions');
                var answerElm = $('#answer');

                var directive = data["directive"];
                var directedPrompt = data["directedPrompt"];
                // console.log(directive, directedPrompt);
                
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

                    buzzing = false;
                }
            });
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'n') {
            if (!startedReading) {
                getTossup(function (tossup) {
                    const question = removePrefix(tossup["question"], "<b>");
                    const answer = tossup["answer"];
                    console.log(answer)
                    questionId = tossup["_id"];
                    const questionArray = question.split(" ")

                    var print = (words) => {
                        if (reading) {
                            var questionElm = $('#question');
                            if (words[wordindex]) {
                                // console.log(words[wordindex])
                                if (words[wordindex] === "(*)</b>") { beforePower = false; }
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
                        buzzable = true;
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
            if(buzzable) { userBuzz() }
        }
    })

    // test();
});