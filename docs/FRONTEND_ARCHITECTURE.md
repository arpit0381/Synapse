# Frontend Architecture Documentation

## Overview

The Synapse Lite frontend is a modern React application built with Next.js 15, providing a comprehensive team collaboration interface with real-time messaging, video calling, task management, and AI assistance.

## Technology Stack

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety throughout

### State Management
- **Zustand**: Lightweight state management with persistence
- **TanStack React Query**: Server state management and caching
- **React Context**: Theme and call providers

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Accessible component library
- **Radix UI**: Headless UI primitives
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Consistent iconography

### Real-time Features
- **Socket.io-client**: Real-time bidirectional communication
- **PeerJS**: WebRTC peer-to-peer connections
- **WebRTC**: Native browser video/audio calling

### Additional Libraries
- **@dnd-kit**: Drag and drop functionality
- **date-fns**: Date manipulation and formatting
- **Zod**: Runtime type validation
- **Sonner**: Toast notifications
- **React Hot Toast**: Additional notification system

## Architecture Components

### 1. Application Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (app)/              # Protected application routes
│   ├── (auth)/             # Authentication routes
│   ├── globals.css         # Global styles and Tailwind
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Landing/home page
├── components/             # Reusable UI components
│   ├── layout/             # Layout components (Sidebar, TopBar)
│   ├── modals/             # Modal dialogs
│   ├── providers/          # Context providers
│   └── ui/                 # Base UI components
├── lib/                    # Utilities and configurations
├── store/                  # Zustand state management
└── styles/                 # Additional styling files
```

### 2. Route Structure

#### Public Routes
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Registration page

#### Protected Routes (`(app)`)
- `/dashboard` - Main dashboard with activity overview
- `/channels/[id]` - Channel chat interface
- `/dm/[id]` - Direct message interface
- `/tasks` - Task management board
- `/ai-assistant` - AI chat interface
- `/settings/*` - User and workspace settings

### 3. Component Architecture

#### Layout Components
- **Sidebar**: Navigation with workspaces, channels, and DMs
- **TopBar**: User controls, search, and workspace switcher
- **CallBanner**: Active call indicator and controls
- **CallScreen**: Full-screen video call interface

#### UI Components
- **MessageList**: Scrollable message display with virtualization
- **MessageInput**: Rich text input with mentions and commands
- **ChannelList**: Hierarchical channel display
- **TaskBoard**: Kanban-style task management
- **UserPresence**: Online status indicators

#### Modal Components
- **CreateChannelModal**: Channel creation dialog
- **WorkspaceSwitcherModal**: Workspace selection
- **CallModal**: Incoming call notification
- **SettingsModal**: User preferences

### 4. State Management

#### Zustand Store (`appStore.ts`)

**Authentication State:**
- `user`: Current user profile
- `token`: JWT access token
- `isAuthenticated`: Authentication status

**Workspace State:**
- `currentWorkspace`: Active workspace
- `workspaces`: Available workspaces

**Channel State:**
- `channels`: Workspace channels
- `activeChannelId`: Currently selected channel

**UI State:**
- `sidebarOpen`: Sidebar visibility
- `rightPanelOpen`: Right panel toggle
- `activeThread`: Active message thread

**Real-time State:**
- `onlineUserIds`: Currently online users
- `unreadNotifications`: Notification count

#### React Query Cache

**Query Keys:**
- `workspaces` - User workspaces
- `channels` - Workspace channels
- `messages` - Channel messages
- `dms` - Direct message conversations
- `tasks` - Workspace tasks

**Mutation Keys:**
- `send-message` - Message sending
- `create-task` - Task creation
- `update-task` - Task updates

### 5. Provider System

#### AppProviders (`AppProviders.tsx`)
Root provider wrapping the entire application:
- **QueryClientProvider**: React Query context
- **ThemeProvider**: Dark/light theme management
- **CallProvider**: Video call state management
- **Toaster**: Global notification system

#### AppInitializer (`AppInitializer.tsx`)
Application bootstrap component handling:
- **Session Recovery**: Supabase auth session restoration
- **Workspace Loading**: Fetch and set initial workspaces
- **Channel Loading**: Load channels for current workspace
- **Socket Connection**: Establish WebSocket connection
- **Presence Setup**: Online status management

### 6. Real-time Communication

#### Socket.io Integration
- **Connection Management**: Automatic reconnection
- **Room Joining**: Workspace and channel room subscriptions
- **Event Handlers**: Real-time message and presence updates
- **Presence Tracking**: Online/offline user status

#### WebRTC Calling (`CallProvider.tsx`)
- **Peer Management**: Peer-to-peer connection handling
- **Media Streams**: Audio/video capture and streaming
- **Call Rooms**: Multi-user call coordination
- **Signaling**: WebRTC offer/answer/ICE candidate exchange

### 7. Component Patterns

#### Custom Hooks
- `useAuth()`: Authentication state access
- `useWorkspace()`: Workspace context
- `useChannels()`: Channel management
- `useMessages()`: Message operations
- `useSocket()`: Socket.io connection

#### Higher-Order Components
- **withAuth**: Route protection wrapper
- **withWorkspace**: Workspace context requirement
- **withSocket**: Socket connection requirement

#### Render Props
- **MessageRenderer**: Custom message display logic
- **ChannelRenderer**: Custom channel list items
- **TaskRenderer**: Custom task card rendering

### 8. Styling System

#### Design Tokens
- **Colors**: Semantic color variables (primary, secondary, destructive)
- **Typography**: Font families and sizing scale
- **Spacing**: Consistent spacing scale (4px increments)
- **Shadows**: Elevation and depth system
- **Border Radius**: Consistent corner rounding

#### Theme System
- **Light/Dark Mode**: CSS custom properties
- **System Preference**: Automatic theme detection
- **Manual Override**: User theme selection
- **Theme Persistence**: Local storage saving

#### Component Styling
- **Tailwind Classes**: Utility-first approach
- **CSS Modules**: Scoped component styles
- **CSS-in-JS**: Dynamic styling with CSS variables
- **Responsive Design**: Mobile-first breakpoints

### 9. Performance Optimizations

#### Code Splitting
- **Route-based Splitting**: Automatic Next.js code splitting
- **Component Lazy Loading**: Dynamic imports for heavy components
- **Vendor Chunking**: Separate vendor bundle

#### Rendering Optimizations
- **React.memo**: Component memoization
- **useMemo/useCallback**: Expensive computation caching
- **Virtual Scrolling**: Large list virtualization
- **Image Optimization**: Next.js Image component

#### State Optimizations
- **Selective Re-renders**: Targeted state updates
- **Query Invalidation**: Efficient cache invalidation
- **Optimistic Updates**: Immediate UI feedback
- **Background Sync**: Non-blocking data synchronization

### 10. Error Handling

#### Error Boundaries
- **Global Error Boundary**: Application-level error catching
- **Component Error Boundaries**: Feature-level error isolation
- **Async Error Handling**: Promise rejection handling

#### User Feedback
- **Loading States**: Skeleton screens and spinners
- **Error Messages**: User-friendly error display
- **Retry Mechanisms**: Failed operation recovery
- **Offline Support**: Network failure handling

### 11. Testing Strategy

#### Unit Tests
- **Component Testing**: Individual component behavior
- **Hook Testing**: Custom hook logic verification
- **Utility Testing**: Helper function validation

#### Integration Tests
- **API Integration**: Backend communication testing
- **Socket Testing**: Real-time feature verification
- **Form Testing**: User input validation

#### E2E Tests
- **User Journeys**: Complete workflow testing
- **Cross-browser**: Browser compatibility verification
- **Performance**: Loading and interaction speed

### 12. Accessibility (A11y)

#### Standards Compliance
- **WCAG 2.1**: Web Content Accessibility Guidelines
- **Semantic HTML**: Proper element usage
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility

#### Component Features
- **Focus Management**: Proper focus indicators
- **Screen Reader**: Descriptive text and labels
- **Color Contrast**: Sufficient color ratios
- **Motion Preferences**: Respects user motion preferences

## Key Features Implementation

### 1. Real-time Messaging

**Components:**
- **MessageList**: Virtualized message display
- **MessageInput**: Rich text input with features
- **TypingIndicator**: Real-time typing feedback
- **MessageReactions**: Emoji reaction system

**Features:**
- **Instant Delivery**: WebSocket-based message delivery
- **Message Threading**: Nested conversation support
- **File Attachments**: Image and document sharing
- **Message Search**: Full-text message searching

### 2. Video Calling System

**Components:**
- **CallModal**: Incoming call handling
- **CallScreen**: Full-screen video interface
- **CallControls**: Mute, video, screen share controls
- **ParticipantGrid**: Multi-user video layout

**Features:**
- **Peer-to-Peer**: Direct WebRTC connections
- **Screen Sharing**: Desktop and application sharing
- **Call Recording**: Session recording capability
- **Background Effects**: Blur and virtual backgrounds

### 3. Task Management

**Components:**
- **TaskBoard**: Kanban board interface
- **TaskCard**: Individual task display
- **TaskModal**: Task creation and editing
- **TaskFilters**: Advanced filtering and search

**Features:**
- **Drag & Drop**: Intuitive task movement
- **Subtasks**: Hierarchical task breakdown
- **Due Dates**: Deadline tracking and reminders
- **Team Assignment**: Multi-user task assignment

### 4. AI Assistant Integration

**Components:**
- **AIChat**: Conversational AI interface
- **AISuggestions**: Context-aware suggestions
- **AIDraft**: Message and content generation
- **AISummary**: Conversation summarization

**Features:**
- **Natural Language**: Conversational AI interactions
- **Context Awareness**: Workspace and channel context
- **Action Execution**: Direct message sending via AI
- **Code Generation**: Programming assistance

### 5. User Experience

**Components:**
- **WorkspaceSwitcher**: Multi-workspace navigation
- **UserProfile**: Profile management interface
- **NotificationCenter**: Centralized notifications
- **SearchInterface**: Global search functionality

**Features:**
- **Responsive Design**: Mobile and desktop optimization
- **Keyboard Shortcuts**: Power user shortcuts
- **Dark Mode**: Theme customization
- **Offline Support**: Graceful degradation

## Development Workflow

### Code Organization
- **Feature-based Structure**: Components grouped by feature
- **Shared Components**: Reusable UI elements
- **Custom Hooks**: Business logic extraction
- **Type Definitions**: Centralized TypeScript types

### Development Tools
- **Hot Reload**: Fast development iteration
- **Type Checking**: Real-time TypeScript validation
- **ESLint/Prettier**: Code quality and formatting
- **Storybook**: Component development and testing

### Build Process
- **Next.js Build**: Optimized production builds
- **Static Analysis**: Bundle size analysis
- **Image Optimization**: Automatic image processing
- **CSS Optimization**: Tailwind purging and minification

## Deployment and Distribution

### Build Configuration
- **Environment Variables**: Configuration management
- **Asset Optimization**: Image and font optimization
- **Bundle Splitting**: Code splitting strategy
- **Caching Strategy**: Aggressive caching headers

### Performance Monitoring
- **Core Web Vitals**: Performance metric tracking
- **Error Tracking**: Real-time error monitoring
- **User Analytics**: Usage pattern analysis
- **Performance Budgets**: Size and speed limits

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Progressive Enhancement**: Graceful feature degradation
- **Polyfills**: Legacy browser compatibility
- **Mobile Browsers**: iOS Safari, Chrome Mobile

## Future Enhancements

### Planned Features
- **Advanced Search**: Full-text search with filters
- **Message Threads**: Nested conversation UI
- **File Management**: Cloud storage integration
- **Calendar Integration**: Meeting scheduling
- **Mobile App**: React Native implementation
- **Desktop App**: Electron-based desktop client

### Performance Improvements
- **Service Worker**: Offline functionality
- **PWA Features**: Installable web app
- **Lazy Loading**: Component and route lazy loading
- **Image Optimization**: Advanced image processing
- **Bundle Optimization**: Tree shaking and compression

### User Experience
- **Advanced Themes**: Custom theme builder
- **Accessibility**: Enhanced screen reader support
- **Internationalization**: Multi-language support
- **Keyboard Shortcuts**: Comprehensive shortcut system
- **Gesture Support**: Touch and gesture interactions

---
*Frontend documentation generated on: 2026-05-02*