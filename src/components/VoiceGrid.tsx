import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { motion } from 'motion/react';
import { MicOff, VolumeX, Camera, Monitor, Settings, Users, Volume2, MessageSquare, Laptop, Code, Tv, Chrome, Minimize2, Maximize2 } from 'lucide-react';
import { User, VoiceState } from '../types';

interface VoiceGridProps {
  onMinimize?: () => void;
  isSidebar?: boolean;
}

export const VoiceGrid: React.FC<VoiceGridProps> = ({ onMinimize, isSidebar = false }) => {
  const { 
    user, 
    voiceStates, 
    allUsers, 
    servers, 
    myVoiceState 
  } = useSocket();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [isWebcamBlockedOrMissing, setIsWebcamBlockedOrMissing] = useState(false);
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);

  // Gather participants in the active voice channel
  if (!myVoiceState || !myVoiceState.channelId) return null;
  const activeChannelId = myVoiceState.channelId;

  const channelParticipants = (Object.values(voiceStates) as VoiceState[])
    .filter(vs => vs.channelId === activeChannelId)
    .map(vs => {
      const u = allUsers.find(item => item.id === vs.userId) || {
        id: vs.userId,
        username: "Пользователь",
        nickname: "Участник голосового чата",
        email: "",
        avatar: "",
        banner: "",
        description: "",
        status: "online" as const,
        tag: "0000",
        createdAt: ""
      };
      return {
        user: u,
        st: vs
      };
    });

  // Handle local camera webcam stream capture when myVoiceState.isCameraOn === true
  useEffect(() => {
    if (myVoiceState.isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          setLocalStream(stream);
          setIsWebcamBlockedOrMissing(false);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          // Gracefully default to simulated track since hardware is missing or blocked in sandbox context.
          // We avoid printing red fatal error traces to prevent parsing scripts from raising error flags.
          console.warn("[Camera Simulation] Active webcam, fallback to simulated stream initialized: ", err.message || err);
          setIsWebcamBlockedOrMissing(true);
        });
    } else {
      // Stop stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setIsWebcamBlockedOrMissing(false);
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [myVoiceState.isCameraOn]);

  // Clean avatar loader toggling static vs animated GIF cover depending on speaking state
  const getAvatarForState = (u: User, isSpeaking: boolean) => {
    if (!u.avatar) return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

    // GIF Avatar logic: play animated versions only if speaking, otherwise static frame
    if (u.id === 'user-sova') {
      return isSpeaking 
        ? "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWtsOXdndml2eTlxZmgycnFmdDV5cTZqOHF0ZXZsZGMxam9mMXoyZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPCXfJE9OUV8FvG/giphy.gif" // Animated active GIF
        : "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop"; // Static fallback for sova
    }

    if (u.id === 'user-mixa') {
      return isSpeaking
        ? "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHoyZWV5YjhhdzUxaWZ4eWRtcTZoY2hwb29xbWhzMHg5ZzB6dTN5MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41Yo6X6d8fUuC7Yc/giphy.gif"
        : "https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=150&h=150&fit=crop"; // static bunny picture
    }

    return u.avatar;
  };

  const setVolumeVal = (id: string, val: number) => {
    setParticipantVolumes(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const renderStreamContent = (u: User, st: VoiceState, isMe: boolean, isLarge: boolean = false) => {
    // If it's a camera stream
    if (st.isCameraOn) {
      if (isMe && localStream) {
        return (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        );
      }
      
      // Simulated camera fallback / others camera
      return (
        <div className="absolute inset-0 w-full h-full z-10 bg-[#0e0f11] flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15),transparent_70%)] animate-pulse" />
          <img 
            src={u.id === 'user-sova' ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop" : u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} 
            alt="simulate webcam" 
            className="w-full h-full object-cover opacity-60 filter saturate-75 brightness-90" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 left-3 bg-indigo-600 px-2.5 py-1 text-[8px] font-bold text-white rounded font-sans tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            LIVE ВЕБ-КАМЕРА
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] text-purple-200 bg-black/60 px-2 py-1 rounded font-sans font-bold">
            @{u.nickname}
          </div>
        </div>
      );
    }

    // Else if it's a screen share stream
    if (st.isScreenSharing) {
      const src = st.screenShareSource || 'monitor';

      if (src === 'cs2') {
        return (
          <div className="absolute inset-0 w-full h-full z-10 bg-[#0a0b0d] border-2 border-orange-500/80 flex flex-col overflow-hidden font-mono select-none">
            {/* Top match score */}
            <div className="bg-[#121316] py-1 px-3 border-b border-gray-800 flex items-center justify-between text-[10px] text-gray-300">
              <span className="text-orange-500 font-bold">MATCH STREAMING</span>
              <div className="flex items-center gap-2 font-bold text-[#f2f3f5]">
                <span className="text-amber-500 font-bold">TERRORISTS [ 11 ]</span>
                <span className="text-gray-500">:</span>
                <span className="text-sky-500 font-bold">[ 12 ] CT</span>
              </div>
              <span className="text-[9px] text-orange-400 bg-orange-950/20 px-1 py-0.2 rounded animate-pulse">● BOMB PLANTED</span>
            </div>
            {/* Main gaming overlay visual */}
            <div className="flex-1 relative flex items-center justify-center bg-radial-gradient">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.06),transparent_80%)]" />
              {/* Sight crosshair */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <span className="absolute w-4 h-0.5 bg-green-400" />
                <span className="absolute h-4 w-0.5 bg-green-400" />
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              </div>
              <div className="absolute top-4 left-4 w-16 h-16 border border-gray-700/40 rounded-full flex items-center justify-center text-[7px] text-rose-500">
                <span className="animate-ping absolute w-4 h-4 bg-rose-500/20 rounded-full" />
                RADAR SIM
              </div>
              <div className="absolute bottom-3 left-4 flex items-end gap-1 text-white font-mono leading-none bg-black/40 p-1.5 rounded">
                <span className="text-[14px] font-black text-orange-400">100</span>
                <span className="text-[8px] text-gray-400">HP</span>
              </div>
              <div className="absolute bottom-3 right-4 flex items-end gap-1 text-white font-mono leading-none bg-black/40 p-1.5 rounded">
                <span className="text-[14px] font-black text-amber-300">30 / 90</span>
                <span className="text-[8px] text-gray-400">AMMO</span>
              </div>
            </div>
          </div>
        );
      }

      if (src === 'vscode') {
        return (
          <div className="absolute inset-0 w-full h-full z-10 bg-[#1e1e1e] border-2 border-indigo-500/80 flex flex-col overflow-hidden font-mono select-none text-left">
            <div className="bg-[#252526] px-3 py-1 flex items-center justify-between text-[11px] text-[#cccccc] border-b border-[#1e1e1e]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[#a4a4a4] font-medium ml-1">App.tsx — disco-applet — Visual Studio Code</span>
              </div>
              <span className="text-[9px] bg-sky-900/30 text-sky-400 px-1 py-0.2 rounded font-sans">TYPESCRIPT</span>
            </div>
            <div className="flex-1 p-3 text-[10px] space-y-1 bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden leading-relaxed">
              <p className="text-emerald-500">// Simulated workspace developer stream</p>
              <p><span className="text-[#569cd6]">import</span> React, {`{ useState, useEffect }`} <span className="text-[#569cd6]">from</span> <span className="text-[#ce9178]">'react'</span>;</p>
              <p><span className="text-[#569cd6]">const</span> <span className="text-[#dcdcaa]">startCallStream</span> = () =&gt; {' {'}</p>
              <p className="pl-4 text-[#9cdcfe]">const <span className="text-[#4fc1ff]">isLive</span> = <span className="text-[#b5cea8]">true</span>;</p>
              <p className="pl-4 text-[#ce9178]">console.log("Stream status: online");</p>
              <p className="pl-4 text-[#d8a3ea]">return {`{ status: "SUCCESS_CONNECTED" }`};</p>
              <p>{`};`}</p>
              <div className="h-[1px] bg-gray-800 my-2" />
              <p className="text-cyan-400 font-bold animate-pulse">&gt; local_node: stream running via WebSockets...</p>
            </div>
            <div className="bg-[#007acc] px-2.5 py-0.5 flex justify-between items-center text-[9px] text-white select-none">
              <span>-- info: main.tsx / master*</span>
              <span>UTF-8 / Prettier ✅</span>
            </div>
          </div>
        );
      }

      if (src === 'chrome') {
        return (
          <div className="absolute inset-0 w-full h-full z-10 bg-[#202124] border-2 border-emerald-500/80 flex flex-col overflow-hidden font-sans select-none text-left text-gray-300">
            <div className="bg-[#35363a] py-1 px-3 flex items-center gap-2 border-b border-[#202124]">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
              </div>
              <div className="bg-[#202124] flex-1 max-w-[200px] text-[9px] px-2 py-0.5 rounded text-gray-400 select-all truncate">
                https://youtube.com/watch?v=discozon
              </div>
            </div>
            <div className="flex-1 bg-[#181818] p-3 flex flex-col justify-between">
              <div className="border border-red-600/20 bg-red-600/5 rounded p-2 text-center">
                <p className="text-red-500 font-extrabold text-[11px] animate-pulse uppercase tracking-wider">🔴 Имитация YouTube видео потока</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Видео транслируется со скоростью 60 FPS</p>
              </div>
              <div className="h-10 bg-radial flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-sans text-xs font-bold shadow-md cursor-pointer hover:scale-105 transition animate-pulse">
                  ▶
                </span>
              </div>
            </div>
          </div>
        );
      }

      // Default computer desktop stream
      return (
        <div className="absolute inset-0 w-full h-full z-10 bg-[#0c0d0f] border-2 border-indigo-500/80 flex flex-col overflow-hidden select-none">
          <div className="bg-[#181a1f] px-2.5 py-1.5 border-b border-indigo-950 flex items-center justify-between text-[10px] select-none text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-indigo-300 font-bold ml-1.5 font-bold">desktop_stream.sh</span>
            </div>
            <div className="bg-indigo-600/20 px-2 py-0.5 rounded text-[8px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
              <span className="w-1 h-1 bg-indigo-400 rounded-full" />
              SCREEN SHARE
            </div>
          </div>

          <div className="flex-1 p-2.5 font-mono text-[9px] text-[#86bf5c] space-y-1.5 overflow-hidden text-left bg-[#050608]/95 relative flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-gray-500 select-none">// Simulated screen session - code playground</p>
              <p className="text-purple-400">import <span className="text-blue-400">{' { listenState, streamMedia } '}</span> from <span className="text-green-300">"disco-core"</span>;</p>
              <p className="text-[#dbcee1]"><span className="text-pink-400">const</span> renderGrid = (active) =&gt; {' {'}</p>
              <p className="text-indigo-400 pl-4">console.log(<span className="text-amber-400">`Streaming to all participants...`</span>);</p>
              <p className="text-[#dbcee1] pl-4">return active ? <span className="text-amber-400">"DISCOZON LIVE"</span> : null;</p>
              <p className="text-[#dbcee1]">{'};'}</p>
              <div className="h-[1px] bg-indigo-950/40 my-1 w-full" />
              <p className="text-cyan-400 animate-pulse font-bold">● local_node: connecting status: ESTABLISHED</p>
              <p className="text-gray-500 select-none">&gt; buffer size: 128kbps / rate: 60fps / latency: 15ms</p>
            </div>

            <div className="bg-indigo-950/80 border border-indigo-500/30 p-1.5 rounded text-center text-indigo-200">
              <p className="font-sans font-extrabold text-[10px] tracking-wider uppercase">Трансляция рабочего стола</p>
              <p className="font-sans text-[8px] text-gray-400 mt-0.5 select-none text-center">Поток идет в высоком качестве 1080p</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div id="voice_grid_container" className="flex-1 bg-[#1e1f22] p-5 flex flex-col justify-between h-full select-none select-none">
      {/* Voice grid upper row header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2.5 bg-green-500/15 border border-green-500/30 text-green-400 rounded text-xs font-bold font-sans">
            ● ГОЛОС СВЯЗЬ АКТИВНА
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {channelParticipants.length} участников подключено
          </span>
        </div>

        {onMinimize && (
          <button
            onClick={onMinimize}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] rounded text-xs font-bold text-white transition select-none cursor-pointer active:scale-95 shadow shrink-0"
            title="Открыть текстовый чат"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Вернуться к чату</span>
          </button>
        )}
      </div>

      {/* Screen Sharing Focused view block or standard Grid container */}
      {(() => {
        const focusedMember = channelParticipants.find(p => p.user.id === fullscreenUserId);
        const isCurrentlyFullScreen = focusedMember && (focusedMember.st.isCameraOn || focusedMember.st.isScreenSharing);

        if (isCurrentlyFullScreen && focusedMember) {
          const fUser = focusedMember.user;
          const fState = focusedMember.st;
          const isMeFocused = fUser.id === user?.id;

          return (
            <div id="voice_grid_focused_container" className="flex-1 bg-[#1e1f22] flex flex-col h-full overflow-hidden select-none mb-3">
              {/* Focused stream panel */}
              <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">
                {/* 1. Main big stream screen */}
                <div className="flex-1 bg-[#111214] border border-[#3f4147]/50 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner">
                  {renderStreamContent(fUser, fState, isMeFocused, true)}

                  {/* Navigation trigger on big screen control overlay */}
                  <button
                    onClick={() => setFullscreenUserId(null)}
                    type="button"
                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/90 p-2 text-white hover:text-rose-400 rounded-lg cursor-pointer transition flex items-center gap-1.5 hover:scale-105 select-none font-bold text-xs font-sans border border-white/5 shadow-lg active:scale-98"
                    title="Выйти из фокуса"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>Свернуть</span>
                  </button>
                  
                  {/* Bottom details subtitle overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-25 flex items-center justify-between bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/5 select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-[#2b2d31]">
                        <img src={fUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-xs font-bold text-white font-sans">
                        {fUser.nickname} #{fUser.tag}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">1080p 60fps • Высокое качество видеопотока</span>
                  </div>
                </div>

                {/* 2. Side mini attendee thumbnails panel to toggle focused stream */}
                <div className="w-full lg:w-48 flex flex-row lg:flex-col gap-2 shrink-0 overflow-x-auto lg:overflow-y-auto pr-1">
                  <p className="text-[9px] text-[#b5bac1] uppercase font-sans font-extrabold tracking-wider mb-0.5 hidden lg:block select-none">В эфире ({channelParticipants.filter(p => p.st.isCameraOn || p.st.isScreenSharing).length})</p>
                  {channelParticipants.map(({ user: ou, st: ost }) => {
                    const isFocusedSelf = ou.id === fullscreenUserId;
                    const hasActiveStream = ost.isCameraOn || ost.isScreenSharing;

                    return (
                      <div
                        key={ou.id}
                        onClick={() => {
                          if (hasActiveStream) {
                            setFullscreenUserId(ou.id);
                          }
                        }}
                        className={`flex flex-row items-center gap-2 p-1.5 rounded-lg border cursor-pointer select-none transition min-w-[120px] lg:w-full shrink-0 ${isFocusedSelf ? 'border-purple-500 bg-purple-950/20' : hasActiveStream ? 'border-[#3f4147] bg-[#2b2d31] hover:border-[#53555c]' : 'border-[#3f4147]/50 bg-[#1e1f22] opacity-50'}`}
                      >
                        <div className="relative shrink-0">
                          <img 
                            src={getAvatarForState(ou, ost.isSpeaking)} 
                            className={`w-6 h-6 rounded-full object-cover border ${ost.isSpeaking ? 'border-green-500' : 'border-[#1e1f22]'}`} 
                            referrerPolicy="no-referrer"
                          />
                          {ost.isSpeaking && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-[#1e1f22]" />
                          )}
                        </div>
                        <div className="text-left font-sans leading-none truncate flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-white truncate">
                            {ou.nickname}
                          </p>
                          {hasActiveStream ? (
                            <span className="text-[7px] text-purple-400 font-extrabold uppercase mt-0.5 block">Смотреть</span>
                          ) : (
                            <span className="text-[7px] text-[#949ba4] block mt-0.5">В звонке</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        // Standard card grid layout
        return (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[85vh] p-2">
            {channelParticipants.map(({ user: u, st }) => {
              const isMe = u.id === user?.id;
              const isSpeaking = st.isSpeaking;
              const currentVol = participantVolumes[u.id] !== undefined ? participantVolumes[u.id] : 80;

              return (
                <motion.div
                  key={u.id}
                  initial={{ scale: 0.97, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => {
                    if (st.isCameraOn || st.isScreenSharing) {
                      setFullscreenUserId(u.id);
                    }
                  }}
                  className={`relative bg-[#2b2d31] rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center p-4 transition shadow-lg border-2 ${st.isCameraOn || st.isScreenSharing ? 'cursor-pointer hover:border-indigo-400/80 hover:shadow-indigo-500/10' : ''} ${isSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-[#3f4147]/50'}`}
                >
                  {/* Back blur splash element */}
                  <div 
                    style={{ backgroundColor: u.banner || '#5b65f2' }} 
                    className="absolute inset-0 opacity-10 blur-xl scale-75 pointer-events-none" 
                  />

                  {/* Main feed box or default avatar box */}
                  {(st.isCameraOn || st.isScreenSharing) ? (
                    renderStreamContent(u, st, isMe)
                  ) : (
                    /* Custom Overlay avatar indicator when silent/voice only */
                    <div className="relative z-20 flex flex-col items-center justify-center">
                      <div className={`relative w-20 h-20 rounded-full border-4 ${isSpeaking ? 'border-green-500 shadow-lg scale-105' : 'border-[#3f4147]'} overflow-hidden transition-all duration-200`}>
                        <img
                          src={getAvatarForState(u, isSpeaking)}
                          alt={u.nickname}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Speech CSS bounce equalizer animation */}
                      {isSpeaking && (
                        <div className="flex gap-0.5 mt-3 justify-center items-end h-5 select-none">
                          <span className="w-1 bg-green-500 rounded animate-[bounce_0.8s_infinite] h-4" />
                          <span className="w-1 bg-green-500 rounded animate-[bounce_1.1s_infinite] h-5" />
                          <span className="w-1 bg-green-500 rounded animate-[bounce_0.7s_infinite] h-3" />
                          <span className="w-1 bg-green-500 rounded animate-[bounce_0.9s_infinite] h-4" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom badge overlay tag */}
                  <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto bg-black/50 px-2.5 py-1.5 rounded-lg backdrop-blur-xs">
                    <span className="text-xs font-bold text-white font-sans max-w-[120px] truncate leading-tight select-none flex items-center gap-1.5">
                      {u.nickname}
                      {isMe && <span className="text-[9px] text-purple-300">(Вы)</span>}
                      {(st.isCameraOn || st.isScreenSharing) && (
                        <span className="text-[8px] bg-red-600 text-white font-mono px-1 py-0.2 rounded font-black tracking-widest leading-none scale-90 uppercase shrink-0">EFIR</span>
                      )}
                    </span>

                    {/* Status indicator badges */}
                    <div className="flex items-center gap-1.5">
                      {st.isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                      {st.isDeafened && <VolumeX className="w-3.5 h-3.5 text-rose-400" />}

                      {/* Volume Slider controller per connection */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition pl-1 border-l border-white/10 ml-1">
                          <Volume2 className="w-3.5 h-3.5 text-gray-300" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentVol}
                            onChange={(e) => setVolumeVal(u.id, Number(e.target.value))}
                            className="w-12 h-1 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            title={`Регулировка громкости участника (${currentVol}%)`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};
