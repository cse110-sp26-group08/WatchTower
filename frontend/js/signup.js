document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    addSignupFormListener();
}

function addSignupFormListener() {
    const signupForm = document.getElementById('signup-form');
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(signupForm);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        if (password !== confirmPassword) {
            alert('Passwords do not match. Please try again.');
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
                window.location.href = '/app-selection';
            } else {
                alert(`Signup failed: ${data.message}`);
            }
        } catch (error) {
            console.error('Error during signup:', error);
            alert('An error occurred during signup. Please try again later.');
        }
    });
}
