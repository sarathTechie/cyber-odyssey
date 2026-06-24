(async function initAntiCheat() {
    try {
        const res = await fetch('/api/session');
        const session = await res.json();
        
        if (!session.authenticated) return;
        if (session.is_admin === true) {
            console.log('Admin access verified. Anti-cheat protocols bypassed.');
            return;
        }

        console.log('Anti-cheat protocols engaged. Waiting for quiz start.');

        // 1. Retrieve persistent strikes from sessionStorage
        let cheatStrikes = parseInt(sessionStorage.getItem('cheatStrikes')) || 0;
        let isProcessingStrike = false;

        // --- INTERFACE INPUT LOCKS ---
        document.addEventListener('copy', e => e.preventDefault());
        document.addEventListener('paste', e => e.preventDefault());
        document.addEventListener('contextmenu', e => e.preventDefault());

        function getAnswersPayload() {
            if (typeof window.userAnswers !== 'undefined') return window.userAnswers;
            if (typeof window.setResults !== 'undefined') return { sets: window.setResults };
            if (typeof window.answers !== 'undefined') return window.answers;
            return [];
        }

        async function triggerStrike() {
            if (isProcessingStrike) return; 
            isProcessingStrike = true;
            cheatStrikes++;
            
            // Persist the new strike count
            sessionStorage.setItem('cheatStrikes', cheatStrikes);

            // Create Overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(36, 0, 70, 0.95)';
            overlay.style.zIndex = '999999';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.color = '#fff';
            overlay.style.fontFamily = "'Fira Code', monospace";
            overlay.style.textAlign = 'center';
            overlay.style.padding = '2rem';

            if (cheatStrikes === 1) {
                overlay.innerHTML = `
                    <h1 style="color: #ff0055; font-size: 3rem; margin-bottom: 1rem; text-shadow: 0 0 10px #ff0055;">WARNING</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">Unusual activity detected. Please stay inside the tournament tab.</p>
                    <p style="font-size: 1.5rem; color: #fdf0d5; margin-bottom: 2rem;">Strike 1/3</p>
                    <button id="clear-strike-btn" style="background: transparent; border: 2px solid #00f0ff; color: #00f0ff; padding: 1rem 2rem; font-family: inherit; font-size: 1rem; cursor: pointer; text-transform: uppercase;">Acknowledge</button>
                `;
                document.body.appendChild(overlay);
                document.getElementById('clear-strike-btn').addEventListener('click', () => {
                    document.body.removeChild(overlay);
                    isProcessingStrike = false;
                });
            } else if (cheatStrikes === 2) {
                overlay.innerHTML = `
                    <h1 style="color: #ff0055; font-size: 4rem; margin-bottom: 1rem; text-shadow: 0 0 20px #ff0055;">FINAL WARNING</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem; color: #ffb703;">Additional browser activity will result in immediate disqualification.</p>
                    <p style="font-size: 1.5rem; color: #ff0055; margin-bottom: 2rem; font-weight: bold;">Strike 2/3</p>
                    <button id="clear-strike-btn" style="background: rgba(255, 0, 85, 0.2); border: 2px solid #ff0055; color: #fff; padding: 1rem 2rem; font-family: inherit; font-size: 1rem; cursor: pointer; text-transform: uppercase; box-shadow: 0 0 10px rgba(255, 0, 85, 0.5);">I Understand</button>
                `;
                document.body.appendChild(overlay);
                document.getElementById('clear-strike-btn').addEventListener('click', () => {
                    document.body.removeChild(overlay);
                    isProcessingStrike = false;
                });
            } else if (cheatStrikes >= 3) {
                overlay.style.backgroundColor = '#000';
                overlay.innerHTML = `
                    <style>
                        .access-glitch { position: relative; display: inline-block; font-weight: bold; }
                        .access-glitch::before, .access-glitch::after {
                            content: attr(data-text);
                            position: absolute;
                            top: 0; left: 0; width: 100%; height: 100%;
                            background: #000;
                        }
                        .access-glitch::before {
                            left: 4px; text-shadow: -2px 0 #ff0000;
                            clip: rect(24px, 9999px, 90px, 0);
                            animation: ag-anim 2s infinite linear alternate-reverse;
                        }
                        .access-glitch::after {
                            left: -4px; text-shadow: -2px 0 #00f0ff;
                            clip: rect(85px, 9999px, 140px, 0);
                            animation: ag-anim-2 2.5s infinite linear alternate-reverse;
                        }
                        @keyframes ag-anim {
                            0% { clip: rect(10px, 9999px, 31px, 0); }
                            20% { clip: rect(62px, 9999px, 14px, 0); }
                            40% { clip: rect(34px, 9999px, 89px, 0); }
                            60% { clip: rect(78px, 9999px, 55px, 0); }
                            80% { clip: rect(14px, 9999px, 92px, 0); }
                            100% { clip: rect(41px, 9999px, 2px, 0); }
                        }
                        @keyframes ag-anim-2 {
                            0% { clip: rect(65px, 9999px, 100px, 0); }
                            20% { clip: rect(12px, 9999px, 55px, 0); }
                            40% { clip: rect(89px, 9999px, 34px, 0); }
                            60% { clip: rect(2px, 9999px, 78px, 0); }
                            80% { clip: rect(55px, 9999px, 14px, 0); }
                            100% { clip: rect(31px, 9999px, 62px, 0); }
                        }
                    </style>
                    <h1 class="access-glitch" data-text="ACCESS DENIED" style="color: #ff0000; font-size: 5rem; margin-bottom: 1rem; text-shadow: 0 0 20px #ff0000;">ACCESS DENIED</h1>
                    <p style="font-size: 1.5rem; color: #fff; margin-bottom: 1rem;">Disqualification Protocols Initiated.</p>
                    <p style="font-size: 1.2rem; color: #ffb703;">Session terminated due to repeated infractions.</p>
                `;
                document.body.appendChild(overlay);

                // Auto-submit current state if on a round page
                const roundMatch = window.location.pathname.match(/round(\d)/);
                if (roundMatch) {
                    const currentRound = roundMatch[1];
                    const currentAnswers = getAnswersPayload();
                    
                    try {
                        await fetch('/api/round/' + currentRound + '/submit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ answers: currentAnswers })
                        });
                        console.log('Force submission complete.');
                    } catch (err) {
                        console.error('Force submission failed:', err);
                    }
                }
                // Do not reset isProcessingStrike so the overlay remains forever
            }
        }

        // Check if user already reached 3 strikes before reloading
        if (cheatStrikes >= 3) {
            cheatStrikes = 2; // Temporarily subtract 1 so triggerStrike hits the 3 branch
            triggerStrike();
        }

        // Expose a function to explicitly START the tracking
        window.startAntiCheatTracking = function() {
            console.log('Quiz started. Anti-cheat monitoring activated.');
            
            window.isNavigating = false;
            window.addEventListener('beforeunload', () => {
                window.isNavigating = true;
            });

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && !window.isNavigating) {
                    triggerStrike();
                }
            });

            window.addEventListener('blur', () => {
                if (!window.isNavigating) {
                    triggerStrike();
                }
            });
        };

    } catch (err) {
        console.error("Anti-cheat init failed:", err);
    }
})();
