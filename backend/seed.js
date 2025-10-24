const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./cems.db');

// Sample data
const sampleUsers = [
    {
        name: 'John Student',
        email: 'john@student.edu',
        password: 'student123',
        role: 'STUDENT'
    },
    {
        name: 'Sarah Organizer',
        email: 'sarah@club.edu',
        password: 'organizer123',
        role: 'ORGANIZER'
    },
    {
        name: 'Mike Organizer',
        email: 'mike@sports.edu',
        password: 'organizer123',
        role: 'ORGANIZER'
    }
];

const sampleEvents = [
    {
        title: 'Annual Music Festival',
        description: 'Join us for a night of amazing music performances from our talented students. Featuring various genres and special guest performances.',
        startTime: '2024-03-15 18:00:00',
        endTime: '2024-03-15 22:00:00',
        capacity: 200,
        venueId: 'AUD-001',
        category: 'music',
        coverImage: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500',
        status: 'APPROVED'
    },
    {
        title: 'Tech Hackathon 2024',
        description: '24-hour coding competition where students can showcase their programming skills and build innovative projects.',
        startTime: '2024-03-20 09:00:00',
        endTime: '2024-03-21 09:00:00',
        capacity: 100,
        venueId: 'CS-101',
        category: 'technology',
        coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500',
        status: 'APPROVED'
    },
    {
        title: 'Basketball Tournament Finals',
        description: 'Championship game of the inter-college basketball tournament. Come support your team!',
        startTime: '2024-03-10 15:00:00',
        endTime: '2024-03-10 17:00:00',
        capacity: 500,
        venueId: 'GYM-001',
        category: 'sports',
        coverImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500',
        status: 'APPROVED'
    },
    {
        title: 'Art Exhibition: Modern Perspectives',
        description: 'Showcasing contemporary art pieces created by our art department students.',
        startTime: '2024-03-25 10:00:00',
        endTime: '2024-03-27 16:00:00',
        capacity: 150,
        venueId: 'ART-GAL',
        category: 'art',
        coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500',
        status: 'PENDING'
    },
    {
        title: 'Dance Workshop: Contemporary Moves',
        description: 'Learn contemporary dance techniques from professional choreographers. All skill levels welcome.',
        startTime: '2024-03-12 14:00:00',
        endTime: '2024-03-12 16:00:00',
        capacity: 50,
        venueId: 'DANCE-01',
        category: 'dance',
        coverImage: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=500',
        status: 'APPROVED'
    },
    {
        title: 'AI & Machine Learning Seminar',
        description: 'Expert talk on the latest developments in artificial intelligence and machine learning applications.',
        startTime: '2024-03-18 13:00:00',
        endTime: '2024-03-18 15:00:00',
        capacity: 80,
        venueId: 'LT-201',
        category: 'academic',
        coverImage: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=500',
        status: 'APPROVED'
    }
];

async function seedDatabase() {
    console.log('Starting database seeding...');

    // Insert sample users
    for (const user of sampleUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        db.run(
            `INSERT OR IGNORE INTO users (name, email, password, role) 
             VALUES (?, ?, ?, ?)`,
            [user.name, user.email, hashedPassword, user.role],
            function(err) {
                if (err) {
                    console.error('Error inserting user:', err);
                } else {
                    console.log(`Inserted user: ${user.name}`);
                }
            }
        );
    }

    // Wait a bit for users to be inserted, then insert events
    setTimeout(() => {
        // Get organizer IDs
        db.all('SELECT id FROM users WHERE role = "ORGANIZER"', (err, organizers) => {
            if (err) {
                console.error('Error fetching organizers:', err);
                return;
            }

            if (organizers.length === 0) {
                console.log('No organizers found, skipping event insertion');
                return;
            }

            // Insert sample events
            sampleEvents.forEach((event, index) => {
                const organizerId = organizers[index % organizers.length].id;
                const venueName = event.venueId ? `Venue ${event.venueId}` : null;

                db.run(
                    `INSERT OR IGNORE INTO events 
                     (title, description, startTime, endTime, capacity, venueId, venueName, category, coverImage, organizerId, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        event.title,
                        event.description,
                        event.startTime,
                        event.endTime,
                        event.capacity,
                        event.venueId,
                        venueName,
                        event.category,
                        event.coverImage,
                        organizerId,
                        event.status
                    ],
                    function(err) {
                        if (err) {
                            console.error('Error inserting event:', err);
                        } else {
                            console.log(`Inserted event: ${event.title}`);
                        }
                    }
                );
            });
        });

        // Create some sample registrations
        setTimeout(() => {
            // Get student and event IDs
            db.all('SELECT id FROM users WHERE role = "STUDENT"', (err, students) => {
                if (err || students.length === 0) return;

                db.all('SELECT id FROM events WHERE status = "APPROVED"', (err, events) => {
                    if (err || events.length === 0) return;

                    // Register students for some events
                    students.forEach(student => {
                        events.slice(0, 2).forEach(event => {
                            db.run(
                                `INSERT OR IGNORE INTO event_registrations (eventId, userId, status) 
                                 VALUES (?, ?, ?)`,
                                [event.id, student.id, 'REGISTERED'],
                                (err) => {
                                    if (err) {
                                        console.error('Error creating registration:', err);
                                    }
                                }
                            );
                        });
                    });

                    console.log('Created sample registrations');
                });
            });
        }, 1000);

    }, 1000);

    console.log('Database seeding completed!');
}

// Run seeding
seedDatabase();

// Close database after seeding
setTimeout(() => {
    db.close();
    console.log('Database connection closed.');
}, 3000);