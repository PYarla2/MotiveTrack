import twilio from 'twilio';

export default async function handler(req, res) {
  try {
    // Log environment variables (without sensitive data)
    console.log('Checking environment variables:');
    console.log('TWILIO_ACCOUNT_SID exists:', !!process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN exists:', !!process.env.TWILIO_AUTH_TOKEN);
    console.log('TWILIO_PHONE_NUMBER exists:', !!process.env.TWILIO_PHONE_NUMBER);
    
    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Send a test message
    const message = await client.messages.create({
      body: 'Ahoy 👋 from SparkVibe!',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+18777804236' // Replace with your test number if needed
    });

    console.log('✅ Message SID:', message.sid);
    return res.status(200).json({ success: true, sid: message.sid });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
} 