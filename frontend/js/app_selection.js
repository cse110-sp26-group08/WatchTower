let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    const user = getStoredUser();

    if (!user?.id) {
        window.location.href = '/login';
        return;
    }

    currentUser = user;
    addLogoutListener();
    bindProjectDialogControls();
    window.watchtowerOpenCreateProject = openCreateProjectDialog;
    loadApps(user.id);
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

async function loadApps(ownerId) {
    const appsList = document.getElementById('apps-list');
    appsList.innerHTML = '<div class="empty-state">Loading project cards...</div>';

    try {
        const response = await fetch(`/api/apps/users/${ownerId}`);
        const data = await response.json();
        const apps = Array.isArray(data.apps) ? data.apps : [];

        renderApps(apps, ownerId);
    } catch (error) {
        console.error('Error loading apps:', error);
        appsList.innerHTML = '<div class="empty-state">Could not load projects.</div>';
    }
}

function renderApps(apps, ownerId) {
    const appsList = document.getElementById('apps-list');
    const storedUrls = getStoredAppUrls();
    appsList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createAddProjectCard(ownerId));

    if (!apps.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No project cards yet. Add your first project to get started.';
        fragment.appendChild(emptyState);
        appsList.appendChild(fragment);
        return;
    }

    apps.forEach((app) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'app-card';
        const appUrl = app.url || storedUrls[app.id] || '';

        card.innerHTML = `
            <div class="app-card-top">
              <span class="app-badge">Project</span>
              <div>
                <h3>${escapeHtml(app.name)}</h3>
              </div>
              <p class="app-description">${appUrl ? escapeHtml(appUrl) : 'No URL saved yet'}</p>
            </div>
            <div class="app-card-footer">
              <span class="app-open-label">Open dashboard</span>
              <span class="app-arrow" aria-hidden="true">&rarr;</span>
            </div>
        `;

        card.addEventListener('click', () => {
            localStorage.setItem('watchtowerSelectedApp', JSON.stringify({
                ...app,
                url: appUrl || undefined,
            }));
            window.location.href = `/dashboard?appId=${encodeURIComponent(app.id)}`;
        });

        fragment.appendChild(card);
    });

    appsList.appendChild(fragment);
}

function createAddProjectCard(ownerId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'add-project-card-wrapper';
    wrapper.innerHTML = '<span class="add-project-label">Create new project</span>';

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'app-card add-project-card';
    card.setAttribute('onclick', 'window.watchtowerOpenCreateProject && window.watchtowerOpenCreateProject()');
    card.innerHTML = `
        <div class="add-project-card-content">
          <span class="add-project-plus" aria-hidden="true">+</span>
        </div>
    `;
    card.addEventListener('click', () => {
        if (!currentUser?.id || currentUser.id !== ownerId) {
            window.location.href = '/login';
            return;
        }

        openCreateProjectDialog();
    });
    wrapper.appendChild(card);
    return wrapper;
}

function bindProjectDialogControls() {
    const dialog = document.getElementById('create-project-dialog');
    const form = document.getElementById('create-project-form');
    const closeButton = document.getElementById('close-project-dialog');

    closeButton.addEventListener('click', () => {
        dialog.close();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await createProjectFromDialog();
    });
}

function openCreateProjectDialog() {
    const dialog = document.getElementById('create-project-dialog');
    const nameInput = document.getElementById('project-name-input');
    const urlInput = document.getElementById('project-url-input');
    const form = document.getElementById('create-project-form');

    form.reset();
    dialog.showModal();
    nameInput.focus();
    urlInput.value = 'https://';
}

async function createProjectFromDialog() {
    const user = currentUser;
    const message = document.getElementById('create-app-message');
    const dialog = document.getElementById('create-project-dialog');
    const nameInput = document.getElementById('project-name-input');
    const urlInput = document.getElementById('project-url-input');
    const name = nameInput.value.trim();

    if (!name) {
        updateMessage(message, 'Project name is required.', 'error');
        nameInput.focus();
        return;
    }

    const url = urlInput.value.trim();

    if (!url) {
        updateMessage(message, 'Project URL is required.', 'error');
        urlInput.focus();
        return;
    }

    if (!isValidUrl(url)) {
        updateMessage(message, 'Project URL must be a valid URL.', 'error');
        urlInput.focus();
        return;
    }

    updateMessage(message, 'Creating project card...', '');

    try {
        const response = await fetch('/api/apps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ownerId: user.id,
                name,
                url,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            updateMessage(message, data.message || data.error || 'Failed to create project.', 'error');
            return;
        }

        updateMessage(message, 'Project card created.', 'success');
        dialog.close();
        await loadApps(user.id);
    } catch (error) {
        console.error('Error creating app:', error);
        updateMessage(message, 'Could not create project right now.', 'error');
    }
}

function addLogoutListener() {
    document.addEventListener('watchtower-logout', () => {
        localStorage.removeItem('watchtowerUser');
        localStorage.removeItem('watchtowerSelectedApp');
        window.location.href = '/';
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
