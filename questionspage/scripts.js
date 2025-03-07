// API Functions
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

// Utility Functions
function removePrefix(text, prefix) {
    if (text.startsWith(prefix)) {
        return text.slice(prefix.length);
    }
    return text;
}

// Main Application
$(document).ready(() => {
    // State Variables
    let state = {
        startedReading: false,
        reading: false,
        buzzable: false,
        buzzing: false,
        wordindex: 0,
        beforePower: true,
        questionId: null,
        answer: null,
        question: null
    };

    // UI Elements
    const elements = {
        answerContainer: $('#answer-container'),
        answerInput: $('#answer-input'),
        question: $('#question'),
        answer: $('#answer'),
        actions: $('#actions')
    };

    // Initialize UI
    elements.answerContainer.hide();

    // Question Reading Functions
    function print(words) {
        if (state.reading) {
            if (words[state.wordindex]) {
                if (words[state.wordindex] === "(*)</b>") {
                    state.beforePower = false;
                } else {
                    elements.question.append(words[state.wordindex] + " ");
                }
            }
            state.wordindex += 1;

            if (state.wordindex < words.length) {
                setTimeout(() => print(words), 200);
            } else {
                state.reading = false;
                state.buzzable = true;
            }
        }
    }

    function readQuestion() {
        state.startedReading = true;
        state.reading = true;
        state.buzzable = true;
        state.wordindex = 0;

        elements.question.html("");
        elements.answer.html("");
        elements.actions.prepend("<p>started reading</p>");

        print(state.question.split(" "));
    }

    // User Action Handlers
    function userBuzz() {
        state.buzzable = false;
        state.buzzing = true;
        state.reading = false;
        
        elements.actions.prepend("<p>buzzed</p>");
        elements.answerContainer.show();
        elements.answerInput.focus();
    }

    function handleAnswer(userAnswer) {
        checkAnswer(state.questionId, userAnswer, function(data) {
            const { directive, directedPrompt } = data;
            
            // Log the answer
            elements.actions.prepend(`<p>Answered: ${userAnswer}</p>`);

            switch (directive) {
                case "accept":
                    elements.answerContainer.hide();
                    elements.actions.prepend(
                        `<p>Answered correctly for ${state.beforePower ? "15" : "10"} points</p>`
                    );
                    elements.answer.html(state.answer);
                    elements.question.html(state.question);
                    
                    // Reset state
                    state.reading = false;
                    state.startedReading = false;
                    state.buzzing = false;
                    break;

                case "prompt":
                    elements.actions.prepend("<p>prompted</p>");
                    if (directedPrompt) {
                        elements.actions.prepend(`<p>Prompt: ${directedPrompt}</p>`);
                    }
                    break;

                case "reject":
                    elements.answerContainer.hide();
                    elements.actions.prepend("<p>Answered incorrectly for no penalty</p>");
                    elements.answer.html(state.answer);
                    elements.question.html(state.question);
                    
                    // Reset state
                    state.reading = false;
                    state.startedReading = false;
                    state.buzzing = false;
                    break;
            }
        });
    }

    // Event Listeners
    document.addEventListener('keydown', (event) => {
        // Answer submission (Enter)
        if (state.buzzing && event.key === 'Enter') {
            const userAnswer = elements.answerInput.val();
            elements.answerInput.val('');
            handleAnswer(userAnswer);
        }
        
        // New question (N)
        if (!state.startedReading && event.key === 'n') {
            getTossup(function(tossup) {
                state.question = removePrefix(tossup["question"], "<b>");
                state.answer = tossup["answer"];
                state.questionId = tossup["_id"];
                readQuestion();
            });
        }
        
        // Buzz (Space)
        if (event.key === ' ' && state.buzzable) {
            userBuzz();
        }
    });
});
