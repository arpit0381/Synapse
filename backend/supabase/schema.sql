-- ================================================================
-- SYNAPSE LITE — COMPLETE SUPABASE SCHEMA
-- File: backend/supabase/schema.sql
-- How to use:
--   1. Go to https://supabase.com/dashboard → your project
--   2. Click "SQL Editor" → "New Query"
--   3. Paste this entire file and click "Run"
-- ================================================================

-- Required extension (enabled by default on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ================================================================
-- UTILITY: auto-update updated_at on any row change
-- ================================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ================================================================
-- TABLE 1: profiles
-- Extended user data linked to Supabase Auth (auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT        UNIQUE,
  full_name       TEXT        NOT NULL DEFAULT '',
  avatar_url      TEXT,
  bio             TEXT        DEFAULT '',
  status          TEXT        DEFAULT 'offline'
                              CHECK (status IN ('online','away','dnd','offline')),
  status_message  TEXT        DEFAULT '',
  timezone        TEXT        DEFAULT 'UTC',
  notification_settings JSONB DEFAULT '{
    "sounds": true,
    "quiet_hours": "Never",
    "categories": {
      "mentions": { "push": true, "email": true, "in_app": true },
      "dms": { "push": true, "email": false, "in_app": true },
      "tasks": { "push": true, "email": true, "in_app": true },
      "channels": { "push": false, "email": false, "in_app": true },
      "email_digest": { "push": false, "email": true, "in_app": false }
    }
  }'::jsonb,
  appearance_settings JSONB DEFAULT '{
    "font_size": "Default",
    "density": "Comfortable"
  }'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, notification_settings, appearance_settings)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    lower(regexp_replace(split_part(NEW.email,'@',1),'[^a-z0-9]','','g')),
    '{
      "sounds": true,
      "quiet_hours": "Never",
      "categories": {
        "mentions": { "push": true, "email": true, "in_app": true },
        "dms": { "push": true, "email": false, "in_app": true },
        "tasks": { "push": true, "email": true, "in_app": true },
        "channels": { "push": false, "email": false, "in_app": true },
        "email_digest": { "push": false, "email": true, "in_app": false }
      }
    }'::jsonb,
    '{
      "font_size": "Default",
      "density": "Comfortable"
    }'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ================================================================
-- TABLE 2: workspaces
-- A workspace is like a "company" or "team" container
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE,
  logo_url     TEXT,
  owner_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invite_code  TEXT        UNIQUE DEFAULT upper(substring(md5(random()::text),1,8)),
  plan         TEXT        DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_workspaces_owner   ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_invite  ON public.workspaces(invite_code);


-- ================================================================
-- TABLE 3: workspace_members
-- Which users belong to which workspace and their role
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  role          TEXT        DEFAULT 'member' CHECK (role IN ('owner','admin','member','guest')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wm_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wm_user      ON public.workspace_members(user_id);


-- ================================================================
-- TABLE 4: channels
-- #general, #engineering, #design etc.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT        DEFAULT '',
  is_private    BOOLEAN     DEFAULT FALSE,
  created_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_channels_workspace ON public.channels(workspace_id);


-- ================================================================
-- TABLE 5: channel_members
-- Tracks who is in private channels + last read position
-- ================================================================
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id    UUID        NOT NULL REFERENCES public.channels(id)  ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  last_read_at  TIMESTAMPTZ DEFAULT NOW(),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cm_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_cm_user    ON public.channel_members(user_id);


-- ================================================================
-- TABLE 6: messages
-- All channel messages including thread replies (parent_id)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id    UUID        NOT NULL REFERENCES public.channels(id)  ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  content       TEXT        NOT NULL CHECK (char_length(content) > 0),
  content_type  TEXT        DEFAULT 'text'
                            CHECK (content_type IN ('text','image','file','system')),
  parent_id     UUID        REFERENCES public.messages(id) ON DELETE CASCADE,
  is_pinned     BOOLEAN     DEFAULT FALSE,
  is_edited     BOOLEAN     DEFAULT FALSE,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user    ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread  ON public.messages(parent_id) WHERE parent_id IS NOT NULL;


-- ================================================================
-- TABLE 7: message_reactions
-- Emoji reactions on messages (👍 🔥 ❤️ etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);


-- ================================================================
-- TABLE 8: direct_messages
-- Person-to-person DMs within a workspace
-- ================================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_user_id  UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  to_user_id    UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  content       TEXT        NOT NULL,
  is_read       BOOLEAN     DEFAULT FALSE,
  is_edited     BOOLEAN     DEFAULT FALSE,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_dms_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_dm_thread  ON public.direct_messages(workspace_id, from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread  ON public.direct_messages(to_user_id, is_read);


-- ================================================================
-- TABLE 9: tasks
-- Advanced Kanban tasks: backlog → in_progress → in_review → done
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT        DEFAULT '',
  status        TEXT        DEFAULT 'backlog'
                             CHECK (status IN ('backlog','in_progress','in_review','done','overdue')),
  priority      TEXT        DEFAULT 'medium'
                             CHECK (priority IN ('urgent','high','medium','low')),
  created_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date      DATE,
  channel_id    UUID        REFERENCES public.channels(id) ON DELETE SET NULL,
  position      INTEGER     DEFAULT 0,
  tags          TEXT[]      DEFAULT '{}',
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON public.tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due       ON public.tasks(due_date) WHERE due_date IS NOT NULL;


-- ================================================================
-- TABLE 9.1: task_assignments
-- Support for multiple assignees per task
-- ================================================================
CREATE TABLE IF NOT EXISTS public.task_assignments (
  task_id   UUID NOT NULL REFERENCES public.tasks(id)    ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ta_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_ta_user ON public.task_assignments(user_id);


-- ================================================================
-- TABLE 10: subtasks
-- Checklist items inside a task
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subtasks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  is_done     BOOLEAN     DEFAULT FALSE,
  position    INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON public.subtasks(task_id);


-- ================================================================
-- TABLE 11: task_comments
-- Discussion thread under a task card
-- ================================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id)   ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_tc_task ON public.task_comments(task_id, created_at);


-- ================================================================
-- TABLE 12: files
-- Metadata for uploads (actual file lives in Appwrite/Cloudinary)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.files (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploaded_by   UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  channel_id    UUID        REFERENCES public.channels(id)  ON DELETE SET NULL,
  message_id    UUID        REFERENCES public.messages(id)  ON DELETE SET NULL,
  name          TEXT        NOT NULL,
  size_bytes    BIGINT      DEFAULT 0,
  mime_type     TEXT        DEFAULT 'application/octet-stream',
  storage       TEXT        DEFAULT 'appwrite' CHECK (storage IN ('appwrite','cloudinary')),
  storage_id    TEXT        NOT NULL,
  url           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_workspace ON public.files(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_channel   ON public.files(channel_id);


-- ================================================================
-- TABLE 13: notifications
-- In-app + push notification records
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  workspace_id  UUID        REFERENCES public.workspaces(id)           ON DELETE CASCADE,
  type          TEXT        NOT NULL
                            CHECK (type IN (
                              'mention','dm','task_assigned',
                              'task_due','channel_invite','workspace_invite','system'
                            )),
  title         TEXT        NOT NULL,
  body          TEXT        DEFAULT '',
  link          TEXT        DEFAULT '',
  is_read       BOOLEAN     DEFAULT FALSE,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, is_read, created_at DESC);


-- ================================================================
-- TABLE 14: focus_sessions
-- Pomodoro timer history per user
-- ================================================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  workspace_id  UUID        REFERENCES public.workspaces(id)         ON DELETE SET NULL,
  goal          TEXT        DEFAULT '',
  duration_min  INTEGER     NOT NULL DEFAULT 25,
  completed     BOOLEAN     DEFAULT FALSE,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_focus_user ON public.focus_sessions(user_id, started_at DESC);


-- ================================================================
-- TABLE 15: workspace_activity
-- Audit log & activity feed for the dashboard
-- ================================================================
CREATE TABLE IF NOT EXISTS public.workspace_activity (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  action        TEXT        NOT NULL, -- e.g., 'task_created', 'member_joined', 'channel_deleted'
  entity_type   TEXT,        -- e.g., 'task', 'channel', 'member'
  entity_id     UUID,
  entity_name   TEXT,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_workspace ON public.workspace_activity(workspace_id, created_at DESC);


-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- Every table is locked down — users only see their own data
-- ================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: anyone authenticated can read"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles: owner can update"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- workspaces
CREATE POLICY "workspaces: member can view"
  ON public.workspaces FOR SELECT TO authenticated
  USING (id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "workspaces: authenticated can create"
  ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces: owner/admin can update"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- workspace_members
CREATE POLICY "workspace_members: members can view"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "workspace_members: user can join"
  ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "workspace_members: owner/admin or self can delete"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- channels
CREATE POLICY "channels: workspace members see public channels"
  ON public.channels FOR SELECT TO authenticated
  USING (
    (NOT is_private AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ))
    OR
    (is_private AND id IN (
      SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "channels: members can create"
  ON public.channels FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- channel_members
CREATE POLICY "channel_members: members can view"
  ON public.channel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "channel_members: insert own"
  ON public.channel_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- messages
CREATE POLICY "messages: channel members can read"
  ON public.messages FOR SELECT TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE
        (NOT is_private AND workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ))
        OR
        (is_private AND id IN (
          SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
        ))
    )
  );
CREATE POLICY "messages: authenticated can insert"
  ON public.messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "messages: author can update"
  ON public.messages FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "messages: author can delete"
  ON public.messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- message_reactions
CREATE POLICY "reactions: authenticated can view"
  ON public.message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions: user manages own"
  ON public.message_reactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- direct_messages
CREATE POLICY "dm: participants can read"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "dm: sender can insert"
  ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "dm: participants can update"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- tasks
CREATE POLICY "tasks: workspace members can view"
  ON public.tasks FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "tasks: members can create"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "tasks: members can update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- subtasks
CREATE POLICY "subtasks: workspace members manage"
  ON public.subtasks FOR ALL TO authenticated
  USING (task_id IN (
    SELECT id FROM public.tasks WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- task_comments
CREATE POLICY "task_comments: members can view"
  ON public.task_comments FOR SELECT TO authenticated
  USING (task_id IN (
    SELECT id FROM public.tasks WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "task_comments: author can insert"
  ON public.task_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "task_comments: author can update"
  ON public.task_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- files
CREATE POLICY "files: workspace members can view"
  ON public.files FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "files: members can upload"
  ON public.files FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "files: uploader can delete"
  ON public.files FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- notifications
CREATE POLICY "notifications: user sees own"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications: user can update (mark read)"
  ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications: service role can insert"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- focus_sessions
CREATE POLICY "focus_sessions: user manages own"
  ON public.focus_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- task_assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignments: workspace members can view"
  ON public.task_assignments FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM public.tasks WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )));
CREATE POLICY "task_assignments: owner/admin can insert/delete"
  ON public.task_assignments FOR ALL TO authenticated
  USING (task_id IN (SELECT id FROM public.tasks WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  )));

-- workspace_activity
ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_activity: members can view"
  ON public.workspace_activity FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));


-- ================================================================
-- REALTIME — enable live updates on key tables
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;


-- ================================================================
-- DONE ✅
-- ================================================================
SELECT 'Synapse Lite schema applied successfully! 14 tables ready.' AS result;
