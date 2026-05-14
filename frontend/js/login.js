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

            if (response.ok) {  
                // Handle successful login (e.g., redirect to dashboard)
                window.location.href = '/dashboard';
            } else {
                // Handle login failure (e.g., show error message)
                const errorData = await response.json();
                alert(`Login failed: ${errorData.message}`);
            }
            
        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred during login. Please try again later.');
        }
    });
}