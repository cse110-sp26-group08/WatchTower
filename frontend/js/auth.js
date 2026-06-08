/**
 * Global logout helper attached to window so any page can call it —
 * including web components that don't share the same module scope.
 *
 * Hits the server-side session endpoint first, then wipes localStorage
 * regardless of whether that request succeeded. We don't want a network
 * blip to leave a user stuck with stale credentials in the browser.
 *
 * @param {string} [redirectHref='/'] - Destination after logout.
 */
window.watchtowerLogout = async function watchtowerLogout(redirectHref) {
    await fetch('/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('watchtowerUser');
    localStorage.removeItem('watchtowerSelectedApp');
    window.location.href = redirectHref || '/';
};
