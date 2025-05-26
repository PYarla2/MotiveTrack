// Test file to verify Twilio SMS sending
const twilio = require('twilio');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send a test message
client.messages
  .create({
    body: 'Ahoy 👋 from SparkVibe!',
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+18777804236' // Replace with your test number
  })
  .then(message => console.log('✅ Message SID:', message.sid))
  .catch(err => console.error('❌ Error:', err.message)); 