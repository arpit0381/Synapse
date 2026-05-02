# Backend Architecture Documentation

## Overview

The Synapse Lite backend is built with Node.js, Express.js, and TypeScript, providing a RESTful API and real-time WebSocket communication. It serves as the central hub for all application data and real-time features.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with custom middleware
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io with Redis adapter (planned)
- **Authentication**: JWT tokens with Supabase Auth
- **AI Integration**: Groq API (Llama models)
- **Validation**: Zod schemas
- **Security**: Helmet.js, CORS, rate limiting

## Architecture Components

### 1. Server Setup (`index.ts`)

The main server file handles:
- Express app configuration
- Socket.io initialization
- CORS setup for frontend communication
- Route mounting
- Error handling middleware
- Server startup

**Key Features:**
- **CORS**: Configured to allow frontend origins (`localhost:3000`, `localhost:3001`)
- **Socket.io**: Real-time bidirectional communication
- **Shared State**: In-memory state for online users and active calls
- **Health Check**: `/health` endpoint for monitoring

### 2. Authentication System

**Endpoints:**
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Logout

**Features:**
- Supabase Auth integration
- JWT token management
- Automatic profile creation on signup
- Password hashing handled by Supabase

### 3. Workspace Management (`workspace.ts`)

**Endpoints:**
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `POST /api/workspaces/join` - Join workspace via invite code
- `GET /api/workspaces/:id/members` - List workspace members
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

**Features:**
- Multi-workspace support per user
- Role-based permissions (owner, admin, member, guest)
- Invite code system for workspace joining
- Automatic general channel creation

### 4. Channel Management (`channels.ts`)

**Endpoints:**
- `GET /api/channels` - List channels in workspace
- `POST /api/channels` - Create channel
- `GET /api/channels/:id` - Get channel details
- `GET /api/channels/:id/members` - List channel members
- `DELETE /api/channels/:id` - Delete channel

**Features:**
- Public and private channels
- Channel member management for private channels
- Automatic creator membership for private channels
- Workspace context validation

### 5. Messaging System (`messages.ts`)

**Endpoints:**
- `GET /api/messages` - Get channel messages with pagination
- `POST /api/messages` - Send message
- `GET /api/messages/:id/thread` - Get message thread
- `PATCH /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Toggle reaction
- `PATCH /api/messages/:id/pin` - Pin/unpin message

**Features:**
- Threaded conversations
- Message reactions (emoji)
- Pinned messages
- Message editing/deletion
- Real-time broadcasting via Socket.io

### 6. Direct Messages (`dm.ts`)

**Endpoints:**
- `GET /api/dm` - Get DM conversation with user
- `POST /api/dm` - Send direct message
- `GET /api/dm/conversations` - List DM conversations
- `PATCH /api/dm/:id/read` - Mark message as read
- `POST /api/dm/:id/reactions` - Toggle DM reaction

**Features:**
- One-on-one private messaging
- Conversation history with pagination
- Read receipts
- Message reactions
- Notification system integration

### 7. Task Management (`tasks.ts`)

**Endpoints:**
- `GET /api/tasks` - List tasks with filtering
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/subtasks` - Add subtask
- `PATCH /api/tasks/:id/subtasks/:sid` - Update subtask

**Features:**
- Kanban board workflow (backlog → in_progress → in_review → done)
- Task assignment and due dates
- Subtask management
- Priority levels and tags
- Workspace context validation

### 8. AI Assistant (`ai.ts`)

**Endpoints:**
- `POST /api/ai/chat` - General AI chat
- `POST /api/ai/summarize` - Summarize conversation
- `POST /api/ai/draft` - Generate message drafts
- `POST /api/ai/code` - Generate code snippets
- `GET /api/ai/models` - List available AI models

**Features:**
- Groq API integration with Llama models
- Context-aware responses using workspace data
- Special DM sending capability via JSON commands
- Multiple AI utilities (summarize, draft, code generation)
- Dynamic context injection from current user session

## Real-time Communication (Socket.io)

### Connection Management
- Persistent WebSocket connections
- Room-based message routing
- Automatic reconnection handling
- Connection state tracking

### Event Types

#### Client → Server Events
- `join_workspace` - Join workspace room for presence
- `join_channel` - Join channel room for messages
- `join_dm` - Join DM room for private messages
- `send_message` - Send new message to channel
- `send_dm` - Send direct message
- `typing_start/typing_stop` - Typing indicators
- `add_reaction` - Add message reaction
- `call-user` - Initiate call
- `accept-call/reject-call` - Call response
- `offer/answer/ice-candidate` - WebRTC signaling
- `join-call/leave-call` - Call room management
- `call-mute-update` - Mute state change
- `call-speaking` - Speaking detection

#### Server → Client Events
- `user_online/user_offline` - Presence updates
- `online_users` - List of online users
- `new_message` - New channel message
- `new_dm` - New direct message
- `user_typing/user_stopped_typing` - Typing indicators
- `reaction_added` - Message reaction added
- `incoming-call` - Incoming call notification
- `call-started/call-ended` - Call lifecycle events
- `call-participants-update` - Call participant changes
- `call-mute-update` - Remote mute state change
- `call-speaking` - Remote speaking detection

### Room Structure
- `workspace:{workspaceId}` - Workspace-wide events
- `channel:{channelId}` - Channel-specific messages
- `user:{userId}` - User-specific events (DMs, calls)
- `call:{roomId}` - Call room for WebRTC signaling

## Database Schema

### Core Tables
- `profiles` - Extended user data
- `workspaces` - Team containers
- `workspace_members` - User-workspace relationships
- `channels` - Communication channels
- `channel_members` - Private channel memberships
- `messages` - Channel messages with threading
- `message_reactions` - Emoji reactions
- `direct_messages` - Private conversations
- `tasks` - Kanban tasks
- `subtasks` - Task checklist items
- `task_comments` - Task discussion threads
- `files` - File metadata
- `notifications` - In-app notifications
- `focus_sessions` - Pomodoro timer history

### Security Features
- **Row Level Security (RLS)**: All tables protected
- **Authentication Required**: All endpoints require valid JWT
- **Workspace Isolation**: Users only see their workspace data
- **Channel Permissions**: Private channel access control
- **Resource Ownership**: Users can only modify their own content

### Performance Optimizations
- **Indexes**: Optimized for common query patterns
- **Real-time Enabled**: Key tables publish to Supabase Realtime
- **Connection Pooling**: Efficient database connections
- **Caching**: Query result caching where appropriate

## API Design Principles

### RESTful Conventions
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- Consistent resource naming
- Proper status codes (200, 201, 400, 401, 404, 500)
- JSON responses with consistent structure

### Validation
- **Zod Schemas**: Type-safe request validation
- **Error Handling**: Detailed error responses with validation errors
- **Type Safety**: Full TypeScript coverage

### Error Handling
- **Global Error Handler**: Centralized error processing
- **Structured Errors**: Consistent error response format
- **Logging**: Comprehensive error logging for debugging

## Environment Configuration

### Required Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `GROQ_API_KEY` - Groq API key for AI features
- `FRONTEND_URL` - Frontend application URL
- `PORT` - Server port (default: 4000)

### Development vs Production
- **Development**: Auto-confirm email, relaxed CORS
- **Production**: Strict CORS, full authentication flow

## Deployment Considerations

### Scalability
- **Stateless Design**: No server-side sessions
- **Database Scaling**: Supabase handles horizontal scaling
- **WebSocket Scaling**: Redis adapter planned for multiple servers

### Monitoring
- **Health Checks**: `/health` endpoint for load balancers
- **Error Tracking**: Comprehensive logging
- **Performance Metrics**: Response time monitoring

### Security
- **HTTPS Enforcement**: SSL termination recommended
- **API Rate Limiting**: Implemented via middleware
- **Input Sanitization**: All inputs validated and sanitized
- **CORS Protection**: Origin validation
- **Helmet.js**: Security headers

## Development Workflow

### Code Organization
- **Routes**: Feature-based route files
- **Middleware**: Reusable middleware functions
- **Lib**: Shared utilities and configurations
- **Types**: TypeScript type definitions

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Real-time Tests**: Socket.io event testing
- **Database Tests**: Schema and migration testing

### Maintenance
- **Database Migrations**: Version-controlled schema changes
- **API Versioning**: URL-based versioning strategy
- **Deprecation Policy**: Gradual feature deprecation
- **Documentation**: Auto-generated API docs from code

## Future Enhancements

### Planned Features
- **Redis Adapter**: Multi-server WebSocket support
- **Rate Limiting**: Advanced rate limiting per user/workspace
- **Audit Logs**: User action tracking
- **API Analytics**: Usage metrics and reporting
- **Webhook Support**: External service integrations
- **File Upload**: Direct file upload to Supabase Storage
- **Advanced Search**: Full-text search across messages
- **Message History**: Message versioning and editing history

### Performance Improvements
- **Caching Layer**: Redis for frequently accessed data
- **Database Optimization**: Query optimization and indexing
- **CDN Integration**: Static asset delivery
- **Compression**: Response compression
- **Pagination**: Cursor-based pagination for large datasets

### Security Enhancements
- **OAuth Integration**: Third-party authentication providers
- **MFA Support**: Multi-factor authentication
- **API Keys**: Service account authentication
- **Audit Trails**: Security event logging
- **Data Encryption**: Sensitive data encryption at rest

---
*Backend documentation generated on: 2026-05-02*