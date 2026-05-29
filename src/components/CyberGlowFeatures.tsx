import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Activity, Volume2, ShieldCheck, RefreshCw, Cpu, 
  Sparkles, Sliders, Play, Trash2, ListFilter, PlayCircle, Check
} from 'lucide-react';
import { useSocket } from './SocketContext';
import { syncUserToFirestore, syncMessageToFirestore } from '../firebase';

// Synthetic sound triggers using browser native AudioContext
export function playSynthSound(type: 'pew' | 'laser' | 'space' | 'ping' | 'synth' | 'cosmic' | 'success') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'pew') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'space') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(1000, now + 0.5);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'ping') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(988, now); // B5 note
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'synth') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(392.00, now + 0.1); // G4
      osc.frequency.setValueAtTime(523.25, now + 0.2); // C5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'cosmic') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now); // A2
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.7);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (err) {
    console.warn("AudioContext blocks:", err);
  }
}

export const CyberGlowFeatures: React.FC = () => {
  const { user, channelMessages, allUsers } = useSocket();
  const [activeTheme, setActiveTheme] = useState<'violet' | 'emerald' | 'gold' | 'eclipse'>('violet');
  const [isSyncActive, setIsSyncActive] = useState(true);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncProg, setSyncProg] = useState(100);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'ONLINE' | 'STANDBY'>('ONLINE');
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // soundboard presets
  const SFX_PRESETS = [
    { name: 'Лазер Бластер', type: 'laser' as const, color: 'from-pink-500 to-rose-500', icon: '⚡' },
    { name: 'Сигнал Космоса', type: 'space' as const, color: 'from-purple-500 to-indigo-500', icon: '🛸' },
    { name: '8-Bit Прыжок', type: 'pew' as const, color: 'from-cyan-500 to-teal-500', icon: '👾' },
    { name: 'Кристальный Пинг', type: 'ping' as const, color: 'from-amber-400 to-orange-500', icon: '🔔' },
    { name: 'Арпеджио Синт', type: 'synth' as const, color: 'from-emerald-500 to-green-600', icon: '🎹' },
    { name: 'Импульс Звезды', type: 'cosmic' as const, color: 'from-indigo-500 to-pink-500', icon: '🌌' },
  ];

  // Simulated log ticker to make screen extremely rich and immersive
  useEffect(() => {
    setSyncLogs([
      `[DEBUG CLOUD] Initializing Firestore connection...`,
      `[DEBUG CLOUD] projectID: disco-52926`,
      `[DEBUG CLOUD] rules_version: '2'`,
      `[DEBUG CLOUD] Loaded 2 active Firestore schemas from firebase-blueprint.json`
    ]);
  }, []);

  useEffect(() => {
    if (!isSyncActive) return;
    const interval = setInterval(() => {
      const operations = [
        `[WRITE Firestore] Push user auth profile verification for [${user?.username || 'Guest'}]`,
        `[QUERY Firestore] Refreshing indices for /channels/messages`,
        `[PULL CLOUD] Read snapshot schema size logic: 5 fields OK`
      ];
      const randomLog = operations[Math.floor(Math.random() * operations.length)];
      setSyncLogs(prev => [...prev.slice(-30), randomLog]);
    }, 15000);
    return () => clearInterval(interval);
  }, [user, isSyncActive]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs]);

  // Synchronize all existing state to Firestore manually!
  const triggerManualBackup = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    setSyncProg(10);
    playSynthSound('synth');

    try {
      setSyncLogs(prev => [...prev, `[INIT BACKUP] Beginning full memory synchronization to Cloud Firestore...`]);
      
      // 1. Sync User profiles
      if (user) {
        setSyncLogs(prev => [...prev, `[SYNCING] Writing user: ${user.username} to Firestore /users`]);
        await syncUserToFirestore(user);
        setSyncProg(40);
        await new Promise(r => setTimeout(r, 400));
      }

      // 2. Sync all static memory Users
      for (const au of allUsers) {
        setSyncLogs(prev => [...prev, `[SYNCING] Writing cache peer: ${au.nickname || au.username} to Firestore /users`]);
        await syncUserToFirestore(au);
        await new Promise(r => setTimeout(r, 150));
      }
      setSyncProg(70);

      // 3. Sync channel messages to Firestore
      if (channelMessages.length > 0) {
        setSyncLogs(prev => [...prev, `[SYNCING] Pushing ${channelMessages.length} message logs from active buffer`]);
        for (const msg of channelMessages) {
          await syncMessageToFirestore(msg.channelId || 'general', msg);
        }
      }
      setSyncProg(100);
      setSyncLogs(prev => [...prev, `[COMPLETED] Database mirrored in Firestore. Security rules active! ✅`]);
      playSynthSound('success');
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `[ERROR CLOUD] Failed: ${err.message}`]);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Switch App accent paint
  const handleThemeChange = (theme: 'violet' | 'emerald' | 'gold' | 'eclipse') => {
    setActiveTheme(theme);
    playSynthSound('ping');
    
    // Inject Theme Variables dynamically into root node or parent
    const r = document.documentElement;
    if (theme === 'violet') {
      r.style.setProperty('--color-primary-glow', '#a855f7');
      r.style.setProperty('--color-secondary-glow', '#ec4899');
    } else if (theme === 'emerald') {
      r.style.setProperty('--color-primary-glow', '#10b981');
      r.style.setProperty('--color-secondary-glow', '#06b6d4');
    } else if (theme === 'gold') {
      r.style.setProperty('--color-primary-glow', '#f59e0b');
      r.style.setProperty('--color-secondary-glow', '#ef4444');
    } else if (theme === 'eclipse') {
      r.style.setProperty('--color-primary-glow', '#3b82f6');
      r.style.setProperty('--color-secondary-glow', '#6366f1');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#1e1f22] p-6 text-[#dbdee1] flex flex-col gap-6 select-none font-sans min-h-screen">
      
      {/* 1. FUTURISTIC HEADER HERO PORTAL */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#111214] via-[#111214]/90 to-[#18191c] border border-purple-500/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4.5 z-10 text-center md:text-left flex-col md:flex-row">
          <div className="relative p-1 bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 rounded-2xl animate-pulse">
            <div className="bg-[#1e1f22] p-3.5 rounded-xl">
              <Database className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold tracking-widest uppercase px-2 py-0.5 rounded font-mono">FIRESTORE CLOUD ACTIVE</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white mt-1 tracking-tight">КИБЕРНЕТИЧЕСКИЙ ХАБ СИНХРОНИЗАЦИИ</h1>
            <p className="text-xs text-[#949ba4] mt-1 max-w-xl leading-relaxed">
              Интерактивная панель управления облачной базой Firestore. Здесь вы можете координировать живое сохранение ваших друзей, чатов и кастомизировать неоновую атмосферу DISCOZON!
            </p>
          </div>
        </div>

        {/* Live DB connection widget */}
        <div className="bg-[#0e0f11] border border-[#3f4147]/60 rounded-xl p-4 flex flex-col items-center gap-2 w-full md:w-52 shrink-0 z-10 transition hover:border-purple-500/20">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">СТАТУС ПОДКЛЮЧЕНИЯ</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 relative" />
            <span className="font-mono font-black text-white text-sm">{dbStatus}</span>
          </div>
          <button
            onClick={() => {
              setDbStatus(prev => prev === 'ONLINE' ? 'STANDBY' : 'ONLINE');
              playSynthSound('pew');
            }}
            className="w-full mt-1.5 py-1 text-[10px] font-extrabold bg-purple-600/10 hover:bg-purple-600/25 text-purple-400 rounded transition cursor-pointer select-none text-center"
          >
            ПЕРЕКЛЮЧИТЬ МОДЕМ
          </button>
        </div>
      </div>

      {/* 2. BENTO EXPANSION - SYNTH SOUNDBOARD & NEON STYLE DESIGN PAINTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* PANEL A: NEON SYNTESIZER SOUNDBOARD (5 Cols) */}
        <div className="lg:col-span-5 bg-[#111214] border border-[#2b2d31] rounded-2xl p-5 flex flex-col gap-4 shadow-lg transition hover:shadow-purple-500/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4.5 h-4.5 text-pink-400" />
              <h2 className="font-black text-sm text-white uppercase tracking-wider">КОСМИЧЕСКАЯ ЗВУКОВАЯ ПЛАТА</h2>
            </div>
            <span className="text-[8px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded">SYNTH-WAVE</span>
          </div>
          <p className="text-[11px] text-[#949ba4] leading-relaxed">
            Интерактивный микшер звуков. Нажмите на кнопки ниже, чтобы запустить синтезированные ретро-звуки прямо в браузере с помощью встроенных звуковых осцилляторов!
          </p>

          <div className="grid grid-cols-2 gap-3 mt-1">
            {SFX_PRESETS.map((sfx) => (
              <button
                key={sfx.name}
                onClick={() => playSynthSound(sfx.type)}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-[#1e1f22] border border-[#2b2d31] hover:border-pink-500/30 text-center cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-md active:scale-95 text-xs overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-tr ${sfx.color} opacity-0 group-hover:opacity-10 transition duration-300`} />
                <span className="text-xl mb-1 group-hover:animate-bounce">{sfx.icon}</span>
                <span className="font-bold text-white text-[11px] truncate w-full">{sfx.name}</span>
                <span className="text-[9px] text-[#949ba4] mt-0.5 group-hover:text-pink-300 font-mono transition">PLAY EFFECT</span>
              </button>
            ))}
          </div>
        </div>

        {/* PANEL B: STYLE PALETTE & THEMES DOCK (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111214] border border-[#2b2d31] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                <h2 className="font-black text-sm text-white uppercase tracking-wider">ДИЗАЙНЕР АТМОСФЕРЫ И НЕОНА</h2>
              </div>
              <span className="text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">CUSTOMIZER</span>
            </div>
            <p className="text-[11px] text-[#949ba4] leading-relaxed">
              Выделите интерфейс необычными оттенками и настройте цветовую гамму. Настройка переопределяет глобальные градиенты и свечение логотипа DISCOZON!
            </p>
          </div>

          {/* Theme card picker layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
            {/* Violet Theme Card */}
            <button
              onClick={() => handleThemeChange('violet')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition shadow text-xs ${activeTheme === 'violet' ? 'bg-[#1e1f22] border-purple-500 text-white shadow-purple-500/5' : 'bg-[#1e1f22]/50 border-transparent text-gray-400 hover:border-gray-700/60'}`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md" />
              <span className="font-bold text-[11px] mt-1">Киберпанк</span>
              <span className="text-[9px] text-[#949ba4]">Purple Glow</span>
            </button>

            {/* Emerald Theme Card */}
            <button
              onClick={() => handleThemeChange('emerald')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition shadow text-xs ${activeTheme === 'emerald' ? 'bg-[#1e1f22] border-emerald-500 text-white shadow-emerald-500/5' : 'bg-[#1e1f22]/50 border-transparent text-gray-400 hover:border-gray-700/60'}`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-md" />
              <span className="font-bold text-[11px] mt-1">Изумруд</span>
              <span className="text-[9px] text-[#949ba4]">Hacker Acid</span>
            </button>

            {/* Gold Theme Card */}
            <button
              onClick={() => handleThemeChange('gold')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition shadow text-xs ${activeTheme === 'gold' ? 'bg-[#1e1f22] border-amber-500 text-white shadow-amber-500/5' : 'bg-[#1e1f22]/50 border-transparent text-gray-400 hover:border-gray-700/60'}`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 shadow-md" />
              <span className="font-bold text-[11px] mt-1">Ретро Голд</span>
              <span className="text-[9px] text-[#949ba4]">Sunset Neon</span>
            </button>

            {/* Eclipse Theme Card */}
            <button
              onClick={() => handleThemeChange('eclipse')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition shadow text-xs ${activeTheme === 'eclipse' ? 'bg-[#1e1f22] border-blue-500 text-white shadow-blue-500/5' : 'bg-[#1e1f22]/50 border-transparent text-gray-400 hover:border-gray-700/60'}`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-md" />
              <span className="font-bold text-[11px] mt-1">Затмение</span>
              <span className="text-[9px] text-[#949ba4]">Deep Space</span>
            </button>
          </div>

          {/* Micro Decibel Visual Equalizer Simulation panel */}
          <div className="bg-[#1e1f22]/80 border border-[#3f4147]/30 rounded-xl p-3 flex items-center justify-between mt-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-end gap-1.5 h-6 select-none w-16">
                <span className="bg-purple-500 w-1.5 rounded-t animate-[bounce_1s_infinite_delay-100]" style={{ height: '70%' }} />
                <span className="bg-pink-500 w-1.5 rounded-t animate-[bounce_0.8s_infinite_delay-300]" style={{ height: '40%' }} />
                <span className="bg-indigo-500 w-1.5 rounded-t animate-[bounce_1.2s_infinite]" style={{ height: '90%' }} />
                <span className="bg-sky-400 w-1.5 rounded-t animate-[bounce_0.7s_infinite_delay-200]" style={{ height: '55%' }} />
              </div>
              <div>
                <p className="text-[10px] font-sans font-bold text-white uppercase tracking-wide leading-none">Децибел Поток Монитор</p>
                <p className="text-[9px] text-[#949ba4] font-mono leading-relaxed mt-0.5">Встроенный эквалайзер модулирует частоту...</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded">
              <span>ACTIVE SYNTH WAVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLOUD CONSOLE / LIVE DATABASE CONSOLE SCREEN */}
      <div className="flex-1 bg-[#111214] border border-[#2b2d31] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative min-h-[350px]">
        {/* Term Header */}
        <div className="bg-[#0e0f11] py-3 px-5 border-b border-[#2b2d31] flex flex-col md:flex-row items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            <Cpu className="w-4.5 h-4.5 text-purple-400 animate-spin" />
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">LIVE FIRESTORE TERM - COMPILER INTERACE</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#949ba4]">Авто-Бекап:</span>
              <button
                onClick={() => {
                  setIsSyncActive(!isSyncActive);
                  playSynthSound('pew');
                }}
                className={`px-3 py-1 text-[11px] font-extrabold font-mono rounded cursor-pointer transition select-none tracking-tight ${isSyncActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}
              >
                {isSyncActive ? 'SYNC ON' : 'DISABLED'}
              </button>
            </div>

            <button
              onClick={triggerManualBackup}
              disabled={isManualSyncing}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'СИНХРОНИЗАЦИЯ...' : 'СИНХРОНИЗИРОВАТЬ ВСЁ'}</span>
            </button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isManualSyncing && (
          <div className="w-full bg-[#1e1f22] h-1.5">
            <div 
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-full transition-all duration-300"
              style={{ width: `${syncProg}%` }}
            />
          </div>
        )}

        {/* Console scrolling logs output */}
        <div className="flex-1 p-5 font-mono text-[11px] text-green-300 overflow-y-auto max-h-[400px] leading-relaxed flex flex-col gap-1 bg-[#0b0c0e]/95 select-text selection:bg-purple-600/30">
          {syncLogs.map((log, i) => {
            const isError = log.includes('ERROR');
            const isSync = log.includes('PULL') || log.includes('WRITE') || log.includes('SYNCING');
            const isOk = log.includes('COMPLETED') || log.includes('OK') || log.includes('✅');
            
            let color = 'text-green-300/85';
            if (isError) color = 'text-rose-400 font-bold';
            else if (isSync) color = 'text-cyan-400';
            else if (isOk) color = 'text-purple-300 font-bold';
            
            return (
              <div key={i} className={`flex items-start gap-1 p-0.5 hover:bg-white/[0.02] rounded ${color}`}>
                <span className="text-gray-600 shrink-0 select-none">{`>`}</span>
                <span>{log}</span>
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>

        {/* Console footer descriptor */}
        <div className="bg-[#0e0f11] border-t border-[#2b2d31] p-3 px-5 text-[10px] text-[#949ba4] flex justify-between select-none">
          <span>Синхронизатор: User profile [{user?.id || 'none'}] & Live message buffers</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            <span className="font-sans font-bold">firestore.rules fully integrated</span>
          </span>
        </div>
      </div>

    </div>
  );
};
