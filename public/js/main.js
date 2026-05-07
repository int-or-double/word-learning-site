// Основной JavaScript файл для TrainingCards
document.addEventListener('DOMContentLoaded', function() {
    
    // Инициализация карточек на главной странице
    if (document.querySelector('.flip-card')) {
        initFlipCards();
    }
    
    // Инициализация тренировочной страницы
    if (document.querySelector('.training-area')) {
        initTrainingPage();
    }
    
    // Инициализация кнопок
    initUniversalButtons();
    
    // Анимация при загрузке
    initPageAnimations();
    
    // Обработка форм
    initFormHandlers();
});

// Инициализация анимаций страницы
function initPageAnimations() {
    const cards = document.querySelectorAll('.card, .flip-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'all 0.5s ease';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100);
            }
        }, index * 100);
    });
}

// Обработчики форм
function initFormHandlers() {
    // Форма регистрации
    const registerForm = document.querySelector('#register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Форма входа
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    if (data.password !== data.password_confirm) {
        alert('Пароли не совпадают!');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: data.username,
                email: data.email,
                password: data.password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            window.location.href = '/login';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при регистрации');
    }
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            window.location.href = '/dashboard';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при входе');
    }
}

// Инициализация карточек на главной странице (с проверенным подходом)
function initFlipCards() {
    const flipCards = document.querySelectorAll('.flip-card');
    let autoFlipTimers = new Map(); // Храним таймеры для каждой карточки
    
    flipCards.forEach((card, index) => {
        if (card) {
            card.addEventListener('click', function() {
                const cardInner = this.querySelector('.flip-card-inner');
                if (cardInner) {
                    flipCardElement(cardInner, 5000, index, autoFlipTimers);
                }
            });
        }
    });
}

// Функция переворота элемента (рабочая логика как на странице тренировки)
function flipCardElement(cardInner, timeoutMs, cardIndex, timersMap) {
    if (cardInner) {
        // Проверяем текущее состояние через transform или класс
        const currentTransform = cardInner.style.transform;
        const isFlipped = currentTransform === 'rotateY(180deg)' || cardInner.classList.contains('flipped');
        
        if (isFlipped) {
            // Переворачиваем на лицевую сторону
            cardInner.style.transform = 'rotateY(0deg)';
            cardInner.classList.remove('flipped');
            
            // Очищаем таймер для этой карточки
            if (timersMap.has(cardIndex)) {
                clearTimeout(timersMap.get(cardIndex));
                timersMap.delete(cardIndex);
            }
        } else {
            // Переворачиваем на обратную сторону
            cardInner.style.transform = 'rotateY(180deg)';
            cardInner.classList.add('flipped');
            
            // Очищаем предыдущий таймер
            if (timersMap.has(cardIndex)) {
                clearTimeout(timersMap.get(cardIndex));
            }
            
            // Устанавливаем новый таймер для автоматического переворота
            const timer = setTimeout(() => {
                cardInner.style.transform = 'rotateY(0deg)';
                cardInner.classList.remove('flipped');
                timersMap.delete(cardIndex);
            }, timeoutMs);
            
            timersMap.set(cardIndex, timer);
        }
    }
}

// Инициализация тренировочной страницы
function initTrainingPage() {
    const card = document.getElementById('current-card');
    const cardInner = document.getElementById('card-inner');
    let autoFlipTimer = null;
    
    if (card && cardInner) {
        card.addEventListener('click', function() {
            flipTrainingCard(cardInner);
        });
    }
    
    // Делаем функцию глобальной для использования в кнопках
    window.flipCard = function() {
        if (cardInner) {
            flipTrainingCard(cardInner);
        }
    };
}

// Функция переворота для тренировочной страницы
function flipTrainingCard(cardInner) {
    if (cardInner) {
        let autoFlipTimer = cardInner.autoFlipTimer || null;
        
        // Проверяем текущее состояние
        const currentTransform = cardInner.style.transform;
        const isFlipped = currentTransform === 'rotateY(180deg)' || cardInner.classList.contains('flipped');
        
        if (isFlipped) {
            // Переворачиваем на лицевую сторону
            cardInner.style.transform = 'rotateY(0deg)';
            cardInner.classList.remove('flipped');
            
            // Очищаем таймер
            if (autoFlipTimer) {
                clearTimeout(autoFlipTimer);
                cardInner.autoFlipTimer = null;
            }
        } else {
            // Переворачиваем на обратную сторону
            cardInner.style.transform = 'rotateY(180deg)';
            cardInner.classList.add('flipped');
            
            // Очищаем предыдущий таймер
            if (autoFlipTimer) {
                clearTimeout(autoFlipTimer);
            }
            
            // Устанавливаем новый таймер для автоматического переворота
            autoFlipTimer = setTimeout(() => {
                cardInner.style.transform = 'rotateY(0deg)';
                cardInner.classList.remove('flipped');
                cardInner.autoFlipTimer = null;
            }, 8000);
            
            cardInner.autoFlipTimer = autoFlipTimer;
        }
    }
}

// Инициализация кнопок
function initUniversalButtons() {
    const buttons = document.querySelectorAll('.btn-universal');
    
    buttons.forEach(button => {
        if (button) {
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.transition = 'transform 0.3s ease';
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.transition = 'transform 0.3s ease';
            });
        }
    });
}

// Функция перехода к следующей карточке
function nextCard() {
    const cardInner = document.getElementById('card-inner');
    if (cardInner) {
        // Принудительно сбрасываем состояние карточки
        cardInner.style.transform = 'rotateY(0deg)';
        cardInner.classList.remove('flipped');
        
        // Очищаем таймер если есть
        if (cardInner.autoFlipTimer) {
            clearTimeout(cardInner.autoFlipTimer);
            cardInner.autoFlipTimer = null;
        }
    }
}
