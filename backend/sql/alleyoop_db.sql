/* ==========================================================
	 Alleyoop Database Schema
	 Inspired by Courtify but extended for:
	 - Players (bookings + matchmaking)
	 - Arena/Venue Owners
	 - Sellers (shops, products, orders)
	 - Trainers (multi-venue, schedules, training bookings)
	 - Matchmaking based on skill level & rating
	 ========================================================== */

/* NOTE: Adjust the database name and "USE" statement as needed. */
CREATE DATABASE IF NOT EXISTS alleyoop;
USE alleyoop;


/* =========================================================
	 Lookup Tables
	========================================================= */

-- Types of courts / sports
CREATE TABLE IF NOT EXISTS court_types (
	id INT AUTO_INCREMENT PRIMARY KEY,
	type_name VARCHAR(50) NOT NULL
);

INSERT INTO court_types (type_name) VALUES
('Padel'),
('Tennis'),
('Badminton'),
('Futsal'),
('Cricket'),
('Basketball'),
('Football 5-a-side');


-- Booking status (used for both court and training bookings)
CREATE TABLE IF NOT EXISTS booking_status (
	id INT AUTO_INCREMENT PRIMARY KEY,
	status_name VARCHAR(50) NOT NULL
);

INSERT INTO booking_status (status_name) VALUES
('pending'),
('confirmed'),
('cancelled'),
('completed');


-- Order status for the in‑app shop
CREATE TABLE IF NOT EXISTS order_status (
	id INT AUTO_INCREMENT PRIMARY KEY,
	status_name VARCHAR(50) NOT NULL
);

INSERT INTO order_status (status_name) VALUES
('pending'),
('paid'),
('shipped'),
('delivered'),
('cancelled');


-- Skill levels for players & trainers (used in matchmaking)
CREATE TABLE IF NOT EXISTS skill_levels (
	id INT AUTO_INCREMENT PRIMARY KEY,
	level_name VARCHAR(50) NOT NULL,
	description VARCHAR(255) DEFAULT NULL
);

INSERT INTO skill_levels (level_name, description) VALUES
('Beginner', 'New to the sport, learning basics'),
('Intermediate', 'Plays regularly, understands rules and basic tactics'),
('Advanced', 'High level of play, good fitness and tactics'),
('Professional', 'Competes at a very high or pro level');


/* ==========================================================
	 Core User Tables
========================================================== */

-- Players (end‑users who book courts, buy products, join matchmaking)
CREATE TABLE IF NOT EXISTS players (
	id INT AUTO_INCREMENT PRIMARY KEY,
	email VARCHAR(100) UNIQUE NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	name VARCHAR(100),
	phone VARCHAR(20),
	is_active TINYINT(1) DEFAULT 0,
	verification_token VARCHAR(255),
	skill_level_id INT DEFAULT NULL,
	rating_avg DECIMAL(3,2) DEFAULT 0.00,
	rating_count INT DEFAULT 0,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id)
);


-- Arena / Venue owners
CREATE TABLE IF NOT EXISTS arena_owners (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	phone VARCHAR(20),
	password_hash VARCHAR(255) NOT NULL,
	is_active TINYINT(1) DEFAULT 0,
	verification_token VARCHAR(255),
	rating_avg DECIMAL(3,2) DEFAULT 0.00,
	rating_count INT DEFAULT 0,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Sellers: run shops inside Alleyoop
CREATE TABLE IF NOT EXISTS sellers (
	id INT AUTO_INCREMENT PRIMARY KEY,
	owner_name VARCHAR(100) NOT NULL,
	shop_name VARCHAR(150) NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	phone VARCHAR(20),
	password_hash VARCHAR(255) NOT NULL,
	is_active TINYINT(1) DEFAULT 0,
	verification_token VARCHAR(255),
	rating_avg DECIMAL(3,2) DEFAULT 0.00,
	rating_count INT DEFAULT 0,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Trainers: can affiliate with multiple venues, maintain schedules
CREATE TABLE IF NOT EXISTS trainers (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(100) UNIQUE NOT NULL,
	phone VARCHAR(20),
	password_hash VARCHAR(255) NOT NULL,
	is_active TINYINT(1) DEFAULT 0,
	verification_token VARCHAR(255),
	primary_sport_id INT DEFAULT NULL,
	skill_level_id INT DEFAULT NULL, -- self‑declared coaching level
	rating_avg DECIMAL(3,2) DEFAULT 0.00,
	rating_count INT DEFAULT 0,
	hourly_rate DECIMAL(10,2) DEFAULT 0.00,
	bio TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (primary_sport_id) REFERENCES court_types(id),
	FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id)
);


/* ==========================================================
	 Arenas, Courts, Images
========================================================== */

CREATE TABLE IF NOT EXISTS arenas (
	id INT AUTO_INCREMENT PRIMARY KEY,
	owner_id INT NOT NULL,
	name VARCHAR(100) NOT NULL,
	city VARCHAR(100) NOT NULL,
	address VARCHAR(255),
	latitude DECIMAL(10,7) DEFAULT NULL,
	longitude DECIMAL(10,7) DEFAULT NULL,
	pricePerHour INT DEFAULT NULL,
	availability ENUM('available', 'unavailable', 'closed') DEFAULT 'available',
	rating DECIMAL(3,2) DEFAULT 0.00,
	timing VARCHAR(100),
	total_courts INT DEFAULT 1,
	sports JSON,
	amenities JSON,
	description TEXT,
	rules JSON,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (owner_id) REFERENCES arena_owners(id)
);


-- Real-world model: one arena has many courts
CREATE TABLE IF NOT EXISTS courts (
	id INT AUTO_INCREMENT PRIMARY KEY,
	arena_id INT NOT NULL,
	name VARCHAR(100) NOT NULL,
	price_per_hour INT DEFAULT NULL,
	is_indoor TINYINT(1) DEFAULT 0,
	status ENUM('available', 'unavailable', 'maintenance') DEFAULT 'available',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (arena_id) REFERENCES arenas(id)
);


-- A court can support one or more sports
CREATE TABLE IF NOT EXISTS court_sports (
	id INT AUTO_INCREMENT PRIMARY KEY,
	court_id INT NOT NULL,
	court_type_id INT NOT NULL,
	UNIQUE KEY uniq_court_sport (court_id, court_type_id),
	FOREIGN KEY (court_id) REFERENCES courts(id),
	FOREIGN KEY (court_type_id) REFERENCES court_types(id)
);


CREATE TABLE IF NOT EXISTS arena_images (
	id INT AUTO_INCREMENT PRIMARY KEY,
	arena_id INT NOT NULL,
	image_path VARCHAR(255) NOT NULL,
	FOREIGN KEY (arena_id) REFERENCES arenas(id)
);


/* ==========================================================
	 Court Bookings
========================================================== */

CREATE TABLE IF NOT EXISTS bookings (
	id INT AUTO_INCREMENT PRIMARY KEY,
	player_id INT NOT NULL,
	arena_id INT NOT NULL,
	court_id INT NOT NULL,
	court_type_id INT NOT NULL,
	booking_date DATE NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	status_id INT NOT NULL,
	participants_count INT DEFAULT 1,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id),
	FOREIGN KEY (arena_id) REFERENCES arenas(id),
	FOREIGN KEY (court_id) REFERENCES courts(id),
	FOREIGN KEY (court_type_id) REFERENCES court_types(id),
	FOREIGN KEY (status_id) REFERENCES booking_status(id)
);


/* ==========================================================
	 Seller Shops, Products, Orders
========================================================== */

CREATE TABLE IF NOT EXISTS products (
	id INT AUTO_INCREMENT PRIMARY KEY,
	seller_id INT NOT NULL,
	name VARCHAR(150) NOT NULL,
	description TEXT,
	price DECIMAL(10,2) NOT NULL,
	stock INT DEFAULT 0,
	category VARCHAR(100),
	main_image_path VARCHAR(255),
	is_active TINYINT(1) DEFAULT 1,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (seller_id) REFERENCES sellers(id)
);


CREATE TABLE IF NOT EXISTS product_images (
	id INT AUTO_INCREMENT PRIMARY KEY,
	product_id INT NOT NULL,
	image_path VARCHAR(255) NOT NULL,
	FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS orders (
	id INT AUTO_INCREMENT PRIMARY KEY,
	player_id INT NOT NULL,
	seller_id INT NOT NULL,
	status_id INT NOT NULL,
	total_amount DECIMAL(10,2) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id),
	FOREIGN KEY (seller_id) REFERENCES sellers(id),
	FOREIGN KEY (status_id) REFERENCES order_status(id)
);


CREATE TABLE IF NOT EXISTS order_items (
	id INT AUTO_INCREMENT PRIMARY KEY,
	order_id INT NOT NULL,
	product_id INT NOT NULL,
	quantity INT NOT NULL,
	unit_price DECIMAL(10,2) NOT NULL,
	FOREIGN KEY (order_id) REFERENCES orders(id),
	FOREIGN KEY (product_id) REFERENCES products(id)
);


/* ==========================================================
	 Trainers: Venues, Schedules, Training Bookings
========================================================== */

-- Many‑to‑many: trainers can work at multiple arenas
CREATE TABLE IF NOT EXISTS trainer_venues (
	id INT AUTO_INCREMENT PRIMARY KEY,
	trainer_id INT NOT NULL,
	arena_id INT NOT NULL,
	is_primary TINYINT(1) DEFAULT 0,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE KEY uniq_trainer_arena (trainer_id, arena_id),
	FOREIGN KEY (trainer_id) REFERENCES trainers(id),
	FOREIGN KEY (arena_id) REFERENCES arenas(id)
);


-- Trainers define time slots at specific arenas/courts
CREATE TABLE IF NOT EXISTS trainer_time_slots (
	id INT AUTO_INCREMENT PRIMARY KEY,
	trainer_id INT NOT NULL,
	arena_id INT NOT NULL,
	court_id INT NOT NULL,
	court_type_id INT DEFAULT NULL,
	session_date DATE NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	capacity INT DEFAULT 1,
	price_per_person DECIMAL(10,2) DEFAULT 0.00,
	is_recurring TINYINT(1) DEFAULT 0,
	recurring_pattern VARCHAR(50) DEFAULT NULL, -- e.g. "weekly"
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (trainer_id) REFERENCES trainers(id),
	FOREIGN KEY (arena_id) REFERENCES arenas(id),
	FOREIGN KEY (court_id) REFERENCES courts(id),
	FOREIGN KEY (court_type_id) REFERENCES court_types(id)
);


-- Bookings for training sessions
CREATE TABLE IF NOT EXISTS trainer_bookings (
	id INT AUTO_INCREMENT PRIMARY KEY,
	player_id INT NOT NULL,
	trainer_time_slot_id INT NOT NULL,
	status_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id),
	FOREIGN KEY (trainer_time_slot_id) REFERENCES trainer_time_slots(id),
	FOREIGN KEY (status_id) REFERENCES booking_status(id)
);


/* ==========================================================
	 Reviews & Ratings (impact player skill & matchmaking)
========================================================== */

-- Reviews for players (by arena owners or other players)
CREATE TABLE IF NOT EXISTS player_reviews (
	id INT AUTO_INCREMENT PRIMARY KEY,
	player_id INT NOT NULL,
	reviewer_player_id INT DEFAULT NULL,
	reviewer_owner_id INT DEFAULT NULL,
	rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
	comment TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id),
	FOREIGN KEY (reviewer_player_id) REFERENCES players(id),
	FOREIGN KEY (reviewer_owner_id) REFERENCES arena_owners(id)
);


-- Reviews for trainers
CREATE TABLE IF NOT EXISTS trainer_reviews (
	id INT AUTO_INCREMENT PRIMARY KEY,
	trainer_id INT NOT NULL,
	reviewer_player_id INT DEFAULT NULL,
	rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
	comment TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (trainer_id) REFERENCES trainers(id),
	FOREIGN KEY (reviewer_player_id) REFERENCES players(id)
);


-- Optional: reviews for arenas
CREATE TABLE IF NOT EXISTS arena_reviews (
	id INT AUTO_INCREMENT PRIMARY KEY,
	arena_id INT NOT NULL,
	player_id INT DEFAULT NULL,
	rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
	comment TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (arena_id) REFERENCES arenas(id),
	FOREIGN KEY (player_id) REFERENCES players(id)
);


/* ==========================================================
	 Matchmaking System
========================================================== */

-- Player‑initiated matchmaking requests
CREATE TABLE IF NOT EXISTS matchmaking_requests (
	id INT AUTO_INCREMENT PRIMARY KEY,
	player_id INT NOT NULL,
	court_type_id INT NOT NULL,   -- which sport
	city VARCHAR(100) DEFAULT NULL,
	arena_id INT DEFAULT NULL,
	desired_date DATE NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	preferred_match_size INT DEFAULT 2, -- total players desired
	min_skill_level_id INT DEFAULT NULL,
	max_skill_level_id INT DEFAULT NULL,
	status ENUM('open','matched','cancelled','expired') DEFAULT 'open',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id),
	FOREIGN KEY (court_type_id) REFERENCES court_types(id),
	FOREIGN KEY (arena_id) REFERENCES arenas(id),
	FOREIGN KEY (min_skill_level_id) REFERENCES skill_levels(id),
	FOREIGN KEY (max_skill_level_id) REFERENCES skill_levels(id)
);


-- Groups created by the matchmaking engine (one group per actual game)
CREATE TABLE IF NOT EXISTS matchmaking_groups (
	id INT AUTO_INCREMENT PRIMARY KEY,
	court_type_id INT NOT NULL,
	arena_id INT DEFAULT NULL,
	booking_id INT DEFAULT NULL, -- link to bookings once a court is reserved
	status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (court_type_id) REFERENCES court_types(id),
	FOREIGN KEY (arena_id) REFERENCES arenas(id),
	FOREIGN KEY (booking_id) REFERENCES bookings(id)
);


-- Players participating in a matchmaking group
CREATE TABLE IF NOT EXISTS matchmaking_group_players (
	id INT AUTO_INCREMENT PRIMARY KEY,
	group_id INT NOT NULL,
	player_id INT NOT NULL,
	from_request_id INT DEFAULT NULL,
	role ENUM('host','guest') DEFAULT 'guest',
	joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (group_id) REFERENCES matchmaking_groups(id),
	FOREIGN KEY (player_id) REFERENCES players(id),
	FOREIGN KEY (from_request_id) REFERENCES matchmaking_requests(id)
);


/* ==========================================================
	 Seed Data (Minimal, can be extended)
========================================================== */

-- Dummy player
INSERT INTO players (email, password_hash, name, phone, is_active, skill_level_id)
VALUES (
	'player@example.com',
	'$2b$10$533qJn3SLMwXHwsUs.WtQexDbAPZYcKw7isfsPwVInWwhSZkcC9l.', -- 12345678
	'Test Player',
	'03001234567',
	1,
	2 -- Intermediate
);

-- Dummy arena owner & arena
INSERT INTO arena_owners (name, email, phone, password_hash, is_active)
VALUES (
	'Sample Owner',
	'owner@example.com',
	'03001112222',
	'$2b$10$533qJn3SLMwXHwsUs.WtQexDbAPZYcKw7isfsPwVInWwhSZkcC9l.',
	1
);

INSERT INTO arenas (
	owner_id, name, city, address, pricePerHour, availability, rating, timing,
	total_courts,
	sports, amenities, description, rules
)
VALUES (
	1,
	'Alleyoop Sports Complex',
	'Karachi',
	'Some Area, Block 5',
	4000,
	'available',
	4.50,
	'8 AM - 11 PM',
	4,
	JSON_ARRAY('Basketball', 'Futsal', 'Padel'),
	JSON_ARRAY('Changing Rooms', 'Showers', 'Parking'),
	'A multi‑sport facility for Alleyoop testing.',
	JSON_ARRAY('Proper sports shoes required', 'Arrive 10 minutes early')
);

INSERT INTO courts (arena_id, name, price_per_hour, is_indoor, status) VALUES
(1, 'Court 1', 4000, 1, 'available'),
(1, 'Court 2', 3800, 1, 'available'),
(1, 'Court 3', 4200, 0, 'available'),
(1, 'Court 4', 4000, 0, 'available');

INSERT INTO court_sports (court_id, court_type_id) VALUES
(1, 6), -- Basketball
(2, 4), -- Futsal
(3, 1), -- Padel
(4, 6), -- Basketball
(4, 4); -- Futsal
 
-- Additional dummy arenas for testing
INSERT INTO arenas (
	owner_id, name, city, address, pricePerHour, availability, rating, timing,
	total_courts,
	sports, amenities, description, rules
)
VALUES
(
	1,
	'Downtown Futsal Arena',
	'Karachi',
	'Downtown Street 12',
	3500,
	'available',
	4.20,
	'6 AM - 12 AM',
	3,
	JSON_ARRAY('Futsal'),
	JSON_ARRAY('Parking', 'Cafeteria'),
	'Indoor and outdoor futsal courts suitable for 5v5 games.',
	JSON_ARRAY('Non-marking shoes only', 'No food or drink on court')
),
(
	1,
	'Clifton Tennis Club',
	'Karachi',
	'Clifton Block 2',
	3000,
	'available',
	4.70,
	'7 AM - 10 PM',
	5,
	JSON_ARRAY('Tennis'),
	JSON_ARRAY('Changing Rooms', 'Showers', 'Parking', 'Pro Shop'),
	'Premium tennis facility with clay and hard courts.',
	JSON_ARRAY('Tennis shoes required', 'Coaching sessions must be pre-booked')
),
(
	1,
	'North Karachi Sports Arena',
	'Karachi',
	'North Karachi Sector 11',
	2500,
	'available',
	4.10,
	'9 AM - 11 PM',
	6,
	JSON_ARRAY('Futsal', 'Basketball'),
	JSON_ARRAY('Parking', 'Refreshments'),
	'Community sports arena with futsal and basketball courts.',
	JSON_ARRAY('No outside food allowed', 'Arrive 15 minutes early')
),
(
	1,
	'Gulshan Multi-Sport Complex',
	'Karachi',
	'Gulshan-e-Iqbal Block 3',
	4200,
	'available',
	4.35,
	'8 AM - 1 AM',
	8,
	JSON_ARRAY('Basketball', 'Badminton', 'Futsal'),
	JSON_ARRAY('Changing Rooms', 'Showers', 'Parking', 'Cafeteria'),
	'Large multi-sport complex ideal for leagues and tournaments.',
	JSON_ARRAY('Full advance payment required', 'Respect staff and other players')
);

INSERT INTO courts (arena_id, name, price_per_hour, is_indoor, status) VALUES
(2, 'Futsal Court A', 3500, 1, 'available'),
(2, 'Futsal Court B', 3500, 1, 'available'),
(2, 'Futsal Court C', 3200, 0, 'available'),
(3, 'Tennis Court 1', 3000, 0, 'available'),
(3, 'Tennis Court 2', 3200, 0, 'available'),
(4, 'Main Court', 2500, 1, 'available'),
(4, 'Basket Court', 2600, 1, 'available'),
(5, 'Court A', 4200, 1, 'available'),
(5, 'Court B', 4200, 1, 'available');

INSERT INTO court_sports (court_id, court_type_id) VALUES
(5, 4), (6, 4), (7, 4), -- arena 2
(8, 2), (9, 2),         -- arena 3
(10, 4), (10, 7), (11, 6),       -- arena 4
(12, 6), (12, 3), (12, 4),
(13, 6), (13, 3);       -- arena 5


-- Example matchmaking request
INSERT INTO matchmaking_requests (
	player_id, court_type_id, city, arena_id, desired_date, start_time, end_time,
	preferred_match_size, min_skill_level_id, max_skill_level_id
)
VALUES (
	1,         -- player
	4,         -- Futsal
	'Karachi',
	1,         -- Alleyoop Sports Complex
	'2025-12-05',
	'18:00:00',
	'19:30:00',
	10,        -- 5v5
	2,         -- Intermediate
	3          -- Advanced
);

-- Dummy court bookings for testing
INSERT INTO bookings (
	player_id, arena_id, court_id, court_type_id, booking_date, start_time, end_time,
	status_id, participants_count
)
VALUES
(
	1,
	1,
	2,
	4, -- Futsal
	'2025-12-05',
	'18:00:00',
	'19:00:00',
	2, -- confirmed
	10
),
(
	1,
	1,
	1,
	6, -- Basketball
	'2025-12-06',
	'20:00:00',
	'21:30:00',
	1, -- pending
	4
),
(
	1,
	2,
	5,
	4, -- Futsal
	'2025-12-07',
	'17:00:00',
	'18:30:00',
	2, -- confirmed
	8
),
(
	1,
	3,
	8,
	1, -- Padel
	'2025-12-08',
	'19:00:00',
	'20:00:00',
	4, -- completed
	2
),
(
	1,
	4,
	10,
	7, -- Football 5-a-side
	'2025-12-09',
	'07:00:00',
	'08:00:00',
	2, -- confirmed
	10
);

