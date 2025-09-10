document.addEventListener('DOMContentLoaded', async () => {
    // Основные секции и формы
    const createVenueSection = document.getElementById('create-venue-section');
    const manageVenueSection = document.getElementById('manage-venue-section');
    const fieldsListDiv = document.getElementById('fields-list');
    const messageDiv = document.getElementById('form-message');
    const venueCreateForm = document.getElementById('venue-create-form');
    const venueEditForm = document.getElementById('venue-edit-form');
    
    // Модальное окно для полей
    const fieldModal = document.getElementById('field-modal');
    const fieldForm = document.getElementById('field-form');
    const modalTitle = document.getElementById('modal-title');
    const addFieldBtn = document.getElementById('add-field-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Модальное окно для расписания
    const scheduleModal = document.getElementById('schedule-modal');
    const scheduleModalTitle = document.getElementById('schedule-modal-title');
    const scheduleGenerateForm = document.getElementById('schedule-generate-form');
    const viewSlotsDateInput = document.getElementById('view-slots-date');
    const slotsViewList = document.getElementById('slots-view-list');
    const closeScheduleModalBtn = document.getElementById('close-schedule-modal-btn');
    let currentManagingFieldId = null;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    let currentUserData = null;

    const renderFields = (fields) => {
        if (!fields || fields.length === 0) {
            fieldsListDiv.innerHTML = `<p style="color: var(--muted);">У вас пока нет добавленных полей.</p>`;
            return;
        }
        fieldsListDiv.innerHTML = fields.map(field => `
            <div class="venue-card">
                <div class="venue-header">
                    <h2>${field.sport} - ${field.address}</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary schedule-btn" data-id="${field.id}" data-title="${field.sport} - ${field.address}">Расписание</button>
                        <button class="btn btn-secondary edit-field-btn" data-id="${field.id}">Редактировать</button>
                    </div>
                </div>
                <p>${field.description || 'Нет описания.'}</p>
                <div style="margin-top: 10px; color: var(--muted); font-size: 14px;">
                    <strong>Удобства:</strong> ${field.amenities || 'Не указано'}
                </div>
            </div>
        `).join('');
    };

    const fetchAndRender = async () => {
        try {
            const response = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` }});
            if (!response.ok) throw new Error('Auth Error');
            currentUserData = await response.json();

            if (currentUserData.venue_profile) {
                createVenueSection.style.display = 'none';
                manageVenueSection.style.display = 'block';
                
                venueEditForm.title.value = currentUserData.venue_profile.title;
                venueEditForm.phone_number.value = currentUserData.venue_profile.phone_number || '';
                venueEditForm.description.value = currentUserData.venue_profile.description || '';

                renderFields(currentUserData.venue_profile.fields);
            } else {
                createVenueSection.style.display = 'block';
                manageVenueSection.style.display = 'none';
            }
        } catch (error) {
            console.error(error);
            localStorage.removeItem('accessToken');
            window.location.href = '/login.html';
        }
    };

    venueCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { title: e.target.title.value, iin_bin: e.target.iin_bin.value };
        const response = await fetch('/api/venues', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            fetchAndRender();
        } else {
            alert('Ошибка создания заведения');
        }
    });

    venueEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const venueId = currentUserData.venue_profile.id;
        const data = {
            title: e.target.title.value,
            phone_number: e.target.phone_number.value,
            description: e.target.description.value
        };
        const response = await fetch(`/api/venues/${venueId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            messageDiv.textContent = 'Информация о заведении обновлена!';
            messageDiv.className = 'form-message success';
            setTimeout(() => { messageDiv.className = 'form-message'; }, 3000);
            fetchAndRender();
        } else {
            alert('Ошибка обновления');
        }
    });

    addFieldBtn.addEventListener('click', () => {
        fieldForm.reset();
        document.getElementById('field-id').value = '';
        modalTitle.textContent = 'Добавить новое поле';
        fieldModal.showModal();
    });
    
    closeModalBtn.addEventListener('click', () => fieldModal.close());

    fieldForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fieldId = e.target.id.value;
        const venueId = currentUserData.venue_profile.id;
        const data = {
            sport: e.target.sport.value,
            address: e.target.address.value,
            price_per_hour: parseInt(e.target.price_per_hour.value),
            amenities: e.target.amenities.value,
            description: e.target.description.value
        };
        
        const method = fieldId ? 'PUT' : 'POST';
        const url = fieldId ? `/api/venues/fields/${fieldId}` : `/api/venues/${venueId}/fields`;

        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            fieldModal.close();
            fetchAndRender();
        } else {
            alert(`Ошибка ${fieldId ? 'обновления' : 'создания'} поля`);
        }
    });

    fieldsListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-field-btn')) {
            const fieldId = e.target.dataset.id;
            const field = currentUserData.venue_profile.fields.find(f => f.id == fieldId);
            if (field) {
                fieldForm.id.value = field.id;
                fieldForm.sport.value = field.sport;
                fieldForm.address.value = field.address;
                fieldForm.price_per_hour.value = field.price_per_hour;
                fieldForm.amenities.value = field.amenities || '';
                fieldForm.description.value = field.description || '';
                modalTitle.textContent = 'Редактировать поле';
                fieldModal.showModal();
            }
        }
        if (e.target.classList.contains('schedule-btn')) {
            currentManagingFieldId = e.target.dataset.id;
            scheduleModalTitle.textContent = `Расписание: ${e.target.dataset.title}`;
            slotsViewList.innerHTML = `<p style="color: var(--muted)">Выберите дату для просмотра слотов.</p>`;
            scheduleGenerateForm.reset();
            viewSlotsDateInput.valueAsDate = new Date();
            viewSlotsDateInput.dispatchEvent(new Event('change'));
            scheduleModal.showModal();
        }
    });
    
    closeScheduleModalBtn.addEventListener('click', () => scheduleModal.close());

    scheduleGenerateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            start_date: e.target['start-date'].value,
            end_date: e.target['end-date'].value,
            start_time: e.target['start-time'].value,
            end_time: e.target['end-time'].value,
            slot_duration_minutes: parseInt(e.target['slot-duration'].value),
        };

        const response = await fetch(`/api/fields/${currentManagingFieldId}/generate-schedule`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Расписание успешно сгенерировано!');
            viewSlotsDateInput.value = data.start_date;
            viewSlotsDateInput.dispatchEvent(new Event('change'));
        } else {
            alert('Ошибка при генерации расписания.');
        }
    });

    viewSlotsDateInput.addEventListener('change', async (e) => {
        const date = e.target.value;
        if (!date || !currentManagingFieldId) {
            slotsViewList.innerHTML = `<p style="color: var(--muted)">Выберите дату для просмотра слотов.</p>`;
            return;
        };

        slotsViewList.innerHTML = `<p style="color: var(--muted)">Загрузка...</p>`;
        const response = await fetch(`/api/fields/${currentManagingFieldId}/slots?on_date=${date}`);
        if (response.ok) {
            const slots = await response.json();
            if (slots.length > 0) {
                slotsViewList.innerHTML = slots.map(slot => {
                    const startTime = new Date(slot.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    const endTime = new Date(slot.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="slot-item ${slot.status}">
                            <span>${startTime} - ${endTime}</span>
                            <span>${slot.price} KZT</span>
                        </div>
                    `;
                }).join('');
            } else {
                slotsViewList.innerHTML = `<p style="color: var(--muted)">На эту дату слотов не найдено.</p>`;
            }
        } else {
            slotsViewList.innerHTML = `<p style="color: var(--muted)">Ошибка загрузки слотов.</p>`;
        }
    });
    
    fetchAndRender();
});