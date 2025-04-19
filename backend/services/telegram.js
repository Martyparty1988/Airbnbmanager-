// services/telegram.js
const axios = require('axios');
const db = require('../db');

async function sendMessage(message) {
  try {
    const token = await db.settings.get('telegram_token');
    const chatId = await db.settings.get('telegram_chat_id');
    
    if (!token || !chatId) {
      console.warn('Telegram settings not configured');
      return;
    }
    
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    
    return response.data;
  } catch (error) {
    console.error('Telegram API error:', error.response?.data || error.message);
    return null;
  }
}

module.exports = {
  sendMessage
};