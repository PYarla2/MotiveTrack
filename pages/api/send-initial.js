const twilio = require('twilio');
const { OpenAI } = require('openai');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { goal, why, phone } = req.body;

    if (!goal || !why || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let motivationalMessage;

    try {
      // Try OpenAI first
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a motivational coach helping people achieve their goals. Keep messages under 160 characters to fit in a single SMS. Be encouraging, personal, and actionable."
          },
          {
            role: "user",
            content: `Generate a motivational text message for someone whose goal is: "${goal}". They're motivated by: "${why}". This is their first message to start their journey.`
          }
        ]
      });

      motivationalMessage = chatCompletion.choices[0].message.content.trim();
    } catch (openaiError) {
      console.log('OpenAI API failed, using fallback message:', openaiError.message);
      
      // Fallback to static motivational messages
      const fallbackMessages = [
        `🚀 Ready to crush your goal: "${goal}"? Remember why you started: ${why}. You've got this! Day 1 starts now! 💪`,
        `✨ Your journey to "${goal}" begins today! Keep "${why}" close to your heart. Every step counts! 🎯`,
        `🔥 Time to make "${goal}" happen! Your reason "${why}" is powerful. Let's build this habit together! 💯`,
        `⭐ Starting strong with "${goal}"! Remember: ${why}. You're already ahead by taking action! 🌟`,
        `💪 Goal activated: "${goal}"! Your motivation "${why}" will carry you through. Day 1 complete! 🎉`
      ];
      
      // Pick a random fallback message
      motivationalMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }

    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Send the message
    const result = await client.messages.create({
      body: motivationalMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    console.log('✅ Message sent successfully. SID:', result.sid);
    return res.status(200).json({ success: true, sid: result.sid, message: motivationalMessage });
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    return res.status(500).json({ error: error.message });
  }
} 