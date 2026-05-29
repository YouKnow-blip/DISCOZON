import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const getDims = () => {
    switch (size) {
      case 'sm': return 'w-6 h-6';
      case 'lg': return 'w-12 h-12';
      case 'xl': return 'w-16 h-16';
      case 'md':
      default:
        return 'w-10 h-10';
    }
  };

  return (
    <div className={`relative ${getDims()} ${className} flex items-center justify-center select-none`}>
      {/* Dynamic ambient back glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 rounded-full blur-md opacity-40 animate-pulse" />
      
      {/* High tech modular graphic vector */}
      <svg 
        className="w-full h-full relative z-10 animate-[spin_8s_linear_infinite]" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" /> {/* purple-500 */}
            <stop offset="40%" stopColor="#ec4899" /> {/* pink-500 */}
            <stop offset="100%" stopColor="#6366f1" /> {/* indigo-500 */}
          </linearGradient>
        </defs>

        {/* Outer segmented space-orbit ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="42" 
          stroke="url(#logoGrad)" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeDasharray="140 60" 
        />
        
        {/* Middle reverse spinning dashed orbit ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="28" 
          stroke="url(#logoGrad)" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeDasharray="60 40" 
          style={{ 
            transformOrigin: 'center',
            animation: 'spin 4s linear infinite reverse' 
          }} 
        />

        {/* Inner core pulsate crown */}
        <circle 
          cx="50" 
          cy="50" 
          r="13" 
          fill="url(#logoGrad)" 
          className="animate-pulse"
        />
        
        {/* Floating cyber satellite dot pin */}
        <circle 
          cx="50" 
          cy="10" 
          r="4.5" 
          fill="#ffffff" 
          className="shadow-md"
        />
      </svg>
    </div>
  );
};
