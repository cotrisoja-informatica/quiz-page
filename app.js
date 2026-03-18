const SUPABASE_URL = 'https://fzsdcdkqwzhxxotvbmtf.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6c2RjZGtxd3poeHhvdHZibXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDE4NDIsImV4cCI6MjA4OTQxNzg0Mn0.rkEg8ETfSneASpWPoqgG8XtTcCCiIC-irDOURKpoWuk';

const state = {
  userId: null,
  questions: [],
  currentIndex: 0,
  currentQuestion: null,
  score: 0,
  playerName: '',
  answers: [],
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
const inputSurname = document.getElementById('input-surname');
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
const answersSummary = document.getElementById('answers-summary');
const alreadyPlayed = document.getElementById('already-played');
const btnSeeClassification = document.getElementById('btn-see-classification');

// Check if user already played
if (localStorage.getItem('quiz_completed')) {
  formStart.style.display = 'none';
  alreadyPlayed.style.display = 'block';
}
btnSeeClassification.addEventListener('click', () => showClassification());

// Start button validation
function updateStartButton() {
  const nameOk = inputName.value.trim().length > 0;
  const surnameOk = inputSurname.value.trim().length > 0;
  btnStart.disabled = !(nameOk && surnameOk);
}
inputName.addEventListener('input', updateStartButton);
inputSurname.addEventListener('input', updateStartButton);

// Helpers
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  screens[name].style.animation = 'none';
  screens[name].offsetHeight;
  screens[name].style.animation = '';
}

function showLoading() {
  loading.classList.add('active');
}

function hideLoading() {
  loading.classList.remove('active');
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/${endpoint}`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
  return res.json();
}

// Start Quiz
formStart.addEventListener('submit', async (e) => {
  e.preventDefault();
  const firstName = inputName.value.trim();
  const lastName = inputSurname.value.trim();
  if (!firstName || !lastName) return;

  state.playerName = `${firstName} ${lastName}`;
  btnStart.disabled = true;
  showLoading();

  try {
    const data = await apiPost('startQuiz', { firstName, lastName });

    state.userId = data.user.id;
    state.questions = data.questions;
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];

    renderQuestion(state.questions[0]);
    showScreen('question');
  } catch (err) {
    alert('Erro ao iniciar o quiz. Tente novamente.');
    console.error(err);
  } finally {
    updateStartButton();
    hideLoading();
  }
});

// Render Question
function renderQuestion(q) {
  const total = state.questions.length;
  const current = state.currentIndex + 1;

  questionCounter.textContent = `Pergunta ${current} de ${total}`;
  progressFill.style.width = `${(current / total) * 100}%`;
  questionText.textContent = q.description;

  optionsContainer.innerHTML = '';
  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.description;
    btn.addEventListener('click', () => selectOption(index, btn));
    optionsContainer.appendChild(btn);
  });

  state.currentQuestion = q;
}

// Select Option
async function selectOption(answerIndex, btn) {
  const allBtns = optionsContainer.querySelectorAll('.option-btn');
  allBtns.forEach(b => b.disabled = true);
  btn.classList.add('selected');

  const selectedAnswerText = state.currentQuestion.options[answerIndex].description;
  const questionDesc = state.currentQuestion.description;
  const optionId = state.currentQuestion.options[answerIndex].id;
  const isFinished = state.currentIndex === state.questions.length - 1;

  showLoading();
  try {
    const data = await apiPost('postAnswer', {
      userId: state.userId,
      optionId,
    });

    if (data.isCorrect) {
      state.score++;
    }

    state.answers.push({
      number: state.currentIndex + 1,
      question: questionDesc,
      selectedAnswer: selectedAnswerText,
      isCorrect: data.isCorrect,
    });

    const correctOption = state.currentQuestion.options.find(o => o.id === data.correctOptionId);
    const correctAnswer = correctOption ? correctOption.description : null;

    showFeedback(data.isCorrect, isFinished, correctAnswer);
  } catch (err) {
    alert('Erro ao enviar resposta. Tente novamente.');
    allBtns.forEach(b => b.disabled = false);
    btn.classList.remove('selected');
    console.error(err);
  } finally {
    hideLoading();
  }
}

// Show Feedback
function showFeedback(isCorrect, isFinished, correctAnswer) {
  const feedbackCard = document.querySelector('.feedback-card');
  feedbackCard.classList.remove('feedback-correct', 'feedback-incorrect');

  // Remove previous correct answer hint if exists
  const existing = feedbackCard.querySelector('.correct-answer-hint');
  if (existing) existing.remove();

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

    if (correctAnswer) {
      const hint = document.createElement('div');
      hint.className = 'correct-answer-hint';
      hint.innerHTML = `<span class="hint-label">Resposta correta:</span> ${correctAnswer}`;
      feedbackMessage.insertAdjacentElement('afterend', hint);
    }
  }

  if (isFinished) {
    btnNext.textContent = 'Ver Resultado';
    btnNext.onclick = () => showResult();
  } else {
    btnNext.textContent = 'Próxima Pergunta';
    btnNext.onclick = () => {
      state.currentIndex++;
      renderQuestion(state.questions[state.currentIndex]);
      showScreen('question');
    };
  }

  showScreen('feedback');
}

// Show Result
function showResult() {
  const total = state.questions.length;
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

  localStorage.setItem('quiz_completed', '1');
  renderAnswersSummary();
  showScreen('result');
}

function renderAnswersSummary() {
  answersSummary.innerHTML = '';
  state.answers.forEach((a) => {
    const item = document.createElement('div');
    item.className = 'summary-item ' + (a.isCorrect ? 'summary-correct' : 'summary-incorrect');
    item.innerHTML = `
      <span class="summary-icon">${a.isCorrect ? '✅' : '❌'}</span>
      <div class="summary-content">
        <span class="summary-question">${a.question}</span>
        <span class="summary-answer">${a.selectedAnswer}</span>
      </div>
    `;
    answersSummary.appendChild(item);
  });
}

// Show Classification
async function showClassification() {
  showLoading();
  try {
    const data = await apiGet('getClassification');
    renderClassification(data.classification);
    showScreen('classification');
  } catch (err) {
    alert('Erro ao carregar classificação. Tente novamente.');
    console.error(err);
  } finally {
    hideLoading();
  }
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function renderClassification(classification) {
  classificationList.innerHTML = '';
  classification.forEach((entry, index) => {
    const fullName = `${entry.first_name} ${entry.last_name}`;
    const item = document.createElement('div');
    item.className = 'classification-item' + (fullName === state.playerName ? ' classification-me' : '');

    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

    item.innerHTML = `
      <span class="classification-rank">${medal}</span>
      <span class="classification-name">${fullName}</span>
      <div class="classification-stats">
        <span class="classification-score">${entry.score} pts</span>
        <span class="classification-time">${formatTime(entry.time_seconds)}</span>
      </div>
    `;
    classificationList.appendChild(item);
  });
}

// Result → Classification
btnRestart.addEventListener('click', () => showClassification());
