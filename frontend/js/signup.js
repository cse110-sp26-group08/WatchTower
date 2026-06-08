document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    configurePageLinks();
    addSignupFormListener();
}

// When served as a static file (e.g. VS Code Live Server), Express routes like
// /signup don't exist, so links must point to relative .html file paths instead.
function configurePageLinks() {
    const homeLink = document.querySelector('[data-home-link]');
    if (homeLink) {
        homeLink.href = isStaticFrontendPreview() ? '../webpages/index.html' : '/';
    }

    const loginLink = document.querySelector('[data-login-link]');
    if (loginLink) {
        loginLink.href = isStaticFrontendPreview() ? 'login.html' : '/login';
    }
}

function getFieldValidationMessage(input) {
    const value = input.value.trim();

    if (input.name === 'username') {
        return value ? '' : 'Please enter your name.';
    }

    if (input.name === 'email') {
        return getEmailError(value);
    }

    if (input.name === 'password') {
        if (!input.value) {
            return 'Please enter your password.';
        }

        return input.value.length >= 8 ? '' : 'Should be at least 8 characters long.';
    }

    return '';
}

function validateField(input) {
    const message = getFieldValidationMessage(input);
    setFieldError(input, message);
    return !message;
}

function validateSignupForm(signupForm) {
    const fields = signupForm.querySelectorAll('input[name="username"], input[name="email"], input[name="password"]');
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

function addValidationListeners(signupForm) {
    const fields = signupForm.querySelectorAll('input[name="username"], input[name="email"], input[name="password"]');
    fields.forEach((field) => attachFieldValidation(field, validateField));
}

function showSignupFailure(signupForm, message) {
    const normalizedMessage = message || 'Could not create account.';
    const lowerMessage = normalizedMessage.toLowerCase();
    const targetFieldName = lowerMessage.includes('username') ? 'username' : 'email';
    const targetField = signupForm.elements[targetFieldName];

    setFieldError(targetField, normalizedMessage);
    targetField.focus();
}

function addSignupFormListener() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) {
        return;
    }

    addValidationListeners(signupForm);

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateSignupForm(signupForm)) {
            return;
        }

        const formData = new FormData(signupForm);
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword') || password;
        if (password !== confirmPassword) {
            setFieldError(signupForm.elements.password, 'Passwords do not match. Please try again.');
            return;
        }

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password, confirmPassword }),
            });

            const data = await response.json();
        
            if (response.ok) {
                localStorage.setItem('watchtowerUser', JSON.stringify(data.user));
                window.location.href = '/apps';
            } else {
                showSignupFailure(signupForm, data.message);
            }
        } catch (error) {
            console.error('Error during signup:', error);
            showSignupFailure(signupForm, 'An error occurred during signup. Please try again later.');
        }
    });
}
