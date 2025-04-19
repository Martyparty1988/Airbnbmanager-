// db/index.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Connect function to test the database connection
async function connect() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    return true;
  } finally {
    client.release();
  }
}

// Migration function
async function runMigrations() {
  const client = await pool.connect();
  try {
    const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
    }
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Models
const propertyModel = {
  async getAll() {
    const { rows } = await pool.query('SELECT * FROM properties ORDER BY name');
    return rows;
  },
  
  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
    return rows[0];
  }
};

const reservationModel = {
  async getAll() {
    const { rows } = await pool.query(`
      SELECT r.*, p.name as property_name 
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      ORDER BY arrival_date DESC
    `);
    return rows;
  },
  
  async getById(id) {
    const { rows } = await pool.query(`
      SELECT r.*, p.name as property_name 
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = $1
    `, [id]);
    return rows[0];
  },
  
  async getByDateRange(startDate, endDate) {
    const { rows } = await pool.query(`
      SELECT r.*, p.name as property_name 
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE 
        (arrival_date >= $1 AND arrival_date <= $2)
        OR (departure_date >= $1 AND departure_date <= $2)
        OR (arrival_date <= $1 AND departure_date >= $2)
      ORDER BY arrival_date
    `, [startDate, endDate]);
    return rows;
  },
  
  async create(reservation) {
    const { 
      property_id, external_id, guest_name, arrival_date, departure_date,
      guest_count, contact_phone, wellness_fee, safebox_password, arrival_time,
      missing_info
    } = reservation;
    
    const { rows } = await pool.query(`
      INSERT INTO reservations (
        property_id, external_id, guest_name, arrival_date, departure_date,
        guest_count, contact_phone, wellness_fee, safebox_password, arrival_time,
        missing_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      property_id, external_id, guest_name, arrival_date, departure_date,
      guest_count, contact_phone, wellness_fee, safebox_password, arrival_time,
      missing_info
    ]);
    
    return rows[0];
  },
  
  async update(id, reservation) {
    const { 
      property_id, guest_name, arrival_date, departure_date,
      guest_count, contact_phone, wellness_fee, safebox_password, arrival_time,
      missing_info
    } = reservation;
    
    const { rows } = await pool.query(`
      UPDATE reservations
      SET 
        property_id = $1,
        guest_name = $2,
        arrival_date = $3,
        departure_date = $4,
        guest_count = $5,
        contact_phone = $6,
        wellness_fee = $7,
        safebox_password = $8,
        arrival_time = $9,
        missing_info = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      property_id, guest_name, arrival_date, departure_date,
      guest_count, contact_phone, wellness_fee, safebox_password, arrival_time,
      missing_info, id
    ]);
    
    return rows[0];
  }
};

const noteModel = {
  async getByReservationId(reservationId) {
    const { rows } = await pool.query(`
      SELECT * FROM notes 
      WHERE reservation_id = $1
      ORDER BY created_at DESC
    `, [reservationId]);
    return rows;
  },
  
  async create(note) {
    const { reservation_id, content, is_internal } = note;
    
    const { rows } = await pool.query(`
      INSERT INTO notes (reservation_id, content, is_internal)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [reservation_id, content, is_internal]);
    
    return rows[0];
  }
};

const specialRequestModel = {
  async getByReservationId(reservationId) {
    const { rows } = await pool.query(`
      SELECT * FROM special_requests
      WHERE reservation_id = $1
      ORDER BY created_at DESC
    `, [reservationId]);
    return rows;
  },
  
  async create(request) {
    const { reservation_id, request_type, description, status } = request;
    
    const { rows } = await pool.query(`
      INSERT INTO special_requests (reservation_id, request_type, description, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [reservation_id, request_type, description, status || 'pending']);
    
    return rows[0];
  },
  
  async updateStatus(id, status) {
    const { rows } = await pool.query(`
      UPDATE special_requests
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);
    
    return rows[0];
  }
};

const settingsModel = {
  async getAll() {
    const { rows } = await pool.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },
  
  async get(key) {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return rows.length > 0 ? rows[0].value : null;
  },
  
  async update(key, value) {
    const { rows } = await pool.query(`
      UPDATE settings
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = $2
      RETURNING *
    `, [value, key]);
    
    if (rows.length === 0) {
      // Key doesn't exist, create it
      await pool.query(`
        INSERT INTO settings (key, value)
        VALUES ($1, $2)
      `, [key, value]);
    }
    
    return { key, value };
  }
};

module.exports = {
  pool,
  connect,
  runMigrations,
  property: propertyModel,
  reservation: reservationModel,
  note: noteModel,
  specialRequest: specialRequestModel,
  settings: settingsModel
};