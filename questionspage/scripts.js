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
  console.log("Print function called", {
    reading: state.reading,
    wordIndex: state.wordindex,
    totalWords: words.length
  });

  // Ensure we're in reading mode
  if (!state.reading) {
    console.error("Not in reading mode, forcing reading mode");
    state.reading = true;
  }

  // Check if we have words left to print
  if (state.wordindex < words.length) {
    const currentWord = words[state.wordindex];
    console.log("Printing word:", currentWord);
    
    if (currentWord === "(*)</b>") {
      state.beforePower = false;
    } else {
      elements.question.append(currentWord + " ");
    }
    
    state.wordindex++;

    // Schedule next word
    setTimeout(() => {
      print(words, state, elements);
    }, 200);
  } else {
    console.log("Finished reading");
    state.reading = false;
    state.buzzable = true;
    state.doneReadingTossup = true;
  }
}

function readTossup(state, ui) {
  console.log('READING TOSSUP:', state.question);
  
  if (!state.question) {
    console.error("No question to read!");
    return;
  }

  // Clear previous content
  ui.elements.question.html("");
  ui.elements.answer.html();
  
  // Process question text
  let processedQuestion = state.question;
  if (processedQuestion.startsWith("<b>")) {
    processedQuestion = removePrefix(processedQuestion, "<b>");
  }
  
  const words = processedQuestion.split(" ").filter(word => word.length > 0);
  console.log("Words to read:", words);
  
  let currentIndex = 0;
  
  function displayNextWord() {
    if (!state.reading) {
      console.log("Reading stopped");
      return;
    }

    if (currentIndex < words.length) {
      const word = words[currentIndex];
      console.log('Displaying word:', word);
      
      if (word === "(*)</b>") {
        state.beforePower = false;
      } else {
        ui.elements.question.append(word + " ");
      }
      
      currentIndex++;
      setTimeout(displayNextWord, 200);
    } else {
      console.log("Finished reading");
      state.reading = false;
      state.buzzable = true;
      state.doneReadingTossup = true;
    }
  }
  
  // Start the reading process
  displayNextWord();
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
  // Clear existing scores but keep the header
  const leaderboardScores = ui.elements.leaderboard.children().not(":first");
  leaderboardScores.remove();

  // Sort users by score in descending order
  const sortedUsers = Object.entries(globalState.users)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  // Add scores for each user
  for (const [username, score] of sortedUsers) {
    ui.elements.leaderboard.append(`
      <div class="leaderboard-entry">
        <span class="username">${username}</span>
        <span class="score">${score}</span>
      </div>
    `);
  }
}

// Handler Functions
function startReadingQuestion(state, ui) {
  console.log("Starting reading question, isHost:", isHost); // Debug log
  
  if (isHost) {
    socket.emit('start_reading', {
      room: roomCode,
      questionState: {
        question: state.question,
        bonuses: state.bonuses,
        answer: state.answer,
        questionId: state.questionId
      }
    });
  }
}

async function handleNewQuestion(state, globalState, ui) {
  try {
    if (!isHost) {
      console.log("Non-host tried to fetch new question - ignoring");
      return;
    }

    console.log("FETCHING NEW QUESTION");
    const tossup = await APIService.getTossup();
    const bonuses = await APIService.getBonus();
    
    // First sync the question with all clients
    socket.emit('sync_question', {
      room: roomCode,
      questionState: {
        question: tossup.question,
        bonuses: bonuses,
        answer: tossup.answer,
        questionId: tossup._id
      }
    });
    
    // Wait a bit to ensure sync completed
    setTimeout(() => {
      // Then trigger reading for all clients
      socket.emit('start_reading', { room: roomCode });
    }, 1000);
    
  } catch (error) {
    console.error("Error fetching question:", error);
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
  const username = sessionStorage.getItem('username');
  const userAnswer = ui.elements.answerInput.val();
  
  if (userAnswer === "") {
    ui.addAction(`Answered: `);
    ui.hideAnswerContainer();

    if (state.doneReadingTossup) {
      ui.addAction("Answered incorrectly for no penalty");
    } else if (!state.doneReadingTossup) {
      ui.addAction("Answered incorrectly for -5 points");
      globalState.updateScore(username, -5);
      updateLeaderboard(globalState, ui); // Update after point deduction
    }

    ui.updateAnswer(state.answer);
    ui.updateQuestion(state.question);
    state.reset(except = ["bonuses"]);
    return;
  }

  ui.elements.answerInput.val(""); // Clear input field

  try {
    const data = await APIService.checkAnswer(
      state.questionId, 
      userAnswer, 
      state.bonus, 
      state.bonusPart
    );

    ui.addAction(`Answered: ${userAnswer}`);

    switch (data.directive) {
      case "accept":
        if (state.bonus) {
          const points = 10;
          ui.hideAnswerContainer();
          ui.addAction(`Answered correctly for ${points} points`);
          ui.updateAnswer(state.answer);
          globalState.updateScore(username, points);
          updateLeaderboard(globalState, ui);
          state.bonusPart++;
        } else {
          const points = state.beforePower ? 15 : 10;
          ui.hideAnswerContainer();
          ui.addAction(`Answered correctly for ${points} points`);
          ui.updateAnswer(state.answer);
          ui.updateQuestion(state.question);
          globalState.updateScore(username, points);
          updateLeaderboard(globalState, ui);
          state.reset(except = ["bonuses"]);
        }
        break;

      case "reject":
        if (state.bonus) {
          ui.hideAnswerContainer();
          ui.addAction("Answered incorrectly for no penalty");
          ui.updateAnswer(state.answer);
          state.bonusPart++;
        } else {
          ui.hideAnswerContainer();
          if (state.doneReadingTossup) {
            ui.addAction("Answered incorrectly for no penalty");
          } else {
            ui.addAction("Answered incorrectly for -5 points");
            globalState.updateScore(username, -5);
            updateLeaderboard(globalState, ui);
          }
          ui.updateAnswer(state.answer);
          ui.updateQuestion(state.question);
          state.reset(except = ["bonuses"]);
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
    console.log("Key pressed:", event.key); // Debug log
    switch (event.key) {
      case "n":
        if (!state.startedReading && isHost) {
          handleNewQuestion(state, globalState, ui);
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

class GlobalState {
  constructor(questionState) {
    this.currentQuestion = questionState;
    this.users = {};
    
    // Get username from session storage
    const username = sessionStorage.getItem('username');
    if (username) {
      this.users[username] = 0;
    }
  }

  // Update to handle multiple users
  syncUsers(players) {
    // Extract just the scores from the player objects
    const scores = {};
    for (const [username, playerData] of Object.entries(players)) {
      scores[username] = playerData.score;
    }
    this.users = scores;
    updateLeaderboard(this, uiManager);
  }

  addUser(username) {
    if (!this.users[username]) {
      this.users[username] = 0;
      updateLeaderboard(this, uiManager);
    }
  }

  updateScore(username, points) {
    if (this.users[username] !== undefined) {
      this.users[username] += points;
      // Emit score update to server
      socket.emit('update_score', {
        room: roomCode,
        username: username,
        score: this.users[username]
      });
      updateLeaderboard(this, uiManager);
      return true;
    }
    return false;
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

// At the top of the file, add these global variables
let socket;
let globalState;
let uiManager;
const isHost = sessionStorage.getItem('isHost') === 'true';
const username = sessionStorage.getItem('username');
const roomCode = sessionStorage.getItem('roomCode');

// Main Application
$(document).ready(() => {
  const state = new QuestionState();
  globalState = new GlobalState(state);
  
  const elements = {
    answerContainer: $("#answer-container"),
    answerInput: $("#answer-input"),
    question: $("#question"),
    answer: $("#answer"),
    actions: $("#actions"),
    leaderboard: $("#leaderboard"),
  };

  uiManager = new UIManager(elements);
  uiManager.hideAnswerContainer();

  // Initialize socket globally
  socket = io('http://localhost:8080', {
    transports: ['websocket'],
    upgrade: false
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
    console.log('Is host:', isHost);
    console.log('Room code:', roomCode);
    socket.emit('join', { 
      room: roomCode, 
      username: username 
    });
  });

  socket.on('player_update', (data) => {
    globalState.syncUsers(data.players);
    updateLeaderboard(globalState, uiManager);
  });

  socket.on('sync_question', (data) => {
    console.log('SYNC QUESTION RECEIVED:', data);
    const questionState = data.questionState;
    
    // Update state for all clients
    state.question = questionState.question;
    state.bonuses = questionState.bonuses;
    state.answer = questionState.answer;
    state.questionId = questionState.questionId;
    
    // Reset reading state
    state.startedReading = false;
    state.reading = false;
    state.buzzable = false;
    state.doneReadingTossup = false;
    state.wordindex = 0;
    state.beforePower = true;
    
    globalState.currentQuestion = state;

    console.log("State after sync:", state); // Debug log
  });

  socket.on('start_reading', (data) => {
    console.log('START READING RECEIVED');
    state.startedReading = true;
    state.reading = true;
    readTossup(state, uiManager);
  });

  socket.on('start_game', () => {
    startGame();
  });

  // Initialize game if host
  if (isHost) {
    socket.emit('start_game', { room: roomCode });
  }

  document.addEventListener("keydown", (event) => {
    EventHandler.handleKeydown(event, state, globalState, uiManager);
  });
});

function startGame() {
  if (isHost) {
    handleNewQuestion(state, globalState, uiManager);
  }
}

function displayQuestion(index) {
  if (index >= questions.length) {
    endGame();
    return;
  }
  
  const question = questions[index];
  document.getElementById('question').textContent = question.question;
  
  const optionsContainer = document.getElementById('options');
  optionsContainer.innerHTML = '';
  
  question.options.forEach((option, i) => {
    const button = document.createElement('button');
    button.textContent = option;
    button.onclick = () => checkAnswer(i);
    optionsContainer.appendChild(button);
  });
}

function checkAnswer(selectedIndex) {
  const question = questions[currentQuestion];
  const correct = selectedIndex === question.correct;
  
  if (correct) {
    score += 100;
    socket.emit('update_score', {
      room: roomCode,
      username: username,
      score: score
    });
  }
  
  currentQuestion++;
  if (isHost) {
    socket.emit('sync_question', {
      room: roomCode,
      currentQuestion: currentQuestion
    });
  }
  displayQuestion(currentQuestion);
}

function endGame() {
  document.getElementById('question').textContent = 'Game Over!';
  document.getElementById('options').innerHTML = '';
}
