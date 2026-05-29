import React, { useState } from 'react';
import { useSocket } from './SocketContext';
import { motion } from 'motion/react';
import { Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';

export const AuthScreen: React.FC = () => {
  const { setUser, setToken, loadServers } = useSocket();
  const [isLogin, setIsLogin] = useState(true);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Произошла непредвиденная ошибка');
      }

      // Success
      setToken(data.token);
      setUser(data.user);
      await loadServers();
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts helpful suggestion
  const handleFillDemo = (type: 'sova' | 'alina' | 'mixa') => {
    if (type === 'sova') {
      setEmail('sova@discozon.ru');
    } else if (type === 'alina') {
      setEmail('alina@discozon.ru');
    } else {
      setEmail('mixa@discozon.ru');
    }
    setPassword('123456');
    setIsLogin(true);
  };

  return (
    <div 
      id="auth_page" 
      className="relative flex items-center justify-center min-h-screen w-full bg-[#111214] text-[#dbdee1] p-4 overflow-hidden select-none"
    >
      {/* Decorative backdrop blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-[480px] bg-[#2b2d31] p-8 rounded-lg shadow-2xl flex flex-col items-center"
      >
        {/* DISCOZON brand branding heading */}
        <div className="flex items-center gap-3 mb-2">
          <Logo size="md" />
          <span className="font-sans font-extrabold tracking-widest text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">DISCOZON</span>
        </div>
        <p className="text-[#949ba4] text-sm text-center mb-6">
          {isLogin ? 'Рады видеть вас снова! Войдите в аккаунт.' : 'Создайте новый аккаунт для старта общения'}
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="w-full flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 p-3 rounded-md text-rose-300 text-xs mb-4"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Никнейм</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
                <input
                  type="text"
                  required
                  placeholder="Например, SovaPRO"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1e1f22] border border-transparent rounded-md text-sm outline-none focus:border-purple-600 transition text-[#f2f3f5] placeholder-[#5c6066]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Электронная почта</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1e1f22] border border-transparent rounded-md text-sm outline-none focus:border-purple-600 transition text-[#f2f3f5] placeholder-[#5c6066]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
              <input
                type="password"
                required
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1e1f22] border border-transparent rounded-md text-sm outline-none focus:border-purple-600 transition text-[#f2f3f5] placeholder-[#5c6066]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm rounded-md shadow-lg transition active:scale-[0.98] mt-2 cursor-pointer flex items-center justify-center gap-1"
          >
            {loading ? 'Обработка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div className="mt-4 text-xs">
          <span className="text-[#949ba4]">
            {isLogin ? 'Нужен аккаунт? ' : 'Уже есть аккаунт? '}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-purple-400 hover:underline hover:text-purple-300 font-medium bg-transparent border-none cursor-pointer"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>

        {/* Demo Fast Login Panel */}
        <div className="w-full mt-6 pt-5 border-t border-[#3f4147] flex flex-col items-center">
          <span className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider mb-2.5 flex items-center gap-1 text-[#b5bac1]">
            <Sparkles className="w-3 h-3 text-purple-400" /> Быстрый вход (Демо)
          </span>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => handleFillDemo('sova')}
              className="flex-1 py-1.5 px-2 bg-[#1e1f22] hover:bg-[#35373c] text-xs font-medium rounded text-purple-300 transition cursor-pointer"
            >
              🦉 Sova
            </button>
            <button
              onClick={() => handleFillDemo('mixa')}
              className="flex-1 py-1.5 px-2 bg-[#1e1f22] hover:bg-[#35373c] text-xs font-medium rounded text-pink-300 transition cursor-pointer"
            >
              🎹 Mixa
            </button>
            <button
              onClick={() => handleFillDemo('alina')}
              className="flex-1 py-1.5 px-2 bg-[#1e1f22] hover:bg-[#35373c] text-xs font-medium rounded text-cyan-300 transition cursor-pointer"
            >
              🛡️ Alina
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
