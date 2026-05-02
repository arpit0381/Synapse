# Synapse Lite Project Overview

## Introduction

Synapse Lite is a real-time collaborative communication platform built with modern web technologies. It combines team messaging, video/audio calls, task management, and AI assistance in a single unified interface.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.14 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Real-time Communication**: Socket.io-client
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **Internationalization**: date-fns
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JSON Web Tokens (JWT)
- **AI Integration**: Groq SDK
- **Security**: Helmet.js, CORS, rate limiting
- **Environment**: dotenv for configuration

## Core Features

### 1. Real-time Messaging
- Instant message delivery via WebSocket
- Channel-based communication (public/private)
- Direct messaging (DM)
- Message reactions
- Typing indicators
- Read receipts
- Message editing/deletion
- File attachments (via Supabase storage)

### 2. Video/Audio Calling
- Peer-to-peer WebRTC connections
- Group video calls
- Screen sharing
- Mute/unmute controls
- Video on/off toggling
- Call recording (planned)
- Background blur/virtual backgrounds (planned)

### 3. Workspace & Channel Management
- Multi-workspace support
- Channel creation and organization
- Member roles and permissions
- Channel topics and descriptions
- Pinned messages
- Message threading (planned)

### 4. Task Management
- Kanban board interface
- Task creation, assignment, and tracking
- Due dates and priorities
- Task comments and attachments
- Progress tracking
- Integration with channels

### 5. AI Assistant
- Natural language processing
- Context-aware suggestions
- Automated task creation
- Message summarization
- Code generation assistance
- Meeting notes transcription (planned)

### 6. User Experience
- Responsive design for desktop and mobile
- Dark/light theme support
- Keyboard shortcuts
- Customizable notifications
- Presence indicators (online/offline/away)
- Search functionality across messages and files

## Architecture Overview

### Frontend Architecture
```
frontend/
├── app/                    # Next.js app router
│   ├── (app)/              # Main application routes (protected)
│   ├── (auth)/             # Authentication routes
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/             # Reusable UI components
│   ├── layout/             # Layout components (sidebar, topbar, etc.)
│   ├── modals/             # Modal dialogs
│   ├── providers/          # Context providers
│   └── ui/                 # Basic UI components
├── lib/                    # Utility functions and helpers
├── store/                  # Zustand state management
└── styles/                 # Global CSS and theme definitions
```

### Backend Architecture
```
backend/
├── src/
│   ├── index.ts            # Application entry point
│   ├── lib/                # Shared libraries (Supabase client)
│   ├── routes/             # API route handlers
│   │   ├── auth.ts         # Authentication endpoints
│   │   ├── workspace.ts    # Workspace management
│   │   ├── channels.ts     # Channel operations
│   │   ├── messages.ts     # Message handling
│   │   ├── tasks.ts        # Task management
│   │   ├── dm.ts           # Direct messaging
│   │   └── ai.ts           # AI assistant endpoints
│   └── setup-database.ts   # Database initialization
└── supabase/               # Supabase migration files
```

### Real-time Communication
The application uses Socket.io for bidirectional real-time communication:
- **Namespaces**: Different event types are organized logically
- **Rooms**: Users join workspace/channel-specific rooms for targeted broadcasting
- **Events**: Custom events for messages, calls, typing, presence, etc.
- **Scalability**: Designed for horizontal scaling with Redis adapter (planned)

## Database Schema (Supabase)

### Core Tables
- `users`: User profiles and authentication data
- `workspaces`: Team/organization containers
- `workspace_members`: Many-to-many relationship between users and workspaces
- `channels`: Communication channels within workspaces
- `messages`: Chat messages with threaded support
- `direct_messages`: One-to-one private conversations
- `tasks`: Work items and assignments
- `task_columns`: Kanban board columns
- `calls`: Call session metadata
- `call_participants`: Users in active calls

### Relationships
- Users can belong to multiple workspaces
- Workspaces contain many channels and members
- Channels belong to one workspace
- Messages belong to channels or direct message conversations
- Tasks belong to workspaces and can be assigned to users
- Calls are associated with channels or workspaces

## Security Considerations

### Authentication
- JWT-based authentication with refresh tokens
- Password hashing using bcrypt
- Session management with expiration
- OAuth2 integration planned (Google, GitHub)

### Authorization
- Role-based access control (RBAC)
- Workspace-level permissions (admin, member, guest)
- Channel-specific permissions
- Resource ownership validation

### Data Protection
- HTTPS enforcement
- CORS policies restricting origins
- Helmet.js security headers
- Input validation and sanitization
- Rate limiting on API endpoints
- File upload validation and virus scanning (planned)

## Deployment

### Development
- Backend: `npm run dev` (nodemon + ts-node)
- Frontend: `npm run dev` (Next.js development server)
- Environment variables loaded from `.env` files

### Production
- Backend: Built with `npm run build` and served via `npm run start`
- Frontend: Built with `npm run build` and served via `npm run start`
- Reverse proxy recommended (NGINX)
- SSL termination at load balancer
- Database backups configured in Supabase

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

### Workspace Endpoints
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `GET /api/workspaces/:id/members` - List workspace members
- `POST /api/workspaces/:id/members` - Add member to workspace

### Channel Endpoints
- `GET /api/channels` - List channels in workspace
- `POST /api/channels` - Create new channel
- `GET /api/channels/:id` - Get channel details
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel
- `GET /api/channels/:id/messages` - Get channel messages

### Message Endpoints
- `POST /api/messages` - Send new message
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add reaction to message
- `DELETE /api/messages/:id/reactions/:emoji` - Remove reaction

### Task Endpoints
- `GET /api/tasks` - List tasks (with filtering)
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/assignees` - Assign user to task
- `DELETE /api/tasks/:id/assignees/:userId` - Unassign user from task

### Direct Message Endpoints
- `GET /api/dm` - List DM conversations
- `POST /api/dm` - Start new DM conversation
- `GET /api/dm/:conversationId/messages` - Get DM messages
- `POST /api/dm/:conversationId/messages` - Send DM message

### AI Endpoints
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/summarize` - Summarize conversation
- `POST /api/ai/generate-tasks` - Generate tasks from discussion
- `POST /api/ai/improve-message` - Improve message clarity

### Socket.io Events
#### Client to Server
- `join_workspace` - Join workspace room
- `join_channel` - Join channel room
- `join_dm` - Join DM conversation room
- `send_message` - Send new message
- `typing_start` / `typing_stop` - Typing indicators
- `add_reaction` - Add message reaction
- `send_dm` - Send direct message
- `dm_typing_start` / `dm_typing_stop` - DM typing indicators
- `dm_reading_start` / `dm_reading_stop` - DM read receipts
- `call-user` - Initiate call
- `accept-call` / `reject-call` - Call response
- `offer` / `answer` / `ice-candidate` - WebRTC signaling
- `join-call` - Join call room
- `leave-call` - Leave call room
- `call-mute-update` - Mute state change
- `call-speaking` - Speaking detection

#### Server to Client
- `user_online` / `user_offline` - Presence updates
- `online_users` - List of online users in workspace
- `new_message` - New message received
- `user_typing` / `user_stopped_typing` - Typing indicators
- `reaction_added` - Message reaction added
- `new_dm` - New direct message received
- `incoming-call` - Incoming call notification
- `accept-call` / `reject-call` - Call response
- `offer` / `answer` / `ice-candidate` - WebRTC signaling
- `user-joined-call` / `user-left-call` - Call participant updates
- `call-room-users` - List of users in call room
- `call-participants-update` - Call participant count/names update
- `call-started` - Call has started
- `call-ended` - Call has ended
- `call-mute-update` - Remote user mute state change
- `call-speaking` - Remote user speaking detection

## Development Guidelines

### Code Style
- Follow ESLint and Prettier configurations
- Use TypeScript strict mode
- Functional components with hooks
- Consistent naming conventions (camelCase for variables, PascalCase for components)
- Export defaults for components, named exports for utilities

### Component Organization
- Presentational vs container components separation
- Reusable components in `/components/ui`
- Feature-specific components in relevant directories
- Atomic design principles where applicable

### State Management
- Global state (auth, user preferences) in Zustand
- Server state (data fetching) in React Query
- Local UI state in React hooks (useState, useReducer)
- Avoid prop lifting when possible; use context or state management

### Performance Optimization
- Code splitting with dynamic imports
- Memoization with useMemo and useCallback
- Virtual lists for large datasets (react-window planned)
- Image optimization with Next.js Image
- Prefetching for navigation
- Bundle analysis and optimization

### Testing Strategy
- Unit tests for utilities and helpers
- Integration tests for components
- End-to-end tests for critical user flows
- Mock external services (Supabase, Socket.io) in tests
- Test coverage goals: 80%+ for critical paths

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Message threading
- [ ] File attachments and previews
- [ ] Advanced search with filters
- [ ] Message pinning
- [ ] Custom emoji reactions
- [ ] Do Not Disturb mode
- [ ] Message scheduling

### Phase 2 (Near-term)
- [ ] Video call recording
- [ ] Screen sharing annotation
- [ ] Breakout rooms in calls
- [ ] Polls and surveys
- [ ] Scheduled meetings
- [ ] Calendar integration
- [ ] Read receipts for DMs

### Phase 3 (Long-term)
- [ ] Workspace analytics dashboard
- [ ] Advanced AI features (meeting summaries, action items)
- [ ] Custom workflow automations
- [ ] Third-party integrations (Slack, Teams, GitHub)
- [ ] On-premise deployment option
- [ ] Mobile applications (React Native)
- [ ] Administrative controls and compliance features

## Contributing

### Setting Up Development Environment
1. Clone the repository
2. Install dependencies:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` in both backend and frontend
   - Configure Supabase credentials
   - Set up Groq API key for AI features
4. Initialize database:
   ```bash
   cd backend
   npm run setup-db
   ```
5. Start development servers:
   ```bash
   # Backend (terminal 1)
   npm run dev
   
   # Frontend (terminal 2)
   npm run dev
   ```

### Making Changes
1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request with descriptive title and description

### Reporting Issues
- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- Specify expected vs actual behavior
- Add screenshots or screen recordings when applicable
- Label issues appropriately (bug, enhancement, question, etc.)

## License

Synapse Lite is licensed under the MIT License. See the LICENSE file for details.

## Contact

For questions or support, please open an issue in the GitHub repository or contact the development team directly.

---
*Documentation generated on: 2026-05-02*