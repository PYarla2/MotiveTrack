# 🚀 SparkVibe

A full-stack Next.js app with Supabase authentication, SMS reminders via Twilio, and AI-powered motivational messages with OpenAI.

## 🌟 Features

* Google OAuth authentication via Supabase
* Dashboard for submitting and tracking personal goals
* AI-generated motivational SMS messages with OpenAI
* Automated reminders via Twilio
* Streak tracking system

## 🔧 Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env.local` file with the following variables:
   ```
   # Supabase Credentials
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Twilio Credentials
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1YOUR_TWILIO_NUMBER
   
   # OpenAI Credentials
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Run the development server with `npm run dev`

## 📦 Backend Automation with Supabase CLI + Scoop

This guide continues from your working goal submission + Twilio + ChatGPT flow.

### ✅ **Step 1: Install Supabase CLI via Scoop (One-Time Setup)**

#### 🧭 In PowerShell (as admin):

```powershell
Set-ExecutionPolicy RemoteSigned -scope CurrentUser
irm get.scoop.sh | iex
scoop install supabase
```

#### 🔍 Confirm it's working:

```bash
supabase --version
```

### ✅ **Step 2: Initialize Edge Functions in Your Project**

From your project folder:

```bash
supabase init
```

Choose:

* Language: `TypeScript`
* Functions directory: default `supabase/functions`

### ✅ **Step 3: Create the Reminder Function**

```bash
supabase functions new send-reminders
```

This creates:

```
supabase/functions/send-reminders/index.ts
```

### ✅ **Step 4: Paste the Full Reminder Function Code**

In `index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.12.1';
import twilio from 'https://esm.sh/twilio@4.6.0';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const openai = new OpenAIApi(
    new Configuration({ apiKey: Deno.env.get('OPENAI_API_KEY') })
  );

  const client = twilio(
    Deno.env.get('TWILIO_ACCOUNT_SID')!,
    Deno.env.get('TWILIO_AUTH_TOKEN')!
  );

  const { data: goals } = await supabase.from('goals').select('*');

  const now = new Date();

  for (const goal of goals || []) {
    const lastSent = new Date(goal.last_sent);
    const daysSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince >= goal.frequency_days) {
      const chat = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a motivational coach. Keep it short and uplifting.' },
          { role: 'user', content: `Goal: ${goal.goal}. Why: ${goal.why}` }
        ]
      });

      const message = chat.data.choices[0].message.content;

      await client.messages.create({
        body: message,
        from: Deno.env.get('TWILIO_PHONE_NUMBER')!,
        to: goal.phone_number
      });

      const newStreak = daysSince <= goal.frequency_days + 1 ? goal.streak_count + 1 : 1;

      await supabase.from('goals')
        .update({ last_sent: now.toISOString(), streak_count: newStreak })
        .eq('id', goal.id);
    }
  }

  return new Response('✅ Sent reminders');
});
```

### ✅ **Step 5: Add Env Vars to Supabase Function**

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  TWILIO_ACCOUNT_SID=AC... \
  TWILIO_AUTH_TOKEN=... \
  TWILIO_PHONE_NUMBER=+1XXXXXXXXXX \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

🔍 Get `SERVICE_ROLE_KEY` from Supabase → **Settings > API**

### ✅ **Step 6: Deploy Your Function**

```bash
supabase functions deploy send-reminders
```

✅ You can test it manually:

```bash
supabase functions invoke send-reminders --no-verify-jwt
```

### ✅ **Step 7: Set Up Cron Job**

1. Go to Supabase Console → **Edge Functions → Triggers**
2. Click **+ New Trigger**
3. Select `send-reminders` as the function
4. Use Cron Expression (e.g., daily at 9 AM):

```
0 9 * * *
```

5. Save!

✅ Now your app automatically sends ChatGPT SMS reminders on schedule.

### ✅ **Step 8: Dashboard UI (Optional Polish)**

In `pages/dashboard.js`, add:

```jsx
<ul className="mt-6">
  {goals.map(g => (
    <li key={g.id} className="border-b py-2">
      <strong>{g.goal}</strong> – {g.streak_count} 🔥 – next in {g.frequency_days}d
    </li>
  ))}
</ul>
```

### ✅ Final Checklist

* [x] Login with Google (Supabase)
* [x] Submit goal form → Save to DB
* [x] Send immediate ChatGPT SMS via Twilio
* [x] Scheduled function runs daily via Supabase
* [x] Goals/streaks visible in dashboard
* [x] Code pushed to GitHub

## 🚀 Next Steps

* A **deploy script** for Vercel
* A **streak-based theme unlock system**
* A **shareable X/Tweet post** for demo launch