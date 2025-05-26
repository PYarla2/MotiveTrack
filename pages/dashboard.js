import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [why, setWhy]   = useState('');
  const [freq, setFreq] = useState(3);
  const [phone, setPhone] = useState('');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // redirect anonymous users
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else {
        // Fetch user's goals
        fetchGoals(user.id);
      }
    })();
  }, []);

  // Fetch user's goals
  const fetchGoals = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching goals:', error);
    } else {
      setGoals(data || []);
    }
    setLoading(false);
  };

  // Add logout function
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  async function handleSubmit() {
    if (!goal.trim() || !why.trim() || !phone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      alert('Please enter a valid phone number in format: +1xxxxxxxxxx');
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from('goals').insert([{
        user_id:       user.id,
        goal, why,
        phone_number:  phone,
        frequency_days: freq,
        last_sent:     new Date().toISOString(),  // immediate send counts as day 1
        streak_count:  1
      }]);
      if (error) { 
        alert('Error saving goal: ' + error.message); 
        setSubmitting(false);
        return; 
      }

      // send the SMS (Twilio + ChatGPT) — we'll add this next
      const response = await fetch('/api/send-initial', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ goal, why, phone })
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }

      alert('Goal saved & first text sent!');
      setGoal(''); setWhy(''); setPhone('');
      
      // Refresh goals
      fetchGoals(user.id);
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">New Goal</h2>
        <button 
          onClick={logout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <input className="border w-full p-2 mb-2"
             placeholder="Goal" value={goal}
             onChange={e=>setGoal(e.target.value)} />

      <input className="border w-full p-2 mb-2"
             placeholder="Why" value={why}
             onChange={e=>setWhy(e.target.value)} />

      <input className="border w-full p-2 mb-2"
             placeholder="Phone (+1xxxxxxxxxx)" value={phone}
             onChange={e=>setPhone(e.target.value)} />

      <input type="number" min="1" className="border w-full p-2 mb-4"
             value={freq} onChange={e=>setFreq(+e.target.value)} />

      <button onClick={handleSubmit}
              disabled={submitting}
              className={`w-full p-2 text-white ${submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
        {submitting ? 'Saving...' : 'Save & Send First SMS'}
      </button>

      {loading ? (
        <p className="mt-6 text-center">Loading goals...</p>
      ) : (
        <>
          <h3 className="text-xl font-semibold mt-8 mb-2">Your Goals</h3>
          {goals.length === 0 ? (
            <p className="text-gray-500">No goals yet. Add one above!</p>
          ) : (
            <ul className="mt-6">
              {goals.map(g => (
                <li key={g.id} className="border-b py-2">
                  <strong>{g.goal}</strong> – {g.streak_count} 🔥 – next in {g.frequency_days}d
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
} 