document.addEventListener('DOMContentLoaded', async () => {
    if (typeof setupHeader === 'function') {
        setupHeader();
    }

    const profileForm = document.getElementById('profile-form');
    const messageDiv = document.getElementById('form-message');
    const venueActionsDiv = document.getElementById('venue-actions');
    const avatarImg = document.getElementById('avatar-img');
    const avatarUploadInput = document.getElementById('avatar-upload');
    const avatarUploadBtn = document.getElementById('avatar-upload-btn');
    const levelSelect = document.getElementById('level');
    const docUploadSection = document.getElementById('doc-upload-section');
    const docUploadInput = document.getElementById('doc-upload');
    const docStatusSpan = document.getElementById('doc-status');

    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    let currentUserData = null;

    const populateUserData = (userData) => {
        profileForm.email.value = userData.email || '';
        profileForm.full_name.value = userData.full_name || '';
        avatarImg.src = userData.photo_url ? `/api${userData.photo_url}` : 'https://via.placeholder.com/150';
        levelSelect.value = userData.level || 'Новичок';
        
        levelSelect.dispatchEvent(new Event('change'));

        if (userData.achievements_doc) {
            docStatusSpan.innerHTML = `Документ <a href="/api${userData.achievements_doc}" target="_blank" style="color: var(--brand);">загружен</a>.`;
        } else {
            docStatusSpan.textContent = 'Загрузите документ для верификации (PDF, JPG).';
        }
        
        if (userData.role === 'venue') {
            venueActionsDiv.innerHTML = `<div class="venue-card"><div class="venue-header"><h2>Управление заведением</h2></div><p style="color: var(--muted); margin-bottom: 20px;">Вы являетесь владельцем заведения. Перейдите в панель, чтобы управлять полями.</p><a href="/venue-dashboard.html" class="btn btn-primary btn-full-width">Управлять заведением</a></div>`;
        } else {
            venueActionsDiv.innerHTML = `<div class="venue-card"><div class="venue-header"><h2>Вы владелец площадки?</h2></div><p style="color: var(--muted); margin-bottom: 20px;">Добавьте свою площадку в нашу систему, чтобы игроки могли создавать на ней матчи.</p><a href="/venue-dashboard.html" class="btn btn-primary btn-full-width">Стать партнером</a></div>`;
        }
    };

    try {
        const response = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Ошибка авторизации');
        currentUserData = await response.json();
        populateUserData(currentUserData);
    } catch (error) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login.html';
    }
    
    avatarUploadBtn.addEventListener('click', () => avatarUploadInput.click());
    avatarUploadInput.addEventListener('change', async () => {
        const file = avatarUploadInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/users/me/upload-photo', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!response.ok) throw new Error('Ошибка загрузки фото');
            const updatedUser = await response.json();
            avatarImg.src = `/api${updatedUser.photo_url}`;
        } catch (error) {
            alert(error.message);
        }
    });

    levelSelect.addEventListener('change', () => {
        const selectedLevel = levelSelect.value;
        if (selectedLevel === 'Мастер' || selectedLevel === 'Профессионал') {
            docUploadSection.style.display = 'block';
        } else {
            docUploadSection.style.display = 'none';
        }
    });

    docUploadInput.addEventListener('change', async () => {
        const file = docUploadInput.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            docStatusSpan.textContent = 'Загрузка...';
            const response = await fetch('/api/users/me/upload-document', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!response.ok) throw new Error('Ошибка загрузки документа');
            const updatedUser = await response.json();
            docStatusSpan.innerHTML = `Документ <a href="/api${updatedUser.achievements_doc}" target="_blank" style="color: var(--brand);">успешно загружен</a>.`;
        } catch (error) {
            alert(error.message);
        }
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        messageDiv.className = 'form-message';
        const data = {
            full_name: profileForm.full_name.value,
            level: profileForm.level.value,
            position: profileForm.position ? profileForm.position.value : null,
        };
        try {
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const updatedUserData = await response.json();
            if (!response.ok) {
                throw new Error(updatedUserData.detail || 'Не удалось обновить профиль');
            }
            currentUserData = updatedUserData;
            populateUserData(currentUserData);
            messageDiv.textContent = 'Профиль успешно обновлен!';
            messageDiv.classList.add('success');
            setTimeout(() => { messageDiv.className = 'form-message'; }, 3000);
        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.classList.add('error');
        }
    });
});