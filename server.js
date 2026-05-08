const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Secret key for JWT
const SECRET_KEY = process.env.ACCESS_TOKEN_SECRET || 'UBp68MhWhQbtpqpeircHZF6isP2rcxVy1Oi2tEjhko4=';

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
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
        // Краткие и информативные карточки
        ['Квантовая запутанность', 'Связь частиц на расстоянии', 'Эйнштейн назвал это "жутким действием"'],
        ['Фотосинтез', 'Процесс создания энергии растениями', 'Производит кислород для дыхания'],
        ['Блокчейн', 'Цепочка защищенных блоков данных', 'Основа криптовалют типа биткоина'],
        ['Искусственный интеллект', 'Машины, имитирующие человеческий разум', 'Используется в чатах и распознавании'],
        ['Относительность', 'Теория искривления пространства-времени', 'Объясняет гравитацию у Эйнштейна'],
        ['Нейронные сети', 'Алгоритмы, подобные мозгу', 'Учатся на примерах и данных'],
        ['ДНК', 'Носитель генетической информации', 'Содержит инструкции для развития'],
        ['Большой взрыв', 'Теория возникновения Вселенной', 'Произошел около 13.8 миллиардов лет назад']
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

// Middleware для проверки токена из cookies
const authenticateToken = (req, res, next) => {
    // Проверяем токен в cookies
    const token = req.cookies.token;
    
    if (!token) {
        // Если нет токена, проверяем в headers (для API)
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const tokenFromHeader = authHeader.split(' ')[1];
            if (tokenFromHeader) {
                req.token = tokenFromHeader;
                jwt.verify(tokenFromHeader, SECRET_KEY, (err, user) => {
                    if (!err) {
                        req.user = user;
                    }
                });
            }
        }
        return next(); // Продолжаем выполнение, даже если нет токена
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            res.clearCookie('token');
        } else {
            req.user = user;
            req.token = token;
        }
        next();
    });
};

// Middleware для защиты маршрутов
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    next();
};

// Routes с middleware
app.get('/', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM cards ORDER BY RANDOM() LIMIT 3`, [], (err, cards) => {
        if (err) {
            res.render('index', { cards: [], user: req.user });
        } else {
            res.render('index', { cards: cards, user: req.user });
        }
    });
});

app.get('/login', authenticateToken, (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { user: req.user });
});

app.get('/register', authenticateToken, (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', { user: req.user });
});

app.get('/dashboard', authenticateToken, requireAuth, (req, res) => {
    db.all(`SELECT * FROM cards ORDER BY created_at DESC`, [], (err, words) => {
        if (err) {
            res.render('dashboard', { words: [], user: req.user });
        } else {
            res.render('dashboard', { words: words || [], user: req.user });
        }
    });
});

app.get('/training', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM cards ORDER BY RANDOM() LIMIT 10`, [], (err, cards) => {
        if (err) {
            res.render('training', { cards: [], user: req.user });
        } else {
            res.render('training', { cards: cards, user: req.user });
        }
    });
});

app.get('/about', authenticateToken, (req, res) => {
    res.render('about', { user: req.user });
});

app.get('/contact', authenticateToken, (req, res) => {
    res.render('contact', { user: req.user });
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
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
                            SECRET_KEY, 
                            { expiresIn: '24h' });
                        
                        // Устанавливаем cookie
                        res.cookie('token', token, { 
                            httpOnly: true, 
                            maxAge: 24 * 60 * 60 * 1000, // 24 часа
                            sameSite: 'strict'
                        });
                        
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
                    SECRET_KEY,
                    { expiresIn: '24h' });
                
                // Устанавливаем cookie
                res.cookie('token', token, { 
                    httpOnly: true, 
                    maxAge: 24 * 60 * 60 * 1000, // 24 часа
                    sameSite: 'strict'
                });
                
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
app.get('/api/cards', authenticateToken, requireAuth, (req, res) => {
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
app.post('/api/cards', authenticateToken, requireAuth, (req, res) => {
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

// Обработка завершения работы
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Соединение с базой данных закрыто.');
        process.exit(0);
    });
});
