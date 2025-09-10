const setupHeader = () => {
    const userNavActionsDiv = document.getElementById('user-nav-actions');
    const token = localStorage.getItem('accessToken');

    // Находим навигационные ссылки в шапке
    const navLinks = document.querySelectorAll('header nav a');
    navLinks.forEach(link => {
        // Заменяем корневую ссылку на ссылку на каталог матчей
        if (link.getAttribute('href') === '/') {
            link.setAttribute('href', '/matches.html');
        }
    });

    if (token) {
        // Если пользователь залогинен, показываем кнопки "Создать матч", "Профиль" и "Выйти"
        userNavActionsDiv.innerHTML = `
            <a href="/create-match.html" class="btn btn-primary" style="margin-right: 10px;">Создать матч</a>
            <a href="/account.html" class="btn btn-secondary">Профиль</a>
            <button id="logout-button" style="margin-left: 10px;">Выйти</button>
        `;
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            // Приводим кнопку "Выйти" к единому стилю
            logoutButton.className = 'btn btn-secondary';
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('accessToken');
                window.location.href = '/'; // После выхода перенаправляем на главную страницу
            });
        }
    } else {
        // Если пользователь не залогинен, показываем кнопки "Вход" и "Регистрация"
        userNavActionsDiv.innerHTML = `
            <a href="/login.html" class="btn btn-secondary">Вход</a>
            <a href="/register.html" class="btn btn-primary">Регистрация</a>
        `;
    }
};

const renderMatchCard = (match) => {
    const progressPercent = (match.players_count / match.max_players) * 100;
    const startsAt = new Date(match.starts_at).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    return `
        <a href="/match.html?id=${match.id}" class="card-link">
            <div class="card">
                <div class="card-content">
                    <div class="card-meta">
                        <span>${match.field ? match.field.sport : 'Спорт'} • ${match.field ? match.field.address : 'Адрес'}</span>
                        <span>${startsAt}</span>
                    </div>
                    <h3 class="card-title">${match.title}</h3>
                    <div class="card-meta">
                        <span>Игроков</span>
                        <span>${match.players_count} / ${match.max_players}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                </div>
            </div>
        </a>
    `;
};

document.addEventListener('DOMContentLoaded', async () => {
    setupHeader();

    // Эта логика сработает на странице каталога матчей (matches.html)
    const matchesGrid = document.getElementById('matches-grid');
    if (matchesGrid) {
        try {
            const response = await fetch('/api/matches');
            if (!response.ok) throw new Error('Не удалось загрузить матчи');
            const matches = await response.json();
            
            if (matches.length > 0) {
                matchesGrid.innerHTML = matches.map(renderMatchCard).join('');
            } else {
                matchesGrid.innerHTML = "<p style='color: var(--muted);'>Активных матчей пока нет. Создайте первый!</p>";
            }
        } catch (error) {
            console.error(error);
            matchesGrid.innerHTML = "<p style='color: #dc3545;'>Ошибка при загрузке матчей.</p>";
        }
    }
    
    // Эта логика сработает на главной странице (index.html)
    const liveMatchesGrid = document.getElementById('live-matches-grid');
    if (liveMatchesGrid) {
        try {
            // Запрашиваем только 3 матча для превью
            const response = await fetch('/api/matches?limit=3');
            if (!response.ok) throw new Error('Не удалось загрузить матчи');
            const matches = await response.json();

            if (matches.length > 0) {
                liveMatchesGrid.innerHTML = matches.map(renderMatchCard).join('');
            } else {
                liveMatchesGrid.innerHTML = "<p style='color: var(--muted);'>Активных матчей пока нет.</p>";
            }
        } catch (error) {
            console.error(error);
            liveMatchesGrid.innerHTML = "<p style='color: #dc3545;'>Ошибка при загрузке матчей.</p>";
        }
    }

    // Регистрация Service Worker для PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
          console.log('ServiceWorker registration failed: ', err);
        });
      });
    }
});