document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    addLoginFormListener();
}

function addLoginFormListener() {
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email');
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
                alert(`Login failed: ${data.message}`);
            }
            
        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred during login. Please try again later.');
        }
    });
}
