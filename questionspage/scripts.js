// API Functions
const APIService = {
  async getTossup() {
    const response = await fetch("http://localhost:3000/tossup");
    const data = await response.json();
    return data.tossups[0];
  },

  async getBonus() {
    const response = await fetch("http://localhost:3000/bonus");
    const data = await response.json();
    return data.bonuses[0];
  },

  async checkAnswer(questionId, guess, isBonus = false, bonusPart = 0) {
    const response = await fetch(
      `http://localhost:3000/checkanswer?questionid=${encodeURIComponent(questionId)}&guess=${encodeURIComponent(guess)}&isBonus=${encodeURIComponent(isBonus)}&bonusPart=${encodeURIComponent(bonusPart)}`,
    );
    return response.json();
  },
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
      state.doneReadingTossup = true;
    }
  }
}

function readTossup(state, ui) {
  state.startedReading = true;
  state.reading = true;
  state.buzzable = true;
  state.doneReadingTossup = false;
  state.wordindex = 0;

  ui.elements.question.html("");
  ui.elements.answer.html("");
  ui.addAction("started reading tossup");

  // Use the removePrefix function directly instead of as a method
  const processedQuestion = removePrefix(state.question, "<b>");
  print(processedQuestion.split(" "), state, ui.elements);
}

function readBonus(state, ui) {
  state.startedReading = true;
  state.reading = true;
  state.buzzable = true;
  state.doneReadingTossup = false;
  state.wordindex = 0;

  ui.elements.question.html("");
  ui.elements.answer.html("");
  ui.addAction("started reading bonus");

  ui.elements.question.append(state.bonuses.leadin);
  ui.elements.question.append("<br><br>");
  for (let i = 0; i <= state.bonusPart; i++) {
    ui.elements.question.append(state.bonuses.parts[i]);
    ui.elements.question.append("<br>");
  }
}

// Function to update the leaderboard
function updateLeaderboard(globalState, ui) {
  const leaderboardElement = ui.elements.leaderboard;
  leaderboardElement.html('<h4><b>Leaderboard</b></h4>');
  
  Object.entries(globalState.users)
    .sort(([,a], [,b]) => b - a)
    .forEach(([username, score]) => {
      leaderboardElement.append(`
        <div class="score-entry">
          <span class="username">${username}</span>
          <span class="score">${score}</span>
        </div>
      `);
    });
}

// Handler Functions
async function handleNewQuestion(state, globalState, ui) {
  try {
    const tossup = await APIService.getTossup();
    const bonuses = await APIService.getBonus();
    
    // Emit new question to all users in room
    socket.emit('newQuestion', {
      roomCode: globalState.roomCode,
      question: tossup.question,
      answer: tossup.answer,
      questionId: tossup._id,
      bonuses: bonuses
    });

    state.question = tossup.question;
    state.bonuses = bonuses;
    state.answer = tossup.answer;
    state.questionId = tossup._id;
    readTossup(state, ui);
    globalState.currentQuestion = state;
  } catch (error) {
    console.error("Error fetching new question:", error);
  }
}

function handleBuzz(state, globalState, ui) {
  state.buzzable = false;
  state.buzzing = true;
  state.reading = false;

  ui.addAction("buzzed");
  if (!state.bonus) {
    ui.elements.question.append("(#) ");
  }
  console.log(state.answer); // Log the answer (for testing)
  console.log(state.bonuses.answers); // Log answer to the bonus (for testing)
  ui.showAnswerContainer();
}

async function handleAnswer(state, globalState, ui) {
  const userAnswer = ui.elements.answerInput.val();
  if (userAnswer === "") {
    ui.addAction(`Answered: `);
    ui.hideAnswerContainer();

    if (state.doneReadingTossup) {
      ui.addAction("Answered incorrectly for no penalty");
    } else if (!state.doneReadingTossup) {
      ui.addAction("Answered incorrectly for -5 points");
      globalState.users["username"] -= 5;
      updateLeaderboard(globalState, ui); // Update after point deduction
    } else {
      throw new Error("state.doneReadingTossup is not true or false");
    }

    ui.updateAnswer(state.answer);
    ui.updateQuestion(state.question);
    state.reset((except = ["bonuses"]));
    return;
  }
  ui.elements.answerInput.val(""); // Clear input field

  try {
    var data = null;
    if (!state.bonus) {
      data = await APIService.checkAnswer(state.questionId, userAnswer, false);
    } else {
      data = await APIService.checkAnswer(
        state.bonuses._id,
        userAnswer,
        true,
        state.bonusPart,
      );
    }
    ui.addAction(`Answered: ${userAnswer}`);

    switch (data.directive) {
      case "accept":
        if (state.bonus) {
          let questionValue = 10;
          socket.emit('updateScore', {
            roomCode: globalState.roomCode,
            username: globalState.username,
            points: questionValue
          });
        } else {
          let questionValue = state.beforePower ? 15 : 10;
          socket.emit('updateScore', {
            roomCode: globalState.roomCode,
            username: globalState.username,
            points: questionValue
          });
        }
        break;
      case "prompt":
        ui.addAction("prompted");
        if (data.directedPrompt) {
          ui.addAction(`Prompt: ${data.directedPrompt}`);
        }
        break;
      case "reject":
        if (!state.bonus && !state.doneReadingTossup) {
          socket.emit('updateScore', {
            roomCode: globalState.roomCode,
            username: globalState.username,
            points: -5
          });
        }
        break;
    }
  } catch (error) {
    console.error("Error checking answer:", error);
  }
}

// Event handling with proper debouncing
const EventHandler = {
  handleKeydown: _.debounce((event, state, globalState, ui) => {
    switch (event.key) {
      case "n":
        if (state.bonus) {
          if (state.bonusPart <= 2) {
            readBonus(state, ui);
          } else {
            state.bonusPart = 0;
            state.bonus = false;
            handleNewQuestion(state, globalState, ui);
          }
        }
        if (!state.startedReading) {
          if (!state.bonus) {
            handleNewQuestion(state, globalState, ui);
          } else {
            if (state.bonusPart <= 2) {
              readBonus(state, ui);
            } else {
              state.bonusPart = 0;
              state.bonus = false;
              handleNewQuestion(state, globalState, ui);
            }
          }
        }
        break;
      case " ":
        if (state.buzzable) {
          handleBuzz(state, globalState, ui);
        }
        break;
      case "Enter":
        if (state.buzzing) {
          handleAnswer(state, globalState, ui);
        }
        break;
    }
  }, 100),
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
    this.bonus = false;
    this.doneReadingTossup = false;
    this.bonusPart = 0;
  }

  reset(except = []) {
    var excepted = {};
    for (const prop of except) {
      excepted[prop] = this[prop];
    }
    Object.assign(this, new QuestionState());
    for (const prop of except) {
      this[prop] = excepted[prop];
    }
  }
}

// Add Socket.IO initialization
const socket = io('http://localhost:5000');
const roomCode = sessionStorage.getItem('roomCode');
const username = sessionStorage.getItem('username');

if (!roomCode || !username) {
  window.location.href = '/kibol'; // Redirect to landing if no room/username
}

class GlobalState {
  constructor(questionState) {
    this.currentQuestion = questionState;
    this.users = {};  // Will store all users' scores
    this.roomCode = roomCode;
    this.username = username;
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
  const globalState = new GlobalState(state); // Pass state to GlobalState

  const elements = {
    answerContainer: $("#answer-container"),
    answerInput: $("#answer-input"),
    question: $("#question"),
    answer: $("#answer"),
    actions: $("#actions"),
    leaderboard: $("#leaderboard"),
  };

  const uiManager = new UIManager(elements);

  uiManager.hideAnswerContainer();

  document.addEventListener("keydown", (event) => {
    EventHandler.handleKeydown(event, state, globalState, uiManager);
  });

  // Socket event handlers
  socket.emit('joinQuestionRoom', { roomCode, username });

  socket.on('userJoined', (data) => {
    // Update users list
    globalState.users = data.users;
    updateLeaderboard(globalState, uiManager);
  });

  socket.on('questionUpdate', (data) => {
    // Sync question state across all users
    state.question = data.question;
    state.answer = data.answer;
    state.questionId = data.questionId;
    if (data.bonuses) {
      state.bonuses = data.bonuses;
    }
    readTossup(state, uiManager);
  });

  socket.on('scoreUpdate', (data) => {
    globalState.users = data.users;
    updateLeaderboard(globalState, uiManager);
  });
});
