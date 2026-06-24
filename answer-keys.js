// answer-keys.js — Server-side only. NEVER served to the browser.
// Contains the canonical answer keys for all 5 rounds.

// ROUND 1: Red Light, Green Light
// Frontend sends: array of strings like ["red light", "green light", ...]
const ROUND_1_ANSWERS = [
    "red light",   // Q1: Healthcare AI shipped with biased data
    "red light",   // Q2: Social media delays fixing misinformation
    "green light", // Q3: University conducts fairness testing
    "red light"    // Q4: Fitness app shares location without consent
];

// ROUND 2: Glass Bridge (Ethical Dilemmas)
// Frontend sends: array of selected option indices [1, 0, 1, 1]
const ROUND_2_ANSWERS = [
    1, // Q1: Explainable model (Right Bridge)
    0, // Q2: Release immediately (Left Bridge)
    1, // Q3: Less advanced for rural (Right Bridge)
    1  // Q4: Collect with consent (Right Bridge)
];

// ROUND 3: Tug of War (Matching)
// Frontend sends: { sets: [ { correctFirstTry: [0,1,2,3,4], failed: [] }, ... ] }
// Each set has 5 pairs. Server computes escalating points + perfect pull bonus.
const ROUND_3_PAIRS = [
    // Set 1: 1pt per match, +2 perfect bonus (max 7)
    { multiplier: 1, count: 5 },
    // Set 2: 2pts per match, +2 perfect bonus (max 12)
    { multiplier: 2, count: 5 },
    // Set 3: 3pts per match, +2 perfect bonus (max 17)
    { multiplier: 3, count: 5 },
    // Set 4: 4pts per match, +2 perfect bonus (max 22)
    { multiplier: 4, count: 5 }
];
// Max total: 7 + 12 + 17 + 22 = 58

// ROUND 4: Dalgona Challenge (MCQ Ciphers)
// Frontend sends: array of selected option indices [1, 2, 1, 0]
const ROUND_4_ANSWERS = [
    1, // Q1: Algorithmic Fairness (B)
    2, // Q2: Integrity (C)
    1, // Q3: Accountability (B)
    0  // Q4: TRANSPARENCY (A)
];

// ROUND 5: Rapid Fire (Text Answers)
// Frontend sends: array of text strings
// Server checks if any keyword is present in the answer
const ROUND_5_KEYWORDS = [
    ["unfair", "bias", "discrimination"],           // Q1: What is algorithmic bias?
    ["unesco"],                                       // Q2: UN framework
    ["digital divide", "divide"],                     // Q3: Technology access gap
    ["bias", "algorithmic", "dataset", "data"]        // Q4: AI fails for minorities
];

module.exports = {
    ROUND_1_ANSWERS,
    ROUND_2_ANSWERS,
    ROUND_3_PAIRS,
    ROUND_4_ANSWERS,
    ROUND_5_KEYWORDS
};
