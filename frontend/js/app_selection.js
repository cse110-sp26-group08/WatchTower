/* global getStoredUser, escapeHtml */

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
    bindProjectDialogControls();
    // Expose on window so the "Create new project" button in HTML can call it directly
    window.watchtowerOpenCreateProject = openCreateProjectDialog;
    loadApps(user.id);
}

/**
 * Fetches all apps for the given owner and hands them to renderApps.
 * Shows a loading state while the request is in flight so the list
 * doesn't sit blank.
 *
 * @param {number} ownerId
 */
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

/**
 * Builds the project card list using a DocumentFragment to avoid
 * repeated reflows from individual DOM insertions.
 * The "add" card always appears first.
 *
 * @param {Array<{ id: number, name: string, url?: string }>} apps
 * @param {number} ownerId
 */
function renderApps(apps, ownerId) {
    const appsList = document.getElementById('apps-list');
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
        const appUrl = app.url || '';

        card.innerHTML = `
            <div class="app-card-top">
              <span class="app-badge">Project</span>
              <div>
                <h3>${escapeHtml(app.name)}</h3>
              </div>
              <p class="app-description" title="${escapeHtml(appUrl || 'No URL saved yet')}">${appUrl ? escapeHtml(appUrl) : 'No URL saved yet'}</p>
            </div>
            <div class="app-card-footer">
              <span class="app-open-label">Open dashboard</span>
              <span class="app-arrow" aria-hidden="true">&rarr;</span>
            </div>
        `;

        card.addEventListener('click', () => {
            // Spread app so the stored object always has the resolved URL even if the
            // server-side record has no url field (url stays undefined rather than null
            // so JSON.stringify omits it, keeping the stored object clean).
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

/**
 * Creates the "+ Create new project" card that opens the dialog.
 * Guards against the edge case where currentUser has changed since the
 * list was last rendered — redirects to login rather than creating a project
 * under the wrong account.
 *
 * @param {number} ownerId
 * @returns {HTMLElement}
 */
function createAddProjectCard(ownerId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'add-project-card-wrapper';
    wrapper.innerHTML = '<span class="add-project-label">Create new project</span>';

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'app-card add-project-card';
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

/**
 * Wires up the dialog close button and form submit.
 * Called once on init — the dialog itself persists in the DOM.
 */
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

/**
 * Resets the form, opens the native <dialog>, and pre-fills the URL
 * field with "https://" so users don't have to type the protocol.
 */
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

/**
 * Validates form inputs, POSTs to /api/apps, and refreshes the card list on success.
 * Intentionally non-destructive on failure — leaves the dialog open with the
 * error message visible so the user can correct and retry.
 */
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

/**
 * Updates a status/feedback element's text and CSS class in one call.
 * type is appended as a modifier class (e.g. 'error' → 'form-message error').
 * Pass an empty string to reset to the base class only.
 *
 * @param {HTMLElement} element
 * @param {string} text
 * @param {string} type - 'error' | 'success' | ''
 */
function updateMessage(element, text, type) {
    element.textContent = text;
    element.className = `form-message${type ? ` ${type}` : ''}`;
}

/**
 * Thin wrapper around the URL constructor — easiest reliable way to
 * check if a string is a parseable URL without a regex.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}
