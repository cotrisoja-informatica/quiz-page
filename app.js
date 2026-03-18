const API_URL = 'https://script.google.com/macros/s/AKfycbwUzuIi1bgat09G2wah0Jjve-qzyCvqaOivOXTNzzfqvVO0sjjNheoNVlZFLdQfoLQ5LQ/exec';

const state = {
  sessionId: null,
  questionIds: [],
  currentIndex: 0,
  currentQuestion: null,
  score: 0,
  playerName: '',
};

// DOM
const screens = {
  start: document.getElementById('screen-start'),
  question: document.getElementById('screen-question'),
  feedback: document.getElementById('screen-feedback'),
  result: document.getElementById('screen-result'),
  classification: document.getElementById('screen-classification'),
};
const loading = document.getElementById('loading');
const inputName = document.getElementById('input-name');
const formStart = document.getElementById('form-start');
const btnStart = document.getElementById('btn-start');
const progressFill = document.getElementById('progress-fill');
const questionCounter = document.getElementById('question-counter');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackMessage = document.getElementById('feedback-message');
const btnNext = document.getElementById('btn-next');
const scoreNumber = document.getElementById('score-number');
const scoreTotal = document.getElementById('score-total');
const resultMessage = document.getElementById('result-message');
const btnRestart = document.getElementById('btn-restart');
const classificationList = document.getElementById('classification-list');

// Helpers
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  // Re-trigger animation
  screens[name].style.animation = 'none';
  screens[name].offsetHeight; // force reflow
  screens[name].style.animation = '';
}

function showLoading() {
  loading.classList.add('active');
}

function hideLoading() {
  loading.classList.remove('active');
}

async function apiCall(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Erro na requisição');
  return res.json();
}

// Start Quiz
formStart.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = inputName.value.trim();
  if (!name) return;

  state.playerName = name;
  btnStart.disabled = true;
  showLoading();

  try {
    const data = await apiCall({
      action: 'startQuiz',
      payload: { playerName: name },
    });

    state.sessionId = data.sessionId;
    state.questionIds = data.questionIds;
    state.currentIndex = 0;
    state.score = 0;

    await loadQuestion();
  } catch (err) {
    alert('Erro ao iniciar o quiz. Tente novamente.');
    console.error(err);
  } finally {
    btnStart.disabled = false;
    hideLoading();
  }
});

// Load Question
async function loadQuestion() {
  showLoading();
  try {
    const questionId = state.questionIds[state.currentIndex];
    const data = await apiCall({
      action: 'getQuestion',
      payload: { questionId },
    });

    state.currentQuestion = data;
    renderQuestion(data);
    showScreen('question');
  } catch (err) {
    alert('Erro ao carregar pergunta. Tente novamente.');
    console.error(err);
  } finally {
    hideLoading();
  }
}

// Render Question
function renderQuestion(q) {
  const total = state.questionIds.length;
  const current = state.currentIndex + 1;

  questionCounter.textContent = `Pergunta ${current} de ${total}`;
  progressFill.style.width = `${(current / total) * 100}%`;
  questionText.textContent = q.question;

  optionsContainer.innerHTML = '';
  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.answer;
    btn.addEventListener('click', () => selectOption(index, btn));
    optionsContainer.appendChild(btn);
  });
}

// Select Option
async function selectOption(answerIndex, btn) {
  // Disable all buttons
  const allBtns = optionsContainer.querySelectorAll('.option-btn');
  allBtns.forEach(b => b.disabled = true);
  btn.classList.add('selected');

  showLoading();
  try {
    const data = await apiCall({
      action: 'postAnswer',
      payload: {
        sessionId: state.sessionId,
        questionId: state.questionIds[state.currentIndex],
        optionId: state.currentQuestion.options[answerIndex].id,
      },
    });

    if (data.isCorrect) {
      state.score++;
    }

    showFeedback(data.isCorrect, data.isFinished);
  } catch (err) {
    alert('Erro ao enviar resposta. Tente novamente.');
    // Re-enable buttons
    allBtns.forEach(b => b.disabled = false);
    btn.classList.remove('selected');
    console.error(err);
  } finally {
    hideLoading();
  }
}

// Show Feedback
function showFeedback(isCorrect, isFinished) {
  const feedbackCard = document.querySelector('.feedback-card');
  feedbackCard.classList.remove('feedback-correct', 'feedback-incorrect');

  if (isCorrect) {
    feedbackIcon.textContent = '✅';
    feedbackTitle.textContent = 'Correto!';
    feedbackMessage.textContent = 'Muito bem, você acertou!';
    feedbackCard.classList.add('feedback-correct');
  } else {
    feedbackIcon.textContent = '❌';
    feedbackTitle.textContent = 'Incorreto';
    feedbackMessage.textContent = 'Não foi dessa vez...';
    feedbackCard.classList.add('feedback-incorrect');
  }

  if (isFinished) {
    btnNext.textContent = 'Ver Resultado';
    btnNext.onclick = () => showResult();
  } else {
    btnNext.textContent = 'Próxima Pergunta';
    btnNext.onclick = () => {
      state.currentIndex++;
      loadQuestion();
    };
  }

  showScreen('feedback');
}

// Show Result
function showResult() {
  const total = state.questionIds.length;
  scoreNumber.textContent = state.score;
  scoreTotal.textContent = `/ ${total}`;

  const pct = (state.score / total) * 100;
  if (pct === 100) {
    resultMessage.textContent = 'Perfeito! Você é um expert na Cotrisoja!';
  } else if (pct >= 70) {
    resultMessage.textContent = 'Ótimo resultado! Você conhece bem a Cotrisoja!';
  } else if (pct >= 40) {
    resultMessage.textContent = 'Bom esforço! Continue aprendendo sobre a Cotrisoja.';
  } else {
    resultMessage.textContent = 'Que tal conhecer mais sobre a Cotrisoja?';
  }

  showScreen('result');
}

// Show Classification
async function showClassification() {
  showLoading();
  try {
    const data = await apiCall({ action: 'getClassification' });
    renderClassification(data.classification);
    showScreen('classification');
  } catch (err) {
    alert('Erro ao carregar classificação. Tente novamente.');
    console.error(err);
  } finally {
    hideLoading();
  }
}

function renderClassification(classification) {
  classificationList.innerHTML = '';
  classification.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'classification-item' + (entry.playerName === state.playerName ? ' classification-me' : '');

    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

    item.innerHTML = `
      <span class="classification-rank">${medal}</span>
      <span class="classification-name">${entry.playerName}</span>
      <span class="classification-score">${entry.score} pts</span>
    `;
    classificationList.appendChild(item);
  });
}

// Result → Classification
btnRestart.addEventListener('click', () => showClassification());
