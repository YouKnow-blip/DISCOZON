import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Paperclip, Smile, Edit2, Trash2, CornerUpLeft, 
  Pin, MessageSquare, Play, FileText, Image as ImageIcon, 
  Heart, Flame, ThumbsUp, Trash, X
} from 'lucide-react';
import { Message, Attachment } from '../types';
import { Logo } from './Logo';

export const ChatArea: React.FC = () => {
  const { 
    user, 
    token, 
    channelMessages, 
    activeChannelId, 
    activeServerId, 
    servers, 
    wsSend, 
    allUsers, 
    activeDmUserId,
    friends,
    loadFriends,
    setActiveDmUserId,
    setActiveServerId,
    setActiveChannelId
  } = useSocket();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPickerForId, setShowEmojiPickerForId] = useState<string | null>(null);
  const [selectedUserCard, setSelectedUserCard] = useState<any | null>(null);

  // Auto-scroll to lowest message on refresh
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  if (!activeChannelId && !activeDmUserId) {
    return (
      <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center text-center p-8 select-none">
        <Logo size="xl" className="mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Добро пожаловать в DISCOZON!</h2>
        <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
          Выберите текстовый или голосовой канал слева, либо пообщайтесь со своими друзьями через Личные сообщения!
        </p>
      </div>
    );
  }

  // Get active text channel or target DM user
  let headerTitle = "общий-чат";
  let headerDescription = "Главный текстовый канал";
  let isChannelAnnouncements = false;

  if (activeChannelId) {
    for (const s of servers) {
      const c = s.channels.find(chan => chan.id === activeChannelId);
      if (c) {
        headerTitle = c.name;
        headerDescription = c.description || "Текстовое общение";
        isChannelAnnouncements = c.type === 'announcement';
        break;
      }
    }
  } else if (activeDmUserId) {
    const dmUser = allUsers.find(u => u.id === activeDmUserId);
    headerTitle = dmUser ? `@${dmUser.nickname}` : "Личные сообщения";
    headerDescription = dmUser ? `Прямой диалог с ${dmUser.nickname}` : "Приватное общение";
  }

  // Handle local markdown translation safely
  const renderMarkdownText = (markdown: string) => {
    if (!markdown) return '';
    let html = markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold replacement
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    // Italic replacement
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>');
    // Inline code block
    html = html.replace(/`(.*?)`/g, '<code class="font-mono text-xs bg-[#1e1f22] text-[#f2f3f5] px-1.5 py-0.5 rounded border border-[#3f4147]/50">$1</code>');
    
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Upload dynamic attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: reader.result as string
          })
        });

        const data = await res.json();
        if (res.ok) {
          setAttachments(prev => [...prev, {
            name: data.name,
            url: data.url,
            type: data.type,
            size: data.size
          }]);
        }
      } catch (err) {
        console.error("Attachment upload failure: ", err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit standard chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && attachments.length === 0) return;
    if (!user) return;

    const channelTarget = activeChannelId || `dm-${activeDmUserId}-${user.id}`;

    const newMsg = {
      id: "m-" + Math.random().toString(36).substring(2, 11),
      senderId: user.id,
      senderName: user.nickname || user.username,
      senderAvatar: user.avatar,
      senderTag: user.tag,
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
      replyToId: replyMessage ? replyMessage.id : undefined,
      replyTo: replyMessage ? {
        id: replyMessage.id,
        senderName: replyMessage.senderName,
        content: replyMessage.content
      } : undefined
    };

    wsSend("MESSAGE_SEND", {
      channelId: channelTarget,
      message: newMsg
    });

    // Reset toolbar values
    setText('');
    setReplyMessage(null);
    setAttachments([]);
  };

  // Modify existing message content
  const saveEditedMessage = (messageId: string) => {
    if (!editText.trim()) return;
    const channelTarget = activeChannelId || `dm-${activeDmUserId}-${user?.id}`;

    wsSend("MESSAGE_EDIT", {
      channelId: channelTarget,
      messageId,
      content: editText
    });

    setEditingMessageId(null);
    setEditText('');
  };

  // Deletes target message
  const deleteMessage = (messageId: string) => {
    const channelTarget = activeChannelId || `dm-${activeDmUserId}-${user?.id}`;
    wsSend("MESSAGE_DELETE", {
      channelId: channelTarget,
      messageId
    });
  };

  // Reaction click toggle
  const sendReaction = (messageId: string, emoji: string) => {
    if (!user) return;
    const channelTarget = activeChannelId || `dm-${activeDmUserId}-${user.id}`;

    wsSend("MESSAGE_REACTION", {
      channelId: channelTarget,
      messageId,
      emoji,
      userId: user.id
    });
    setShowEmojiPickerForId(null);
  };

  const getAttachmentIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
    if (mime.startsWith('audio/')) return <Play className="w-5 h-5 text-green-400 animate-pulse" />;
    return <FileText className="w-5 h-5 text-cyan-400" />;
  };

  return (
    <div id="chat_area" className="flex-1 bg-[#14161A] flex flex-col h-full overflow-hidden text-[#E0E0E0]">
      
      {/* Messages Column Upper Header bar */}
      <div className="h-16 border-b border-[#1F2229] px-6 flex items-center justify-between shrink-0 select-none bg-[#14161A]/80 backdrop-blur">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xl text-gray-400 font-normal">#</span>
          <span className="font-sans font-bold text-white text-sm truncate">{headerTitle}</span>
          <span className="text-gray-500 mx-1.5 font-light">|</span>
          <span className="text-xs text-[#949ba4] truncate">{headerDescription}</span>
        </div>
      </div>

      {/* Messages Stream Scroller lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {channelMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#949ba4] py-10 select-none">
            <MessageSquare className="w-12 h-12 text-[#4e5058] animate-pulse mb-3" />
            <h4 className="text-sm font-semibold">Добро пожаловать в начало истории канала #{headerTitle}!</h4>
            <p className="text-xs max-w-xs leading-relaxed">Отправьте первое сообщение, чтобы запустить общение.</p>
          </div>
        ) : (
          channelMessages.map((msg: Message) => {
            const isMyOwn = msg.senderId === user?.id;
            const isEditing = editingMessageId === msg.id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col p-2.5 hover:bg-[#2e3035] rounded transition duration-150-all"
              >
                {/* Embedded message reply link */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1.5 ml-11 text-xs text-gray-400 mb-1 select-none">
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span className="font-bold text-[#b5bac1]">{msg.replyTo.senderName}:</span>
                    <span className="truncate max-w-[250px] italic">{msg.replyTo.content}</span>
                  </div>
                )}

                {/* Primary message layout row */}
                <div className="flex gap-3 items-start">
                  {/* Sender Avatar */}
                  <div 
                    onClick={() => setSelectedUserCard(msg)}
                    className="w-10 h-10 rounded-full overflow-hidden bg-[#5865f2] shrink-0 border border-transparent shadow select-none cursor-pointer hover:opacity-85 active:scale-95 transition"
                  >
                    {msg.senderAvatar ? (
                      <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm select-none">
                        {msg.senderName[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Right side contents */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 select-none">
                      <span 
                        onClick={() => setSelectedUserCard(msg)}
                        className="font-bold text-sm text-[white] hover:underline cursor-pointer"
                      >
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">@{msg.senderTag}</span>
                      <span className="text-[9px] text-[#949ba4] font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.editedAt && (
                        <span className="text-[8px] text-gray-500 italic lowercase">(изменено)</span>
                      )}
                    </div>

                    {/* Content text */}
                    <div className="text-sm text-[#dbdee1] leading-relaxed mt-1 break-words">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveEditedMessage(msg.id);
                              }
                            }}
                            className="w-full p-2.5 bg-[#1e1f22] rounded border border-purple-500 outline-none text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2 justify-end self-end">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="text-xs px-2.5 py-1 bg-gray-600 hover:bg-gray-500 rounded font-semibold cursor-pointer text-white"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={() => saveEditedMessage(msg.id)}
                              className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded font-bold cursor-pointer text-white"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      ) : (
                        renderMarkdownText(msg.content)
                      )}
                    </div>

                    {/* Render message attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2 select-none">
                        {msg.attachments.map((file, idx) => (
                          <div key={idx} className="max-w-sm rounded bg-[#2b2d31] border border-[#3f4147] overflow-hidden shadow">
                            {file.type.startsWith('image/') ? (
                              <div className="relative">
                                <img src={file.url} alt={file.name} className="w-full max-h-48 object-cover" referrerPolicy="no-referrer" />
                                <div className="p-2 bg-black/60 text-[10px] text-white flex justify-between">
                                  <span className="truncate max-w-[180px]">{file.name}</span>
                                  <span>{(file.size / 1024).toFixed(1)} КБ</span>
                                </div>
                              </div>
                            ) : file.type.startsWith('audio/') ? (
                              <div className="p-3">
                                <span className="text-xs text-white block truncate mb-1.5 font-bold">{file.name}</span>
                                <audio src={file.url} controls className="w-full h-8 outline-none" />
                              </div>
                            ) : (
                              <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getAttachmentIcon(file.type)}
                                  <div>
                                    <span className="text-xs text-white block font-semibold truncate max-w-[180px]">{file.name}</span>
                                    <span className="text-[10px] text-gray-400 block font-mono">{(file.size / 1024).toFixed(1)} КБ</span>
                                  </div>
                                </div>
                                <a
                                  href={file.url}
                                  download
                                  className="text-xs font-bold text-purple-400 hover:underline cursor-pointer"
                                >
                                  Скачать
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message reactions representation row */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5 select-none">
                        {msg.reactions.map((react, k) => {
                          const hasIReacted = user ? react.users.includes(user.id) : false;
                          return (
                            <button
                              key={k}
                              onClick={() => sendReaction(msg.id, react.emoji)}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold cursor-pointer transition ${hasIReacted ? 'bg-purple-600/10 border-purple-500 text-purple-400' : 'bg-[#1e1f22] border-transparent hover:bg-[#35373c] text-gray-300'}`}
                            >
                              <span>{react.emoji}</span>
                              <span className="text-[10px] font-semibold">{react.users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover action toolbar */}
                <div className="absolute right-4 top-[-14px] opacity-0 group-hover:opacity-100 transition duration-150-all z-20 flex items-center bg-[#313338] border border-[#3f4147] rounded shadow-md overflow-hidden select-none">
                  <button
                    onClick={() => {
                      setReplyMessage(msg);
                      fileInputRef.current?.focus();
                    }}
                    className="p-1 px-2.5 hover:bg-[#3f4147] text-gray-300 hover:text-white transition cursor-pointer"
                    title="Ответить"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Add Reactions quick bar */}
                  <button
                    onClick={() => setShowEmojiPickerForId(showEmojiPickerForId === msg.id ? null : msg.id)}
                    className="p-1 px-2.5 hover:bg-[#3f4147] text-gray-300 hover:text-white transition cursor-pointer"
                    title="Добавить реакцию"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  {isMyOwn && (
                    <>
                      <button
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditText(msg.content);
                        }}
                        className="p-1 px-2.5 hover:bg-[#3f4147] text-gray-300 hover:text-white transition cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 px-2.5 hover:bg-[#3f4147] text-gray-300 hover:text-rose-400 transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Popover reactions picker selectors */}
                <AnimatePresence>
                  {showEmojiPickerForId === msg.id && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="absolute right-4 top-[20px] bg-[#1e1f22] p-2 rounded shadow-xl border border-[#3f4147] z-30 flex gap-2 select-none"
                    >
                      {['👍', '❤️', '🔥', '😂', '👏', '🦉', '❄️'].map((emo) => (
                        <button
                          key={emo}
                          onClick={() => sendReaction(msg.id, emo)}
                          className="text-lg p-1 px-1.5 hover:bg-gray-700 rounded transition cursor-pointer"
                        >
                          {emo}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply header alert indicator box */}
      {replyMessage && (
        <div className="bg-[#2b2d31] p-2 px-4 flex justify-between items-center text-xs text-gray-400 select-none border-t border-[#1e1f22]">
          <span className="flex items-center gap-1">
            <CornerUpLeft className="w-4.5 h-4.5" /> Ответ пользователю <strong className="text-white">@{replyMessage.senderName}</strong>
          </span>
          <button
            onClick={() => setReplyMessage(null)}
            className="text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
          >
            Отмена
          </button>
        </div>
      )}

      {/* File Upload Attachment bar display */}
      {attachments.length > 0 && (
        <div className="mx-4 p-2.5 bg-[#2b2d31] rounded-md border border-purple-500/30 flex flex-wrap gap-2 select-none">
          {attachments.map((attach, k) => (
            <div key={k} className="flex items-center gap-2 p-1.5 px-3 bg-[#1e1f22] rounded text-xs text-[#dbdee1]">
              {getAttachmentIcon(attach.type)}
              <span className="truncate max-w-[150px] font-semibold">{attach.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== k))}
                className="hover:text-red-400 ml-1.5 cursor-pointer bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Text entry form input */}
      <form onSubmit={handleSendMessage} className="p-4 shrink-0 select-none">
        <div className="relative bg-[#383a40] rounded-lg p-2.5 flex items-center gap-2.5">
          {/* File attach micro-button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 px-1.5 rounded text-gray-400 hover:text-white bg-transparent hover:bg-gray-700/30 cursor-pointer transition shrink-0"
            disabled={isUploading}
            title="Прикрепить файл"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isUploading}
            placeholder={isUploading ? "Файл загружается к серверу..." : `Отправить сообщение в #${headerTitle}`}
            className="flex-1 bg-transparent border-none text-sm outline-none text-[#dbdee1] placeholder-[#5c6066]"
          />

          <button
            type="submit"
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold cursor-pointer transition flex items-center justify-center shrink-0 shadow active:scale-[0.98]"
            title="Отправить"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Selected Message Sender Interactive Profile Hover Action Card modal */}
      <AnimatePresence>
        {selectedUserCard && (() => {
          const pId = selectedUserCard.senderId;
          const pName = selectedUserCard.senderName;
          const pAvatar = selectedUserCard.senderAvatar;
          const pTag = selectedUserCard.senderTag || "1024";

          const isMe = pId === user?.id;

          const isFriend = friends.some(f => 
            f.status === 'accepted' && 
            ((f.requesterId === user?.id && f.receiverId === pId) || 
             (f.requesterId === pId && f.receiverId === user?.id))
          );

          const handleAddNewFriend = async () => {
            try {
              const res = await fetch("/api/friends/request", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ friendKeyword: `${pName}#${pTag}` })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Не удалось отправить запрос");

              if (data.relation && data.relation.id) {
                await fetch(`/api/friends/${data.relation.id}/action`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ action: "accept" })
                });
              }
              
              await loadFriends();
              setSelectedUserCard(prev => prev ? { ...prev, justAdded: true } : prev);
            } catch (e: any) {
              console.error(e);
              setSelectedUserCard(prev => prev ? { ...prev, justAddedError: e.message } : prev);
            }
          };

          return (
            <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
              <motion.div 
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="w-full max-w-xs bg-[#111214] border border-[#1f2229] rounded-xl overflow-hidden shadow-2xl flex flex-col relative text-left"
              >
                {/* Decorative top header banner */}
                <div className="h-16 bg-purple-600/35 relative">
                  <button 
                    type="button"
                    onClick={() => setSelectedUserCard(null)}
                    className="absolute top-2.5 right-2.5 p-1 bg-black/40 text-gray-300 hover:text-white rounded-full transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Avatar position offset */}
                <div className="relative px-4 pb-4 flex flex-col">
                  <div className="absolute -top-9 left-4 w-18 h-18 rounded-full border-4 border-[#111214] bg-[#2b2d31] overflow-hidden">
                    {pAvatar ? (
                      <img src={pAvatar} alt={pName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold font-sans text-white uppercase select-none">
                        {pName[0]}
                      </div>
                    )}
                  </div>

                  {/* Identity names block */}
                  <div className="mt-11 select-none">
                    <h4 className="text-white text-base font-bold font-sans leading-tight">
                      {pName}
                    </h4>
                    <p className="text-gray-400 font-mono text-xs mt-0.5 select-all">@{pTag}</p>
                  </div>

                  <div className="w-full h-[1px] bg-[#1f2229] my-3 shrink-0" />

                  {/* Status block */}
                  <div className="space-y-1 select-none mb-3">
                    <p className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider font-sans">О пользователе</p>
                    <p className="text-xs text-gray-300 font-sans leading-relaxed">Пользователь платформы DISCOZON. Готов к общению и совместным играм!</p>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-green-400 font-sans">В сети</span>
                  </div>

                  {/* Direct Action triggers */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {!isMe && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveServerId(null);
                            setActiveChannelId(null);
                            setActiveDmUserId(pId);
                            setSelectedUserCard(null);
                          }}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold font-sans cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-97 shadow"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Написать сообщение (ЛС)</span>
                        </button>

                        {selectedUserCard.justAdded ? (
                          <div className="py-2 bg-[#0e2714] border border-[#164e23] rounded text-xs font-extrabold text-green-400 text-center select-none shadow">
                            🎉 Вы теперь друзья!
                          </div>
                        ) : selectedUserCard.justAddedError ? (
                          <div className="py-2 bg-[#2d0f13] border border-[#58151c] rounded text-xs font-semibold text-rose-400 text-center select-none shadow px-1">
                            {selectedUserCard.justAddedError}
                          </div>
                        ) : isFriend ? (
                          <div className="py-1.5 bg-[#1b1d22] border border-[#2b2d31] rounded text-[11px] font-semibold text-emerald-400 text-center select-none flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Вы уже друзья
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAddNewFriend}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold font-sans cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-97 shadow"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Добавить в друзья</span>
                          </button>
                        )}
                      </>
                    )}

                    {isMe && (
                      <div className="py-2 bg-[#1b1d22] border border-[#1f2229] rounded text-[11px] font-semibold text-gray-400 text-center select-none font-sans">
                        Это ваш собственный профиль
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};
