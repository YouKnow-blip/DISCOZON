export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';

export interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  banner: string;
  description: string;
  status: UserStatus;
  customStatusText?: string;
  tag: string;
  createdAt: string;
}

export interface VoiceState {
  userId: string;
  channelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  avatarFrameStatic?: boolean; // if true, gif is frozen (not speaking)
  screenShareSource?: 'monitor' | 'vscode' | 'cs2' | 'chrome';
}

export interface Channel {
  id: string;
  serverId: string | null; // null for DM channels
  name: string;
  type: 'text' | 'voice' | 'announcement';
  description: string;
}

export interface ServerMember {
  userId: string;
  serverId: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  banner: string;
  ownerId: string;
  inviteCode: string;
  channels: Channel[];
  members: ServerMember[];
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  users: string[]; // List of user IDs
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderTag: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyToId?: string;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  isPinned?: boolean;
}

export interface FriendRelation {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'blocked';
  updatedAt: string;
}

export interface VoiceChannelParticipant {
  user: User;
  voiceState: VoiceState;
}

// WebSocket Event schemas
export type WsEventType =
  | 'AUTH_SUCCESS'
  | 'PRESENCE_CHANGE'
  | 'MESSAGE_SEND'
  | 'MESSAGE_DELETE'
  | 'MESSAGE_EDIT'
  | 'MESSAGE_REACTION'
  | 'VOICE_JOIN'
  | 'VOICE_LEAVE'
  | 'VOICE_STATE'
  | 'VOICE_SPEAKING'
  | 'SIGNAL'
  | 'MOCK_EVENT';

export interface WsEvent {
  type: WsEventType;
  payload: any;
}
