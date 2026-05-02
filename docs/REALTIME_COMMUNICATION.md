# Real-time Communication (Socket.io) Documentation

## Overview

Synapse Lite uses Socket.io for real-time bidirectional communication between clients and server. This enables instant messaging, presence updates, video calling, and live collaboration features.

## Architecture

### Connection Management

#### Server Setup (`index.ts`)
```typescript
const io = new SocketServer(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"], credentials: true },
  pingTimeout: 60000,    // 60 seconds
  pingInterval: 25000,   // 25 seconds
});
```

#### Client Connection (`AppInitializer.tsx`)
```typescript
const socket = connectSocket(token || "");
socketRef.current = socket;
```

### Room Structure

Socket.io uses rooms to organize connections and enable targeted broadcasting:

#### Workspace Rooms
- `workspace:{workspaceId}` - All users in a workspace
- Used for: Presence updates, workspace-wide announcements

#### Channel Rooms
- `channel:{channelId}` - Users viewing a specific channel
- Used for: Message broadcasting, typing indicators

#### User Rooms
- `user:{userId}` - Individual user connections
- Used for: Direct messages, personal notifications, call signaling

#### Call Rooms
- `call:{roomId}` - Participants in a voice/video call
- Used for: WebRTC signaling, call control messages

## Event Types

### Connection Events

#### Client → Server
```typescript
socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

#### Server → Client
- `connect` - Successful connection established
- `disconnect` - Connection lost
- `reconnect` - Automatic reconnection
- `reconnect_error` - Reconnection failed

### Presence Events

#### Client → Server
```typescript
socket.emit("join_workspace", {
  workspaceId: "ws-123",
  userId: "user-456"
});
```

#### Server → Client
```typescript
// User presence updates
socket.on("user_online", ({ userId }) => {
  updateUserPresence(userId, true);
});

socket.on("user_offline", ({ userId }) => {
  updateUserPresence(userId, false);
});

socket.on("online_users", ({ users }) => {
  setOnlineUsers(users);
});
```

### Messaging Events

#### Channel Messages
```typescript
// Send message
socket.emit("send_message", {
  id: "msg-123",
  channelId: "chan-456",
  userId: "user-789",
  userName: "John Doe",
  content: "Hello world!",
  timestamp: new Date().toISOString()
});

// Receive message
socket.on("new_message", (message) => {
  addMessageToChannel(message);
});
```

#### Direct Messages
```typescript
// Send DM
socket.emit("send_dm", {
  id: "dm-123",
  toUserId: "user-456",
  fromUserId: "user-789",
  content: "Private message",
  timestamp: new Date().toISOString()
});

// Receive DM
socket.on("new_dm", (message) => {
  addDirectMessage(message);
});
```

### Typing Indicators

#### Channel Typing
```typescript
// Start typing
socket.emit("typing_start", {
  channelId: "chan-456",
  userId: "user-789",
  userName: "John Doe"
});

// Stop typing
socket.emit("typing_stop", {
  channelId: "chan-456",
  userId: "user-789"
});

// Receive typing events
socket.on("user_typing", ({ userId, userName }) => {
  showTypingIndicator(userId, userName);
});

socket.on("user_stopped_typing", ({ userId }) => {
  hideTypingIndicator(userId);
});
```

#### DM Typing
```typescript
socket.emit("dm_typing_start", {
  toUserId: "user-456",
  userId: "user-789"
});

socket.on("user_typing", ({ userId, channelId }) => {
  if (channelId.startsWith("dm_")) {
    showDMTypingIndicator(userId);
  }
});
```

### Message Reactions

```typescript
socket.emit("add_reaction", {
  messageId: "msg-123",
  channelId: "chan-456",
  emoji: "👍",
  userId: "user-789"
});

socket.on("reaction_added", ({ messageId, emoji, userId }) => {
  addReactionToMessage(messageId, emoji, userId);
});
```

### Video Calling Events

#### Call Initiation
```typescript
socket.emit("call-user", {
  userToCall: "user-456",
  fromUserId: "user-789",
  fromUserName: "John Doe",
  type: "video",
  isGroupCall: false,
  callRoomId: "chan-123",
  channelName: "general"
});
```

#### Call Response
```typescript
socket.on("incoming-call", ({
  fromUserId,
  fromUserName,
  type,
  isGroupCall,
  callRoomId,
  channelName
}) => {
  showIncomingCallModal({
    fromUserId,
    fromUserName,
    type,
    isGroupCall,
    callRoomId,
    channelName
  });
});

socket.emit("accept-call", {
  toUserId: "user-456",
  fromUserId: "user-789",
  fromUserName: "John Doe"
});

socket.emit("reject-call", {
  toUserId: "user-456",
  fromUserId: "user-789"
});
```

#### WebRTC Signaling
```typescript
// Offer
socket.emit("offer", {
  toUserId: "user-456",
  fromUserId: "user-789",
  offer: rtcOffer
});

// Answer
socket.emit("answer", {
  toUserId: "user-456",
  fromUserId: "user-789",
  answer: rtcAnswer
});

// ICE Candidates
socket.emit("ice-candidate", {
  toUserId: "user-456",
  fromUserId: "user-789",
  candidate: iceCandidate
});

// Receive signals
socket.on("offer", ({ fromUserId, offer }) => {
  handleWebRTCOffer(fromUserId, offer);
});

socket.on("answer", ({ fromUserId, answer }) => {
  handleWebRTCAnswer(fromUserId, answer);
});

socket.on("ice-candidate", ({ fromUserId, candidate }) => {
  handleICECandidate(fromUserId, candidate);
});
```

### Call Room Management

#### Joining Calls
```typescript
socket.emit("join-call", {
  roomId: "chan-123",
  userId: "user-789",
  userName: "John Doe",
  channelName: "general",
  workspaceId: "ws-456"
});

socket.on("call-room-users", ({ roomId, users }) => {
  updateCallParticipants(roomId, users);
});

socket.on("user-joined-call", ({ userId, userName }) => {
  addCallParticipant(userId, userName);
});

socket.on("user-left-call", ({ userId }) => {
  removeCallParticipant(userId);
});
```

#### Call Control
```typescript
// Mute/unmute
socket.emit("call-mute-update", {
  roomId: "chan-123",
  userId: "user-789",
  isMuted: true
});

// Speaking detection
socket.emit("call-speaking", {
  roomId: "chan-123",
  userId: "user-789",
  isSpeaking: true
});

// Receive updates
socket.on("call-mute-update", ({ userId, isMuted }) => {
  updateParticipantMuteStatus(userId, isMuted);
});

socket.on("call-speaking", ({ userId, isSpeaking }) => {
  updateParticipantSpeakingStatus(userId, isSpeaking);
});
```

#### Call Lifecycle
```typescript
socket.on("call-started", ({
  roomId,
  channelName,
  initiatorName,
  initiatorId,
  count,
  participants
}) => {
  showCallStartedNotification({
    roomId,
    channelName,
    initiatorName,
    participants
  });
});

socket.on("call-participants-update", ({
  roomId,
  count,
  participants
}) => {
  updateCallParticipantCount(roomId, count, participants);
});

socket.on("call-ended", ({ roomId }) => {
  endCall(roomId);
});
```

### Leaving Calls
```typescript
socket.emit("leave-call", {
  roomId: "chan-123",
  userId: "user-789"
});
```

## Error Handling

### Connection Errors
```typescript
socket.on("connect_error", (error) => {
  console.error("Connection failed:", error);
  showConnectionError();
});

socket.on("reconnect_failed", () => {
  console.error("Reconnection failed");
  showReconnectFailedMessage();
});
```

### Event Errors
```typescript
socket.on("error", (error) => {
  console.error("Socket error:", error);
  handleSocketError(error);
});
```

## Security Considerations

### Authentication
- Socket connections require valid JWT tokens
- User identity validated on connection
- Room access controlled by workspace membership

### Rate Limiting
- Message sending rate limited per user
- Connection attempts rate limited
- Event broadcasting throttled

### Data Validation
- All event payloads validated with Zod schemas
- Malformed data rejected with error responses
- XSS protection through input sanitization

## Performance Optimization

### Connection Management
- Automatic reconnection with exponential backoff
- Connection pooling for multiple tabs/devices
- Heartbeat mechanism to detect dead connections

### Message Batching
- Multiple messages batched for efficient delivery
- Presence updates throttled to reduce network traffic
- Typing indicators debounced

### Scalability Features
- Room-based broadcasting reduces server load
- Redis adapter support for multi-server deployment
- Connection state synchronized across servers

## Monitoring and Debugging

### Connection Monitoring
```typescript
socket.on("ping", () => console.log("ping"));
socket.on("pong", () => console.log("pong"));

console.log("Connected:", socket.connected);
console.log("ID:", socket.id);
```

### Event Logging
```typescript
// Enable debug logging
localStorage.debug = "socket.io-client:socket";

// Log all events
socket.onAny((event, ...args) => {
  console.log(`Event: ${event}`, args);
});
```

### Network Debugging
- Browser DevTools Network tab for WebSocket traffic
- Socket.io debug logs for connection details
- Server logs for event processing

## Browser Compatibility

### Supported Browsers
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

### Fallback Strategies
- Automatic reconnection on network changes
- Graceful degradation for unsupported features
- Progressive enhancement for modern features

## Testing

### Unit Tests
```typescript
describe("Socket Events", () => {
  it("should emit message correctly", () => {
    const mockSocket = createMockSocket();
    sendMessage(mockSocket, testMessage);
    expect(mockSocket.emit).toHaveBeenCalledWith("send_message", testMessage);
  });
});
```

### Integration Tests
```typescript
describe("Real-time Messaging", () => {
  it("should receive messages in real-time", async () => {
    const client1 = createTestClient();
    const client2 = createTestClient();

    await client1.joinChannel("test-channel");
    await client2.joinChannel("test-channel");

    const message = await client1.sendMessage("Hello!");
    expect(client2).toReceiveMessage(message);
  });
});
```

### Load Testing
- Connection scaling tests
- Message throughput testing
- Memory usage monitoring
- Network latency simulation

## Future Enhancements

### Planned Features
- **Message History Sync**: Sync missed messages on reconnect
- **Offline Message Queue**: Queue messages when offline
- **Push Notifications**: Browser push for important events
- **Message Encryption**: End-to-end encryption for sensitive messages
- **File Transfer**: Real-time file sharing
- **Screen Sharing**: Real-time screen sharing controls

### Scalability Improvements
- **Redis Clustering**: Distributed Redis for large deployments
- **Message Persistence**: Persistent message queues
- **Load Balancing**: Intelligent connection distribution
- **Geographic Distribution**: Multi-region deployment support

---
*Real-time communication documentation generated on: 2026-05-02*