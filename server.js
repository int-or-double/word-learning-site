const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Инициализация базы данных
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
        initializeDatabase();
    }
});

// Функция инициализации базы данных
function initializeDatabase() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Ошибка создания таблицы users:', err.message);
            } else {
                console.log('Таблица users создана');
            }
        });

        // Таблица карточек
        db.run(`CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            note TEXT,
            category TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error('Ошибка создания таблицы cards:', err.message);
            } else {
                console.log('Таблица cards создана');
                insertSampleCards();
            }
        });

        // Таблица прогресса пользователя
        db.run(`CREATE TABLE IF NOT EXISTS user_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            card_id INTEGER,
            status TEXT DEFAULT 'new', -- new, learning, learned
            difficulty INTEGER DEFAULT 3, -- 1-5, где 1 легкие, 5 сложные
            last_reviewed DATETIME,
            next_review DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )`, (err) => {
            if (err) {
                console.error('Ошибка создания таблицы user_cards:', err.message);
            } else {
                console.log('Таблица user_cards создана');
            }
        });
    });
}

// Функция добавления примерных карточек
function insertSampleCards() {
    const sampleCards = [
        ['Квантовая запутанность', 'Явление, при котором две частицы остаются связанными независимо от расстояния между ними.', 'Эйнштейн называл это «жутким действием на расстоянии».'],
        ['Фотосинтез', 'Процесс, при котором растения преобразуют солнечный свет в химическую энергию.', 'Производит кислород, который мы дышим.'],
        ['Блокчейн', 'Распределенная база данных, в которой информация хранится в виде цепочки блоков.', 'Лежит в основе криптовалют, таких как биткоин.'],
        ['Искусственный интеллект', 'Создание компьютерных систем, способных выполнять задачи, требующие человеческого интеллекта.', 'Включает машинное обучение и нейронные сети.'],
        ['Релятивистская теория', 'Теория, описывающая гравитацию как искривление пространства-времени.', 'Объясняет, почему время течет по-разному в разных условиях.']
    ];

    sampleCards.forEach(card => {
        db.run(`INSERT OR IGNORE INTO cards (front, back, note) VALUES (?, ?, ?)`, card, (err) => {
            if (err) {
                console.error('Ошибка добавления примерной карточки:', err.message);
            }
        });
    });
    
    console.log('Примерные карточки добавлены');
}

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    // Получаем 3 случайных карточки для демонстрации
    db.all(`SELECT * FROM cards ORDER BY RANDOM() LIMIT 3`, [], (err, cards) => {
        if (err) {
            console.error('Ошибка получения карточек:', err.message);
            res.render('index', { cards: [] });
        } else {
            res.render('index', { cards: cards });
        }
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/dashboard', (req, res) => {
    // Получаем все слова для демонстрации
    db.all(`SELECT * FROM cards ORDER BY created_at DESC`, [], (err, words) => {
        if (err) {
            console.error('Ошибка получения карточек для дашборда:', err.message);
            res.render('dashboard', { words: [], user: null });
        } else {
            res.render('dashboard', { words: words || [], user: { username: 'Гость' } });
        }
    });
});


app.get('/training', (req, res) => {
    // Получаем карточки для тренировки
    db.all(`SELECT * FROM cards ORDER BY RANDOM() LIMIT 10`, [], (err, cards) => {
        if (err) {
            console.error('Ошибка получения карточек для тренировки:', err.message);
            res.render('training', { cards: [] });
        } else {
            res.render('training', { cards: cards });
        }
    });
});

app.get('/about', (req, res) => {
    res.render('about');
});
app.get('/contact', (req, res) => {
    res.render('contact');
});

// API endpoints
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, email], (err, user) => {
            if (err) {
                return res.json({ success: false, message: 'Ошибка базы данных' });
            }
            
            if (user) {
                return res.json({ success: false, message: 'Пользователь с таким именем или email уже существует' });
            }
            
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    return res.json({ success: false, message: 'Ошибка при регистрации' });
                }
                
                db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, 
                    [username, email, hashedPassword], 
                    function(err) {
                        if (err) {
                            return res.json({ success: false, message: 'Ошибка при создании пользователя' });
                        }
                        
                        const token = jwt.sign({ id: this.lastID, username: username }, 
                            process.env.ACCESS_TOKEN_SECRET || 'your-secret-key');
                        
                        res.json({ 
                            success: true, 
                            message: 'Регистрация успешна!', 
                            token: token,
                            user: { id: this.lastID, username: username }
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.json({ success: false, message: 'Произошла ошибка сервера' });
    }
});

app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
            if (err) {
                return res.json({ success: false, message: 'Ошибка базы данных' });
            }
            
            if (!user) {
                return res.json({ success: false, message: 'Неверный логин или пароль' });
            }
            
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err || !isMatch) {
                    return res.json({ success: false, message: 'Неверный логин или пароль' });
                }
                
                const token = jwt.sign({ id: user.id, username: user.username }, 
                    process.env.ACCESS_TOKEN_SECRET || 'your-secret-key');
                
                res.json({ 
                    success: true, 
                    message: 'Вход выполнен!', 
                    token: token,
                    user: { id: user.id, username: user.username }
                });
            });
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.json({ success: false, message: 'Произошла ошибка сервера' });
    }
});

// Получение карточек пользователя
app.get('/api/cards', authenticateToken, (req, res) => {
    db.all(`SELECT c.*, uc.status FROM cards c 
            LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = ?
            ORDER BY c.created_at DESC`, [req.user.id], (err, cards) => {
        if (err) {
            res.json({ success: false, message: 'Ошибка получения карточек' });
        } else {
            res.json({ success: true, cards: cards });
        }
    });
});

// Добавление новой карточки
app.post('/api/cards', authenticateToken, (req, res) => {
    const { front, back, note, category } = req.body;
    
    db.run(`INSERT INTO cards (front, back, note, category, user_id) VALUES (?, ?, ?, ?, ?)`, 
        [front, back, note, category, req.user.id], 
        function(err) {
            if (err) {
                res.json({ success: false, message: 'Ошибка добавления карточки' });
            } else {
                res.json({ 
                    success: true, 
                    message: 'Карточка добавлена!', 
                    card: { id: this.lastID, front, back, note, category }
                });
            }
        }
    );
});

app.listen(PORT, HOST, () => {
    console.log(`Сервер запущен на http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Соединение с базой данных закрыто.');
        process.exit(0);
    });
});
