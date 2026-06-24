document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.classList.remove('visible');

    const name = document.getElementById('participant-name').value.trim();
    const team_name = document.getElementById('team-name').value.trim();
    const registration_number = document.getElementById('reg-number').value.trim();

    if (!name || !team_name || !registration_number) {
        errorEl.textContent = '> ERROR: All fields are required.';
        errorEl.classList.add('visible');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, team_name, registration_number })
        });
        const data = await res.json();

        if (data.success) {
            window.location.href = 'index.html';
        } else {
            errorEl.textContent = `> ACCESS_DENIED: ${data.error}`;
            errorEl.classList.add('visible');
        }
    } catch (err) {
        errorEl.textContent = '> CONNECTION_FAILED: Server unreachable.';
        errorEl.classList.add('visible');
    }
});
