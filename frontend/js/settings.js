document.addEventListener('DOMContentLoaded', () => {
    initSettings().catch((err) => {
        console.error('Settings failed to initialize:', err);
    });
});

/**
 * Reads the currently selected app from localStorage.
 * Returns null if missing or unparseable — callers redirect to /apps in that case.
 *
 * @returns {{ id: number, name: string, url?: string } | null}
 */
function getSelectedApp() {
    try {
        return JSON.parse(localStorage.getItem('watchtowerSelectedApp')) || null;
    } catch {
        return null;
    }
}

/**
 * Entry point. Fetches app data and its API key in parallel, then
 * wires up the form, copy button, and delete button.
 * Redirects to /apps if no app is selected or the fetch fails.
 */
async function initSettings() {
    const app = getSelectedApp();

    if (!app?.id) {
        window.location.href = '/apps';
        return;
    }

    // Fetch app details and API key concurrently — both are needed before we
    // can populate the form, so there's no reason to do them sequentially.
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

/**
 * Fills the settings form fields with the current app values.
 * Also sets the app name in the delete confirmation modal header.
 *
 * @param {{ name: string, url?: string }} app
 * @param {string | null} apiKey
 */
function populateForm(app, apiKey) {
    document.getElementById('settings-name').value = app.name;
    document.getElementById('settings-url').value = app.url ?? '';
    document.getElementById('settings-apikey').value = apiKey ?? '(unavailable)';
    document.getElementById('settings-modal-app-name').textContent = app.name;
}

/**
 * Attaches the save handler to the app info form.
 * On success, syncs the updated name/url back into localStorage so the
 * navbar and other pages that read from storage reflect the change immediately.
 *
 * @param {number} appId
 */
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
        saveBtn.textContent = 'Saving…';

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

            // Keep localStorage in sync so the dash navbar shows the updated name
            const stored = getSelectedApp();
            if (stored) {
                localStorage.setItem('watchtowerSelectedApp', JSON.stringify({
                    ...stored,
                    name: data.app.name,
                    url: data.app.url ?? stored.url,
                }));
            }

            document.getElementById('settings-modal-app-name').textContent = data.app.name;
            feedback.textContent = 'Changes saved.';
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

/**
 * Wires up the "Copy" button for the API key field.
 * Disables the button entirely if no key is available rather than
 * showing a misleading copy affordance.
 *
 * @param {string | null} apiKey
 */
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

/**
 * Wires up the delete button and its confirmation modal.
 * The modal backdrop doubles as a click-outside-to-dismiss target.
 * After a successful delete, clears the selected app from localStorage
 * before redirecting so the next page doesn't pick up a stale reference.
 *
 * @param {{ id: number, name: string }} app
 */
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

    // Close on click outside the modal panel
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
