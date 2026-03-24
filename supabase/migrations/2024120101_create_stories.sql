-- Create stories table for user-specific story tracking
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS policies (user can only access own stories)
CREATE POLICY "Users can view own stories" ON public.stories
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own stories" ON public.stories
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Indexes for performance
CREATE INDEX idx_stories_user_updated ON public.stories (user_id, updated_at DESC);
CREATE INDEX idx_stories_user_title ON public.stories (user_id, title);
CREATE INDEX idx_stories_user_status ON public.stories USING gin (user_id, data->>'status');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

COMMENT ON TABLE public.stories IS 'User-specific story tracking data with Dexie sync';

