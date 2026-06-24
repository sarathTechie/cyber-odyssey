const questions = [
    {
        scenario: "What is algorithmic bias?",
        displayAnswer: "Systematic unfairness in AI decisions.",
        note: "Data pipelines often carry historical prejudices that manifest quietly at scale, disproportionately affecting vulnerable demographics during automated decision-making processes."
    },
    {
        scenario: "What framework, adopted by the UN in 2021, provides global guidelines on ethical AI development by governments and companies?",
        displayAnswer: "UNESCO Recommendation on the Ethics of Artificial Intelligence",
        note: "Aligning 193 member states required establishing a foundational baseline for transparency, accountability, and the protection of human rights in automated systems."
    },
    {
        scenario: "What is the term for the gap between populations who have meaningful access to digital technology and those who do not?",
        displayAnswer: "The Digital Divide",
        note: "Socioeconomic disparity directly translates to technological access, creating persistent barriers in education, employment, and civic participation for unconnected communities."
    },
    {
        scenario: "A tech company's AI model performs well for majority groups but poorly for minorities. What type of failure is this?",
        displayAnswer: "Algorithmic Bias / Dataset Bias",
        note: "Machine learning architectures are highly sensitive to the distributions of their training corpora. When specific feature spaces are under-sampled, generalization fails predictably."
    }
];

// Game State
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];
let isAdmin = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const endScreen = document.getElementById('end-screen');
const blockedScreen = document.getElementById('blocked-screen');
const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn');
const answerInput = document.getElementById('answer-input');
const feedbackMessage = document.getElementById('feedback-message');
const developerNote = document.getElementById('developer-note');
const progressFill = document.getElementById('progress-fill');
const finalScore = document.getElementById('final-score');
const evaluationText = document.getElementById('evaluation-text');

// ─── SESSION & ROUND STATUS CHECK ───────────────────────────────────────────
(async function init() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.authenticated) {
            window.location.href = 'login.html';
            return;
        }
        isAdmin = sessionData.is_admin;

        const statusRes = await fetch('/api/round/5/status');
        const statusData = await statusRes.json();
        if (statusData.completed && !isAdmin) {
            startScreen.classList.remove('active');
            if (blockedScreen) {
                blockedScreen.classList.add('active');
                const blockedScore = document.getElementById('blocked-score');
                if (blockedScore) blockedScore.textContent = statusData.score;
            }
            return;
        }
    } catch(e) {
        console.warn('Server not reachable, running in static mode.');
    }

    startBtn.addEventListener('click', startGame);
    submitBtn.addEventListener('click', () => {
        if (submitBtn.querySelector('.btn-text').textContent === "PROCEED_TO_NEXT") {
            nextQuestion();
        } else {
            checkAnswer();
        }
    });
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && submitBtn.querySelector('.btn-text').textContent === "EXECUTE_ANALYSIS") {
            checkAnswer();
        }
    });
})();

async function startGame() {
    if (window.startAntiCheatTracking) window.startAntiCheatTracking();
    try {
        await fetch('/api/round/5/start', { method: 'POST' });
    } catch(e) { /* static fallback */ }
    startScreen.classList.remove('active');
    questionScreen.classList.add('active');
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        endGame();
        return;
    }

    const q = questions[currentQuestionIndex];
    document.getElementById('q-number').textContent = `Question ${currentQuestionIndex + 1}`;
    document.getElementById('q-scenario').textContent = q.scenario;
    
    answerInput.value = '';
    answerInput.disabled = false;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.querySelector('.btn-text').textContent = "EXECUTE_ANALYSIS";
    
    feedbackMessage.className = 'hidden';
    developerNote.className = 'hidden';
    document.querySelector('.cyber-card').style.borderColor = 'var(--border-color)';

    const progressPercentage = (currentQuestionIndex / questions.length) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    
    answerInput.focus();
}

function checkAnswer() {
    const userAnswer = answerInput.value.trim();
    if (userAnswer === '') return;

    const q = questions[currentQuestionIndex];
    userAnswers.push(userAnswer);

    feedbackMessage.classList.remove('hidden');
    developerNote.classList.remove('hidden');
    
    answerInput.disabled = true;

    feedbackMessage.className = 'feedback-correct';
    feedbackMessage.innerHTML = `> RESPONSE_LOGGED.`;
    
    developerNote.innerHTML = `<strong>> DEV_NOTE:</strong> ${q.note}`;

    submitBtn.querySelector('.btn-text').textContent = "PROCEED_TO_NEXT";
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

async function endGame() {
    questionScreen.classList.remove('active');
    endScreen.classList.add('active');

    let serverScore = 0;
    try {
        const res = await fetch('/api/round/5/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: userAnswers })
        });
        const data = await res.json();
        if (data.success) serverScore = data.score;
    } catch(e) { console.warn('Server not reachable.'); }

    score = serverScore;
    
    let currentScore = 0;
    const scoreInterval = setInterval(() => {
        finalScore.textContent = currentScore;
        if(currentScore === score) {
            clearInterval(scoreInterval);
            if(score === 4) {
                evaluationText.innerHTML = "> SYSTEM_EVALUATION: FLAWLESS EXECUTION. SECURITY CLEARANCE GRANTED.";
                evaluationText.style.color = "var(--success)";
            } else if (score >= 2) {
                evaluationText.innerHTML = "> SYSTEM_EVALUATION: ACCEPTABLE. FURTHER TRAINING RECOMMENDED.";
                evaluationText.style.color = "var(--highlight)";
            } else {
                evaluationText.innerHTML = "> SYSTEM_EVALUATION: CRITICAL FAILURE. SECURITY BREACH IMMINENT.";
                evaluationText.style.color = "var(--error)";
            }
        }
        currentScore++;
    }, 200);
}
