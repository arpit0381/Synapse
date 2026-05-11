# Synapse Lite

Synapse Lite is a real-time collaborative workspace application built with Next.js 15, React 19, Tailwind CSS, Zustand, Socket.io, Express.js, and Supabase.

## Features
- **Real-Time Messaging**: Direct messages, channel messaging, and real-time typing indicators.
- **Presence Tracking**: Heartbeat-based online/offline status, away states, and DND.
- **Audio/Video Calls**: Integrated WebRTC via PeerJS and Socket.io signaling.
- **Workspace Management**: Multiple workspaces with robust role-based access control.
- **File Sharing**: Integrated Appwrite / Cloudinary storage.
- **AI Assistant**: Groq-powered contextual summaries and smart replies.

## Architecture
This project is divided into two main parts:
- `/frontend`: Next.js 15 (App Router) client application.
- `/backend`: Node.js/Express.js server handling Socket.io and Supabase Admin integrations.

For detailed documentation, please see the `/docs` directory.///

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (or local instance)
- Groq API Key

### Backend Setup
1. Navigate to the `backend` directory: `cd backend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your Supabase, Groq, and storage credentials.
4. Run database migrations: Found in `backend/supabase/migration_001_enhancements.sql`.
5. Start the backend development server: `npm run dev` (Runs on port 4001/4000)

### Frontend Setup
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and provide your public Supabase URL and Anon key.
4. Start the frontend development server: `npm run dev` (Runs on port 3000)

Your app should now be running at `http://localhost:3000`.

## License
MIT
