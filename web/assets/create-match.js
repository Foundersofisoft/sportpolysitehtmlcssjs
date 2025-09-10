document.addEventListener('DOMContentLoaded', async () => {
    // Вызываем функцию отрисовки хедера из app.js
    if (typeof setupHeader === 'function') {
        setupHeader();
    }

    const createMatchForm = document.getElementById('create-match-form');
    const fieldSelect = document.getElementById('field-select');
    const dateSelect = document.getElementById('date-select');
    const slotsContainer = document.getElementById('available-slots');
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = `/login.html?redirect=${window.location.pathname}`;
        return;
    }
    
    try {
        const response = await fetch('/api/fields');
        const fields = await response.json();
        fields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.id;
            option.textContent = `${field.sport} - ${field.address}`;
            fieldSelect.appendChild(option);
        });
    } catch (error) { console.error("Ошибка загрузки полей", error); }

    const fetchAndRenderSlots = async () => {
        const fieldId = fieldSelect.value;
        const onDate = dateSelect.value;
        if (!fieldId || !onDate) {
            slotsContainer.innerHTML = `<p style="color: var(--muted);">Выберите площадку и дату...</p>`;
            return;
        }

        slotsContainer.innerHTML = `<p style="color: var(--muted);">Загрузка...</p>`;
        const response = await fetch(`/api/fields/${fieldId}/slots?on_date=${onDate}`);
        if (response.ok) {
            const slots = await response.json();
            const availableSlots = slots.filter(s => s.status === 'available');
            if (availableSlots.length > 0) {
                slotsContainer.innerHTML = availableSlots.map(slot => {
                    const startTime = new Date(slot.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <label class="slot-radio">
                            <input type="radio" name="slot_id" value="${slot.id}" required>
                            <span>${startTime} - ${slot.price} KZT</span>
                        </label>
                    `;
                }).join('');
            } else {
                slotsContainer.innerHTML = `<p style="color: var(--muted);">На эту дату свободных слотов нет.</p>`;
            }
        }
    };

    fieldSelect.addEventListener('change', fetchAndRenderSlots);
    dateSelect.addEventListener('change', fetchAndRenderSlots);

    createMatchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedSlot = document.querySelector('input[name="slot_id"]:checked');
        if (!selectedSlot) {
            alert('Пожалуйста, выберите слот');
            return;
        }
        
        const matchData = {
            title: createMatchForm.title.value,
            slot_id: parseInt(selectedSlot.value),
            max_players: parseInt(createMatchForm.max_players.value),
            waitlist_enabled: createMatchForm.waitlist_enabled.checked,
            is_private: createMatchForm.is_private.checked,
        };

        const response = await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });
        
        if (response.ok) {
            window.location.href = '/';
        } else {
            const errorData = await response.json();
            alert(`Ошибка: ${errorData.detail}`);
        }
    });
});