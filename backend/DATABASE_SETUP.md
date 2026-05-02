# Synapse Lite - Database & AI Setup Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
The `.env` file is already configured with your Supabase and Groq credentials.

### 3. Groq AI API
Your Groq API key is configured in `.env`. Available endpoints:
- `POST /api/ai/chat` - General chat with AI
- `POST /api/ai/summarize` - Summarize channel messages
- `POST /api/ai/draft` - Draft messages/replies
- `POST /api/ai/code` - Generate code snippets
- `GET /api/ai/models` - List available models

### Testing AI:
```bash
curl -X POST http://localhost:4001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! What can you help me with?"}
    ]
  }'
```

---

## 📋 Database Setup

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
The `.env` file is already configured with your Supabase credentials.

### 3. Setup Database Schema

#### Option A: Automatic Setup (Recommended)
```bash
npm run setup-db
```

#### Option B: Manual Setup via Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `fwazhxezviwaotbvdpjq`
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Open `backend/supabase/schema.sql` and copy all the SQL
6. Paste it into the SQL Editor
7. Click "Run" button

### 4. Start the Backend Server
```bash
npm run dev
```

The server will start on `http://localhost:4001`

## 📊 Database Tables

The schema includes 14 tables:
- `profiles` - User profiles linked to Supabase Auth
- `workspaces` - Team/company workspaces
- `workspace_members` - Workspace membership
- `channels` - Chat channels (#general, #engineering, etc.)
- `channel_members` - Private channel membership
- `messages` - Channel messages
- `message_reactions` - Emoji reactions
- `direct_messages` - DMs between users
- `tasks` - Kanban tasks
- `subtasks` - Task checklists
- `task_comments` - Task discussions
- `files` - File uploads metadata
- `notifications` - User notifications
- `focus_sessions` - Pomodoro timer sessions

## 🔧 Troubleshooting

### Channel Creation Issues

If you can't create channels, check:

1. **Database Schema Applied**
   ```bash
   npm run setup-db
   ```

2. **Supabase Connection**
   - Verify `.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Check Supabase dashboard: https://supabase.com/dashboard/project/fwazhxezviwaotbvdpjq

3. **User Authentication**
   - Make sure you're authenticated
   - Check that your user has a profile in the `profiles` table

4. **Workspace Membership**
   - You must be a member of the workspace to create channels
   - Check `workspace_members` table for your user ID

### Testing Channel Creation

```bash
# Test the channels endpoint
curl -X POST http://localhost:4001/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "your-workspace-id",
    "name": "test-channel",
    "description": "Test channel",
    "is_private": false,
    "created_by": "your-user-id"
  }'
```

## 📝 API Endpoints

### Channels
- `GET /api/channels?workspace_id=xxx` - List channels
- `POST /api/channels` - Create channel
- `GET /api/channels/:id` - Get channel details
- `GET /api/channels/:id/members` - Get channel members
- `DELETE /api/channels/:id` - Delete channel

### Workspaces
- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create workspace
- `POST /api/workspaces/join` - Join via invite code
- `GET /api/workspaces/:id/members` - Get workspace members

## 🔐 Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access data they're authorized to see
- Service role key bypasses RLS (backend only)

## 📚 More Information

- Supabase Dashboard: https://supabase.com/dashboard/project/fwazhxezviwaotbvdpjq
- Schema file: `backend/supabase/schema.sql`
- Backend routes: `backend/src/routes/`