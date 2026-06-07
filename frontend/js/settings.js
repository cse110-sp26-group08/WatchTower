document.addEventListener('DOMContentLoaded', () => {
    initSettings().catch((err) => {
        console.error('Settings failed to initialize:', err);
    });
});

function getSelectedApp() {
    try {
        return JSON.parse(localStorage.getItem('watchtowerSelectedApp')) || null;
    } catch {
        return null;
    }
}

async function initSettings() {
    const app = getSelectedApp();

    if (!app?.id) {
        window.location.href = '/apps';
        return;
    }

    const [appRes, keyRes] = await Promise.all([
        fetch(`/api/apps/${app.id}`),
        fetch(`/api/apps/${app.id}/apikey`),
    ]);

    if (!appRes.ok) {
        window.location.href = '/apps';
        return;
    }

    const { app: appData } = await appRes.json();
    const keyData = keyRes.ok ? await keyRes.json() : null;

    populateForm(appData, keyData?.apiKey ?? null);
    bindSaveForm(appData.id);
    bindCopyButton(keyData?.apiKey ?? null);
    bindDeleteButton(appData);
}

function populateForm(app, apiKey) {
    document.getElementById('settings-name').value = app.name;
    document.getElementById('settings-url').value = app.url ?? '';
    document.getElementById('settings-apikey').value = apiKey ?? '(unavailable)';
    document.getElementById('settings-modal-app-name').textContent = app.name;
}

function bindSaveForm(appId) {
    const form = document.getElementById('settings-info-form');
    const feedback = document.getElementById('settings-save-feedback');
    const saveBtn = document.getElementById('settings-save-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.textContent = '';
        feedback.className = 'settings-feedback';

        const name = document.getElementById('settings-name').value.trim();
        const url = document.getElementById('settings-url').value.trim();

        if (!name) {
            feedback.textContent = 'App name is required.';
            feedback.classList.add('settings-feedback-error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = url ? 'Checking URL…' : 'Saving…';

        try {
            const res = await fetch(`/api/apps/${appId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url: url || null }),
            });

            const data = await res.json();

            if (!res.ok) {
                feedback.textContent = data.error || 'Failed to save changes.';
                feedback.classList.add('settings-feedback-error');
                return;
            }

            const stored = getSelectedApp();
            if (stored) {
                localStorage.setItem('watchtowerSelectedApp', JSON.stringify({
                    ...stored,
                    name: data.app.name,
                    url: data.app.url ?? stored.url,
                }));
            }

            document.getElementById('settings-modal-app-name').textContent = data.app.name;

            if (url) {
                const downOrNot = Array.isArray(data.app.downOrNot) ? data.app.downOrNot : [];
                const isUp = downOrNot.length > 0 ? downOrNot[downOrNot.length - 1] : null;
                const statusText = isUp === true ? ' — site is UP' : isUp === false ? ' — site is DOWN' : '';
                feedback.textContent = `Changes saved${statusText}.`;
            } else {
                feedback.textContent = 'Changes saved.';
            }
            feedback.classList.add('settings-feedback-success');
        } catch {
            feedback.textContent = 'Network error. Please try again.';
            feedback.classList.add('settings-feedback-error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });
}

function bindCopyButton(apiKey) {
    const copyBtn = document.getElementById('settings-copy-btn');
    const feedback = document.getElementById('settings-copy-feedback');

    if (!apiKey) {
        copyBtn.disabled = true;
        return;
    }

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(apiKey);
            feedback.textContent = 'Copied!';
            feedback.className = 'settings-feedback settings-feedback-success';
            setTimeout(() => { feedback.textContent = ''; feedback.className = 'settings-feedback'; }, 2000);
        } catch {
            feedback.textContent = 'Copy failed — select and copy manually.';
            feedback.className = 'settings-feedback settings-feedback-error';
        }
    });
}

function bindDeleteButton(app) {
    const deleteBtn = document.getElementById('settings-delete-btn');
    const backdrop = document.getElementById('settings-modal-backdrop');
    const cancelBtn = document.getElementById('settings-modal-cancel');
    const confirmBtn = document.getElementById('settings-modal-confirm');

    deleteBtn.addEventListener('click', () => {
        backdrop.hidden = false;
    });

    cancelBtn.addEventListener('click', () => {
        backdrop.hidden = true;
    });

    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.hidden = true;
    });

    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting…';

        try {
            const res = await fetch(`/api/apps/${app.id}`, { method: 'DELETE' });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to delete app. Please try again.');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Delete';
                return;
            }

            localStorage.removeItem('watchtowerSelectedApp');
            window.location.href = '/apps';
        } catch {
            alert('Network error. Please try again.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete';
        }
    });
}
