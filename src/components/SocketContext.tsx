import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, VoiceState, Channel, Server, Message, FriendRelation } from '../types';
import { syncUserToFirestore, syncMessageToFirestore } from '../firebase';

interface SocketContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  servers: Server[];
  setServers: React.Dispatch<React.SetStateAction<Server[]>>;
  activeServerId: string | null;
  setActiveServerId: (id: string | null) => void;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  channelMessages: Message[];
  setChannelMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  voiceStates: Record<string, VoiceState>;
  myVoiceState: VoiceState | null;
  allUsers: User[];
  friends: FriendRelation[];
  loadFriends: () => Promise<void>;
  loadServers: () => Promise<void>;
  loadUsers: () => Promise<void>;
  joinVoiceChannel: (channelId: string) => void;
  leaveVoiceChannel: () => void;
  updateMyVoiceState: (updates: Partial<VoiceState>) => void;
  wsSend: (type: string, payload: any) => void;
  isConnected: boolean;
  activeDmUserId: string | null;
  setActiveDmUserId: (userId: string | null) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('disco_token'));
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelMessages, setChannelMessages] = useState<Message[]>([]);
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceState>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<FriendRelation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // Computed local voice state
  const myVoiceState = user ? voiceStates[user.id] || null : null;
  const myVoiceStateRef = useRef<VoiceState | null>(null);

  useEffect(() => {
    myVoiceStateRef.current = myVoiceState;
  }, [myVoiceState]);

  // Sync token in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('disco_token', token);
    } else {
      localStorage.removeItem('disco_token');
    }
  }, [token]);

  // Synchronise user profile details to Firestore in the background
  useEffect(() => {
    if (user) {
      syncUserToFirestore(user);
    }
  }, [user]);

  // Load all user records from REST
  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setAllUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch user list:", err);
    }
  };

  // Load friend relations from REST
  const loadFriends = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/friends", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.relations) {
        setFriends(data.relations);
      }
    } catch (err) {
      console.error("Failed to fetch friends list:", err);
    }
  };

  // Load servers from REST
  const loadServers = async () => {
    try {
      const res = await fetch("/api/servers");
      const data = await res.json();
      if (data.servers) {
        setServers(data.servers);
        
        // Auto select first server
        if (data.servers.length > 0 && !activeServerId && !activeDmUserId) {
          setActiveServerId(data.servers[0].id);
          const firstChan = data.servers[0].channels.find((c: any) => c.type === 'text');
          if (firstChan) {
            setActiveChannelId(firstChan.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch servers list:", err);
    }
  };

  // Validate session on launch
  useEffect(() => {
    const initSession = async () => {
      if (!token) return;
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          setToken(null);
        }
      } catch {
        setToken(null);
      }
    };
    initSession();
    loadUsers();
    loadServers();
  }, [token]);

  // Handle WebSocket Connection
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    // Connect WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join as authenticated user
      ws.send(JSON.stringify({
        type: "AUTH_JOIN",
        payload: { userId: user.id }
      }));
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        const { type, payload } = event;

        switch (type) {
          case "AUTH_SUCCESS":
            if (payload.voiceStates) {
              setVoiceStates(payload.voiceStates);
            }
            break;

          case "PRESENCE_CHANGE": {
            const { userId, status, user: updatedUser } = payload;
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
            if (userId === user.id) {
              setUser(updatedUser);
            }
            break;
          }

          case "MESSAGE_SEND": {
            const { channelId, message } = payload;
            setChannelMessages(prev => {
              // Ensure we don't have duplicates
              if (prev.some(m => m.id === message.id)) return prev;
              if (message.channelId === activeChannelId) {
                return [...prev, message];
              }
              return prev;
            });
            syncMessageToFirestore(channelId || 'general', message);
            break;
          }

          case "MESSAGE_EDIT": {
            const { channelId, messageId, content, editedAt } = payload;
            if (channelId === activeChannelId) {
              setChannelMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, editedAt } : m));
            }
            break;
          }

          case "MESSAGE_DELETE": {
            const { channelId, messageId } = payload;
            if (channelId === activeChannelId) {
              setChannelMessages(prev => prev.filter(m => m.id !== messageId));
            }
            break;
          }

          case "MESSAGE_REACTION": {
            const { channelId, messageId, reactions } = payload;
            if (channelId === activeChannelId) {
              setChannelMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
            }
            break;
          }

          case "VOICE_JOIN": {
            const { userId, voiceState } = payload;
            setVoiceStates(prev => ({
              ...prev,
              [userId]: voiceState
            }));
            break;
          }

          case "VOICE_LEAVE": {
            const { userId } = payload;
            setVoiceStates(prev => {
              const copy = { ...prev };
              if (copy[userId]) {
                copy[userId].channelId = null;
                copy[userId].isSpeaking = false;
              }
              return copy;
            });
            break;
          }

          case "VOICE_STATE": {
            const { userId, voiceState } = payload;
            setVoiceStates(prev => ({
              ...prev,
              [userId]: voiceState
            }));
            break;
          }

          case "VOICE_SPEAKING": {
            const { userId, isSpeaking } = payload;
            setVoiceStates(prev => {
              if (!prev[userId]) return prev;
              return {
                ...prev,
                [userId]: { ...prev[userId], isSpeaking }
              };
            });
            break;
          }
        }
      } catch (err) {
        console.error("WS event parse error:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [user]);

  // Load message log when active channel swaps
  useEffect(() => {
    if (!activeChannelId) {
      setChannelMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/channels/${activeChannelId}/messages`);
        const data = await res.json();
        if (data.messages) {
          setChannelMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to load channel messages:", err);
      }
    };
    loadMessages();
  }, [activeChannelId]);

  // Synchronise friends list and load servers initially
  useEffect(() => {
    if (token) {
      loadFriends();
      loadUsers();
    }
  }, [token]);

  // WS helper trigger with automatic optimistic message logs and fallback
  const wsSend = (type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn("WebSocket is offline. Fallback and optimistic handling active:", type);
    }

    // Always do an optimistic local state update for MESSAGE_SEND to avoid lag or offline drops
    if (type === "MESSAGE_SEND") {
      const { channelId, message } = payload;
      setChannelMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      syncMessageToFirestore(channelId || 'general', message);

      // Synchronize with server database through fallback endpoint to persist across refreshes
      fetch(`/api/channels/${channelId}/messages/fallback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      }).catch(err => console.warn("Incremental local REST synchronization fallback failed: ", err));
    }
  };

  // Helper trigger action joins voice channel with immediate local state activation
  const joinVoiceChannel = (channelId: string) => {
    if (!user) return;
    
    const initialVoiceState: VoiceState = {
      userId: user.id,
      channelId,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      isCameraOn: false,
      isScreenSharing: false
    };

    // Update voice grid locally instantly so voice connection is immediate and works offline / on block!
    setVoiceStates(prev => ({
      ...prev,
      [user.id]: initialVoiceState
    }));

    // Re-verify if connecting to "DISCOZON Кают-компания" (chan-voice-lounge). If so, auto-add simulated speaking users!
    if (channelId === "chan-voice-lounge") {
      setTimeout(() => {
        setVoiceStates(prev => ({
          ...prev,
          "user-sova": {
            userId: "user-sova",
            channelId: "chan-voice-lounge",
            isMuted: false,
            isDeafened: false,
            isSpeaking: true,
            isCameraOn: false,
            isScreenSharing: false
          },
          "user-mixa": {
            userId: "user-mixa",
            channelId: "chan-voice-lounge",
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
            isCameraOn: false,
            isScreenSharing: false
          }
        }));
      }, 1000);
    }

    wsSend("VOICE_JOIN", {
      userId: user.id,
      channelId,
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false
    });
  };

  // Helper leaves active voice channel with immediate local state deactivation
  const leaveVoiceChannel = () => {
    if (!user) return;
    
    setVoiceStates(prev => {
      const copy = { ...prev };
      if (copy[user.id]) {
        copy[user.id].channelId = null;
        copy[user.id].isSpeaking = false;
      }
      return copy;
    });

    // Clear simulated offline voice lounge participants from list too
    setTimeout(() => {
      setVoiceStates(prev => {
        const copy = { ...prev };
        if (copy["user-sova"]) {
          copy["user-sova"].channelId = null;
          copy["user-sova"].isSpeaking = false;
        }
        if (copy["user-mixa"]) {
          copy["user-mixa"].channelId = null;
          copy["user-mixa"].isSpeaking = false;
        }
        return copy;
      });
    }, 400);

    wsSend("VOICE_LEAVE", { userId: user.id });
  };

  // Toggle mic, deafen, cameras
  const updateMyVoiceState = (updates: Partial<VoiceState>) => {
    if (!user) return;
    
    // Fetch local or default
    const current = voiceStates[user.id] || {
      userId: user.id,
      channelId: null,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      isCameraOn: false,
      isScreenSharing: false
    };

    const nextState = { ...current, ...updates };

    // Update locally instantly
    setVoiceStates(prev => ({
      ...prev,
      [user.id]: nextState
    }));

    wsSend("VOICE_STATE", {
      userId: user.id,
      ...nextState
    });
  };

  // Microphone and smart simulation voice-activity detector
  useEffect(() => {
    if (!myVoiceState || !myVoiceState.channelId || myVoiceState.isMuted) {
      if (myVoiceState?.isSpeaking) {
        updateMyVoiceState({ isSpeaking: false });
      }
      return;
    }

    let micStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let interval: any = null;

    const startRecording = async () => {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let speakingDebounce = 0;

        interval = setInterval(() => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          const curState = myVoiceStateRef.current;
          if (!curState || curState.isMuted) return;

          if (average > 18) { // Sound energy threshold
            if (!curState.isSpeaking) {
              updateMyVoiceState({ isSpeaking: true });
            }
            speakingDebounce = 7; // avoid quick cutoff status flickering
          } else {
            if (speakingDebounce > 0) {
              speakingDebounce--;
            } else if (curState.isSpeaking) {
              updateMyVoiceState({ isSpeaking: false });
            }
          }
        }, 120);
      } catch (err) {
        console.warn("[VAD] Microphone stream not accessible (iframe sandbox constraints):", err);
      }
    };

    startRecording();

    return () => {
      if (interval) clearInterval(interval);
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
      }
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [myVoiceState?.channelId, myVoiceState?.isMuted]);

  return (
    <SocketContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        servers,
        setServers,
        activeServerId,
        setActiveServerId,
        activeChannelId,
        setActiveChannelId,
        channelMessages,
        setChannelMessages,
        voiceStates,
        myVoiceState,
        allUsers,
        friends,
        loadFriends,
        loadServers,
        loadUsers,
        joinVoiceChannel,
        leaveVoiceChannel,
        updateMyVoiceState,
        wsSend,
        isConnected,
        activeDmUserId,
        setActiveDmUserId
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used inside a SocketProvider');
  }
  return context;
};
