-- ================================================================
-- SYNAPSE LITE — MIGRATION 001: All Feature Enhancements
-- Phases 1-10: Files, Search, Notifications, Polls, Pins, Bookmarks, Presence
-- ================================================================

-- ── Phase 1: Files Enhancement ─────────────────────────────────────
ALTER TABLE public.files ALTER COLUMN storage SET DEFAULT 'supabase';
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_storage_check;
ALTER TABLE public.files ADD CONSTRAINT files_storage_check 
  CHECK (storage IN ('appwrite','cloudinary','supabase'));
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS dm_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- ── Phase 2: Full-Text Search GIN Indexes ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_content_fts 
  ON public.messages USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_tasks_title_fts 
  ON public.tasks USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_channels_name_fts 
  ON public.channels USING GIN (to_tsvector('english', name));

-- ── Phase 3: Push Subscriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription  JSONB       NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions: user manages own"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Phase 7: Presence columns ──────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_text TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_emoji TEXT DEFAULT '';

-- ── Phase 10: Poll Votes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index  INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_message ON public.poll_votes(message_id);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_votes: workspace members manage"
  ON public.poll_votes FOR ALL TO authenticated
  USING (
    message_id IN (
      SELECT id FROM public.messages WHERE channel_id IN (
        SELECT id FROM public.channels WHERE workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- ── Phase 10: Channel Pins ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channel_pins (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id    UUID        NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id    UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  pinned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_pins_channel ON public.channel_pins(channel_id);
ALTER TABLE public.channel_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_pins: workspace members can view"
  ON public.channel_pins FOR SELECT TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "channel_pins: members can manage"
  ON public.channel_pins FOR ALL TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- ── Phase 10: Bookmarks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id    UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id, created_at DESC);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks: user manages own"
  ON public.bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Realtime for new tables ────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_pins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;

SELECT 'Migration 001 applied successfully!' AS result;
