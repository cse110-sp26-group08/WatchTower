async function watchtowerLogout(redirectHref) {
    await fetch('/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('watchtowerUser');
    localStorage.removeItem('watchtowerSelectedApp');
    window.location.href = redirectHref || '/';
}
