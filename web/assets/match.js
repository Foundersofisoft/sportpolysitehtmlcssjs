document.addEventListener('DOMContentLoaded', async () => {
    if (typeof setupHeader === 'function') {
        setupHeader();
    }

    const params = new URLSearchParams(window.location.search);
    let matchId = params.get('id');
    const inviteCode = params.get('code');

    if (!matchId && !inviteCode) {
        window.location.href = '/';
        return;
    }

    const matchDetailsDiv = document.getElementById('match-details');
    const playerListDiv = document.getElementById('player-list');
    const waitlistContainer = document.getElementById('waitlist-container');
    const waitlistDiv = document.getElementById('waitlist');
    const playersCountSpan = document.getElementById('players-count');
    const maxPlayersSpan = document.getElementById('max-players');
    const captainControlsDiv = document.getElementById('captain-controls');
    const reviewsSection = document.getElementById('reviews-section');
    
    const token = localStorage.getItem('accessToken');
    let currentUserId = null;

    if (token) {
        try {
            const meResponse = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (meResponse.ok) {
                const meData = await meResponse.json();
                currentUserId = meData.id;
            }
        } catch (e) { console.error("Could not fetch current user"); }
    }

    const renderPage = (matchData) => {
        const startsAt = new Date(matchData.starts_at).toLocaleString('ru-RU', { dateStyle: 'full', timeStyle: 'short' });
        matchDetailsDiv.innerHTML = `
            <div class="page-header">
                <h1>${matchData.title}</h1>
                <div id="action-button-container"></div>
            </div>
            <p style="color: var(--muted);">
                <strong>Когда:</strong> ${startsAt} <br>
                <strong>Где:</strong> ${matchData.field.address} <br>
                <strong>Спорт:</strong> ${matchData.field.sport}
            </p>
        `;

        playersCountSpan.textContent = matchData.players.length;
        maxPlayersSpan.textContent = matchData.max_players;
        playerListDiv.innerHTML = matchData.players.map(player => `
             <div class="player-item">
                <span>${player.full_name || player.email} ${player.id === matchData.captain.id ? ' (👑 Капитан)' : ''}</span>
            </div>
        `).join('') || '<div style="padding: 12px;"><p style="color: var(--muted);">Никто еще не присоединился.</p></div>';
        
        if (matchData.waitlist && matchData.waitlist.length > 0) {
            waitlistContainer.style.display = 'block';
            waitlistDiv.innerHTML = matchData.waitlist.map(player => `
                <div class="player-item"><span>${player.full_name || player.email}</span></div>
            `).join('');
        } else {
            waitlistContainer.style.display = 'none';
        }

        const actionContainer = document.getElementById('action-button-container');
        const isPlayerInMatch = matchData.players.some(p => p.id === currentUserId);
        const isPlayerInWaitlist = matchData.waitlist.some(p => p.id === currentUserId);
        
        if (matchData.status !== 'active') {
             actionContainer.innerHTML = `<button class="btn btn-secondary" disabled>Матч ${matchData.status === 'completed' ? 'завершен' : 'отменен'}</button>`;
        } else if (!token) {
             actionContainer.innerHTML = `<a href="/login.html" class="btn btn-primary">Войдите, чтобы присоединиться</a>`;
        } else if (isPlayerInMatch) {
            if (currentUserId === matchData.captain.id) {
                 actionContainer.innerHTML = `<button class="btn btn-secondary" disabled>Вы капитан</button>`;
            } else {
                 actionContainer.innerHTML = `<button id="leave-btn" class="btn btn-secondary">Покинуть матч</button>`;
            }
        } else if (isPlayerInWaitlist) {
            actionContainer.innerHTML = `<button id="leave-btn" class="btn btn-secondary">Покинуть лист ожидания</button>`;
        } else if (matchData.players.length >= matchData.max_players) {
            if (matchData.waitlist_enabled) {
                actionContainer.innerHTML = `<button id="join-btn" class="btn btn-primary">Встать в очередь</button>`;
            } else {
                actionContainer.innerHTML = `<button class="btn btn-secondary" disabled>Матч заполнен</button>`;
            }
        } else {
            actionContainer.innerHTML = `<button id="join-btn" class="btn btn-primary">Присоединиться</button>`;
        }
        
        if (currentUserId === matchData.captain.id && matchData.status === 'active') {
            captainControlsDiv.innerHTML = `
                <div class="venue-card" style="border-color: var(--brand); padding: 20px;">
                    <h3 class="card-title">Панель капитана</h3>
                    ${matchData.is_private ? `
                        <div class="form-group">
                            <label>Ссылка-приглашение:</label>
                            <input type="text" readonly value="${window.location.origin}/invite.html?code=${matchData.invite_code}" onclick="this.select()">
                        </div>` : ''
                    }
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button id="complete-btn" class="btn btn-primary">Завершить матч</button>
                        <button id="cancel-btn" class="btn btn-secondary">Отменить матч</button>
                    </div>
                </div>
            `;
        } else {
            captainControlsDiv.innerHTML = '';
        }

        if (currentUserId === matchData.captain.id && matchData.status === 'completed') {
            const playersToReview = matchData.players.filter(p => p.id !== currentUserId);
            reviewsSection.innerHTML = `
                <div class="venue-card">
                    <h3 class="card-title">Оставить отзывы после матча</h3>
                    <form id="reviews-form">
                        ${playersToReview.map(player => `
                            <div class="player-review-block">
                                <p><strong>${player.full_name || player.email}</strong></p>
                                <div class="review-inputs">
                                    <div class="form-group">
                                        <label>Навык игры (1-5)</label>
                                        <input type="number" class="skill-rating" data-player-id="${player.id}" min="1" max="5" value="3">
                                    </div>
                                    <div class="form-group">
                                        <label>Адекватность (1-5)</label>
                                        <input type="number" class="sportsmanship-rating" data-player-id="${player.id}" min="1" max="5" value="5">
                                    </div>
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" class="no-show-check" id="noshow-${player.id}" data-player-id="${player.id}">
                                        <label for="noshow-${player.id}">Не пришел</label>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        <button type="submit" class="btn btn-primary btn-full-width" style="margin-top: 20px;">Отправить отзывы</button>
                    </form>
                </div>
            `;
        } else {
            reviewsSection.innerHTML = '';
        }
    };

    const fetchMatchData = async () => {
        let url = inviteCode ? `/api/matches/invite/${inviteCode}` : `/api/matches/${matchId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                 const error = await response.json();
                 throw new Error(error.detail || 'Матч не найден');
            }
            const matchData = await response.json();
            if (!matchId) { matchId = matchData.id; }
            renderPage(matchData);
        } catch(error) {
            matchDetailsDiv.innerHTML = `<h1>${error.message}</h1>`;
        }
    };

    document.body.addEventListener('click', async (e) => {
        const action = e.target.id;
        const validActions = ['join-btn', 'leave-btn', 'complete-btn', 'cancel-btn'];
        if (!validActions.includes(action)) return;
        
        e.target.disabled = true;
        e.target.textContent = 'Загрузка...';

        let endpoint = '';
        if (action === 'join-btn') endpoint = 'join';
        if (action === 'leave-btn') endpoint = 'leave';
        if (action === 'complete-btn') endpoint = 'complete';
        if (action === 'cancel-btn') endpoint = 'cancel';

        const url = `/api/matches/${matchId}/${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail);
            renderPage(result);
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
            fetchMatchData(); 
        }
    });
    
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'reviews-form') {
            e.preventDefault();
            
            const reviews = [];
            const no_shows = [];

            document.querySelectorAll('.skill-rating').forEach(input => {
                reviews.push({
                    subject_id: parseInt(input.dataset.playerId),
                    review_type: 'skill',
                    rating: parseInt(input.value)
                });
            });

            document.querySelectorAll('.sportsmanship-rating').forEach(input => {
                reviews.push({
                    subject_id: parseInt(input.dataset.playerId),
                    review_type: 'sportsmanship',
                    rating: parseInt(input.value)
                });
            });

            document.querySelectorAll('.no-show-check:checked').forEach(checkbox => {
                no_shows.push({
                    subject_id: parseInt(checkbox.dataset.playerId)
                });
            });
            
            try {
                const response = await fetch(`/api/reviews/match/${matchId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reviews, no_shows })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.detail);
                
                alert('Спасибо за ваш отзыв!');
                document.getElementById('reviews-section').innerHTML = '<div class="venue-card"><p style="color: var(--muted);">Вы уже оставили отзыв об этом матче.</p></div>';

            } catch (error) {
                alert(`Ошибка: ${error.message}`);
            }
        }
    });

    fetchMatchData();
});