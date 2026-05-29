import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { motion } from 'motion/react';
import { Users, UserPlus, MessageSquare, Check, X, ShieldAlert, Smile, Search, Copy } from 'lucide-react';
import { User, FriendRelation } from '../types';

export const FriendsTab: React.FC = () => {
  const { 
    user, 
    token, 
    friends, 
    allUsers, 
    loadFriends, 
    setActiveDmUserId, 
    setActiveServerId, 
    setActiveChannelId 
  } = useSocket();

  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [friendInput, setFriendInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedFriendCode, setCopiedFriendCode] = useState(false);

  if (!user) return null;

  const handleCopyFriendCode = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedFriendCode(true);
    setTimeout(() => setCopiedFriendCode(false), 2000);
  };

  // Handles adding friendship via locator string
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ friendKeyword: friendInput })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось отправить запрос");

      setSuccessMsg(data.message || `Запрос дружбы отправлен пользователю ${data.targetUser.nickname}!`);
      setFriendInput('');
      await loadFriends();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Accept/Decline/Block triggers
  const handleFriendAction = async (relationId: string, action: 'accept' | 'decline' | 'block') => {
    try {
      const res = await fetch(`/api/friends/${relationId}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (!res.ok) throw new Error("Ошибка совершения действия");
      await loadFriends();
    } catch (err: any) {
      console.error(err.message);
    }
  };

  // Convert buddy relation to full user profile
  const getFriendDetails = (rel: FriendRelation): { profile: User; isRequester: boolean } => {
    const friendId = rel.requesterId === user.id ? rel.receiverId : rel.requesterId;
    const profile = allUsers.find(u => u.id === friendId) || {
      id: friendId,
      username: "Пользователь",
      nickname: "Пользователь",
      email: "",
      avatar: "",
      banner: "",
      description: "Оффлайн",
      status: "offline",
      tag: "0000",
      createdAt: ""
    };
    return {
      profile,
      isRequester: rel.requesterId === user.id
    };
  };

  // Start DM Chat with Friend
  const startDmChat = (friendId: string) => {
    setActiveServerId(null);
    setActiveChannelId(null);
    setActiveDmUserId(friendId);
  };

  // Filter listings based on active tab selection
  const filteredRelations = friends.filter(rel => {
    const { profile } = getFriendDetails(rel);
    
    // Search query matches
    if (searchFilter && !profile.nickname.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }

    if (activeTab === 'online') {
      return rel.status === 'accepted' && profile.status !== 'offline' && profile.status !== 'invisible';
    }
    if (activeTab === 'all') {
      return rel.status === 'accepted';
    }
    if (activeTab === 'pending') {
      return rel.status === 'pending';
    }
    return false;
  });

  return (
    <div id="friends_tab" className="flex-1 bg-[#14161A] flex flex-col h-full overflow-hidden text-[#E0E0E0] select-none">
      {/* Upper sub header navigation */}
      <div className="h-16 border-b border-[#1F2229] bg-[#14161A]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-sm font-semibold overflow-x-auto py-2">
          <div className="flex items-center gap-2 pr-3 border-r border-[#3f4147] text-white select-none whitespace-nowrap">
            <Users className="w-5 h-5 text-gray-400" />
            Друзья
          </div>

          <button
            onClick={() => setActiveTab('online')}
            className={`px-2.5 py-1 rounded-sm text-xs font-semibold cursor-pointer transition whitespace-nowrap ${activeTab === 'online' ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c]'}`}
          >
            В сети ({friends.filter(f => getFriendDetails(f).profile.status !== 'offline' && f.status === 'accepted').length})
          </button>
          
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-sm text-xs font-semibold cursor-pointer transition whitespace-nowrap ${activeTab === 'all' ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c]'}`}
          >
            Все друзья ({friends.filter(f => f.status === 'accepted').length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-2.5 py-1 rounded-sm text-xs font-semibold relative cursor-pointer transition whitespace-nowrap ${activeTab === 'pending' ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c]'}`}
          >
            Ожидание
            {friends.filter(f => f.status === 'pending' && f.receiverId === user.id).length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#f23f43]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-2 py-0.5 rounded font-bold text-xs bg-[#248046] text-white cursor-pointer transition flex items-center gap-1 hover:bg-[#1a6535] whitespace-nowrap`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Добавить
          </button>
        </div>
      </div>

      {/* Main Container body */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab !== 'add' ? (
          <div className="space-y-4 max-w-4xl mx-auto h-full flex flex-col">
            {/* Search filter input */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4] pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск по друзьям..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-1 bg-[#1e1f22] border-none rounded text-xs text-[#dbdee1] outline-none"
              />
            </div>

            {/* List block */}
            <div className="flex-1 space-y-2 mt-2">
              {filteredRelations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-[#949ba4] py-16 space-y-3">
                  <Smile className="w-12 h-12 text-[#4e5058] animate-bounce" />
                  <p className="text-sm font-semibold select-none">Здесь пока пусто!</p>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Добавьте друзей с помощью тега или инвайт-кода, чтобы начать общаться по голосовой связи и обмениваться файлами!
                  </p>
                </div>
              ) : (
                filteredRelations.map((rel) => {
                  const { profile, isRequester } = getFriendDetails(rel);
                  const isPendingIn = rel.status === 'pending' && !isRequester;
                  const isPendingOut = rel.status === 'pending' && isRequester;

                  return (
                    <motion.div
                      key={rel.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-[#2b2d31] hover:bg-[#35373c] rounded border border-transparent hover:border-[#3f4147] transition shadow-inner"
                    >
                      {/* Left user identity info */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#5865f2] border border-[#3f4147]">
                            {profile.avatar ? (
                              <img src={profile.avatar} alt={profile.nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm select-none">
                                {profile.nickname[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          {/* Connection marker status */}
                          {rel.status === 'accepted' && (
                            <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-1.5 border-[#2b2d31] ${
                              profile.status === 'online' ? 'bg-green-500' :
                              profile.status === 'idle' ? 'bg-amber-500' :
                              profile.status === 'dnd' ? 'bg-rose-500' :
                              'bg-gray-400'
                            }`} />
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-sm text-[white] flex items-center gap-1.5">
                            {profile.nickname || profile.username}
                            <span className="text-gray-400 text-xs font-normal">#{profile.tag || "0000"}</span>
                          </div>
                          <span className="text-xs text-[#949ba4] block max-w-xs truncate italic">
                            {isPendingIn ? 'Входящий запрос дружбы' : 
                             isPendingOut ? 'Исходящий запрос ожидания...' :
                             (profile.customStatusText || profile.description || 'В сети')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons triggers */}
                      <div className="flex items-center gap-2">
                        {isPendingIn && (
                          <>
                            <button
                              onClick={() => handleFriendAction(rel.id, 'accept')}
                              className="p-1.5 bg-[#248046] hover:bg-[#1a6535] rounded-full text-white cursor-pointer transition"
                              title="Принять запрос"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFriendAction(rel.id, 'decline')}
                              className="p-1.5 bg-[#f23f43]/20 hover:bg-[#f23f43] rounded-full text-rose-300 hover:text-white cursor-pointer transition"
                              title="Отклонить"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {isPendingOut && (
                          <button
                            onClick={() => handleFriendAction(rel.id, 'decline')}
                            className="px-2.5 py-1 bg-[#4e5058] hover:bg-[#f23f43] text-xs font-semibold rounded text-red-100 cursor-pointer transition"
                            title="Отменить"
                          >
                            Отменить
                          </button>
                        )}

                        {rel.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => startDmChat(profile.id)}
                              className="p-2 bg-[#1e1f22] hover:bg-[#313338] rounded-full text-[#b5bac1] hover:text-white cursor-pointer transition shadow border border-[#3f4147]"
                              title="Начать личный чат"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFriendAction(rel.id, 'block')}
                              className="p-2 bg-[#1e1f22]/50 hover:bg-[#f23f43]/15 rounded-full text-[#b5bac1] hover:text-red-300 cursor-pointer transition"
                              title="Заблокировать"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider mb-2">Добавить друга</h2>
              <p className="text-sm text-[#949ba4] leading-relaxed">
                Вы можете отправить запрос дружбы, вписав имя пользователя и его четырехзначный тег через решетку. Например: <code className="bg-[#1e1f22] text-[#f2f3f5] px-1.5 py-0.5 rounded font-mono text-xs">Sova#1122</code>.
                Также теперь вы можете добавить друга напрямую по его <strong className="text-purple-400">уникальному Коду Друга</strong> (например: <code className="bg-[#1e1f22] text-[#f2f3f5] px-1.5 py-0.5 rounded font-mono text-xs">user-s6m3b8d9</code>)!
              </p>
            </div>

            {/* My Personal Friend Code Display banner */}
            <div className="bg-[#1e1f22]/50 border border-[#3f4147]/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-350 hover:border-purple-500/40 hover:bg-[#1e1f22]/70">
              <div className="text-left">
                <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider mb-1">Ваш уникальный Код Друга</p>
                <p className="text-[11px] text-[#949ba4] leading-relaxed max-w-sm">
                  Скопируйте этот секретный код и отправьте его своим близким. Они смогут добавить вас в друзья моментально, вставив в поле ниже!
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#111214] border border-[#3f4147] py-2 px-3.5 rounded-lg select-all font-mono font-bold text-purple-400 text-sm shadow-inner shrink-0 xl:scale-105">
                <span>{user.id}</span>
                <button
                  onClick={handleCopyFriendCode}
                  type="button"
                  className="p-1 px-1.5 ml-1.5 hover:bg-white/5 text-[#949ba4] hover:text-white rounded transition cursor-pointer select-none active:scale-95"
                  title="Скопировать код"
                >
                  {copiedFriendCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-300 text-xs rounded-md">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/20 text-rose-300 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddFriend} className="flex gap-2.5 items-center">
              <input
                type="text"
                required
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                placeholder="Имя#0000 или Код друга (user-xxxxxxxxx)"
                className="flex-1 px-4 py-3 bg-[#1e1f22] border border-transparent rounded text-sm text-[#f2f3f5] outline-none focus:border-purple-600 transition placeholder-[#5c6066]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded shadow transition active:scale-[0.98] cursor-pointer flex items-center gap-1 shrink-0"
              >
                Отправить запрос
              </button>
            </form>

            <div className="border-t border-[#3f4147] pt-5">
              <span className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-3">Возможно вы знакомы</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allUsers
                  .filter(u => u.id !== user.id && !friends.some(f => f.requesterId === u.id || f.receiverId === u.id))
                  .map(suggestedUser => (
                    <div key={suggestedUser.id} className="p-3 bg-[#2b2d31] rounded flex items-center justify-between border border-[#3f4147]/40 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-900">
                          <img src={suggestedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{suggestedUser.nickname}</p>
                          <p className="text-[10px] text-gray-400 font-mono">@{suggestedUser.username.toLowerCase()}#{suggestedUser.tag}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFriendInput(`${suggestedUser.username}#${suggestedUser.tag}`);
                          setActiveTab('add');
                        }}
                        className="py-1 px-2.5 bg-purple-600/20 hover:bg-purple-600 text-[10px] font-bold rounded text-purple-300 hover:text-white cursor-pointer transition"
                      >
                        Выбрать
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
