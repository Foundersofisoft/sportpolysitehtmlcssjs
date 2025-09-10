document.addEventListener('DOMContentLoaded', () => {
    if (typeof setupHeader === 'function') {
        setupHeader();
    }
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('form-message');

    // Логика для проверки сложности пароля
    const passwordInput = document.getElementById('password');
    const passwordReqs = document.getElementById('password-reqs');

    if (passwordInput && passwordReqs) {
        const reqs = {
            length: document.getElementById('req-length'),
            capital: document.getElementById('req-capital'),
            number: document.getElementById('req-number')
        };

        passwordInput.addEventListener('input', () => {
            const value = passwordInput.value;
            reqs.length.classList.toggle('valid', value.length >= 8);
            reqs.capital.classList.toggle('valid', /[A-Z]/.test(value));
            reqs.number.classList.toggle('valid', /[0-9]/.test(value));
        });
    }

    // Обработчик формы регистрации
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            messageDiv.textContent = '';
            messageDiv.className = 'form-message';
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Произошла ошибка');
                messageDiv.textContent = `Пользователь ${data.email} успешно зарегистрирован! Можете войти.`;
                messageDiv.classList.add('success');
                registerForm.reset();
            } catch (error) {
                messageDiv.textContent = error.message;
                messageDiv.classList.add('error');
            }
        });
    }

    // Обработчик формы логина
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.textContent = '';
            messageDiv.className = 'form-message';
            const formData = new URLSearchParams();
            formData.append('username', loginForm.username.value);
            formData.append('password', loginForm.password.value);
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Произошла ошибка');
                localStorage.setItem('accessToken', data.access_token);
                messageDiv.textContent = 'Вход выполнен успешно! Перенаправление...';
                messageDiv.classList.add('success');
                const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/account.html';
                setTimeout(() => { window.location.href = redirectUrl; }, 1000);
            } catch (error) {
                messageDiv.textContent = error.message;
                messageDiv.classList.add('error');
            }
        });
    }
});