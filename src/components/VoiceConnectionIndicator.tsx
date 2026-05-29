import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { motion } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, LogOut, PhoneCall, Monitor, Camera, CameraOff, X, Laptop, Code, Tv, Chrome } from 'lucide-react';

export const VoiceConnectionIndicator: React.FC = () => {
  const { 
    user, 
    myVoiceState, 
    servers, 
    leaveVoiceChannel, 
    updateMyVoiceState 
  } = useSocket();

  const [showScreenPicker, setShowScreenPicker] = useState(false);

  if (!user || !myVoiceState || !myVoiceState.channelId) return null;

  // Find the channel reference details
  let connectedServerName = "Личные сообщения";
  let connectedChannelName = "Голосовой звонок";

  for (const s of servers) {
    const matchedChan = s.channels.find(c => c.id === myVoiceState.channelId);
    if (matchedChan) {
      connectedServerName = s.name;
      connectedChannelName = matchedChan.name;
      break;
    }
  }

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="bg-[#111214] border-t border-[#3f4147] p-3 flex flex-col gap-2 shrink-0 select-none"
    >
      {/* Top row status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>

          <div className="text-left font-sans">
            <span className="text-[11px] font-bold text-green-400 block leading-tight">RTC Соединение</span>
            <span className="text-[10px] text-gray-400 font-mono tracking-tight">{connectedServerName} / {connectedChannelName}</span>
          </div>
        </div>

        {/* Latency badge representation */}
        <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>RTC Connected</span>
        </div>
      </div>

      {/* Low row buttons modifiers */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex gap-1.5">
          {/* Mute micro */}
          <button
            onClick={() => updateMyVoiceState({ isMuted: !myVoiceState.isMuted })}
            className={`p-2 rounded cursor-pointer transition ${myVoiceState.isMuted ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5]'}`}
            title={myVoiceState.isMuted ? "Включить микрофон" : "Выключить микрофон"}
          >
            {myVoiceState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Deafen sounds */}
          <button
            onClick={() => updateMyVoiceState({ 
              isDeafened: !myVoiceState.isDeafened,
              isMuted: !myVoiceState.isDeafened ? true : myVoiceState.isMuted // auto mute if deafened
            })}
            className={`p-2 rounded cursor-pointer transition ${myVoiceState.isDeafened ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5]'}`}
            title={myVoiceState.isDeafened ? "Включить звук" : "Выключить звук"}
          >
            {myVoiceState.isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Camera toggle */}
          <button
            onClick={() => updateMyVoiceState({ isCameraOn: !myVoiceState.isCameraOn })}
            className={`p-2 rounded cursor-pointer transition ${myVoiceState.isCameraOn ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse' : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5]'}`}
            title={myVoiceState.isCameraOn ? "Выключить камеру" : "Включить камеру"}
          >
            {myVoiceState.isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>

          {/* Screen Share toggle */}
          <button
            onClick={() => {
              if (myVoiceState.isScreenSharing) {
                updateMyVoiceState({ isScreenSharing: false });
              } else {
                setShowScreenPicker(true);
              }
            }}
            className={`p-2 rounded cursor-pointer transition ${myVoiceState.isScreenSharing ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-[#1e1f22] text-[#b5bac1] hover:bg-[#35373c] hover:text-[#f2f3f5]'}`}
            title={myVoiceState.isScreenSharing ? "Прекратить трансляцию" : "Демонстрация экрана"}
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        {/* Call disconnect trigger red hangup */}
        <button
          onClick={leaveVoiceChannel}
          className="p-2 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition flex items-center justify-center gap-1.5 px-3.5"
          title="Отключиться от звонка"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold leading-none font-sans">Выйти</span>
        </button>
      </div>

      {showScreenPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-[#1e1f22] border border-[#3f4147]/60 rounded-xl overflow-hidden shadow-2xl flex flex-col p-4 text-left">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#3f4147]/40">
              <h3 className="text-white text-xs font-bold font-sans uppercase tracking-wider text-purple-400">Демонстрация экрана</h3>
              <button 
                onClick={() => setShowScreenPicker(false)}
                className="text-gray-400 hover:text-white rounded transition cursor-pointer p-0.5"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mb-3 font-sans">
              Выберите виртуальный источник или настоящее окно браузера для трансляции в канал:
            </p>

            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
              
              {/* Real browser window search */}
              <button
                type="button"
                onClick={async () => {
                  setShowScreenPicker(false);
                  try {
                    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                      await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                    }
                  } catch (err) {
                    console.warn("DisplayMedia blocked:", err);
                  }
                  updateMyVoiceState({ isScreenSharing: true, screenShareSource: 'monitor' });
                }}
                className="w-full bg-[#2b2d31] border border-emerald-500/20 hover:border-emerald-500 hover:bg-[#35373c] p-2 rounded flex items-center gap-2.5 text-left transition select-none cursor-pointer group active:scale-98"
              >
                <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Monitor className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div>
                  <div className="text-white font-bold text-xs flex items-center gap-1 font-sans">
                    <span>Реальный дисплей на ПК</span>
                    <span className="text-[7px] bg-emerald-600 text-white font-mono px-1 py-0.2 rounded uppercase">LIVE</span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-sans mt-0.5 leading-none">Транслировать Вашу физическую ОС</p>
                </div>
              </button>

              {/* Option 2: Full Monitor 1 */}
              <button
                type="button"
                onClick={() => {
                  setShowScreenPicker(false);
                  updateMyVoiceState({ isScreenSharing: true, screenShareSource: 'monitor' });
                }}
                className="w-full bg-[#2b2d31] border border-transparent hover:bg-[#35373c] hover:border-purple-500 p-2 rounded flex items-center gap-2.5 text-left transition select-none cursor-pointer group active:scale-98"
              >
                <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs font-sans group-hover:text-indigo-400">Экран 1 (Основной монитор)</h4>
                  <p className="text-[9px] text-gray-400 font-sans mt-0.5 leading-none">Имитировать трансляцию всего дисплея</p>
                </div>
              </button>

              {/* Option 3: VS Code */}
              <button
                type="button"
                onClick={() => {
                  setShowScreenPicker(false);
                  updateMyVoiceState({ isScreenSharing: true, screenShareSource: 'vscode' });
                }}
                className="w-full bg-[#2b2d31] border border-transparent hover:bg-[#35373c] hover:border-purple-500 p-2 rounded flex items-center gap-2.5 text-left transition select-none cursor-pointer group active:scale-98"
              >
                <div className="w-7 h-7 rounded bg-indigo-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Code className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs font-sans group-hover:text-indigo-400">Visual Studio Code IDE</h4>
                  <p className="text-[9px] text-gray-400 font-sans mt-0.5 leading-none">Показать активное окно кодинга Node JS</p>
                </div>
              </button>

              {/* Option 4: Counter Strike */}
              <button
                type="button"
                onClick={() => {
                  setShowScreenPicker(false);
                  updateMyVoiceState({ isScreenSharing: true, screenShareSource: 'cs2' });
                }}
                className="w-full bg-[#2b2d31] border border-transparent hover:bg-[#35373c] hover:border-purple-500 p-2 rounded flex items-center gap-2.5 text-left transition select-none cursor-pointer group active:scale-98"
              >
                <div className="w-7 h-7 rounded bg-indigo-500/10 text-orange-400 flex items-center justify-center shrink-0">
                  <Tv className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs font-sans group-hover:text-indigo-400">Counter-Strike 2</h4>
                  <p className="text-[9px] text-gray-400 font-sans mt-0.5 leading-none">Стрим игрового шутера в высоком FPS</p>
                </div>
              </button>

              {/* Option 5: Chrome Tab */}
              <button
                type="button"
                onClick={() => {
                  setShowScreenPicker(false);
                  updateMyVoiceState({ isScreenSharing: true, screenShareSource: 'chrome' });
                }}
                className="w-full bg-[#2b2d31] border border-transparent hover:bg-[#35373c] hover:border-purple-500 p-2 rounded flex items-center gap-2.5 text-left transition select-none cursor-pointer group active:scale-98"
              >
                <div className="w-7 h-7 rounded bg-indigo-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <Chrome className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs font-sans group-hover:text-indigo-400">Вкладка Chrome (YouTube)</h4>
                  <p className="text-[9px] text-gray-400 font-sans mt-0.5 leading-none">Показать страницу медиа в браузере</p>
                </div>
              </button>

            </div>

            <div className="mt-3.5 pt-2 border-t border-[#3f4147]/40 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScreenPicker(false)}
                className="px-3.5 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[10px] font-bold rounded cursor-pointer transition active:scale-95 text-center font-sans uppercase tracking-wider"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
