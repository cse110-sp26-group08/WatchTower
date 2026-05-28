function getStoredUser() {
    const rawUser = localStorage.getItem('watchtowerUser');

    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('watchtowerUser');
        return null;
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

function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// True when the page is served directly from the filesystem (e.g. VS Code
// Live Server) rather than through Express. Links need different hrefs in
// each case because Express uses clean paths (/login) while static serving
// requires relative .html file paths.
function isStaticFrontendPreview() {
    return window.location.pathname.includes('/frontend/');
}

function getFieldError(input) {
    return input.closest('.form-field').querySelector('.field-error');
}

function setFieldError(input, message) {
    const errorElement = getFieldError(input);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function getEmailError(email) {
    if (!email) {
        return 'Please enter your email.';
    }

    // Minimal RFC-compatible check: local@domain.tld, no whitespace
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email) ? '' : 'Please enter a valid email.';
}

function attachFieldValidation(field, validateFn) {
    field.addEventListener('blur', () => validateFn(field));
    field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
            validateFn(field);
        }
    });
}
