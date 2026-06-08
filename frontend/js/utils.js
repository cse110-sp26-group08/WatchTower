/**
 * Pulls the stored user object out of localStorage.
 * If the stored JSON is malformed, removes the bad entry and returns null
 * rather than surfacing a parse error to callers.
 *
 * @returns {{ id: number, username: string, email: string } | null}
 */
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

/**
 * Escapes the five HTML-special characters so user-supplied strings
 * can be injected via innerHTML without opening XSS.
 * Covers: & < > " '
 *
 * @param {*} value - Coerced to string if not already one.
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * Arithmetic mean of an array of numbers.
 * Returns 0 for an empty array — callers that display this should check
 * for the empty case themselves if "0 ms" and "no data" need to look different.
 *
 * @param {number[]} values
 * @returns {number}
 */
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

/**
 * Finds the .field-error element paired with a given input.
 * Assumes the markup pattern: input → .form-field ancestor → .field-error child.
 *
 * @param {HTMLInputElement} input
 * @returns {Element | null}
 */
function getFieldError(input) {
    return input.closest('.form-field').querySelector('.field-error');
}

/**
 * Shows or clears the error message for a form field and flips aria-invalid
 * so assistive tech announces the state change.
 * Passing an empty string clears the error.
 *
 * @param {HTMLInputElement} input
 * @param {string} message - Error text. Empty string = no error.
 */
function setFieldError(input, message) {
    const errorElement = getFieldError(input);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

/**
 * Basic email format check. Returns an error string on failure, empty string on success.
 * The regex is intentionally minimal — just local@domain.tld with no whitespace.
 * Full RFC 5322 compliance isn't worth the complexity here; the server validates too.
 *
 * @param {string} email - Already-trimmed value.
 * @returns {string} Error message or empty string.
 */
function getEmailError(email) {
    if (!email) {
        return 'Please enter your email.';
    }

    // Minimal RFC-compatible check: local@domain.tld, no whitespace
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email) ? '' : 'Please enter a valid email.';
}

/**
 * Attaches blur and input event listeners to a field for real-time validation.
 * The input listener is intentionally gated: it only re-validates once the field
 * has already been flagged invalid, so we don't yell at users mid-typing.
 *
 * @param {HTMLInputElement} field
 * @param {(field: HTMLInputElement) => void} validateFn
 */
function attachFieldValidation(field, validateFn) {
    field.addEventListener('blur', () => validateFn(field));
    field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
            validateFn(field);
        }
    });
}
