/* global isStaticFrontendPreview, getFieldError, setFieldError, getEmailError, attachFieldValidation */

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

function addValidationListeners(loginForm) {
    const fields = loginForm.querySelectorAll('input[name="email"], input[name="password"]');
    fields.forEach((field) => attachFieldValidation(field, validateField));
}

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
