// Основной JavaScript файл для TrainingCards
document.addEventListener('DOMContentLoaded', function() {
    
    // Инициализация карточек на главной странице (только если элементы существуют)
    if (document.querySelector('.flip-card')) {
        initFlipCards();
    }
    
    // Инициализация тренировочной страницы (только если элементы существуют)
    if (document.querySelector('.training-area')) {
        initTrainingPage();
    }
    
    // Инициализация кнопок с переворотом (только если элементы существуют)
    if (document.querySelector('.btn-template-1') || document.querySelector('.btn-template-2')) {
        initFlipButtons();
    }
    
    // Простая анимация при загрузке (только если элементы существуют)
    const cards = document.querySelectorAll('.card, .flip-card');
    if (cards.length > 0) {
        cards.forEach((card, index) => {
            setTimeout(() => {
                if (card) { // Проверка существования элемента
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.5s ease';
                    
                    setTimeout(() => {
                        if (card) { // Проверка существования элемента
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }
                    }, 100);
                }
            }, index * 100);
        });
    }

    // Обработка формы регистрации (только если форма существует)
    const registerForm = document.querySelector('#register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Проверка совпадения паролей
            if (data.password !== data.password_confirm) {
                alert('Пароли не совпадают!');
                return;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
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
        });
    }

    // Обработка формы входа (только если форма существует)
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
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
        });
    }
});

// Инициализация кнопок с переворотом (с проверками)
function initFlipButtons() {
    const flipButtons = document.querySelectorAll('.btn-template-1, .btn-template-2');
    
    flipButtons.forEach(button => {
        if (button) { // Проверка существования элемента
            // Добавляем эффект наведения
            button.addEventListener('mouseenter', function() {
                if (this) { // Проверка существования элемента
                    this.style.transform = 'scale(1.05)';
                }
            });
            
            button.addEventListener('mouseleave', function() {
                if (this) { // Проверка существования элемента
                    this.style.transform = 'scale(1)';
                }
            });
        }
    });
}

// Инициализация карточек-перевертышей (с проверками)
function initFlipCards() {
    const flipCards = document.querySelectorAll('.flip-card');
    
    flipCards.forEach(card => {
        if (card) { // Проверка существования элемента
            // Добавляем обработчик клика
            card.addEventListener('click', function(e) {
                if (this) { // Проверка существования элемента
                    // Предотвращаем всплытие события если клик по скроллбару
                    if (e.target.classList && e.target.classList.contains('flip-card-back')) {
                        const backCard = e.target;
                        const rect = backCard.getBoundingClientRect();
                        const isScrollbarClick = e.clientX > rect.right - 20;
                        if (isScrollbarClick) return;
                    }
                    
                    this.classList.toggle('flipped');
                }
            });
            
            // Добавляем эффект наведения
            card.addEventListener('mouseenter', function() {
                if (this && !this.classList.contains('flipped')) {
                    this.style.transform = 'scale(1.03)';
                    this.style.transition = 'transform 0.3s ease';
                }
            });
            
            card.addEventListener('mouseleave', function() {
                if (this) {
                    this.style.transform = 'scale(1)';
                }
            });
        }
    });
}

// Инициализация тренировочной страницы (с проверками)
function initTrainingPage() {
    const currentCard = document.getElementById('current-card');
    const cardInner = document.getElementById('card-inner');
    
    if (currentCard && cardInner) {
        // Обработчик клика по карточке
        currentCard.addEventListener('click', function(e) {
            if (cardInner) {
                // Предотвращаем переворот при клике на скроллбар
                if (e.target.classList && e.target.classList.contains('flip-card-back')) {
                    const backCard = e.target;
                    const rect = backCard.getBoundingClientRect();
                    const isScrollbarClick = e.clientX > rect.right - 20;
                    if (isScrollbarClick) return;
                }
                
                cardInner.classList.toggle('flipped');
            }
        });
    }
}

// Функция переворота карточки (для кнопки)
function flipCard() {
    const cardInner = document.getElementById('card-inner');
    if (cardInner) {
        cardInner.classList.toggle('flipped');
    }
}

// Функция перехода к следующей карточке
function nextCard() {
    // В реальной реализации здесь будет логика перехода к следующей карточке
    const cardInner = document.getElementById('card-inner');
    if (cardInner) {
        cardInner.classList.remove('flipped');
    }
    console.log('Показ следующей карточки');
}
