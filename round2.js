const questions = [
    {
        scenario: "The Cancer AI Dilemma: Deploy an AI that detects cancer with 99% accuracy but cannot explain its decisions, OR an AI with 94% accuracy whose decisions are fully explainable to doctors and patients.",
        options: [
            "Deploy 99% accurate (unexplainable) model",
            "Deploy 94% accurate (explainable) model"
        ],
        note: "In healthcare, explainability is crucial for doctor-patient trust, regulatory compliance, and identifying bias. Accuracy alone is insufficient if the clinical rationale is opaque."
    },
    {
        scenario: "The Disaster Prediction Dilemma: Release flood predictions immediately even though the model has a 20% false-alarm rate, OR delay release for additional verification, risking that some communities receive warnings too late.",
        options: [
            "Release immediately with 20% false-alarm rate",
            "Delay for verification"
        ],
        note: "In emergency scenarios, acting on imperfect information is often preferable to acting too late. The cost of a false alarm is far lower than the cost of missing a warning for a disaster."
    },
    {
        scenario: "The Accessibility Trade-Off: Develop one highly sophisticated educational platform for urban schools, OR a less advanced platform that can run on low-end devices in rural communities worldwide.",
        options: [
            "Sophisticated platform for urban schools",
            "Less advanced platform for low-end devices"
        ],
        note: "Tech equity prioritizes building solutions that bridge the digital divide. Designing for low-end constraints ensures broader, more inclusive access to educational resources."
    },
    {
        scenario: "The Bias Dilemma: Remove all demographic information from the dataset, OR collect demographic information with consent and use it to continuously audit fairness.",
        options: [
            "Remove all demographic information",
            "Collect demographic information with consent"
        ],
        note: "Being 'blind' to demographics makes it impossible to measure or fix bias. Collecting data securely with consent is necessary to actively audit and ensure equitable outcomes."
    }
];

// Game State
let currentQuestionIndex = 0;
let score = 0;
let selectedOptionIndex = -1;
let userAnswers = [];
let isAdmin = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const endScreen = document.getElementById('end-screen');
const blockedScreen = document.getElementById('blocked-screen');
const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn');
const optionsContainer = document.getElementById('options-container');
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

        const statusRes = await fetch('/api/round/2/status');
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
    submitBtn.addEventListener('click', checkAnswer);
})();

async function startGame() {
    if (window.startAntiCheatTracking) window.startAntiCheatTracking();
    try {
        await fetch('/api/round/2/start', { method: 'POST' });
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
    document.getElementById('q-number').textContent = `Scenario ${currentQuestionIndex + 1}`;
    document.getElementById('q-scenario').textContent = q.scenario;
    
    selectedOptionIndex = -1;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.querySelector('.btn-text').textContent = "EXECUTE_ANALYSIS";
    submitBtn.onclick = checkAnswer;
    
    feedbackMessage.className = 'hidden';
    developerNote.className = 'hidden';
    document.querySelector('.cyber-card').style.borderColor = 'var(--border-color)';

    const progressPercentage = (currentQuestionIndex / questions.length) * 100;
    progressFill.style.width = `${progressPercentage}%`;

    optionsContainer.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'mcq-option';
        btn.textContent = opt;
        btn.onclick = () => selectOption(index, btn);
        optionsContainer.appendChild(btn);
    });
}

function selectOption(index, btnElement) {
    if (submitBtn.querySelector('.btn-text').textContent === "PROCEED_TO_NEXT") return;
    selectedOptionIndex = index;
    document.querySelectorAll('.mcq-option').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
}

function checkAnswer() {
    if (selectedOptionIndex === -1) return;

    const q = questions[currentQuestionIndex];
    userAnswers.push(selectedOptionIndex);

    feedbackMessage.classList.remove('hidden');
    developerNote.classList.remove('hidden');
    
    document.querySelectorAll('.mcq-option').forEach(b => {
        b.style.pointerEvents = 'none';
    });

    feedbackMessage.className = 'feedback-correct';
    feedbackMessage.innerHTML = `> RESPONSE_LOGGED. CHOICE RECORDED.`;
    
    developerNote.innerHTML = `<strong>> DEV_NOTE:</strong> ${q.note}`;

    submitBtn.querySelector('.btn-text').textContent = "PROCEED_TO_NEXT";
    submitBtn.onclick = () => { nextQuestion(); };
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
        const res = await fetch('/api/round/2/submit', {
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
