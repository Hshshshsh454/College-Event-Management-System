const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'cems_secret_key_2024'; // In production, use environment variable

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database initialization
const db = new sqlite3.Database('./cems.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('STUDENT', 'ORGANIZER', 'ADMIN')),
        phone TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        startTime DATETIME NOT NULL,
        endTime DATETIME NOT NULL,
        capacity INTEGER NOT NULL,
        venueId TEXT,
        venueName TEXT,
        category TEXT NOT NULL,
        coverImage TEXT,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
        organizerId INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizerId) REFERENCES users (id)
    )`);

    // Event registrations table
    db.run(`CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        status TEXT DEFAULT 'REGISTERED' CHECK(status IN ('REGISTERED', 'WAITLISTED', 'CANCELLED')),
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events (id),
        FOREIGN KEY (userId) REFERENCES users (id),
        UNIQUE(eventId, userId)
    )`);

    // Create default admin user if not exists
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)`, 
            ['Admin User', 'admin@cems.com', adminPassword, 'ADMIN']);
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to get event with registration count
function getEventWithRegistrationCount(eventId, callback) {
    const query = `
        SELECT e.*, 
               u.name as organizerName,
               u.email as organizerEmail,
               COUNT(er.id) as registeredCount
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.eventId AND er.status = 'REGISTERED'
        LEFT JOIN users u ON e.organizerId = u.id
        WHERE e.id = ?
        GROUP BY e.id
    `;
    
    db.get(query, [eventId], callback);
}

// Helper function to check if user is registered for event
function checkUserRegistration(eventId, userId, callback) {
    db.get(
        'SELECT * FROM event_registrations WHERE eventId = ? AND userId = ?',
        [eventId, userId],
        callback
    );
}

// Routes

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!['STUDENT', 'ORGANIZER'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ message: 'Email already exists' });
                    }
                    return res.status(500).json({ message: 'Error creating user' });
                }

                const user = {
                    id: this.lastID,
                    name,
                    email,
                    role
                };

                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

                res.status(201).json({
                    message: 'User created successfully',
                    token,
                    user
                });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ message: 'Server error' });
                }

                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const userResponse = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    avatar: user.avatar
                };

                const token = jwt.sign(userResponse, JWT_SECRET, { expiresIn: '24h' });

                res.json({
                    message: 'Login successful',
                    token,
                    user: userResponse
                });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Events Routes
app.get('/api/events', (req, res) => {
    const { status, category } = req.query;
    
    let query = `
        SELECT e.*, 
               u.name as organizerName,
               u.email as organizerEmail,
               COUNT(er.id) as registeredCount
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.eventId AND er.status = 'REGISTERED'
        LEFT JOIN users u ON e.organizerId = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
        conditions.push('e.status = ?');
        params.push(status);
    }
    
    if (category) {
        conditions.push('e.category = ?');
        params.push(category);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY e.id ORDER BY e.created_at DESC';
    
    db.all(query, params, (err, events) => {
        if (err) {
            console.error('Error fetching events:', err);
            return res.status(500).json({ message: 'Error fetching events' });
        }

        // For each event, check if current user is registered (if authenticated)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.json(events);
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.json(events);
            }

            // Add registration status for each event
            const eventsWithRegistration = events.map(event => {
                return new Promise((resolve) => {
                    checkUserRegistration(event.id, user.id, (err, registration) => {
                        if (registration) {
                            event.registeredUsers = [{ id: user.id }];
                        } else {
                            event.registeredUsers = [];
                        }
                        resolve(event);
                    });
                });
            });

            Promise.all(eventsWithRegistration).then(events => {
                res.json(events);
            });
        });
    });
});

app.get('/api/events/:id', (req, res) => {
    const eventId = req.params.id;

    getEventWithRegistrationCount(eventId, (err, event) => {
        if (err) {
            console.error('Error fetching event:', err);
            return res.status(500).json({ message: 'Error fetching event' });
        }

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Get registered users for this event
        db.all(
            `SELECT u.id, u.name, u.email 
             FROM event_registrations er 
             JOIN users u ON er.userId = u.id 
             WHERE er.eventId = ? AND er.status = 'REGISTERED'`,
            [eventId],
            (err, registeredUsers) => {
                if (err) {
                    console.error('Error fetching registered users:', err);
                }

                event.registeredUsers = registeredUsers || [];
                res.json(event);
            }
        );
    });
});

app.post('/api/events', authenticateToken, (req, res) => {
    const { title, description, startTime, endTime, capacity, venueId, category, coverImage } = req.body;
    const organizerId = req.user.id;

    if (!title || !description || !startTime || !endTime || !capacity || !category) {
        return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const venueName = venueId ? `Venue ${venueId}` : null;

    db.run(
        `INSERT INTO events (title, description, startTime, endTime, capacity, venueId, venueName, category, coverImage, organizerId, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, startTime, endTime, capacity, venueId, venueName, category, coverImage, organizerId, 'PENDING'],
        function(err) {
            if (err) {
                console.error('Error creating event:', err);
                return res.status(500).json({ message: 'Error creating event' });
            }

            // Return the created event
            getEventWithRegistrationCount(this.lastID, (err, event) => {
                if (err) {
                    return res.status(500).json({ message: 'Error fetching created event' });
                }
                res.status(201).json(event);
            });
        }
    );
});

app.post('/api/events/:id/register', authenticateToken, (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Check if event exists and get current registration count
    getEventWithRegistrationCount(eventId, (err, event) => {
        if (err) {
            return res.status(500).json({ message: 'Error checking event' });
        }

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Event is not available for registration' });
        }

        // Check if user is already registered
        checkUserRegistration(eventId, userId, (err, existingRegistration) => {
            if (err) {
                return res.status(500).json({ message: 'Error checking registration' });
            }

            if (existingRegistration) {
                return res.status(400).json({ message: 'Already registered for this event' });
            }

            // Check if event is at capacity
            if (event.registeredCount >= event.capacity) {
                return res.status(400).json({ message: 'Event is at full capacity' });
            }

            // Register user for event
            db.run(
                'INSERT INTO event_registrations (eventId, userId, status) VALUES (?, ?, ?)',
                [eventId, userId, 'REGISTERED'],
                function(err) {
                    if (err) {
                        console.error('Error registering for event:', err);
                        return res.status(500).json({ message: 'Error registering for event' });
                    }

                    res.json({ 
                        message: 'Successfully registered for event',
                        registrationId: this.lastID
                    });
                }
            );
        });
    });
});

// Admin Routes
app.post('/api/events/:id/approve', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const eventId = req.params.id;

    db.run(
        'UPDATE events SET status = ? WHERE id = ?',
        ['APPROVED', eventId],
        function(err) {
            if (err) {
                console.error('Error approving event:', err);
                return res.status(500).json({ message: 'Error approving event' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Event not found' });
            }

            res.json({ message: 'Event approved successfully' });
        }
    );
});

app.post('/api/events/:id/reject', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const eventId = req.params.id;

    db.run(
        'UPDATE events SET status = ? WHERE id = ?',
        ['REJECTED', eventId],
        function(err) {
            if (err) {
                console.error('Error rejecting event:', err);
                return res.status(500).json({ message: 'Error rejecting event' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Event not found' });
            }

            res.json({ message: 'Event rejected successfully' });
        }
    );
});

// User Routes
app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    db.all(
        'SELECT id, name, email, role, phone, avatar, created_at FROM users ORDER BY created_at DESC',
        (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ message: 'Error fetching users' });
            }

            res.json(users);
        }
    );
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
    const userId = req.params.id;
    
    // Users can only update their own profile unless they're admin
    if (req.user.id !== parseInt(userId) && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, phone, avatar } = req.body;

    db.run(
        'UPDATE users SET name = ?, email = ?, phone = ?, avatar = ? WHERE id = ?',
        [name, email, phone, avatar, userId],
        function(err) {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).json({ message: 'Error updating user' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Return updated user
            db.get(
                'SELECT id, name, email, role, phone, avatar FROM users WHERE id = ?',
                [userId],
                (err, user) => {
                    if (err) {
                        return res.status(500).json({ message: 'Error fetching updated user' });
                    }

                    // Update token if user updated their own profile
                    if (req.user.id === parseInt(userId)) {
                        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
                        return res.json({ 
                            message: 'Profile updated successfully',
                            user,
                            token 
                        });
                    }

                    res.json({ 
                        message: 'User updated successfully',
                        user 
                    });
                }
            );
        }
    );
});

// Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    // Total events
    db.get('SELECT COUNT(*) as total FROM events', (err, result) => {
        if (err) return res.status(500).json({ message: 'Error fetching stats' });
        
        stats.totalEvents = result.total;

        // User-specific stats
        if (userRole === 'STUDENT') {
            // Student registrations
            db.get(
                'SELECT COUNT(*) as count FROM event_registrations WHERE userId = ? AND status = "REGISTERED"',
                [userId],
                (err, result) => {
                    if (err) return res.status(500).json({ message: 'Error fetching stats' });
                    
                    stats.myRegistrations = result.count;

                    // Upcoming events
                    db.get(
                        'SELECT COUNT(*) as count FROM events WHERE startTime > datetime("now") AND status = "APPROVED"',
                        (err, result) => {
                            if (err) return res.status(500).json({ message: 'Error fetching stats' });
                            
                            stats.upcomingEvents = result.count;
                            res.json(stats);
                        }
                    );
                }
            );
        } else if (userRole === 'ORGANIZER' || userRole === 'ADMIN') {
            // Organizer/Admin stats
            db.get(
                'SELECT COUNT(*) as count FROM events WHERE organizerId = ?',
                [userId],
                (err, result) => {
                    if (err) return res.status(500).json({ message: 'Error fetching stats' });
                    
                    stats.myEvents = result.count;

                    // Total attendees for organizer's events
                    db.get(
                        `SELECT COUNT(*) as count 
                         FROM event_registrations er 
                         JOIN events e ON er.eventId = e.id 
                         WHERE e.organizerId = ? AND er.status = "REGISTERED"`,
                        [userId],
                        (err, result) => {
                            if (err) return res.status(500).json({ message: 'Error fetching stats' });
                            
                            stats.totalAttendees = result.count;
                            res.json(stats);
                        }
                    );
                }
            );
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${4000}`);
    console.log(`API available at http://localhost:${8080}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});