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

// Функция инициализации базы данных с наборами
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

        // Таблица наборов карточек
        db.run(`CREATE TABLE IF NOT EXISTS card_sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error('Ошибка создания таблицы card_sets:', err.message);
            } else {
                console.log('Таблица card_sets создана');
            }
        });

        // Таблица карточек
        db.run(`CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            note TEXT,
            set_id INTEGER,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (set_id) REFERENCES card_sets (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error('Ошибка создания таблицы cards:', err.message);
            } else {
                console.log('Таблица cards создана');
                insertSampleSetsAndCards();
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


// Функция добавления примерных наборов и карточек
function insertSampleSetsAndCards() {
    // Проверяем, есть ли уже данные
    db.get(`SELECT COUNT(*) as count FROM card_sets`, [], (err, row) => {
        if (err || row.count > 0) return;
        
        // Создаем примерные наборы
        const sampleSets = [
            ['Английские слова', 'Набор для изучения английского языка', 'language'],
            ['JavaScript', 'Основы программирования на JavaScript', 'programming'],
            ['Научные термины', 'Термины из различных наук', 'science']
        ];

        sampleSets.forEach((set, index) => {
            db.run(`INSERT INTO card_sets (name, description, category, user_id) VALUES (?, ?, ?, ?)`, 
                [...set, 1], // user_id = 1 для примера
                function(err) {
                    if (err) return;
                    
                    const setId = this.lastID;
                    
                    // Добавляем карточки в каждый набор
                    let sampleCards = [];
                    switch(index) {
                        case 0: // Английские слова
                            sampleCards = [
                                ['Hello', 'Привет', 'Hello, how are you?'],
                                ['Thank you', 'Спасибо', 'Thank you for your help'],
                                ['Goodbye', 'До свидания', 'Goodbye, see you tomorrow']
                            ];
                            break;
                        case 1: // JavaScript
                            sampleCards = [
                                ['let', 'Объявление переменной', 'let name = "John";'],
                                ['function', 'Объявление функции', 'function greet() { return "Hello"; }'],
                                ['if', 'Условный оператор', 'if (condition) { doSomething(); }']
                            ];
                            break;
                        case 2: // Научные термины
                            sampleCards = [
                                ['Фотосинтез', 'Процесс создания энергии растениями', 'Производит кислород'],
                                ['Гравитация', 'Сила притяжения между объектами', 'Держит нас на Земле'],
                                ['Эволюция', 'Процесс изменения видов', 'Теория Дарвина']
                            ];
                            break;
                    }
                    
                    sampleCards.forEach(card => {
                        db.run(`INSERT INTO cards (front, back, note, set_id, user_id) VALUES (?, ?, ?, ?, ?)`, 
                            [...card, setId, 1]);
                    });
                }
            );
        });
        
        console.log('Примерные наборы и карточки добавлены');
    });
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
// Страница управления наборами
app.get('/sets', authenticateToken, requireAuth, (req, res) => {
    res.render('sets', { user: req.user });
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

// Получение всех наборов пользователя
app.get('/api/sets', authenticateToken, requireAuth, (req, res) => {
    console.log('Запрос наборов для пользователя:', req.user.id); // Для отладки
    
    db.all(`SELECT cs.*, COUNT(c.id) as card_count 
            FROM card_sets cs 
            LEFT JOIN cards c ON cs.id = c.set_id 
            WHERE cs.user_id = ? 
            GROUP BY cs.id 
            ORDER BY cs.created_at DESC`, 
            [req.user.id], (err, sets) => {
        if (err) {
            console.error('Ошибка получения наборов:', err); // Для отладки
            res.json({ success: false, message: 'Ошибка получения наборов: ' + err.message });
        } else {
            console.log('Получено наборов:', sets.length); // Для отладки
            res.json({ success: true, sets: sets });
        }
    });
});

// Создание нового набора
app.post('/api/sets', authenticateToken, requireAuth, (req, res) => {
    const { name, description, category } = req.body;
    
    if (!name) {
        return res.json({ success: false, message: 'Название набора обязательно' });
    }
    
    db.run(`INSERT INTO card_sets (name, description, category, user_id) VALUES (?, ?, ?, ?)`, 
        [name, description, category, req.user.id], 
        function(err) {
            if (err) {
                res.json({ success: false, message: 'Ошибка создания набора' });
            } else {
                res.json({ 
                    success: true, 
                    message: 'Набор создан!', 
                    set: { id: this.lastID, name, description, category }
                });
            }
        }
    );
});

// Обновление набора
app.put('/api/sets/:id', authenticateToken, requireAuth, (req, res) => {
    const setId = req.params.id;
    const { name, description, category } = req.body;
    
    db.run(`UPDATE card_sets SET name = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND user_id = ?`, 
        [name, description, category, setId, req.user.id], 
        function(err) {
            if (err) {
                res.json({ success: false, message: 'Ошибка обновления набора' });
            } else if (this.changes === 0) {
                res.json({ success: false, message: 'Набор не найден или доступ запрещен' });
            } else {
                res.json({ success: true, message: 'Набор обновлен!' });
            }
        }
    );
});

// Удаление набора
app.delete('/api/sets/:id', authenticateToken, requireAuth, (req, res) => {
    const setId = req.params.id;
    
    db.serialize(() => {
        // Сначала удаляем все карточки из набора
        db.run(`DELETE FROM cards WHERE set_id = ? AND user_id = ?`, [setId, req.user.id]);
        
        // Затем удаляем сам набор
        db.run(`DELETE FROM card_sets WHERE id = ? AND user_id = ?`, 
            [setId, req.user.id], 
            function(err) {
                if (err) {
                    res.json({ success: false, message: 'Ошибка удаления набора' });
                } else if (this.changes === 0) {
                    res.json({ success: false, message: 'Набор не найден или доступ запрещен' });
                } else {
                    res.json({ success: true, message: 'Набор удален!' });
                }
            }
        );
    });
});

// Получение карточек из конкретного набора
app.get('/api/sets/:id/cards', authenticateToken, requireAuth, (req, res) => {
    const setId = req.params.id;
    
    db.all(`SELECT c.*, uc.status 
            FROM cards c 
            LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = ?
            WHERE c.set_id = ? AND c.user_id = ?
            ORDER BY c.created_at DESC`, 
            [req.user.id, setId, req.user.id], (err, cards) => {
        if (err) {
            res.json({ success: false, message: 'Ошибка получения карточек' });
        } else {
            res.json({ success: true, cards: cards });
        }
    });
});

// Страница карточек набора
app.get('/sets/:setId/cards', authenticateToken, requireAuth, (req, res) => {
    const setId = req.params.setId;
    
    // Проверяем, что набор принадлежит пользователю
    db.get(`SELECT * FROM card_sets WHERE id = ? AND user_id = ?`, 
        [setId, req.user.id], (err, set) => {
            if (err || !set) {
                return res.redirect('/sets');
            }
            
            res.render('set-cards', { 
                user: req.user,
                set: set
            });
        });
});

// API получения карточек набора
app.get('/api/sets/:setId/cards', authenticateToken, requireAuth, (req, res) => {
    const setId = req.params.setId;
    
    // Проверяем, что набор принадлежит пользователю
    db.get(`SELECT id FROM card_sets WHERE id = ? AND user_id = ?`, 
        [setId, req.user.id], (err, set) => {
            if (err || !set) {
                return res.status(404).json({ success: false, message: 'Набор не найден' });
            }
            
            // Получаем карточки набора
            db.all(`SELECT * FROM cards WHERE set_id = ? ORDER BY created_at DESC`, 
                [setId], (err, cards) => {
                    if (err) {
                        res.json({ success: false, message: 'Ошибка получения карточек' });
                    } else {
                        res.json({ success: true, cards: cards });
                    }
                });
        });
});

// API создания карточки
app.post('/api/sets/:setId/cards', authenticateToken, requireAuth, (req, res) => {
    const setId = req.params.setId;
    const { front, back, note } = req.body;
    
    if (!front || !back) {
        return res.json({ success: false, message: 'Термин и объяснение обязательны' });
    }
    
    // Проверяем, что набор принадлежит пользователю
    db.get(`SELECT id FROM card_sets WHERE id = ? AND user_id = ?`, 
        [setId, req.user.id], (err, set) => {
            if (err || !set) {
                return res.status(404).json({ success: false, message: 'Набор не найден' });
            }
            
            // Создаем карточку
            db.run(`INSERT INTO cards (front, back, note, set_id, user_id) VALUES (?, ?, ?, ?, ?)`, 
                [front, back, note, setId, req.user.id], 
                function(err) {
                    if (err) {
                        res.json({ success: false, message: 'Ошибка создания карточки' });
                    } else {
                        res.json({ 
                            success: true, 
                            message: 'Карточка создана!', 
                            card: { id: this.lastID, front, back, note, set_id: setId }
                        });
                    }
                });
        });
});

// API обновления карточки
app.put('/api/cards/:id', authenticateToken, requireAuth, (req, res) => {
    const cardId = req.params.id;
    const { front, back, note } = req.body;
    
    if (!front || !back) {
        return res.json({ success: false, message: 'Термин и объяснение обязательны' });
    }
    
    // Проверяем, что карточка принадлежит пользователю
    db.get(`SELECT id FROM cards WHERE id = ? AND user_id = ?`, 
        [cardId, req.user.id], (err, card) => {
            if (err || !card) {
                return res.status(404).json({ success: false, message: 'Карточка не найдена' });
            }
            
            // Обновляем карточку
            db.run(`UPDATE cards SET front = ?, back = ?, note = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ? AND user_id = ?`, 
                [front, back, note, cardId, req.user.id], 
                function(err) {
                    if (err) {
                        res.json({ success: false, message: 'Ошибка обновления карточки' });
                    } else if (this.changes === 0) {
                        res.json({ success: false, message: 'Карточка не найдена' });
                    } else {
                        res.json({ success: true, message: 'Карточка обновлена!' });
                    }
                });
        });
});

// API удаления карточек
app.delete('/api/cards', authenticateToken, requireAuth, (req, res) => {
    const { cardIds } = req.body; // Массив ID карточек для удаления
    
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
        return res.json({ success: false, message: 'Не выбраны карточки для удаления' });
    }
    
    // Создаем placeholders для SQL запроса
    const placeholders = cardIds.map(() => '?').join(',');
    const query = `DELETE FROM cards WHERE id IN (${placeholders}) AND user_id = ?`;
    const params = [...cardIds, req.user.id];
    
    db.run(query, params, function(err) {
        if (err) {
            res.json({ success: false, message: 'Ошибка удаления карточек' });
        } else {
            res.json({ 
                success: true, 
                message: `Удалено карточек: ${this.changes}`,
                deletedCount: this.changes
            });
        }
    });
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
