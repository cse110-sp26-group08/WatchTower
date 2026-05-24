document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    configurePageLinks();
    addLoginFormListener();
}

function isStaticFrontendPreview() {
    return window.location.pathname.includes('/frontend/');
}

function resolveBackendPath(path) {
    if (!isStaticFrontendPreview()) {
        return path;
    }

    const authOrigin = window.WATCHTOWER_AUTH_ORIGIN || 'http://localhost:3000';
    return `${authOrigin}${path}`;
}

function configurePageLinks() {
    const homeLink = document.querySelector('[data-home-link]');
    if (homeLink) {
        homeLink.href = isStaticFrontendPreview() ? '../index.html' : '/';
    }

    const signupLink = document.querySelector('[data-signup-link]');
    if (signupLink) {
        signupLink.href = isStaticFrontendPreview() ? 'signup.html' : '/signup';
    }

    document.querySelectorAll('[data-auth-path]').forEach((authLink) => {
        authLink.href = resolveBackendPath(authLink.dataset.authPath);
    });
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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email) ? '' : 'Please enter a valid email.';
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
    fields.forEach((field) => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => {
            if (field.getAttribute('aria-invalid') === 'true') {
                validateField(field);
            }
        });
    });
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
