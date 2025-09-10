document.addEventListener('DOMContentLoaded', async () => {
    const venuesListDiv = document.getElementById('venues-list');

    const renderVenueCard = (venue) => {
        // Создаем HTML для списка полей этого заведения
        const fieldsHtml = venue.fields.map(field => `
            <div class="field-item">
                <span>${field.sport} - ${field.address}</span>
                <span class="price">${field.price_per_hour} KZT/час</span>
            </div>
        `).join('');

        return `
            <div class="venue-card">
                <div class="venue-header">
                    <h2>${venue.title}</h2>
                    <span class="iin">ИИН/БИН: ${venue.iin_bin}</span>
                </div>
                <div class="fields-list">
                    ${fieldsHtml || '<p style="color: var(--muted);">У этого заведения пока нет добавленных полей.</p>'}
                </div>
            </div>
        `;
    };

    try {
        const response = await fetch('/api/venues');
        if (!response.ok) throw new Error('Не удалось загрузить площадки');
        
        const venues = await response.json();
        
        if (venues.length > 0) {
            venuesListDiv.innerHTML = venues.map(renderVenueCard).join('');
        } else {
            venuesListDiv.innerHTML = "<p style='color: var(--muted);'>Площадок пока не добавлено.</p>";
        }
    } catch (error) {
        console.error(error);
        venuesListDiv.innerHTML = "<p style='color: #dc3545;'>Ошибка при загрузке площадок.</p>";
    }
});