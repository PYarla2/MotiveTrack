// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4"
import twilio from "https://esm.sh/twilio@4"

interface Goal {
  id: number
  user_id: string
  goal: string
  why: string
  phone_number: string
  frequency_days: number
  last_sent: string
  streak_count: number
}

console.log("Hello from Functions!")

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    // Validate required environment variables
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey || 
        !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response('Missing required environment variables', { status: 500 })
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: openaiApiKey })
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken)

    // Fetch all goals from the database
    const { data: goals, error: fetchError } = await supabase
      .from('goals')
      .select('id, user_id, goal, why, phone_number, frequency_days, last_sent, streak_count')

    if (fetchError) {
      console.error('Error fetching goals:', fetchError)
      return new Response('Error fetching goals', { status: 500 })
    }

    if (!goals || goals.length === 0) {
      return new Response('✅ No goals found', { status: 200 })
    }

    const now = new Date()
    let remindersSent = 0

    // Process each goal
    for (const goal of goals as Goal[]) {
      try {
        const lastSent = new Date(goal.last_sent)
        const daysSinceLastSent = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24))

        // Check if reminder is due
        if (daysSinceLastSent >= goal.frequency_days) {
          console.log(`Processing goal ${goal.id}: ${daysSinceLastSent} days since last sent`)

          // Generate motivational message with OpenAI
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Generate a motivational text message in exactly 20 words. Be encouraging and mention the goal and motivation. Keep it personal and inspiring."
              },
              {
                role: "user",
                content: `Goal: "${goal.goal}". Motivation: "${goal.why}". Create a 20-word motivational reminder.`
              }
            ],
            max_tokens: 50,
            temperature: 0.7
          })

          const motivationalMessage = completion.choices[0]?.message?.content?.trim()
          
          if (!motivationalMessage) {
            console.error(`Failed to generate message for goal ${goal.id}`)
            continue
          }

          // Send SMS via Twilio
          const message = await twilioClient.messages.create({
            body: motivationalMessage,
            from: twilioPhoneNumber,
            to: goal.phone_number
          })

          console.log(`SMS sent for goal ${goal.id}. Message SID: ${message.sid}`)

          // Calculate new streak count
          const isOnTime = daysSinceLastSent <= (goal.frequency_days + 1)
          const newStreakCount = isOnTime ? goal.streak_count + 1 : 1

          // Update the goal in database
          const { error: updateError } = await supabase
            .from('goals')
            .update({
              last_sent: now.toISOString(),
              streak_count: newStreakCount
            })
            .eq('id', goal.id)

          if (updateError) {
            console.error(`Error updating goal ${goal.id}:`, updateError)
          } else {
            console.log(`Updated goal ${goal.id}: streak ${newStreakCount}, last_sent ${now.toISOString()}`)
            remindersSent++
          }
        } else {
          console.log(`Goal ${goal.id} not due yet: ${daysSinceLastSent}/${goal.frequency_days} days`)
        }
      } catch (error) {
        console.error(`Error processing goal ${goal.id}:`, error)
        // Continue processing other goals even if one fails
        continue
      }
    }

    console.log(`✅ Processed ${goals.length} goals, sent ${remindersSent} reminders`)
    return new Response(`✅ Sent reminders`, { status: 200 })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-reminders' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
