import React, { useState } from 'react';
import { SocketProvider, useSocket } from './components/SocketContext';
import { AuthScreen } from './components/AuthScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { FriendsTab } from './components/FriendsTab';
import { VoiceConnectionIndicator } from './components/VoiceConnectionIndicator';
import { VoiceGrid } from './components/VoiceGrid';
import { ChatArea } from './components/ChatArea';
import { Logo } from './components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Settings, Compass, Share2, Volume2, Mic, MicOff, VolumeX,
  PlusCircle, User, LogOut, MessageSquare, Code, HelpCircle, Copy, Check, Cpu
} from 'lucide-react';
import { CyberGlowFeatures, playSynthSound } from './components/CyberGlowFeatures';

function Dashboard() {
  const {
    user,
    setToken,
    setUser,
    servers,
    setServers,
    activeServerId,
    setActiveServerId,
    activeChannelId,
    setActiveChannelId,
    voiceStates,
    myVoiceState,
    joinVoiceChannel,
    updateMyVoiceState,
    allUsers,
    friends,
    activeDmUserId,
    setActiveDmUserId,
    loadServers
  } = useSocket();

  // Dialog visual states
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [isVoiceFullscreen, setIsVoiceFullscreen] = useState(false);

  // Form entries
  const [newServerName, setNewServerName] = useState('');
  const [newServerIcon, setNewServerIcon] = useState('🛸');
  const [inviteCodeJoin, setInviteCodeJoin] = useState('');
  const [newChanName, setNewChanName] = useState('');
  const [newChanType, setNewChanType] = useState<'text' | 'voice'>('text');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  if (!user) return <AuthScreen />;

  // Select active server
  const selectedServer = servers.find(s => s.id === activeServerId) || null;

  // Log Out and sign out
  const handleLogOut = () => {
    setToken(null);
    setUser(null);
  };

  // Submit new server creation
  const handleCreateServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;

    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem('disco_token')}`
        },
        body: JSON.stringify({
          name: newServerName,
          icon: newServerIcon
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать сервер");

      setServers(prev => [...prev, data.server]);
      setActiveServerId(data.server.id);
      
      // select default channel
      const textChannel = data.server.channels?.find((ch: any) => ch.type === 'text');
      if (textChannel) {
        setActiveChannelId(textChannel.id);
      }

      setShowCreateServer(false);
      setNewServerName('');
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  // Joins server via copied invite code
  const handleJoinServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!inviteCodeJoin.trim()) return;

    try {
      const res = await fetch("/api/servers/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem('disco_token')}`
        },
        body: JSON.stringify({ inviteCode: inviteCodeJoin })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await loadServers();
      setActiveServerId(data.server.id);
      
      const firstText = data.server.channels?.find((ch: any) => ch.type === 'text');
      if (firstText) {
        setActiveChannelId(firstText.id);
      }

      setShowJoinServer(false);
      setInviteCodeJoin('');
    } catch (err: any) {
      setJoinError(err.message || "Неверный инвайт-код");
    }
  };

  // Handles adding channel to server
  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim() || !activeServerId) return;

    try {
      const res = await fetch(`/api/servers/${activeServerId}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem('disco_token')}`
        },
        body: JSON.stringify({
          name: newChanName,
          type: newChanType,
          description: newChanDesc
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать канал");

      setServers(prev => prev.map(s => s.id === activeServerId ? data.server : s));
      setShowCreateChannel(false);
      setNewChanName('');
      setNewChanDesc('');
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const copyInviteToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvite(code);
    setTimeout(() => setCopiedInvite(null), 2500);
  };

  const getDMBuddies = () => {
    return allUsers.filter(u => u.id !== user.id);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0E0F11] text-[#E0E0E0] overflow-hidden select-none font-sans">
      
      {/* 1. LEFTMOST RAIL - SERVER LISTS (Discord Server Columns) */}
      <div className="w-[72px] bg-[#08090A] shrink-0 p-3 flex flex-col items-center gap-2 select-none border-r border-[#1F2229]">
        
        {/* DM Button Home buble */}
        <button
          onClick={() => {
            setActiveServerId(null);
            setActiveChannelId(null);
            setActiveDmUserId(getDMBuddies()[0]?.id || null);
          }}
          className={`w-12 h-12 rounded-3xl bg-[#2b2d31] hover:bg-purple-600 hover:rounded-2xl flex items-center justify-center font-bold text-white transition-all duration-200 shadow cursor-pointer ${(!activeServerId && activeServerId !== 'cyber-hub') ? 'bg-purple-600 rounded-2xl ring-2 ring-purple-600/30' : ''}`}
          title="Секция друзей и ЛС"
        >
          <Logo size="sm" />
        </button>

        {/* Cyber Firestore Hub Button */}
        <button
          onClick={() => {
            setActiveServerId('cyber-hub');
            setActiveChannelId(null);
            setActiveDmUserId(null);
          }}
          className={`w-12 h-12 rounded-3xl bg-[#2b2d31] hover:bg-purple-600 hover:rounded-2xl flex items-center justify-center text-white transition-all duration-200 shadow cursor-pointer ${activeServerId === 'cyber-hub' ? 'bg-purple-600 rounded-2xl ring-2 ring-purple-500/80' : ''}`}
          title="Кибер-Хаб Снихронизации и Дизайна"
        >
          <Cpu className={`w-5 h-5 text-purple-400 group-hover:text-white ${activeServerId === 'cyber-hub' ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
        </button>

        <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

        {/* Server Bubbles */}
        <div className="flex-1 w-full space-y-2 overflow-y-auto no-scrollbar max-h-[70vh]">
          {servers.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveDmUserId(null);
                setActiveServerId(s.id);
                // select first channel
                const firstChan = s.channels.find(c => c.type === 'text') || s.channels[0];
                if (firstChan) {
                  setActiveChannelId(firstChan.id);
                }
              }}
              className={`w-12 h-12 rounded-3xl hover:rounded-2xl bg-[#2b2d31] hover:bg-[#313338] text-white flex items-center justify-center font-bold text-lg select-none transition-all duration-200 shadow cursor-pointer border border-[#3f4147]/10 ${activeServerId === s.id ? 'bg-purple-600 rounded-2xl ring-2 ring-purple-500/80' : ''}`}
              title={s.name}
            >
              <span className="leading-none text-base">{s.icon || "🪐"}</span>
            </button>
          ))}
        </div>

        {/* Action controllers adds server/joins */}
        <button
          onClick={() => setShowCreateServer(true)}
          className="w-12 h-12 rounded-3xl bg-[#2b2d31] hover:bg-green-600 hover:rounded-2xl flex items-center justify-center text-green-500 hover:text-white transition-all duration-200 cursor-pointer shadow border border-dashed border-green-500/30 mt-2"
          title="Создать новый сервер"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowJoinServer(true)}
          className="w-12 h-12 rounded-3xl bg-[#2b2d31] hover:bg-teal-600 hover:rounded-2xl flex items-center justify-center text-teal-400 hover:text-white transition-all duration-200 cursor-pointer shadow mt-1"
          title="Войти по инвайт-коду"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* 2. MIDDLE CHANNEL SIDEBAR column */}
      <div className="w-64 bg-[#111317] border-r border-[#1F2229] flex flex-col shrink-0 select-none">
        
        {/* Upper channel header */}
        <div className="h-16 px-4 border-b border-[#1F2229] flex items-center justify-between font-sans select-none bg-[#0A0B0D]/10">
          {activeServerId === 'cyber-hub' ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 relative" />
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-xs uppercase tracking-widest leading-none">КИБЕР СИНХРОН</span>
            </div>
          ) : selectedServer ? (
            <>
              <span className="font-bold text-white text-sm truncate uppercase tracking-wider">{selectedServer.name}</span>
              {/* Copy invite button representation */}
              <button
                onClick={() => copyInviteToClipboard(selectedServer.inviteCode)}
                className="text-[#b5bac1] hover:text-white cursor-pointer transition relative flex items-center gap-1.5"
                title="Копировать код инвайта"
              >
                {copiedInvite === selectedServer.inviteCode ? (
                  <Check className="w-4.5 h-4.5 text-green-400" />
                ) : (
                  <Copy className="w-4.5 h-4.5" />
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="font-bold text-white text-xs uppercase tracking-widest">DISCOZON ЛС</span>
            </div>
          )}
        </div>

        {/* List of text & voice channels / direct messages */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          {activeServerId === 'cyber-hub' ? (
            <div className="space-y-5 p-1">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-2 pl-1 select-none">СТРУКТУРА FIRESTORE</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-[#a855f7] bg-purple-500/10 p-2 rounded border border-purple-500/10 font-mono">
                    <span className="text-sm">📁</span>
                    <span className="font-bold">/users</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#ec4899] bg-pink-500/10 p-2 rounded border border-pink-500/10 font-mono">
                    <span className="text-sm">📁</span>
                    <span className="font-bold">/channels/messages</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-2 pl-1 select-none">БЫСТРЫЕ ЭФФЕКТЫ</div>
                <div className="space-y-1">
                  <button 
                    onClick={() => { playSynthSound('laser') }} 
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-pink-500/10 hover:text-pink-400 rounded text-xs select-none transition border border-transparent font-medium text-[#949ba4] text-left cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Микро Лазер sfx</span>
                  </button>
                  <button 
                    onClick={() => { playSynthSound('space') }} 
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-purple-500/10 hover:text-purple-400 rounded text-xs select-none transition border border-transparent font-medium text-[#949ba4] text-left cursor-pointer"
                  >
                    <span>🛸</span>
                    <span>Короткий Космос sfx</span>
                  </button>
                  <button 
                    onClick={() => { playSynthSound('success') }} 
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-green-500/10 hover:text-green-400 rounded text-xs select-none transition border border-transparent font-medium text-[#949ba4] text-left cursor-pointer"
                  >
                    <span>✨</span>
                    <span>Свечение победы</span>
                  </button>
                </div>
              </div>
            </div>
          ) : selectedServer ? (
            <>
              {/* Servers Channels listings */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#949ba4] uppercase tracking-wider mb-2 pr-1.5 pl-1 select-none">
                  <span>Текстовые Каналы</span>
                  <button
                    onClick={() => {
                      setNewChanType('text');
                      setShowCreateChannel(true);
                    }}
                    className="hover:text-white transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
                
                <div className="space-y-0.5">
                  {selectedServer.channels
                    .filter(c => c.type === 'text' || c.type === 'announcement')
                    .map(channel => (
                      <button
                        key={channel.id}
                        onClick={() => {
                          setActiveDmUserId(null);
                          setActiveChannelId(channel.id);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition text-xs font-semibold cursor-pointer align-middle ${activeChannelId === channel.id ? 'bg-[#35373c] text-white' : 'text-[#949ba4] hover:bg-[#35373c]/60 hover:text-[#dbdee1]'}`}
                      >
                        <span className="text-sm font-normal text-gray-500 opacity-60">#</span>
                        <span className="truncate">{channel.name}</span>
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#949ba4] uppercase tracking-wider mb-2 pr-1.5 pl-1 select-none">
                  <span>Голосовые Каналы</span>
                  <button
                    onClick={() => {
                      setNewChanType('voice');
                      setShowCreateChannel(true);
                    }}
                    className="hover:text-white transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-purple-400" />
                  </button>
                </div>

                <div className="space-y-1">
                  {selectedServer.channels
                    .filter(c => c.type === 'voice')
                    .map(channel => {
                      const isConnectedToThis = myVoiceState?.channelId === channel.id;
                      return (
                        <div key={channel.id} className="space-y-1 block select-none">
                          <button
                            onClick={() => {
                              joinVoiceChannel(channel.id);
                              setIsVoiceFullscreen(true);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition text-xs font-bold cursor-pointer ${isConnectedToThis ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20' : 'text-[#949ba4] hover:bg-[#35373c]/60 hover:text-[#dbdee1]'}`}
                          >
                            <span className="flex items-center gap-2 truncate text-left">
                              <Volume2 className="w-4 h-4 text-gray-400" />
                              <span className="truncate">{channel.name}</span>
                            </span>
                            {isConnectedToThis && (
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                          </button>

                          {/* Render participants linked directly details list under active voice channel */}
                          <div className="pl-6 space-y-0.5">
                            {(Object.values(voiceStates) as any[])
                              .filter(vs => vs.channelId === channel.id)
                              .map(pVs => {
                                const participantProfile = allUsers.find(au => au.id === pVs.userId);
                                if (!participantProfile) return null;
                                return (
                                  <div key={pVs.userId} className="flex items-center justify-between py-1 px-1.5 hover:bg-[#1e1f22]/35 rounded">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#dbdee1]">
                                      <div className={`w-5 h-5 rounded-full overflow-hidden border border-[#3f4147] relative shrink-0 ${pVs.isSpeaking ? 'ring-2 ring-green-500' : ''}`}>
                                        <img src={participantProfile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      </div>
                                      <span className="truncate max-w-[100px]">{participantProfile.nickname}</span>
                                    </div>

                                    {pVs.isMuted && <MicOff className="w-3 h-3 text-rose-400 scale-90" />}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            // Private direct dialog users
            <div>
              <div className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider mb-3 pr-1.5 pl-1 select-none">
                Личные сообщения
              </div>

              <div className="space-y-1 block">
                {getDMBuddies().map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => {
                      setActiveServerId(null);
                      setActiveChannelId(null);
                      setActiveDmUserId(dm.id);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded transition text-xs font-semibold cursor-pointer ${activeDmUserId === dm.id ? 'bg-[#35373c] text-white' : 'text-[#949ba4] hover:bg-[#35373c]/60 hover:text-[#dbdee1]'}`}
                  >
                    <div className="flex items-center gap-2 text-left truncate">
                      <div className="relative">
                        <div className="w-6.5 h-6.5 rounded-full overflow-hidden border border-transparent">
                          <img src={dm.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className={`absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 rounded-full border border-[#2b2d31] ${
                          dm.status === 'online' ? 'bg-green-500' :
                          dm.status === 'idle' ? 'bg-amber-500' :
                          dm.status === 'dnd' ? 'bg-rose-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <span className="truncate block font-bold text-white pr-2">{dm.nickname}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. FOOTER - ACTIVE CONNECTION STATUS bar indicator */}
        <VoiceConnectionIndicator />

        {/* 4. FOOTER - PERSON PROFILE SUMMARY PANEL */}
        <div className="h-[52px] bg-[#232428] px-3.5 flex items-center justify-between shrink-0 select-none shadow">
          {/* Avatar and Nick */}
          <div className="flex items-center gap-2 max-w-[120px] cursor-pointer" onClick={() => setShowProfileSettings(true)}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-700">
                <img src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#232428] bg-green-500" />
            </div>

            <div className="text-left leading-tight truncate">
              <span className="text-xs font-bold text-white block truncate">{user.nickname || user.username}</span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(user.id);
                  const target = e.currentTarget;
                  const originalText = target.innerText;
                  target.innerText = "Код скопирован! ✅";
                  target.style.color = "#c084fc"; // lighter purple
                  setTimeout(() => {
                    target.innerText = `#${user.tag}`;
                    target.style.color = "";
                  }, 1200);
                }}
                className="text-[9px] text-gray-400 block font-mono hover:text-purple-300 font-bold transition-all"
                title="Нажмите, чтобы скопировать уникальный Код Друга"
              >
                #{user.tag}
              </span>
            </div>
          </div>

          {/* Action icon links */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowProfileSettings(true)}
              className="p-1 px-1.5 hover:bg-gray-700/30 text-[#b5bac1] hover:text-white rounded cursor-pointer transition"
              title="Настройки профиля"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 3. MAIN WORK PANEL column */}
      <div className="flex-1 flex flex-col h-full bg-[#313338] relative overflow-hidden select-none">
        {/* Check if user active screen matches Friends tab or regular text logs chat */}
        {activeServerId === 'cyber-hub' ? (
          <CyberGlowFeatures />
        ) : !activeServerId && !activeChannelId && activeDmUserId ? (
          // Direct DM view has private text log chat
          <div className="flex-1 flex flex-col h-full overflow-hidden select-none select-none">
            <ChatArea />
          </div>
        ) : !activeServerId && !activeChannelId && !activeDmUserId ? (
          // Empty or General friends directory
          <FriendsTab />
        ) : (
          // Render Standard Discord Server text room with optional VOICE GRID on splitscreen/fullscreen!
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {isVoiceFullscreen && myVoiceState && myVoiceState.channelId ? (
              // Fullscreen Voice View
              <div className="flex-1 flex flex-col h-full bg-[#14161A]">
                <VoiceGrid onMinimize={() => setIsVoiceFullscreen(false)} />
              </div>
            ) : (
              // Split-screen Chat and Voice Grid
              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                <div className="flex-1 flex flex-col h-full border-r border-[#1f2023]/25">
                  <ChatArea />
                </div>
                {myVoiceState && myVoiceState.channelId && (
                  <div 
                    onClick={() => setIsVoiceFullscreen(true)}
                    className="w-full md:w-[360px] border-l border-[#1f2023]/25 flex flex-col h-full shrink-0 select-none bg-[#1e1f22] cursor-pointer hover:ring-2 hover:ring-purple-500/30 transition-all duration-200 group relative"
                    title="Нажмите, чтобы развернуть голосовой канал во весь экран"
                  >
                    <div className="bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white px-2 py-1.5 text-[10px] text-center font-bold uppercase tracking-widest border-b border-[#3f4147]/30 transition select-none flex items-center justify-center gap-1.5 font-sans">
                      <span>Нажмите для полного экрана</span>
                      <span className="text-[8px] px-1 py-0.2 bg-purple-500 text-white rounded">MAX</span>
                    </div>
                    <VoiceGrid isSidebar />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =======================================================
          POPOVER INTERACTIVE DIALOG MODALS SECTION
          ======================================================= */}
      <AnimatePresence>
        {/* User profile modifier */}
        {showProfileSettings && (
          <UserProfileModal onClose={() => setShowProfileSettings(false)} />
        )}

        {/* Server Creator dialog popup */}
        {showCreateServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#313338] p-6 rounded-lg shadow-2xl relative"
            >
              <h3 className="text-lg font-bold text-white mb-2 font-sans text-center">Создайте собственный сервер</h3>
              <p className="text-xs text-[#949ba4] text-center mb-5 leading-normal">
                Подарите вашему сообществу место для общения. Выберите классное имя и аватар-иконку!
              </p>

              <form onSubmit={handleCreateServerSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Эмодзи-иконка</label>
                  <select
                    value={newServerIcon}
                    onChange={(e) => setNewServerIcon(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1f22] border border-[#3f4147] rounded text-[#dbdee1] outline-none text-sm cursor-pointer"
                  >
                    <option value="🛸">🛸 Космический</option>
                    <option value="🎮">🎮 Гейминг</option>
                    <option value="🎹">🎹 Музыкальный</option>
                    <option value="🔥">🔥 Огненная тусовка</option>
                    <option value="🍕">🍕 Пиццерия</option>
                    <option value="💬">💬 Беседка</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Название сервера</label>
                  <input
                    type="text"
                    required
                    placeholder="Например, Моя Каюта"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1f22] border border-transparent rounded text-sm text-[#f2f3f5] outline-none focus:border-purple-600 transition"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateServer(false)}
                    className="px-4 py-2 text-xs font-bold text-[#dbdee1] hover:text-white cursor-pointer bg-transparent"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-bold cursor-pointer transition shadow"
                  >
                    Создать сервер
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Invite Code joining dialog popup */}
        {showJoinServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#313338] p-6 rounded-lg shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2 text-center">Присоединиться к серверу</h3>
              <p className="text-xs text-[#949ba4] text-center mb-4 leading-relaxed">
                Введите инвайт-код, предоставленный вашими друзьями, чтобы зайти на сервер моментально! (Например: <code className="bg-[#1e1f22] text-[#f2f3f5] px-1 py-0.5 rounded font-mono text-xs">LOUNGE</code>).
              </p>

              {joinError && (
                <div className="p-2.5 text-xs bg-rose-500/15 border border-rose-500/20 text-rose-300 rounded mb-4">
                  {joinError}
                </div>
              )}

              <form onSubmit={handleJoinServerSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Код приглашения</label>
                  <input
                    type="text"
                    required
                    placeholder="LOUNGE"
                    value={inviteCodeJoin}
                    onChange={(e) => setInviteCodeJoin(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1f22] border border-transparent rounded text-sm text-[#f2f3f5] outline-none focus:border-purple-600 transition"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinServer(false);
                      setJoinError(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-[#dbdee1] hover:text-white cursor-pointer bg-transparent"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-bold cursor-pointer transition"
                  >
                    Войти
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Server Channel adder dialog popup */}
        {showCreateChannel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#313338] p-6 rounded-lg shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2 text-center">Создать Канал</h3>
              <p className="text-xs text-[#949ba4] text-center mb-4 leading-normal">
                Создайте текстовую комнату для анонсов и сообщений, либо голосовой канал для бесед в реальном времени.
              </p>

              <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Тип Канала</label>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewChanType('text')}
                      className={`flex-1 py-1.5 px-3 border rounded text-xs font-semibold cursor-pointer transition ${newChanType === 'text' ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#1e1f22] border-[#3f4147]'}`}
                    >
                      # Текстовый
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChanType('voice')}
                      className={`flex-1 py-1.5 px-3 border rounded text-xs font-semibold cursor-pointer transition ${newChanType === 'voice' ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#1e1f22] border-[#3f4147]'}`}
                    >
                      🔊 Голосовой
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Название канала</label>
                  <input
                    type="text"
                    required
                    placeholder="новая-комната"
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1f22] border border-transparent rounded text-sm text-[#f2f3f5] outline-none focus:border-purple-600 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Описание канала (Опционально)</label>
                  <input
                    type="text"
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    placeholder="О чем этот канал?"
                    className="w-full p-2.5 bg-[#1e1f22] border border-transparent rounded text-sm text-[#f2f3f5] outline-none focus:border-purple-600 transition"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateChannel(false)}
                    className="px-4 py-2 text-xs font-bold text-[#dbdee1] hover:text-white cursor-pointer bg-transparent"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-bold cursor-pointer transition shadow"
                  >
                    Создать канал
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <Dashboard />
    </SocketProvider>
  );
}
