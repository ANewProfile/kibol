// API Functions
const APIService = {
    async getTossup() {
        const response = await fetch('http://localhost:3000/tossup');
        const data = await response.json();
        return data.tossups[0];
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

// 1. Create a QuestionState class to manage state
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
    }

    reset() {
        Object.assign(this, new QuestionState());
    }
}

// 2. Create a UI manager
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

// 3. Implement event handling with proper debouncing
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

// Main Application
$(document).ready(() => {
    // State Variables
    const state = new QuestionState();

    // UI Elements
    const elements = {
        answerContainer: $('#answer-container'),
        answerInput: $('#answer-input'),
        question: $('#question'),
        answer: $('#answer'),
        actions: $('#actions')
    };

    const uiManager = new UIManager(elements);

    // Initialize UI
    uiManager.hideAnswerContainer();

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
        EventHandler.handleKeydown(event, state, uiManager);
    });
});
