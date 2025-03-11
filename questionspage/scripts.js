// API Functions
const APIService = {
    async getTossup() {
        const response = await fetch('http://localhost:3000/tossup');
        const data = await response.json();
        return data.tossups[0];
    },

    async getBonus() {
        const response = await fetch('http://localhost:3000/bonus');
        const data = await response.json();
        return data.bonuses[0];
    },

    async checkAnswer(questionId, guess) {
        const response = await fetch(
            `http://localhost:3000/checkanswer?questionid=${encodeURIComponent(questionId)}&guess=${encodeURIComponent(guess)}`
        );
        return response.json();
    }
};

// Utility Functions
function removePrefix(text, prefix) {
    if (text.startsWith(prefix)) {
        return text.slice(prefix.length);
    }
    return text;
}

// Question Reading Functions
function print(words, state, elements) {
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
            setTimeout(() => print(words, state, elements), 200);
        } else {
            state.reading = false;
            state.buzzable = true;
        }
    }
}

function readQuestion(state, ui) {
    state.startedReading = true;
    state.reading = true;
    state.buzzable = true;
    state.wordindex = 0;

    ui.elements.question.html("");
    ui.elements.answer.html("");
    ui.addAction("started reading");

    print(state.question.split(" "), state, ui.elements);
    state.doneReadingTossup = true;
}

function readBonus(state, ui) {
    state.startedReading = true;
    state.reading = true;
    state.buzzable = true;
    state.wordindex = 0;

    ui.elements.question.html("");
    ui.elements.answer.html("");
    ui.addAction("started reading");

    print(state.question.split(" "), state, ui.elements);
}

// Handler Functions
async function handleNewQuestion(state, ui) {
    try {
        const tossup = await APIService.getTossup();
        const bonuses = await APIService.getBonus();
        state.question = removePrefix(tossup.question, "<b>");
        state.bonuses = bonuses;
        state.answer = tossup.answer;
        state.questionId = tossup._id;
        readQuestion(state, ui);
    } catch (error) {
        console.error('Error fetching new question:', error);
    }
}

function handleBuzz(state, ui) {
    state.buzzable = false;
    state.buzzing = true;
    state.reading = false;
    
    ui.addAction("buzzed");
    ui.elements.question.append("(#) ");
    console.log(state.answer);  // Log the answer (for testing)
    ui.showAnswerContainer();
}

async function handleAnswer(state, ui) {
    const userAnswer = ui.elements.answerInput.val();
    if (userAnswer === "") {
        ui.addAction(`Answered: `);
        ui.hideAnswerContainer();

        if (state.doneReadingTossup) { ui.addAction("Answered incorrectly for no penalty"); }
        else if (!state.doneReadingTossup) { ui.addAction("Answered incorrectly for -5 points"); }
        else { throw new Error("state.doneReadingTossup is not true or false"); }
        
        ui.updateAnswer(state.answer);
        ui.updateQuestion(state.question);
        state.reset();
        return;
    }
    ui.elements.answerInput.val(''); // Clear input field

    try {
        const data = await APIService.checkAnswer(state.questionId, userAnswer);
        ui.addAction(`Answered: ${userAnswer}`);

        switch (data.directive) {
            case "accept":
                ui.hideAnswerContainer();
                ui.addAction(`Answered correctly for ${state.beforePower ? "15" : "10"} points`);
                ui.updateAnswer(state.answer);
                ui.updateQuestion(state.question);
                state.reset();
                break;

            case "prompt":
                ui.addAction("prompted");
                if (data.directedPrompt) {
                    ui.addAction(`Prompt: ${data.directedPrompt}`);
                }
                break;

            case "reject":
                ui.hideAnswerContainer();
                if (state.doneReadingTossup) { ui.addAction("Answered incorrectly for no penalty"); }
                else if (!state.doneReadingTossup) { ui.addAction("Answered incorrectly for -5 points"); }
                else { throw new Error("state.doneReadingTossup is not true or false"); }
                ui.updateAnswer(state.answer);
                ui.updateQuestion(state.question);
                state.reset();
                break;
        }
    } catch (error) {
        console.error('Error checking answer:', error);
    }
}

// Event handling with proper debouncing
const EventHandler = {
    handleKeydown: _.debounce((event, state, ui) => {
        switch(event.key) {
            case 'n':
                if (!state.startedReading) {
                    handleNewQuestion(state, ui);
                }
                break;
            case ' ':
                if (state.buzzable) {
                    handleBuzz(state, ui);
                }
                break;
            case 'Enter':
                if (state.buzzing) {
                    handleAnswer(state, ui);
                }
                break;
        }
    }, 100)
};

// Classes
class QuestionState {
    constructor() {
        this.startedReading = false;
        this.reading = false;
        this.buzzable = false;
        this.buzzing = false;
        this.wordindex = 0;
        this.beforePower = true;
        this.questionId = null;
        this.answer = null;
        this.question = null;
        this.bonuses = null;
        this.doneReadingTossup = false;
    }

    reset() {
        Object.assign(this, new QuestionState());
    }
}

class UIManager {
    constructor(elements) {
        this.elements = elements;
    }

    updateQuestion(text) {
        this.elements.question.html(text);
    }

    updateAnswer(text) {
        this.elements.answer.html(text);
    }

    showAnswerContainer() {
        this.elements.answerContainer.show();
        this.elements.answerInput.focus();
    }

    hideAnswerContainer() {
        this.elements.answerContainer.hide();
    }

    addAction(text) {
        this.elements.actions.prepend(`<p>${text}</p>`);
    }
}

// Main Application
$(document).ready(() => {
    const state = new QuestionState();
    const elements = {
        answerContainer: $('#answer-container'),
        answerInput: $('#answer-input'),
        question: $('#question'),
        answer: $('#answer'),
        actions: $('#actions')
    };
    const uiManager = new UIManager(elements);

    uiManager.hideAnswerContainer();

    document.addEventListener('keydown', (event) => {
        EventHandler.handleKeydown(event, state, uiManager);
    });
});
