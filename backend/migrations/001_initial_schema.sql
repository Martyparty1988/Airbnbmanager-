-- migrations/001_initial_schema.sql

-- Properties table (villas)
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ical_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  external_id VARCHAR(255),
  guest_name VARCHAR(255),
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  guest_count INTEGER,
  contact_phone VARCHAR(50),
  wellness_fee DECIMAL(10, 2),
  safebox_password VARCHAR(10),
  arrival_time TIME,
  missing_info BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Special requests table
CREATE TABLE special_requests (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id),
  request_type VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial properties
INSERT INTO properties (name, ical_url) VALUES 
('Amazing Pool Vila', 'https://www.airbnb.cz/calendar/ical/660104733582708563.ics?s=690e5705d584bdea19c3be8e2144e4fb'),
('Ohyeah Vila', 'https://www.airbnb.cz/calendar/ical/36773922.ics?s=3530bcd2c1602623eff2c2876a9ec341'),
('The Little Castle Vila', 'https://www.airbnb.cz/calendar/ical/1013828545896648855.ics?s=79f0dd2f2e7ee95659dd831d4213475e');

-- Insert default settings
INSERT INTO settings (key, value) VALUES
('email_server', ''),
('email_user', ''),
('email_password', ''),
('email_protocol', 'imap'),
('openai_api_key', ''),
('telegram_token', '7590306430:AAFjR5GNzdozq1HRGv_fw24mN_dRvb_NS_I'),
('telegram_chat_id', '6592431657');