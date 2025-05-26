-- Fix the foreign key constraint issue
-- Drop the existing foreign key constraint and recreate the table structure

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS goals;

-- Recreate the goals table without the strict foreign key constraint
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,  -- Remove the REFERENCES constraint
  goal TEXT NOT NULL,
  why TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  frequency_days INTEGER NOT NULL DEFAULT 3,
  last_sent TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  streak_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (this provides the security we need)
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see their own goals
CREATE POLICY "Users can view their own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy so users can insert their own goals
CREATE POLICY "Users can insert their own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy so users can update their own goals
CREATE POLICY "Users can update their own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy so users can delete their own goals
CREATE POLICY "Users can delete their own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id); 