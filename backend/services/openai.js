// services/openai.js
const axios = require('axios');

async function extractReservationData(emailText, apiKey) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `
              You are an assistant that extracts reservation information from emails.
              Extract the following information in JSON format:
              - guest_name: The name of the guest
              - guest_count: Number of guests
              - contact_phone: Phone number with country code
              - wellness_fee: The amount in EUR that will be paid for wellness
              - arrival_time: Expected arrival time in 24h format (HH:MM)
              - special_requests: Array of objects with {type, description}
              
              If you can't find a specific field, return null for that field.
              Return only the JSON object without any additional text.
            `
          },
          { role: 'user', content: emailText }
        ],
        temperature: 0.1,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const content = response.data.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch (e) {
      // Try to extract JSON if it's not properly formatted
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw e;
    }
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    return {
      guest_name: null,
      guest_count: null,
      contact_phone: null, 
      wellness_fee: null,
      arrival_time: null,
      special_requests: []
    };
  }
}

module.exports = {
  extractReservationData
};