document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    configurePageLinks();
    addLoginFormListener();
}

// When served as a static file (e.g. VS Code Live Server), Express routes like
// /login don't exist, so links must point to relative .html file paths instead.
function configurePageLinks() {
    const homeLink = document.querySelector('[data-home-link]');
    if (homeLink) {
        homeLink.href = isStaticFrontendPreview() ? '../index.html' : '/';
    }

    const signupLink = document.querySelector('[data-signup-link]');
    if (signupLink) {
        signupLink.href = isStaticFrontendPreview() ? 'signup.html' : '/signup';
    }
}

/**
 * Validates a single login field and displays the appropriate error.
 * Returns true if the field is valid so validateLoginForm can aggregate results.
 *
 * @param {HTMLInputElement} input
 * @returns {boolean}
 */
function validateField(input) {
    const value = input.value.trim();
    let message = '';

    if (input.name === 'email') {
        message = getEmailError(value);
    }

    if (input.name === 'password' && !input.value) {
        message = 'Please enter your password.';
    }

    setFieldError(input, message);
    return !message;
}

/**
 * Runs validateField on every login input and moves focus to the first
 * invalid field so keyboard and screen-reader users land in the right place.
 *
 * @param {HTMLFormElement} loginForm
 * @returns {boolean} True if all fields passed.
 */
function validateLoginForm(loginForm) {
    const fields = loginForm.querySelectorAll('input[name="email"], input[name="password"]');
    let isValid = true;

    fields.forEach((field) => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    if (!isValid) {
        fields[0].form.querySelector('[aria-invalid="true"]')?.focus();
    }

    return isValid;
}

/**
 * @param {HTMLFormElement} loginForm
 */
function addValidationListeners(loginForm) {
    const fields = loginForm.querySelectorAll('input[name="email"], input[name="password"]');
    fields.forEach((field) => attachFieldValidation(field, validateField));
}

/**
 * Shows a server-side login error. We always attach the message to the email
 * field (rather than password) because "invalid email or password" shouldn't
 * hint which one was wrong.
 *
 * @param {HTMLFormElement} loginForm
 * @param {string} [message]
 */
function showLoginFailure(loginForm, message) {
    const emailField = loginForm.elements.email;
    setFieldError(emailField, message || 'Invalid email or password.');
    emailField.focus();
}

function addLoginFormListener() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        return;
    }

    addValidationListeners(loginForm);

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateLoginForm(loginForm)) {
            return;
        }

        const formData = new FormData(loginForm);
        const email = formData.get('email').trim();
        const password = formData.get('password');

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store user so other pages can check auth without a round-trip
                localStorage.setItem('watchtowerUser', JSON.stringify(data.user));
                window.location.href = '/apps';
            } else {
                showLoginFailure(loginForm, data.message);
            }
        } catch (error) {
            console.error('Error during login:', error);
            showLoginFailure(loginForm, 'An error occurred during login. Please try again later.');
        }
    });
}
