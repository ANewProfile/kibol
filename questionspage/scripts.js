// Fetches a random tossup question from the server
async function getTossup(cb) {
    const response = await fetch('http://localhost:3000/tossup');
    const fullData = await response.json();
    const readableData = fullData["tossups"][0];
    cb(readableData);
}

// Validates the user's answer against the correct answer
async function checkAnswer(questionId, guess, cb) {
    const response = await fetch(`http://localhost:3000/checkanswer?questionid=${questionId}&guess=${guess}`);
    const data = await response.json();
    cb(data);
}

// Removes HTML formatting prefix from question text
function removePrefix(text, prefix) {
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length);
    }
    return text;
}

$(document).ready(() => {
    // Initialize game state variables
    $('#answer-container').hide();
    var startedReading = false;
    var reading = false;
    var buzzable = false;
    var buzzing = false;
    var wordindex = 0;
    var beforePower = true;
    var questionId;
    var answer;
    var question;

    // Handles user buzz action - stops reading and shows answer input
    var userBuzz = () => {
        buzzable = false;
        buzzing = true;
        reading = false;
        var actionsElm = $('#actions');
        actionsElm.prepend("<p>buzzed</p>");
        console.log(answer)
        
        // Show the answer container and focus on input
        $('#answer-container').show();
        $('#answer-input').focus();
    }

    // Event listener for answer submission (Enter key)
    document.addEventListener('keydown', (event) => {
        if (!buzzing) { return; }

        if (event.key === 'Enter') {
            // Store the answer before clearing the input
            const userAnswer = $('#answer-input').val();
            
            // Clear the answer input field
            $('#answer-input').val('');
            
            checkAnswer(questionId, userAnswer, function (data) {
                var actionsElm = $('#actions');
                var answerElm = $('#answer');

                var directive = data["directive"];
                var directedPrompt = data["directedPrompt"];
                
                // Handle correct answer
                if (directive === "accept") {
                    $('#answer-container').hide();
                    var answered = `Answered: ${userAnswer}`;
                    actionsElm.prepend(`<p>${answered}</p>`);
                    if (beforePower) {
                        actionsElm.prepend("<p>Answered correctly for 15 points</p>");
                    } else {
                        actionsElm.prepend("<p>Answered correctly for 10 points</p>");
                    }
                    answerElm.html(answer);
                    $('#question').html(question);

                    reading = false;
                    startedReading = false;
                    buzzing = false;
                } 
                // Handle prompt for more specific answer
                else if (directive === "prompt") {
                    var answered = `Answered: ${userAnswer}`;
                    actionsElm.prepend(`<p>${answered}</p>`);
                    actionsElm.prepend("<p>prompted</p>");
                    if (directedPrompt) {
                        var prompt = `Prompt: ${directedPrompt}`
                        actionsElm.prepend(`<p>${prompt}</p>`);
                    }
                } 
                // Handle incorrect answer
                else if (directive === "reject") {
                    $('#answer-container').hide();
                    var answered = `Answered: ${userAnswer}`;
                    actionsElm.prepend(`<p>${answered}</p>`);
                    actionsElm.prepend("<p>Answered incorrectly for no penalty</p>");
                    answerElm.html(answer);
                    $('#question').html(question);

                    reading = false;
                    startedReading = false;
                    buzzing = false;
                }
            });
        }
    });

    // Event listener for new question (N key)
    document.addEventListener('keydown', (event) => {
        if (!startedReading) {
            if (event.key === 'n') {
                getTossup(function (tossup) {
                    question = removePrefix(tossup["question"], "<b>");
                    answer = tossup["answer"];
                    questionId = tossup["_id"];
                    const questionArray = question.split(" ");

                    // Displays question words one at a time with delay
                    var print = (words) => {
                        if (reading) {
                            var questionElm = $('#question');
                            if (words[wordindex]) {
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
                
                    // Initializes question reading state and UI
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
        }
    });

    // Event listener for buzz attempt (Space key)
    document.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
            if(buzzable) { userBuzz() }
        }
    });
});
