import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";

// Define Data Store interfaces
interface StoredUser {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string; // URL reference
  banner: string; // hex colour
  description: string;
  status: 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';
  customStatusText?: string;
  tag: string;
  createdAt: string;
}

interface StoredMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderTag: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  attachments?: any[];
  reactions?: any[];
  replyToId?: string;
  replyTo?: any;
  isPinned?: boolean;
}

interface StoredChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  description: string;
}

interface StoredServer {
  id: string;
  name: string;
  icon: string;
  banner: string;
  ownerId: string;
  inviteCode: string;
  channels: StoredChannel[];
  members: { userId: string; role: string }[];
}

interface StoredFriendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'blocked';
  updatedAt: string;
}

interface DataBase {
  users: Record<string, StoredUser>;
  passwords: Record<string, string>;
  servers: Record<string, StoredServer>;
  messages: Record<string, StoredMessage[]>;
  friends: StoredFriendship[];
}

// Global server variables
const DATA_FILE = path.join(process.cwd(), "data_store.json");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Initialize uploads directory
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Failed to create uploads directory (expected in serverless or read-only workspaces):", err);
}

// Set up Gemini SDK
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log("Gemini AI initialized on the server.");
  } catch (err) {
    console.error("Failed to initialize Gemini AI SDK:", err);
  }
}

// Default Seed Data
const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop", // NeonBot Blue Mascot
  "https://media.giphy.com/media/26FPCXfJE9OUV8FvG/giphy.gif", // Sova Gaiming Speaking GIF (Cute fox)
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop", // Alina Static profile
  "https://media.giphy.com/media/l41Yo6X6d8fUuC7Yc/giphy.gif", // Mixa Speaking Synthwave GIF
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"  // Default default
];

const loadDb = (): DataBase => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      // Validate structure to prevent undefined errors
      if (parsed && typeof parsed === "object") {
        if (!parsed.users) parsed.users = {};
        if (!parsed.passwords) parsed.passwords = {};
        if (!parsed.servers) parsed.servers = {};
        if (!parsed.messages) parsed.messages = {};
        if (!parsed.friends) parsed.friends = [];
        return parsed as DataBase;
      }
    } catch (err) {
      console.warn("Could not parse data_store.json, creating a fresh seeded seed database database:", err);
    }
  }

  // Seed DB
  const db: DataBase = {
    users: {
      "bot-neon": {
        id: "bot-neon",
        username: "NeonBot",
        nickname: "Неон Помощник",
        email: "bot@discozon.ru",
        avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop", // Aesthetic neon geometry
        banner: "#bd00ff",
        description: "Умный ИИ-помощник от Google Gemini. Напишите мне в чате или упомяните @NeonBot!",
        status: "online",
        customStatusText: "Слушаю ваши запросы ✨",
        tag: "0001",
        createdAt: new Date().toISOString()
      },
      "user-sova": {
        id: "user-sova",
        username: "Sova",
        nickname: "Совушка Стример",
        email: "sova@discozon.ru",
        avatar: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWtsOXdndml2eTlxZmgycnFmdDV5cTZqOHF0ZXZsZGMxam9mMXoyZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPCXfJE9OUV8FvG/giphy.gif", // Cute speech active gif
        banner: "#ff3b8b",
        description: "Обожаю Валорант и роллы! Го в войс 🎮",
        status: "idle",
        customStatusText: "В катке, не отвлекать",
        tag: "1122",
        createdAt: new Date().toISOString()
      },
      "user-mixa": {
        id: "user-mixa",
        username: "Mixa",
        nickname: "Миха Реббит",
        email: "mixa@discozon.ru",
        avatar: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHoyZWV5YjhhdzUxaWZ4eWRtcTZoY2hwb29xbWhzMHg5ZzB6dTN5MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41Yo6X6d8fUuC7Yc/giphy.gif", // Cool pixel synthwave bunny speaking
        banner: "#1af3ff",
        description: "Пишу ретровейв треки на аналоговых синтезаторах. Оцени мои треки в #музыка",
        status: "dnd",
        customStatusText: "Свожу альбом 🎹🎧",
        tag: "9021",
        createdAt: new Date().toISOString()
      },
      "user-alina": {
        id: "user-alina",
        username: "Alina",
        nickname: "Алина Модератор",
        email: "alina@discozon.ru",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
        banner: "#ffb400",
        description: "Модератор DISCOZON Lounge. Обращайтесь с любыми вопросами по платформе! Рада гостям.",
        status: "online",
        customStatusText: "Помогаю новичкам 🛡️",
        tag: "5544",
        createdAt: new Date().toISOString()
      }
    },
    passwords: {
      "bot-neon": "bot-nopass-123",
      "user-sova": "123456",
      "user-mixa": "123456",
      "user-alina": "123456"
    },
    servers: {
      "server-lounge": {
        id: "server-lounge",
        name: "DISCOZON Гостиная",
        icon: "💬",
        banner: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=300&fit=crop",
        ownerId: "system",
        inviteCode: "LOUNGE",
        channels: [
          { id: "chan-general", name: "общий-чат", type: "text", description: "Главный текстовый канал для общения обо всем!" },
          { id: "chan-announces", name: "анонсы", type: "announcement", description: "Новости и важные обновления платформы DISCOZON." },
          { id: "chan-music", name: "музыка-и-арты", type: "text", description: "Делитесь своими любимыми треками, артами и GIF-ками!" },
          { id: "chan-voice-lounge", name: "Кают-компания", type: "voice", description: "Общий голосовой канал. Заходите поболтать с друзьями!" },
          { id: "chan-voice-gaming", name: "Игровая комната 🎮", type: "voice", description: "Комната для обсуждения катков и игр." }
        ],
        members: [
          { userId: "bot-neon", role: "moderator" },
          { userId: "user-sova", role: "member" },
          { userId: "user-mixa", role: "member" },
          { userId: "user-alina", role: "moderator" }
        ]
      }
    },
    messages: {
      "chan-general": [
        {
          id: "m1",
          channelId: "chan-general",
          senderId: "user-alina",
          senderName: "Алина Модератор",
          senderAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
          senderTag: "5544",
          content: "Добро пожаловать в **DISCOZON**! 🎉 Это первый этап супер-платформы для голосового и текстового общения на русском языке. Все синхронизируется в реальном времени!",
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: "m2",
          channelId: "chan-general",
          senderId: "user-sova",
          senderName: "Совушка Стример",
          senderAvatar: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWtsOXdndml2eTlxZmgycnFmdDV5cTZqOHF0ZXZsZGMxam9mMXoyZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPCXfJE9OUV8FvG/giphy.gif",
          senderTag: "1122",
          content: "Ааааа! Всем приветики в этом чатике! 🦉 Рада всех слышать. Кто пойдет в голосовой со мной? Я залетаю в канал **Кают-компания** через 5 минут!",
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      "chan-music": [
        {
          id: "m_mus1",
          channelId: "chan-music",
          senderId: "user-mixa",
          senderName: "Миха Реббит",
          senderAvatar: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHoyZWV5YjhhdzUxaWZ4eWRtcTZoY2hwb29xbWhzMHg5ZzB6dTN5MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41Yo6X6d8fUuC7Yc/giphy.gif",
          senderTag: "9021",
          content: "Зацените превью трека, который я набросал вчера перед сном! Эстетика Neon 80-x во всем блеске ✨🎧",
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        }
      ]
    },
    friends: [
      { id: "f1", requesterId: "user-sova", receiverId: "user-alina", status: "accepted", updatedAt: new Date().toISOString() },
      { id: "f2", requesterId: "user-mixa", receiverId: "user-sova", status: "accepted", updatedAt: new Date().toISOString() }
    ]
  };

  saveDb(db);
  return db;
};

const saveDb = (db: DataBase) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("[DATABASE SAVE ERROR] Could not save data to data_store.json:", error);
    // Keep running in memory gracefully so registrations/actions still work
  }
};

// Local db inst
const database = loadDb();

// Active voice connections with metadata
// Key is UserID, Value is voice states
const voiceStates: Record<string, {
  userId: string;
  channelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}> = {};

// Initialize mock voice connection states
voiceStates["user-sova"] = { userId: "user-sova", channelId: null, isMuted: false, isDeafened: false, isSpeaking: false, isCameraOn: false, isScreenSharing: false };
voiceStates["user-mixa"] = { userId: "user-mixa", channelId: null, isMuted: false, isDeafened: false, isSpeaking: false, isCameraOn: false, isScreenSharing: false };
voiceStates["bot-neon"] = { userId: "bot-neon", channelId: null, isMuted: true, isDeafened: true, isSpeaking: false, isCameraOn: false, isScreenSharing: false };

// Express and HTTP setup
const app = express();
app.use(express.json({ limit: '20mb' }));

// Serve static compiled app files inside dist
const distPath = path.join(process.cwd(), "dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOAD_DIR));

// Simple log function
const log = (...args: any[]) => {
  console.log(`[DISCOZON Server]`, ...args);
};

// ==========================================
// REST API FOR DISCOZON PLATFORM
// ==========================================

// Authentication route: Register
app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Все поля (имя, почта, пароль) обязательны к заполнению" });
  }

  const emailLower = email.toLowerCase();
  const userExists = Object.values(database.users).some(u => u.email.toLowerCase() === emailLower || u.username.toLowerCase() === username.toLowerCase());

  if (userExists) {
    return res.status(400).json({ error: "Пользователь с таким именем или почтой уже существует" });
  }

  const randomId = "user-" + Math.random().toString(36).substring(2, 11);
  const tag = Math.floor(1000 + Math.random() * 9000).toString();

  const newUser: StoredUser = {
    id: randomId,
    username,
    nickname: username,
    email: emailLower,
    avatar: "", // defaults to beautiful standard custom avatar wrapper client-side
    banner: "#" + Math.floor(Math.random() * 16777215).toString(16),
    description: "Всем привет, я новый участник DISCOZON!",
    status: "online",
    tag,
    createdAt: new Date().toISOString()
  };

  database.users[randomId] = newUser;
  database.passwords[randomId] = password;
  saveDb(database);

  log(`Registered new user: ${username}#${tag}`);
  res.status(200).json({ user: newUser, token: `mock-jwt-token-for-${randomId}` });
});

// Authentication route: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Необходимо заполнить почту и пароль" });
  }

  const emailLower = email.toLowerCase();
  const user = Object.values(database.users).find(u => u.email.toLowerCase() === emailLower);

  if (!user || database.passwords[user.id] !== password) {
    return res.status(401).json({ error: "Неверный e-mail или пароль" });
  }

  log(`User logged in: ${user.username}#${user.tag}`);
  res.status(200).json({ user, token: `mock-jwt-token-for-${user.id}` });
});

// Get currently logged-in user profile
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }

  const userId = authHeader.replace("Bearer mock-jwt-token-for-", "");
  const user = database.users[userId];

  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  res.status(200).json({ user });
});

// Update personal user profile details
app.post("/api/auth/update", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Пользователь не авторизован" });
  }

  const userId = authHeader.replace("Bearer mock-jwt-token-for-", "");
  const user = database.users[userId];

  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const { nickname, description, avatar, banner, status, customStatusText } = req.body;

  if (nickname !== undefined) user.nickname = nickname;
  if (description !== undefined) user.description = description;
  if (avatar !== undefined) user.avatar = avatar;
  if (banner !== undefined) user.banner = banner;
  if (status !== undefined) user.status = status;
  if (customStatusText !== undefined) user.customStatusText = customStatusText;

  saveDb(database);
  log(`Updated user profile: ${user.username}#${user.tag}`);

  // Broadcast presence updates to connected users
  broadcast({
    type: "PRESENCE_CHANGE",
    payload: { userId, status: user.status, user }
  });

  res.status(200).json({ user });
});

// Users List
app.get("/api/users", (req, res) => {
  res.status(200).json({ users: Object.values(database.users) });
});

// Servers listing/invite
app.get("/api/servers", (req, res) => {
  res.status(200).json({ servers: Object.values(database.servers) });
});

// Create new Discord server
app.post("/api/servers", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  const userId = authHeader.replace("Bearer mock-jwt-token-for-", "");
  const { name, icon } = req.body;

  if (!name || !icon) {
    return res.status(400).json({ error: "Название сервера и иконка обязательны к заполнению" });
  }

  const serverId = "server-" + Math.random().toString(36).substring(2, 11);
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newServer: StoredServer = {
    id: serverId,
    name,
    icon,
    banner: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&h=300&fit=crop",
    ownerId: userId,
    inviteCode,
    channels: [
      { id: `chan-text-${serverId}`, name: "основной-чат", type: "text", description: "Текстовое общение участников сервера." },
      { id: `chan-voice-${serverId}`, name: "Голосовой канал 🔊", type: "voice", description: "Заходи пообщаться по микрофону!" }
    ],
    members: [
      { userId, role: "owner" },
      { userId: "bot-neon", role: "moderator" } // Auto invite AI helper
    ]
  };

  database.servers[serverId] = newServer;
  saveDb(database);

  log(`Created server: ${name} (invite: ${inviteCode}) by user ${userId}`);
  res.status(200).json({ server: newServer });
});

// Join server via Invite Code
app.post("/api/servers/join", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  const userId = authHeader.replace("Bearer mock-jwt-token-for-", "");
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: "Введите инвайт-код" });
  }

  const cleanCode = inviteCode.trim().toUpperCase();
  const server = Object.values(database.servers).find(s => s.inviteCode.toUpperCase() === cleanCode);

  if (!server) {
    return res.status(404).json({ error: "Код приглашения недействителен" });
  }

  const alreadyMember = server.members.some(m => m.userId === userId);
  if (alreadyMember) {
    return res.status(200).json({ server, message: "Вы уже являетесь участником этого сервера" });
  }

  server.members.push({ userId, role: "member" });
  saveDb(database);

  log(`User ${userId} joined server: ${server.name} via invite code`);
  res.status(200).json({ server });
});

// Create Server Channel
app.post("/api/servers/:serverId/channels", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  const { serverId } = req.params;
  const { name, type, description } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Название и тип канала обязательны" });
  }

  const server = database.servers[serverId];
  if (!server) {
    return res.status(404).json({ error: "Сервер не найден" });
  }

  const chanId = "chan-" + Math.random().toString(36).substring(2, 11);
  const newChan: StoredChannel = {
    id: chanId,
    name: name.toLowerCase().replace(/\s+/g, '-'),
    type,
    description: description || ""
  };

  server.channels.push(newChan);
  saveDb(database);

  log(`Created channel: ${newChan.name} (${type}) on server ${server.name}`);
  res.status(200).json({ channel: newChan, server });
});

// Get messages for a channel
app.get("/api/channels/:channelId/messages", (req, res) => {
  const { channelId } = req.params;
  const list = database.messages[channelId] || [];
  res.status(200).json({ messages: list });
});

// Fallback post message for offline/WS blocked environments
app.post("/api/channels/:channelId/messages/fallback", (req, res) => {
  const { channelId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message payload" });

  const savedMsg: StoredMessage = {
    id: message.id || "m-" + Math.random().toString(36).substring(2, 11),
    channelId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    senderTag: message.senderTag,
    content: message.content,
    attachments: message.attachments || [],
    replyToId: message.replyToId,
    replyTo: message.replyTo,
    createdAt: new Date().toISOString()
  };

  if (!database.messages[channelId]) {
    database.messages[channelId] = [];
  }
  
  // check for duplicate
  if (!database.messages[channelId].some(m => m.id === savedMsg.id)) {
    database.messages[channelId].push(savedMsg);
    saveDb(database);
  }

  // Also simulate bot-neon triggers if mentioned!
  if (savedMsg.content && savedMsg.senderId !== "bot-neon") {
    const mentionMatch = savedMsg.content.includes("@NeonBot") || savedMsg.content.toLowerCase().includes("neonbot") || savedMsg.content.toLowerCase().includes("неон");
    if (mentionMatch) {
      handleGeminiAssistantTrigger(channelId, savedMsg.content, savedMsg.senderName).catch(console.error);
    }
  }

  res.status(200).json({ status: "success", message: savedMsg });
});

// Friend System Routing
app.get("/api/friends", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  const userId = authHeader.replace("Bearer mock-jwt-token-for-", "");
  const userRelations = database.friends.filter(f => f.requesterId === userId || f.receiverId === userId);

  res.status(200).json({ relations: userRelations });
});

// Send Friend Request
app.post("/api/friends/request", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  const userId = authHeader.replace("Bearer mock-jwt-token-for-", "");
  const { friendKeyword } = req.body; // could be username, username#tag, or friend code (user.id)

  if (!friendKeyword) {
    return res.status(400).json({ error: "Укажите имя друга, тег или уникальный код друга" });
  }

  const keywordClean = friendKeyword.trim().toLowerCase();

  // Find user by either direct Friend Code (ID) OR username#tag
  const foundUser = Object.values(database.users).find(u => {
    // 1. Direct ID / Friend Code match
    const isIdMatch = u.id.toLowerCase() === keywordClean;

    // 2. Name and tag parts match
    let nameMatch = false;
    let tagMatch = true;

    if (friendKeyword.includes("#")) {
      const parts = friendKeyword.split("#");
      const namePart = parts[0].trim().toLowerCase();
      const tagPart = parts[1].trim();
      nameMatch = u.username.toLowerCase() === namePart || u.nickname.toLowerCase() === namePart;
      tagMatch = u.tag === tagPart;
    } else {
      nameMatch = u.username.toLowerCase() === keywordClean || u.nickname.toLowerCase() === keywordClean;
    }

    const isMatch = isIdMatch || (nameMatch && tagMatch);
    return isMatch && u.id !== userId;
  });

  if (!foundUser) {
    return res.status(404).json({ error: "Пользователь не найден или вы указали себя" });
  }

  // Check friendship existence
  const existing = database.friends.find(f =>
    (f.requesterId === userId && f.receiverId === foundUser.id) ||
    (f.requesterId === foundUser.id && f.receiverId === userId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: "Вы уже друзья с этим пользователем" });
    }
    return res.status(200).json({ relation: existing, message: "Запрос дружбы уже отправлен или ожидает вашего ответа" });
  }

  const newRelation: StoredFriendship = {
    id: "f-" + Math.random().toString(36).substring(2, 11),
    requesterId: userId,
    receiverId: foundUser.id,
    status: 'pending',
    updatedAt: new Date().toISOString()
  };

  database.friends.push(newRelation);
  saveDb(database);

  log(`Friend request sent: ${userId} -> ${foundUser.id}`);
  res.status(200).json({ relation: newRelation, targetUser: foundUser });
});

// Action on friend request (accept, decline, block)
app.post("/api/friends/:relationId/action", (req, res) => {
  const { relationId } = req.params;
  const { action } = req.body; // 'accept' | 'decline' | 'block'

  const index = database.friends.findIndex(f => f.id === relationId);
  if (index === -1) {
    return res.status(404).json({ error: "Запрос не найден" });
  }

  const relation = database.friends[index];

  if (action === 'accept') {
    relation.status = 'accepted';
    relation.updatedAt = new Date().toISOString();
  } else if (action === 'decline') {
    database.friends.splice(index, 1);
  } else if (action === 'block') {
    relation.status = 'blocked';
    relation.updatedAt = new Date().toISOString();
  }

  saveDb(database);
  res.status(200).json({ status: "success", relation });
});

// Base64 file upload support
app.post("/api/upload", (req, res) => {
  const { fileName, fileType, fileData } = req.body;
  if (!fileName || !fileData || !fileType) {
    return res.status(400).json({ error: "Необходимы имя файла, тип и данные в base64" });
  }

  try {
    const base64Data = fileData.replace(/^data:.*,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create random prefix to handle duplicates safely
    const uniqueName = Date.now() + "_" + fileName.replace(/\s+/g, "_");
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    
    fs.writeFileSync(filePath, buffer);
    const downloadUrl = `/uploads/${uniqueName}`;

    res.status(200).json({
      url: downloadUrl,
      name: fileName,
      type: fileType,
      size: buffer.length
    });
  } catch (err: any) {
    res.status(400).json({ error: "Ошибка сохранения файла: " + err.message });
  }
});

// ==========================================
// CREATING THE COMBINED HTTP + WEBSOCKET SERVER
// ==========================================

const server = http.createServer(app);
let wss: any;

if (process.env.VERCEL) {
  wss = {
    on: () => {},
    clients: new Set(),
  };
} else {
  wss = new WebSocketServer({ server });
}

// Active ws connections mapped by User ID
const activeConnections: Record<string, WebSocket> = {};

// Helper to broadcast WS event to all connected users
function broadcast(event: { type: string; payload: any }) {
  const str = JSON.stringify(event);
  Object.values(activeConnections).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

// System trigger Gemini chat reply if user mentions NeonBot in general
async function handleGeminiAssistantTrigger(channelId: string, messageText: string, userNickname: string) {
  if (!ai) return;

  const mentionMatch = messageText.includes("@NeonBot") || messageText.toLowerCase().includes("neonbot") || messageText.toLowerCase().includes("неон");
  if (!mentionMatch) return;

  // Clean the prompt
  const cleanPrompt = messageText
    .replace("@NeonBot", "")
    .replace("neonbot", "")
    .replace("НеонБот", "")
    .trim();

  // Create typing status
  broadcast({
    type: "VOICE_SPEAKING",
    payload: { userId: "bot-neon", channelId: null, isSpeaking: true }
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Тебя зовут НеонБот. Ты - встроенный умный помощник в платформе DISCOZON (Discord-like web platform).
      Пользователь по имени "${userNickname}" обратился к тебе в чате с запросом: "${cleanPrompt}".
      Дай краткий, увлекательный и полезный ответ на РУССКОМ языке. Будь вежлив, дружелюбен, используй markdown форматирование, списки, жирный шрифт и эмодзи. Ответь в духе Discord-бота.`,
    });

    const replyContent = response.text || "Извините, не смог обработать ваш запрос. Пожалуйста, попробуйте еще раз!";

    // Create bot reply structure
    const replyMessage: StoredMessage = {
      id: "m-gemini-" + Math.random().toString(36).substring(2, 11),
      channelId,
      senderId: "bot-neon",
      senderName: "NeonBot",
      senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop",
      senderTag: "0001",
      content: replyContent,
      createdAt: new Date().toISOString()
    };

    if (!database.messages[channelId]) {
      database.messages[channelId] = [];
    }
    database.messages[channelId].push(replyMessage);
    saveDb(database);

    // Broadcast the new message over WebSockets
    broadcast({
      type: "MESSAGE_SEND",
      payload: { channelId, message: replyMessage }
    });

  } catch (err: any) {
    console.error("Gemini Assistant error:", err);
    // Send small error fallback message to user
    const errorMsg: StoredMessage = {
      id: "m-gemini-err-" + Math.random().toString(36).substring(2, 11),
      channelId,
      senderId: "bot-neon",
      senderName: "NeonBot",
      senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop",
      senderTag: "0001",
      content: `⚠️ Не удалось связаться с ядром ИИ Google Gemini. Проверьте правильность вашего API ключа в настройках AI Studio! Но я все равно желаю вам классного общения на DISCOZON!`,
      createdAt: new Date().toISOString()
    };
    if (!database.messages[channelId]) database.messages[channelId] = [];
    database.messages[channelId].push(errorMsg);
    saveDb(database);
    broadcast({
      type: "MESSAGE_SEND",
      payload: { channelId, message: errorMsg }
    });
  } finally {
    // Stop typing status info
    broadcast({
      type: "VOICE_SPEAKING",
      payload: { userId: "bot-neon", channelId: null, isSpeaking: false }
    });
  }
}

// WebSocket processing logic
wss.on("connection", (ws) => {
  let authenticatedUserId: string | null = null;

  log("New WebSocket connection established.");

  ws.on("message", async (rawMessage) => {
    try {
      const event = JSON.parse(rawMessage.toString());
      const { type, payload } = event;

      switch (type) {
        case "AUTH_JOIN": {
          const { userId } = payload;
          if (userId && database.users[userId]) {
            authenticatedUserId = userId;
            activeConnections[userId] = ws;
            log(`WS authenticated: ${database.users[userId].username}`);

            // Send success confirmation
            ws.send(JSON.stringify({
              type: "AUTH_SUCCESS",
              payload: { userId, voiceStates }
            }));

            // Sync presence
            const user = database.users[userId];
            user.status = "online";
            saveDb(database);
            broadcast({
              type: "PRESENCE_CHANGE",
              payload: { userId, status: "online", user }
            });
          }
          break;
        }

        case "PRESENCE_CHANGE": {
          const { userId, status } = payload;
          if (userId && database.users[userId]) {
            database.users[userId].status = status;
            saveDb(database);
            broadcast({
              type: "PRESENCE_CHANGE",
              payload: { userId, status, user: database.users[userId] }
            });
          }
          break;
        }

        case "MESSAGE_SEND": {
          const { channelId, message } = payload;
          if (!channelId || !message) return;

          const savedMsg: StoredMessage = {
            id: message.id || "m-" + Math.random().toString(36).substring(2, 11),
            channelId,
            senderId: message.senderId,
            senderName: message.senderName,
            senderAvatar: message.senderAvatar,
            senderTag: message.senderTag,
            content: message.content,
            attachments: message.attachments || [],
            replyToId: message.replyToId,
            replyTo: message.replyTo,
            createdAt: new Date().toISOString()
          };

          if (!database.messages[channelId]) {
            database.messages[channelId] = [];
          }
          database.messages[channelId].push(savedMsg);
          saveDb(database);

          // Broadcast to connected users
          broadcast({
            type: "MESSAGE_SEND",
            payload: { channelId, message: savedMsg }
          });

          // Intercept mentioning chatbot NeonBot
          if (savedMsg.content && savedMsg.senderId !== "bot-neon") {
            // Lazy load AI Response
            handleGeminiAssistantTrigger(channelId, savedMsg.content, savedMsg.senderName);
          }
          break;
        }

        case "MESSAGE_EDIT": {
          const { channelId, messageId, content } = payload;
          if (!database.messages[channelId]) return;

          const msg = database.messages[channelId].find(m => m.id === messageId);
          if (msg) {
            msg.content = content;
            msg.editedAt = new Date().toISOString();
            saveDb(database);
            broadcast({
              type: "MESSAGE_EDIT",
              payload: { channelId, messageId, content, editedAt: msg.editedAt }
            });
          }
          break;
        }

        case "MESSAGE_DELETE": {
          const { channelId, messageId } = payload;
          if (!database.messages[channelId]) return;

          const index = database.messages[channelId].findIndex(m => m.id === messageId);
          if (index !== -1) {
            database.messages[channelId].splice(index, 1);
            saveDb(database);
            broadcast({
              type: "MESSAGE_DELETE",
              payload: { channelId, messageId }
            });
          }
          break;
        }

        case "MESSAGE_REACTION": {
          const { channelId, messageId, emoji, userId } = payload;
          if (!database.messages[channelId]) return;

          const msg = database.messages[channelId].find(m => m.id === messageId);
          if (msg) {
            if (!msg.reactions) msg.reactions = [];
            const rIndex = msg.reactions.findIndex(r => r.emoji === emoji);

            if (rIndex === -1) {
              msg.reactions.push({ emoji, users: [userId] });
            } else {
              const uIndex = msg.reactions[rIndex].users.indexOf(userId);
              if (uIndex === -1) {
                msg.reactions[rIndex].users.push(userId);
              } else {
                // toggle remove if already reacted
                msg.reactions[rIndex].users.splice(uIndex, 1);
                if (msg.reactions[rIndex].users.length === 0) {
                  msg.reactions.splice(rIndex, 1);
                }
              }
            }

            saveDb(database);
            broadcast({
              type: "MESSAGE_REACTION",
              payload: { channelId, messageId, reactions: msg.reactions }
            });
          }
          break;
        }

        case "VOICE_JOIN": {
          const { userId, channelId } = payload;
          if (!userId) return;

          voiceStates[userId] = {
            userId,
            channelId,
            isMuted: payload.isMuted || false,
            isDeafened: payload.isDeafened || false,
            isSpeaking: false,
            isCameraOn: payload.isCameraOn || false,
            isScreenSharing: payload.isScreenSharing || false
          };

          broadcast({
            type: "VOICE_JOIN",
            payload: { userId, channelId, voiceState: voiceStates[userId] }
          });

          // Simulate active community interactions:
          // If a user joins "chan-voice-lounge" (Кают-компания), let's make mock user Sova or Mixa run a cute automated voice activity inside that channel!
          if (channelId === "chan-voice-lounge") {
            setTimeout(() => {
              if (voiceStates["user-sova"]) {
                voiceStates["user-sova"].channelId = "chan-voice-lounge";
                broadcast({
                  type: "VOICE_JOIN",
                  payload: { userId: "user-sova", channelId: "chan-voice-lounge", voiceState: voiceStates["user-sova"] }
                });
                simulateVoiceSpeech("user-sova");
              }
            }, 3000);
          }
          break;
        }

        case "VOICE_LEAVE": {
          const { userId } = payload;
          if (!userId || !voiceStates[userId]) return;

          const prevChannel = voiceStates[userId].channelId;
          voiceStates[userId].channelId = null;
          voiceStates[userId].isSpeaking = false;

          broadcast({
            type: "VOICE_LEAVE",
            payload: { userId, channelId: prevChannel }
          });

          // If user leaves Кают-компания, let Sova leave as well after a small cooldown
          if (prevChannel === "chan-voice-lounge") {
            setTimeout(() => {
              if (voiceStates["user-sova"] && voiceStates["user-sova"].channelId === "chan-voice-lounge") {
                voiceStates["user-sova"].channelId = null;
                voiceStates["user-sova"].isSpeaking = false;
                broadcast({
                  type: "VOICE_LEAVE",
                  payload: { userId: "user-sova", channelId: "chan-voice-lounge" }
                });
              }
            }, 2000);
          }
          break;
        }

        case "VOICE_STATE": {
          const { userId, isMuted, isDeafened, isCameraOn, isScreenSharing } = payload;
          if (userId && voiceStates[userId]) {
            if (isMuted !== undefined) voiceStates[userId].isMuted = isMuted;
            if (isDeafened !== undefined) voiceStates[userId].isDeafened = isDeafened;
            if (isCameraOn !== undefined) voiceStates[userId].isCameraOn = isCameraOn;
            if (isScreenSharing !== undefined) voiceStates[userId].isScreenSharing = isScreenSharing;

            broadcast({
              type: "VOICE_STATE",
              payload: { userId, voiceState: voiceStates[userId] }
            });
          }
          break;
        }

        case "VOICE_SPEAKING": {
          const { userId, isSpeaking } = payload;
          if (userId && voiceStates[userId]) {
            voiceStates[userId].isSpeaking = isSpeaking;
            broadcast({
              type: "VOICE_SPEAKING",
              payload: { userId, isSpeaking, channelId: voiceStates[userId].channelId }
            });
          }
          break;
        }

        // WebRTC SDP Signalling
        case "SIGNAL": {
          const { targetId, senderId, signal } = payload;
          const targetWs = activeConnections[targetId];
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: "SIGNAL",
              payload: { senderId, signal }
            }));
          }
          break;
        }
      }
    } catch (err) {
      console.error("WebSocket message parsing error:", err);
    }
  });

  ws.on("close", () => {
    if (authenticatedUserId) {
      log(`WS disconnected client: ${authenticatedUserId}`);
      delete activeConnections[authenticatedUserId];

      if (database.users[authenticatedUserId]) {
        database.users[authenticatedUserId].status = "offline";
        saveDb(database);
        broadcast({
          type: "PRESENCE_CHANGE",
          payload: { userId: authenticatedUserId, status: "offline", user: database.users[authenticatedUserId] }
        });
      }

      // Handle voice disconnects
      if (voiceStates[authenticatedUserId]) {
        const prevChan = voiceStates[authenticatedUserId].channelId;
        voiceStates[authenticatedUserId].channelId = null;
        voiceStates[authenticatedUserId].isSpeaking = false;
        if (prevChan) {
          broadcast({
            type: "VOICE_LEAVE",
            payload: { userId: authenticatedUserId, channelId: prevChan }
          });
        }
      }
    }
  });
});

// Helper simulation function: Makes mock user speak periodically to trigger client speech visual states (Stage 8 active speak avatar)
function simulateVoiceSpeech(userId: string) {
  const userState = voiceStates[userId];
  if (!userState || !userState.channelId) return;

  // Toggle speaking
  const startSpeaking = !userState.isSpeaking;
  userState.isSpeaking = startSpeaking;

  broadcast({
    type: "VOICE_SPEAKING",
    payload: { userId, isSpeaking: startSpeaking, channelId: userState.channelId }
  });

  // Schedule next speech toggle
  const nextDelay = startSpeaking ? 4000 : 2000;
  setTimeout(() => simulateVoiceSpeech(userId), nextDelay);
}

// Periodic presence random shift to make environment feel alive!
setInterval(() => {
  const mockKeys = ["user-mixa", "user-alina"];
  const randomKey = mockKeys[Math.floor(Math.random() * mockKeys.length)];
  const randomStatusList: ('online' | 'idle' | 'dnd')[] = ["online", "idle", "dnd"];
  const newStatus = randomStatusList[Math.floor(Math.random() * randomStatusList.length)];
  
  if (database.users[randomKey]) {
    database.users[randomKey].status = newStatus;
    broadcast({
      type: "PRESENCE_CHANGE",
      payload: { userId: randomKey, status: newStatus, user: database.users[randomKey] }
    });
  }
}, 45000);

// ==========================================
// DEVSERVER INTEGRATION WITH VITE
// ==========================================

async function startServer() {
  if (process.env.VERCEL) {
    log("Serverless Vercel environment detected. Bypassing HTTP port listener.");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    log("Mounting Vite developer middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets or fallback index.html for SPA router
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`-----------------------------------------------`);
    log(`DISCOZON listening on http://localhost:${PORT}`);
    log(`-----------------------------------------------`);
  });
}

startServer();

export default app;
