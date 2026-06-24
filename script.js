const questions = [
    {
        from: "Development Team",
        subject: "Healthcare AI Tool Deployment",
        detail: "A healthcare AI tool flags a patient as 'low risk' for a serious condition. The development team knows the model was trained on a dataset underrepresenting women over 50. They ship the tool anyway to meet the launch deadline."
    },
    {
        from: "Social Media Executive",
        subject: "Recommendation System Audit",
        detail: "A social media company learns its recommendation system promotes harmful misinformation but delays action because engagement is at an all-time high."
    },
    {
        from: "University Admissions",
        subject: "AI Screening Deployment",
        detail: "A university uses AI to screen applications. Before deployment, it conducts fairness testing across gender, ethnicity, and socioeconomic groups."
    },
    {
        from: "Fitness App Tracker",
        subject: "Data Monetization",
        detail: "A fitness app shares users' location history with advertisers without clearly informing users."
    }
];

let currentQuestionIndex = 0;
let score = 0;
let userAnswers = []; // Collect answers to submit to server
let isAdmin = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const endScreen = document.getElementById('end-screen');
const blockedScreen = document.getElementById('blocked-screen');
const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn');
const btnRedLight = document.getElementById('btn-red-light');
const btnGreenLight = document.getElementById('btn-green-light');
const feedbackMessage = document.getElementById('feedback-message');
const progressFill = document.getElementById('progress-fill');

// Question Display Elements
const qNumber = document.getElementById('q-number');
const qFrom = document.getElementById('q-from');
const qSubject = document.getElementById('q-subject');
const qDetail = document.getElementById('q-detail');
const finalScore = document.getElementById('final-score');
const evaluationText = document.getElementById('evaluation-text');

// Typewriter Utility Function for Scenario Details
function typeWriterEffect(element, text, speed = 15) {
    element.innerHTML = '';
    let i = 0;
    return new Promise(resolve => {
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                resolve();
            }
        }
        type();
    });
}

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

        const statusRes = await fetch('/api/round/1/status');
        const statusData = await statusRes.json();
        if (statusData.completed && !isAdmin) {
            // Round already completed — show blocked screen
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

    // Bind event listeners only if round is playable
    startBtn.addEventListener('click', startGame);
    btnRedLight.addEventListener('click', () => checkAnswer('red light'));
    btnGreenLight.addEventListener('click', () => checkAnswer('green light'));
})();

async function startGame() {
    if (window.startAntiCheatTracking) window.startAntiCheatTracking();
    try {
        await fetch('/api/round/1/start', { method: 'POST' });
    } catch(e) { /* static fallback */ }

    startScreen.classList.remove('active');
    questionScreen.classList.add('active');
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    loadQuestion();
}

async function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        endGame();
        return;
    }

    const q = questions[currentQuestionIndex];
    qNumber.textContent = `SYSTEM.SCENARIO[${currentQuestionIndex + 1}/${questions.length}]`;
    
    // Clear details first
    qFrom.textContent = '';
    qSubject.textContent = '';
    qDetail.textContent = '';
    
    btnRedLight.disabled = true;
    btnGreenLight.disabled = true;
    btnRedLight.style.opacity = '0.5';
    btnGreenLight.style.opacity = '0.5';
    submitBtn.classList.add('hidden');
    
    feedbackMessage.className = 'hidden';
    progressFill.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;

    // Type out the scenario
    await typeWriterEffect(qFrom, q.from);
    await typeWriterEffect(qSubject, q.subject);
    await typeWriterEffect(qDetail, q.detail);

    // Re-enable input
    btnRedLight.disabled = false;
    btnGreenLight.disabled = false;
    btnRedLight.style.opacity = '1';
    btnGreenLight.style.opacity = '1';
}

function checkAnswer(userAnswer) {
    if(btnRedLight.disabled) return;

    userAnswers.push(userAnswer); // Collect for server submission

    // Show immediate feedback (cosmetic only — server computes real score)
    feedbackMessage.classList.remove('hidden');
    feedbackMessage.className = 'feedback-correct';
    feedbackMessage.innerHTML = `> RESPONSE_LOGGED: [${userAnswer.toUpperCase()}]`;

    btnRedLight.disabled = true;
    btnGreenLight.disabled = true;
    btnRedLight.style.opacity = '0.5';
    btnGreenLight.style.opacity = '0.5';
    
    submitBtn.classList.remove('hidden');
    submitBtn.querySelector('.btn-text').textContent = "PROCEED_TO_NEXT";
    submitBtn.onclick = () => {
        document.querySelector('.cyber-card').style.borderColor = 'var(--brand-hover)';
        nextQuestion();
    };
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

async function endGame() {
    questionScreen.classList.remove('active');
    endScreen.classList.add('active');

    // Submit answers to server for scoring
    let serverScore = userAnswers.length; // fallback
    try {
        const res = await fetch('/api/round/1/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: userAnswers })
        });
        const data = await res.json();
        if (data.success) {
            serverScore = data.score;
        }
    } catch(e) {
        console.warn('Server not reachable, using local score.');
    }

    score = serverScore;
    
    // Animate score counter
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
