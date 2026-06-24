const questions = [
    {
        scenario: "Emoji Cipher: Identify the concept: ⚖️🤖💻",
        options: [
            "A) Data Privacy",
            "B) Algorithmic Fairness",
            "C) Malware",
            "D) Cloud Security"
        ],
        note: "The balance scale represents justice and fairness, the robot represents AI/algorithms, and the laptop represents computing."
    },
    {
        scenario: "ROT13 Cipher: Decode: VAGRTEVGL",
        options: [
            "A) Innovation",
            "B) Platform",
            "C) Integrity",
            "D) Governance"
        ],
        note: "Applying ROT13 (shifting letters by 13 places) to VAGRTEVGL yields INTEGRITY."
    },
    {
        scenario: "Riddle: 'Leaders promise me, users demand me, and regulators enforce me. Without me, trust collapses.'",
        options: [
            "A) Bandwidth",
            "B) Accountability",
            "C) Encryption",
            "D) Hardware"
        ],
        note: "Accountability is a core pillar of responsible AI, ensuring that someone is responsible for the impacts of AI systems."
    },
    {
        scenario: "Substitution Cipher: Each letter is replaced by the one directly opposite on a keyboard (Q↔P, W↔O, E↔I, R↔U, T↔Y). Decode: YUIRYQTIRSCE",
        options: [
            "A) TRANSPARENCY",
            "B) GOVERNANCE",
            "C) RESPONSIBLE",
            "D) INNOVATION"
        ],
        note: "Swapping the letters based on a standard QWERTY keyboard layout reveals the word TRANSPARENCY."
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

        const statusRes = await fetch('/api/round/4/status');
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
        await fetch('/api/round/4/start', { method: 'POST' });
    } catch(e) {}
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
    document.getElementById('q-number').textContent = `Puzzle ${currentQuestionIndex + 1}`;
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
        const res = await fetch('/api/round/4/submit', {
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
