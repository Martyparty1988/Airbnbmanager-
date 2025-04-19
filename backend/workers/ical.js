// workers/ical.js
const axios = require('axios');
const ical = require('node-ical');
const cron = require('node-cron');
const db = require('../db');
const telegram = require('../services/telegram');

async function fetchICalFeed(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching iCal feed from ${url}:`, error);
    throw error;
  }
}

async function parseICalFeed(data) {
  try {
    const events = ical.parseICS(data);
    return Object.values(events).filter(event => event.type === 'VEVENT').map(event => ({
      external_id: event.uid,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end
    }));
  } catch (error) {
    console.error('Error parsing iCal data:', error);
    throw error;
  }
}

async function extractGuestInfo(event) {
  // Extract guest name from the summary or description
  const guestNameMatch = event.summary.match(/Reservation for (.+?)(?: -|$)/i) ||
                         event.description?.match(/Guest: (.+?)(\n|$)/i);
  
  const guestName = guestNameMatch ? guestNameMatch[1].trim() : 'Unknown Guest';
  
  return {
    guest_name: guestName,
    external_id: event.external_id,
    arrival_date: event.start.toISOString().split('T')[0],
    departure_date: event.end.toISOString().split('T')[0]
  };
}

async function syncReservations() {
  try {
    console.log('Starting iCal sync...');
    const properties = await db.property.getAll();
    
    for (const property of properties) {
      console.log(`Syncing reservations for ${property.name}`);
      const icalData = await fetchICalFeed(property.ical_url);
      const events = await parseICalFeed(icalData);
      
      for (const event of events) {
        const guestInfo = await extractGuestInfo(event);
        
        // Check if reservation already exists
        const existingReservations = await db.pool.query(
          'SELECT * FROM reservations WHERE external_id = $1 AND property_id = $2',
          [guestInfo.external_id, property.id]
        );
        
        if (existingReservations.rows.length === 0) {
          // This is a new reservation
          const newReservation = await db.reservation.create({
            property_id: property.id,
            external_id: guestInfo.external_id,
            guest_name: guestInfo.guest_name,
            arrival_date: guestInfo.arrival_date,
            departure_date: guestInfo.departure_date,
            missing_info: true // Mark as missing info until email is parsed
          });
          
          console.log(`New reservation created: ${newReservation.id} - ${guestInfo.guest_name}`);
          
          // Notify cleaning team on Telegram
          await telegram.sendMessage(
            `🆕 New reservation:\n` +
            `📍 ${property.name}\n` +
            `👤 ${guestInfo.guest_name}\n` +
            `📅 Check-in: ${guestInfo.arrival_date}\n` +
            `📅 Check-out: ${guestInfo.departure_date}\n` +
            `ℹ️ Need more info from email`
          );
        } else {
          // Update existing reservation if dates changed
          const existingReservation = existingReservations.rows[0];
          if (
            existingReservation.arrival_date.toISOString().split('T')[0] !== guestInfo.arrival_date ||
            existingReservation.departure_date.toISOString().split('T')[0] !== guestInfo.departure_date
          ) {
            await db.reservation.update(existingReservation.id, {
              ...existingReservation,
              arrival_date: guestInfo.arrival_date,
              departure_date: guestInfo.departure_date
            });
            
            console.log(`Updated reservation dates: ${existingReservation.id} - ${guestInfo.guest_name}`);
          }
        }
      }
    }
    
    console.log('iCal sync completed');
  } catch (error) {
    console.error('Error in iCal sync:', error);
  }
}

function setupICalJob() {
  // Run every hour
  cron.schedule('0 * * * *', syncReservations);
  
  // Also run immediately on startup
  syncReservations();
  
  console.log('iCal sync job scheduled');
}

module.exports = {
  setupICalJob,
  syncReservations
};