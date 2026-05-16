document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    const user = getStoredUser();

    if (!user?._id) {
        window.location.href = '/login';
        return;
    }

    setWelcomeMessage(user);
    addCreateAppFormListener(user);
    addLogoutListener();
    loadApps(user._id);
}

function getStoredUser() {
    const rawUser = localStorage.getItem('watchtowerUser');

    if (!rawUser) {
        return null;
    }

    try {
        return JSON.parse(rawUser);
    } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('watchtowerUser');
        return null;
    }
}

function setWelcomeMessage(user) {
    const welcomeMessage = document.getElementById('welcome-message');
    const name = user.username || user.email || 'there';
    welcomeMessage.textContent = `Signed in as ${name}. Start a new app or continue with an existing project.`;
}

function addCreateAppFormListener(user) {
    const form = document.getElementById('create-app-form');
    const message = document.getElementById('create-app-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const name = String(formData.get('name') || '').trim();
        const url = String(formData.get('url') || '').trim();

        if (!name) {
            updateMessage(message, 'Project name is required.', 'error');
            return;
        }

        if (url && !isValidUrl(url)) {
            updateMessage(message, 'Project URL must be a valid URL.', 'error');
            return;
        }

        updateMessage(message, 'Initializing app...', '');

        try {
            const response = await fetch('/api/apps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ownerId: user._id,
                    name,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                updateMessage(message, data.message || data.error || 'Failed to initialize app.', 'error');
                return;
            }

            if (data.app?._id && url) {
                saveAppUrl(data.app._id, url);
            }

            updateMessage(message, 'App initialized.', 'success');
            form.reset();
            await loadApps(user._id);
        } catch (error) {
            console.error('Error creating app:', error);
            updateMessage(message, 'Could not initialize app right now.', 'error');
        }
    });
}

async function loadApps(ownerId) {
    const appsList = document.getElementById('apps-list');
    appsList.innerHTML = '<div class="empty-state">Loading apps...</div>';

    try {
        const response = await fetch(`/api/apps/users/${ownerId}`);
        const data = await response.json();
        const apps = Array.isArray(data.apps) ? data.apps : [];

        renderApps(apps);
    } catch (error) {
        console.error('Error loading apps:', error);
        appsList.innerHTML = '<div class="empty-state">Could not load apps.</div>';
    }
}

function renderApps(apps) {
    const appsList = document.getElementById('apps-list');
    const storedUrls = getStoredAppUrls();

    if (!apps.length) {
        appsList.innerHTML = '<div class="empty-state">No apps yet. Initialize your first project on the left.</div>';
        return;
    }

    appsList.innerHTML = '';

    apps.forEach((app) => {
        const article = document.createElement('article');
        article.className = 'app-card';
        const appUrl = storedUrls[app._id] || '';

        const createdLabel = app.createdAt
            ? new Date(app.createdAt).toLocaleDateString()
            : 'Unknown date';

        article.innerHTML = `
            <div>
              <h3>${escapeHtml(app.name)}</h3>
              <p class="app-meta">Created ${escapeHtml(createdLabel)}</p>
              ${appUrl ? `<a class="app-link" href="${escapeAttribute(appUrl)}" target="_blank" rel="noreferrer">${escapeHtml(appUrl)}</a>` : '<p class="app-meta">No URL saved</p>'}
            </div>
            <button type="button" class="button button-primary">Open dashboard</button>
        `;

        const button = article.querySelector('button');
        button.addEventListener('click', () => {
            localStorage.setItem('watchtowerSelectedApp', JSON.stringify({
                ...app,
                url: appUrl || undefined,
            }));
            window.location.href = `/dashboard?appId=${encodeURIComponent(app._id)}`;
        });

        appsList.appendChild(article);
    });
}

function addLogoutListener() {
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('watchtowerUser');
        localStorage.removeItem('watchtowerSelectedApp');
        window.location.href = '/login';
    });
}

function updateMessage(element, text, type) {
    element.textContent = text;
    element.className = `form-message${type ? ` ${type}` : ''}`;
}

function getStoredAppUrls() {
    const rawUrls = localStorage.getItem('watchtowerAppUrls');

    if (!rawUrls) {
        return {};
    }

    try {
        return JSON.parse(rawUrls);
    } catch (error) {
        console.error('Failed to parse stored app URLs:', error);
        localStorage.removeItem('watchtowerAppUrls');
        return {};
    }
}

function saveAppUrl(appId, url) {
    const appUrls = getStoredAppUrls();
    appUrls[appId] = url;
    localStorage.setItem('watchtowerAppUrls', JSON.stringify(appUrls));
}

function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
