// workers/email.js
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cron = require('node-cron');
const db = require('../db');
const openai = require('../services/openai');
const telegram = require('../services/telegram');

function connectImap(config) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls
    });
    
    imap.once('ready', () => resolve(imap));
    imap.once('error', err => reject(err));
    imap.connect();
  });
}

function fetchEmails(imap, since = '1-Jan-2023') {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) return reject(err);
      
      const fetch = imap.seq.fetch(`1:*`, {
        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
        struct: true
      });
      
      const messages = [];
      
      fetch.on('message', (msg, seqno) => {
        const message = { seqno };
        
        msg.on('body', (stream, info) => {
          let buffer = '';
          stream.on('data', chunk => {
            buffer += chunk.toString('utf8');
          });
          
          stream.on('end', () => {
            if (info.which.includes('HEADER')) {
              message.header = Imap.parseHeader(buffer);
            } else {
              message.body = buffer;
            }
          });
        });
        
        msg.once('attributes', attrs => {
          message.uid = attrs.uid;
          message.flags = attrs.flags;
          message.date = attrs.date;
        });
        
        msg.once('end', () => {
          messages.push(message);
        });
      });
      
      fetch.once('error', err => {
        reject(err);
      });
      
      fetch.once('end', () => {
        resolve(messages);
      });
    });
  });
}

async function parseEmailContent(email) {
  try {
    const parsed = await simpleParser(email.body);
    return {
      subject: parsed.subject,
      from: parsed.from.text,
      to: parsed.to.text,
      date: parsed.date,
      text: parsed.text,
      html: parsed.html
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
}

async function extractReservationData(emailContent) {
  try {
    // First try to identify which reservation this belongs to
    const dateRegex = /(\d{1,2}[-\/. ]\d{1,2}[-\/. ]\d{2,4})/g;
    const potentialDates = emailContent.text.match(dateRegex) || [];
    
    const nameRegex = /(?:guest|name|jméno|host)[:]\s*([A-Za-z\s]+)/i;
    const nameMatch = emailContent.text.match(nameRegex);
    const guestName = nameMatch ? nameMatch[1].trim() : null;
    
    // Use OpenAI to extract the rest of the information
    const apiKey = await db.settings.get('openai_api_key');
    if (!apiKey) {
      console.warn('OpenAI API key not configured');
      return null;
    }
    
    const extractedData = await openai.extractReservationData(emailContent.text, apiKey);
    
    return {
      ...extractedData,
      guest_name: extractedData.guest_name || guestName,
      safebox_password: extractedData.contact_phone ? 
        extractedData.contact_phone.replace(/\D/g, '').slice(-4) : null
    };
  } catch (error) {
    console.error('Error extracting reservation data:', error);
    return null;
  }
}

async function processEmails() {
  try {
    console.log('Starting email processing...');
    
    const emailConfig = {
      user: await db.settings.get('email_user'),
      password: await db.settings.get('email_password'),
      host: await db.settings.get('email_server'),
      port: 993,
      tls: true
    };
    
    if (!emailConfig.user || !emailConfig.password || !emailConfig.host) {
      console.warn('Email settings not configured');
      return;
    }
    
    const imap = await connectImap(emailConfig);
    const emails = await fetchEmails(imap);
    
    console.log(`Found ${emails.length} emails to process`);
    
    for (const email of emails) {
      const content = await parseEmailContent(email);
      if (!content) continue;
      
      // Only process reservation-related emails
      const isReservationEmail = 
        content.subject.includes('Reservation') || 
        content.subject.includes('Booking') ||
        content.subject.includes('rezervace') ||
        content.subject.includes('ubytování');
      
      if (isReservationEmail) {
        console.log(`Processing reservation email: ${content.subject}`);
        
        const reservationData = await extractReservationData(content);
        if (!reservationData || !reservationData.guest_name) {
          console.warn('Could not extract reservation data from email');
          continue;
        }
        
        // Find matching reservation
        const { rows } = await db.pool.query(
          'SELECT * FROM reservations WHERE guest_name ILIKE $1',
          [`%${reservationData.guest_name}%`]
        );
        
        if (rows.length === 0) {
          console.warn(`No matching reservation found for guest: ${reservationData.guest_name}`);
          continue;
        }
        
        // Update reservation with extracted data
        const reservation = rows[0];
        const updatedReservation = await db.reservation.update(reservation.id, {
          ...reservation,
          guest_count: reservationData.guest_count || reservation.guest_count,
          contact_phone: reservationData.contact_phone || reservation.contact_phone,
          wellness_fee: reservationData.wellness_fee || reservation.wellness_fee,
          safebox_password: reservationData.safebox_password || reservation.safebox_password,
          arrival_time: reservationData.arrival_time || reservation.arrival_time,
          missing_info: false
        });
        
        console.log(`Updated reservation ${reservation.id} with data from email`);
        
        // Add special requests if any
        if (reservationData.special_requests && reservationData.special_requests.length > 0) {
          for (const request of reservationData.special_requests) {
            await db.specialRequest.create({
              reservation_id: reservation.id,
              request_type: request.type || 'Other',
              description: request.description
            });
          }
          
          console.log(`Added ${reservationData.special_requests.length} special requests`);
        }
        
        // Notify cleaning team via Telegram
        const property = await db.property.getById(reservation.property_id);
        await telegram.sendMessage(
          `🔄 Updated reservation:\n` +
          `📍 ${property.name}\n` +
          `👤 ${reservation.guest_name}\n` +
          `📅 Check-in: ${reservation.arrival_date}\n` +
          `📅 Check-out: ${reservation.departure_date}\n` +
          `👥 Guests: ${updatedReservation.guest_count || 'Unknown'}\n` +
          `🕒 Arrival time: ${updatedReservation.arrival_time || 'Unknown'}\n` +
          `📱 Contact: ${updatedReservation.contact_phone || 'Unknown'}\n` +
          `🔑 Safebox: ${updatedReservation.safebox_password || 'Not set'}\n` +
          (reservationData.special_requests && reservationData.special_requests.length > 0 ?
            `🔶 Special requests: ${reservationData.special_requests.map(r => r.description).join(', ')}` : '')
        );
      }
    }
    
    imap.end();
    console.log('Email processing completed');
  } catch (error) {
    console.error('Error processing emails:', error);
  }
}

async function checkUpcomingCheckouts() {
  try {
    // Get reservations with checkout in next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { rows } = await db.pool.query(`
      SELECT r.*, p.name as property_name
      FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE r.departure_date = $1
    `, [tomorrow.toISOString().split('T')[0]]);
    
    if (rows.length === 0) return;
    
    console.log(`Found ${rows.length} checkouts for tomorrow`);
    
    for (const reservation of rows) {
      // Notify about upcoming checkout
      await telegram.sendMessage(
        `⚠️ CHECKOUT TOMORROW ⚠️\n` +
        `📍 ${reservation.property_name}\n` +
        `👤 ${reservation.guest_name}\n` +
        `📅 Checkout date: ${reservation.departure_date}\n` +
        `👥 Guests: ${reservation.guest_count || 'Unknown'}\n` +
        `📱 Contact: ${reservation.contact_phone || 'Unknown'}`
      );
      
      // Get any special notes or requests
      const notes = await db.note.getByReservationId(reservation.id);
      const requests = await db.specialRequest.getByReservationId(reservation.id);
      
      if (notes.length > 0 || requests.length > 0) {
        let message = `📝 Notes and requests for ${reservation.guest_name}:\n`;
        
        if (notes.length > 0) {
          message += '🗒️ Notes:\n';
          notes.forEach(note => {
            message += `- ${note.content}\n`;
          });
        }
        
        if (requests.length > 0) {
          message += '🔶 Special requests:\n';
          requests.forEach(req => {
            message += `- ${req.request_type}: ${req.description} (${req.status})\n`;
          });
        }
        
        await telegram.sendMessage(message);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming checkouts:', error);
  }
}

function setupEmailJob() {
  // Process emails every 30 minutes
  cron.schedule('*/30 * * * *', processEmails);
  
  // Check for upcoming checkouts every day at 10:00
  cron.schedule('0 10 * * *', checkUpcomingCheckouts);
  
  // Also run immediately on startup
  processEmails();
  checkUpcomingCheckouts();
  
  console.log('Email processing job scheduled');
}

module.exports = {
  setupEmailJob,
  processEmails,
  checkUpcomingCheckouts
};