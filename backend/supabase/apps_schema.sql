-- ================================================================
-- SYNAPSE LITE — APPS HUB SCHEMA (DOCS & SHEETS)
-- File: backend/supabase/apps_schema.sql
-- ================================================================

-- 1. DOCUMENTS TABLE
-- Store rich text document metadata and content
CREATE TABLE IF NOT EXISTS public.documents (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT 'Untitled Document',
  content       JSONB       DEFAULT '{}', -- TipTap JSON or Yjs state
  created_by    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public     BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DOCUMENT VERSIONS
-- Snapshot history for documents
CREATE TABLE IF NOT EXISTS public.document_versions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content       JSONB       NOT NULL,
  created_by    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SHEETS TABLE (Workbook)
-- Spreadsheet metadata
CREATE TABLE IF NOT EXISTS public.sheets (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT 'Untitled Spreadsheet',
  settings      JSONB       DEFAULT '{}', -- Grid config, frozen rows, etc.
  created_by    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3a. SHEET TABS TABLE
-- Individual tabs within a spreadsheet workbook
CREATE TABLE IF NOT EXISTS public.sheet_tabs (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id      UUID        NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT 'Sheet1',
  index         INTEGER     NOT NULL DEFAULT 0,
  color         TEXT        DEFAULT NULL,
  hidden        BOOLEAN     DEFAULT FALSE,
  grid_props    JSONB       DEFAULT '{"frozenRows": 0, "frozenCols": 0}',
  created_by    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SHEET CELLS TABLE
-- Granular cell-level data for real-time syncing
CREATE TABLE IF NOT EXISTS public.sheet_cells (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tab_id        UUID        NOT NULL REFERENCES public.sheet_tabs(id) ON DELETE CASCADE,
  row_index     INTEGER     NOT NULL,
  col_index     INTEGER     NOT NULL,
  value         TEXT        DEFAULT '',
  formula       TEXT        DEFAULT '',
  format        JSONB       DEFAULT '{}',
  updated_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tab_id, row_index, col_index)
);

-- 5. APPS COLLABORATORS
-- Fine-grained permissions (Editor, Viewer, Commenter)
CREATE TABLE IF NOT EXISTS public.apps_collaborators (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT        NOT NULL CHECK (entity_type IN ('document', 'sheet', 'task')),
  entity_id     UUID        NOT NULL,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer', 'commenter')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, user_id)
);

-- 6. APPS EMBEDS
-- Track where apps are embedded in chat messages
CREATE TABLE IF NOT EXISTS public.apps_embeds (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  entity_type   TEXT        NOT NULL CHECK (entity_type IN ('document', 'sheet', 'task')),
  entity_id     UUID        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_tabs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_cells        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps_embeds        ENABLE ROW LEVEL SECURITY;

-- Basic policy: workspace members can see docs/sheets in their workspace
CREATE POLICY "documents: workspace members can view"
  ON public.documents FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "documents: workspace members can insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "documents: workspace members can update"
  ON public.documents FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sheets: workspace members can view"
  ON public.sheets FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sheets: workspace members can insert"
  ON public.sheets FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sheets: workspace members can update"
  ON public.sheets FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "sheet_tabs: workspace members can manage"
  ON public.sheet_tabs FOR ALL TO authenticated
  USING (sheet_id IN (SELECT id FROM public.sheets WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "sheet_cells: workspace members can manage"
  ON public.sheet_cells FOR ALL TO authenticated
  USING (tab_id IN (SELECT id FROM public.sheet_tabs WHERE sheet_id IN (SELECT id FROM public.sheets WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))));

-- ... (More detailed policies for update/delete would be added based on apps_collaborators)

-- ================================================================
-- REALTIME
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheet_tabs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheet_cells;

-- 7. TASK PROJECTS
-- Projects to group tasks (Linear-style)
CREATE TABLE IF NOT EXISTS public.task_projects (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT        DEFAULT '',
  created_by    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_sheets_updated_at BEFORE UPDATE ON public.sheets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_task_projects_updated_at BEFORE UPDATE ON public.task_projects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.task_projects ENABLE ROW LEVEL SECURITY;

-- Basic policy
CREATE POLICY "task_projects: workspace members can view"
  ON public.task_projects FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "task_projects: workspace members can insert"
  ON public.task_projects FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "task_projects: workspace members can update"
  ON public.task_projects FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_projects;
