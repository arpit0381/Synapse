-- ================================================================
-- SYNAPSE LITE — CALLING SYSTEM TABLES (PHASE 2)
-- ================================================================

-- 1. Calls History
CREATE TABLE IF NOT EXISTS public.calls (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    room_id         TEXT        NOT NULL, -- Could be channel_id or a unique DM room string
    initiator_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            TEXT        NOT NULL CHECK (type IN ('audio', 'video')),
    status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    is_group_call   BOOLEAN     DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    metadata        JSONB       DEFAULT '{}'
);

-- 2. Call Participants Tracking
CREATE TABLE IF NOT EXISTS public.call_participants (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id         UUID        NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role            TEXT        DEFAULT 'member' CHECK (role IN ('host', 'speaker', 'audience', 'member')),
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    is_muted        BOOLEAN     DEFAULT FALSE,
    is_camera_on    BOOLEAN     DEFAULT FALSE,
    UNIQUE(call_id, user_id, joined_at)
);

-- 3. Call Recordings
CREATE TABLE IF NOT EXISTS public.call_recordings (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id         UUID        NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    creator_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_url     TEXT        NOT NULL,
    duration_sec    INTEGER     DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    metadata        JSONB       DEFAULT '{}'
);

-- RLS POLICIES
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace members can see calls in their workspace
CREATE POLICY "calls: workspace members view"
ON public.calls FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Policy: Anyone authenticated can start a call (if they are in the workspace)
CREATE POLICY "calls: start call"
ON public.calls FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Policy: Participants can view participant data
CREATE POLICY "call_participants: view"
ON public.call_participants FOR SELECT TO authenticated
USING (call_id IN (SELECT id FROM public.calls));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
