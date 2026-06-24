require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');
const supabase = require('./supabaseClient');
const {
    ROUND_1_ANSWERS,
    ROUND_2_ANSWERS,
    ROUND_3_PAIRS,
    ROUND_4_ANSWERS,
    ROUND_5_KEYWORDS
} = require('./answer-keys');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Supabase Postgres directly for sessions
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust Vercel's HTTPS proxy
app.use(express.json());
app.use(session({
    store: new pgSession({
        pool: pgPool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'ieee-wie-cyber-survival-2026-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 4, // 4 hours
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Auth middleware for protected routes
function requireAuth(req, res, next) {
    if (!req.session.teamId) {
        return res.status(401).json({ error: 'Not authenticated. Please login.' });
    }
    next();
}

// Serve static files (but block answer-keys.js and server.js)
app.use((req, res, next) => {
    const blocked = ['/answer-keys.js', '/server.js', '/tournament.db', '/.env', '/supabaseclient.js'];
    if (blocked.includes(req.path.toLowerCase())) {
        return res.status(403).json({ error: 'Access denied.' });
    }
    next();
});
app.use(express.static(path.join(__dirname)));

// ─── AUTH ENDPOINTS ─────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { name, team_name, registration_number } = req.body;
    if (!name || !team_name || !registration_number) {
        return res.status(400).json({ error: 'Name, Team name, and registration number required.' });
    }

    try {
        // 1. Check if user exists by registration_number
        let { data: team, error } = await supabase
            .from('teams')
            .select('*')
            .eq('registration_number', registration_number.trim())
            .single();

        if (!team) {
            // 2. Register New Team
            const { data: newTeam, error: insertError } = await supabase
                .from('teams')
                .insert([{
                    name: name.trim(),
                    team_name: team_name.trim(),
                    registration_number: registration_number.trim()
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            team = newTeam;
        } else {
            // 3. Verify existing team name
            if (team.team_name.toLowerCase() !== team_name.trim().toLowerCase()) {
                return res.status(401).json({ error: 'Invalid credentials. Team name does not match registration number.' });
            }
            
            // 4. Update name if missing
            if (!team.name) {
                const { data: updatedTeam } = await supabase
                    .from('teams')
                    .update({ name: name.trim() })
                    .eq('id', team.id)
                    .select()
                    .single();
                team = updatedTeam;
            }
        }

        // 5. Set session state
        req.session.teamId = team.id;
        req.session.teamName = team.team_name;
        req.session.isAdmin = !!team.is_admin;

        res.json({
            success: true,
            team_name: team.team_name,
            name: team.name,
            is_admin: !!team.is_admin
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/session
app.get('/api/session', async (req, res) => {
    if (!req.session.teamId) {
        return res.json({ authenticated: false });
    }

    try {
        const { data: team } = await supabase
            .from('teams')
            .select('*')
            .eq('id', req.session.teamId)
            .single();
            
        if (!team) {
            return res.json({ authenticated: false });
        }

        res.json({
            authenticated: true,
            team_name: team.team_name,
            name: team.name,
            registration_number: team.registration_number,
            is_admin: !!team.is_admin,
            scores: {
                round_1: team.round_1_score,
                round_2: team.round_2_score,
                round_3: team.round_3_score,
                round_3_start_time: team.round_3_start_time,
                round_3_end_time: team.round_3_end_time,
                round_4: team.round_4_score,
                round_5: team.round_5_score
            }
        });
    } catch (err) {
        console.error(err);
        res.json({ authenticated: false });
    }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ─── ROUND STATUS & CONTROL ────────────────────────────────────────────────────

// GET /api/round/:n/status
app.get('/api/round/:n/status', requireAuth, async (req, res) => {
    const roundNum = parseInt(req.params.n);
    if (roundNum < 1 || roundNum > 5) {
        return res.status(400).json({ error: 'Invalid round number.' });
    }

    try {
        const { data: team } = await supabase.from('teams').select('*').eq('id', req.session.teamId).single();
        const scoreField = `round_${roundNum}_score`;
        const score = team[scoreField];
        const isAdmin = !!team.is_admin;

        const response = {
            round: roundNum,
            is_admin: isAdmin,
            completed: score !== null && !isAdmin,
            score: score
        };

        // Special handling for Round 3 timing
        if (roundNum === 3) {
            response.start_time = team.round_3_start_time;
            response.end_time = team.round_3_end_time;
        }

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/round/:n/start
app.post('/api/round/:n/start', requireAuth, async (req, res) => {
    const roundNum = parseInt(req.params.n);
    if (roundNum < 1 || roundNum > 5) return res.status(400).json({ error: 'Invalid round number.' });

    try {
        const { data: team } = await supabase.from('teams').select('*').eq('id', req.session.teamId).single();
        const isAdmin = !!team.is_admin;
        const scoreField = `round_${roundNum}_score`;

        // Check completion lock
        if (!isAdmin && team[scoreField] !== null) {
            return res.status(403).json({ error: 'Round already completed.', completed: true });
        }

        // Handle Round 3 Timestamping
        if (roundNum === 3) {
            if (isAdmin) {
                // Admin override
                await supabase.from('teams').update({
                    round_3_start_time: new Date().toISOString(),
                    round_3_end_time: null,
                    round_3_score: null
                }).eq('id', team.id);
            } else if (!team.round_3_start_time) {
                // First start
                await supabase.from('teams').update({
                    round_3_start_time: new Date().toISOString()
                }).eq('id', team.id);
            }
        }

        res.json({ success: true, started: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/round/:n/submit
app.post('/api/round/:n/submit', requireAuth, async (req, res) => {
    const roundNum = parseInt(req.params.n);
    if (roundNum < 1 || roundNum > 5) return res.status(400).json({ error: 'Invalid round number.' });

    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: 'No answers provided.' });

    try {
        const { data: team } = await supabase.from('teams').select('*').eq('id', req.session.teamId).single();
        const isAdmin = !!team.is_admin;
        const scoreField = `round_${roundNum}_score`;
        const answersField = `round_${roundNum}_answers`;

        if (!isAdmin && team[scoreField] !== null) {
            return res.status(403).json({ error: 'Round already completed. Score locked.', completed: true });
        }

        let computedScore = 0;
        switch (roundNum) {
            case 1: computedScore = computeRound1Score(answers); break;
            case 2: computedScore = computeRound2Score(answers); break;
            case 3: computedScore = computeRound3Score(answers, team, isAdmin); break;
            case 4: computedScore = computeRound4Score(answers); break;
            case 5: computedScore = computeRound5Score(answers); break;
        }

        const updatePayload = {
            [scoreField]: computedScore,
            [answersField]: answers // Supabase handles JSON natively
        };

        if (roundNum === 3 && !isAdmin) {
            updatePayload.round_3_end_time = new Date().toISOString();
        }

        if (!isAdmin) {
            await supabase.from('teams').update(updatePayload).eq('id', team.id);
        }

        const response = { success: true, score: computedScore };

        // Include Time Delta for Round 3
        if (roundNum === 3) {
            const { data: updatedTeam } = await supabase.from('teams').select('round_3_start_time, round_3_end_time').eq('id', team.id).single();
            if (updatedTeam.round_3_start_time && updatedTeam.round_3_end_time) {
                const delta = new Date(updatedTeam.round_3_end_time) - new Date(updatedTeam.round_3_start_time);
                response.time_elapsed_ms = delta;
                response.time_elapsed_s = (delta / 1000).toFixed(2);
            }
        }

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server error' });
    }
});

// ─── SCORING FUNCTIONS ──────────────────────────────────────────────────────────

function computeRound1Score(answers) {
    if (!Array.isArray(answers)) return 0;
    let score = 0;
    for (let i = 0; i < ROUND_1_ANSWERS.length; i++) {
        if (answers[i] && answers[i].toLowerCase().trim() === ROUND_1_ANSWERS[i]) {
            score++;
        }
    }
    return score;
}

function computeRound2Score(answers) {
    if (!Array.isArray(answers)) return 0;
    let score = 0;
    for (let i = 0; i < ROUND_2_ANSWERS.length; i++) {
        if (answers[i] === ROUND_2_ANSWERS[i]) {
            score++;
        }
    }
    return score;
}

function computeRound3Score(answers, team, isAdmin) {
    if (!answers || !answers.sets || !Array.isArray(answers.sets)) return 0;

    let totalScore = 0;
    for (let i = 0; i < ROUND_3_PAIRS.length && i < answers.sets.length; i++) {
        const setData = answers.sets[i];
        const { multiplier, count } = ROUND_3_PAIRS[i];

        const correctFirstTry = Math.min(setData.correctCount || 0, count);
        const failedCount = (setData.failedMatchIds && setData.failedMatchIds.length) || 0;

        const firstTryCorrect = Math.max(0, correctFirstTry - failedCount);
        totalScore += firstTryCorrect * multiplier;

        if (failedCount === 0 && correctFirstTry === count) {
            totalScore += 2;
        }
    }

    return totalScore;
}

function computeRound4Score(answers) {
    if (!Array.isArray(answers)) return 0;
    let score = 0;
    for (let i = 0; i < ROUND_4_ANSWERS.length; i++) {
        if (answers[i] === ROUND_4_ANSWERS[i]) {
            score++;
        }
    }
    return score;
}

function computeRound5Score(answers) {
    if (!Array.isArray(answers)) return 0;
    let score = 0;
    for (let i = 0; i < ROUND_5_KEYWORDS.length; i++) {
        if (answers[i]) {
            const userAnswer = answers[i].toLowerCase().trim();
            for (const keyword of ROUND_5_KEYWORDS[i]) {
                if (userAnswer.includes(keyword)) {
                    score++;
                    break;
                }
            }
        }
    }
    return score;
}

// ─── START SERVER ───────────────────────────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n══════════════════════════════════════════════`);
        console.log(`  Cyber Odyssey Server`);
        console.log(`  Running on http://localhost:${PORT}`);
        console.log(`  Admin Login: ADMIN / ADMIN-000`);
        console.log(`══════════════════════════════════════════════\n`);
    });
}

module.exports = app;
