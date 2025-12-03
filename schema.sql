-- Database schema for Event Management System
CREATE DATABASE IF NOT EXISTS event_db;
USE event_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
    reg_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    ticket_count INT DEFAULT 1,
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_event (user_id, event_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    reg_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reg_id) REFERENCES registrations(reg_id) ON DELETE CASCADE
);

-- Sample data
INSERT IGNORE INTO events (title, description, event_date, venue, capacity, fee) VALUES
('Tech Conference 2025', 'Annual technology conference featuring latest trends in AI and Machine Learning', '2025-11-15 09:00:00', 'Convention Center Hall A', 500, 1500.00),
('Music Festival', 'Three-day music festival featuring top artists from around the world', '2025-12-01 18:00:00', 'City Park Amphitheater', 10000, 2500.00),
('Startup Pitch Night', 'Entrepreneurs pitch their innovative ideas to potential investors', '2025-10-30 19:00:00', 'Business Hub Auditorium', 200, 500.00),
('Food & Culture Fair', 'Celebrate diverse cultures through food, music, and art', '2025-11-08 12:00:00', 'Downtown Square', 1000, 0.00);