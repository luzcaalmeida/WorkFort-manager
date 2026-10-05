import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark'; // 'light' is for white/light cards (navy text); 'dark' is for dark sidebar (white text)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  layout?: 'stacked' | 'horizontal';
}

export function Logo({
  variant = 'light',
  size = 'md',
  showSubtitle = true,
  className = '',
  layout = 'stacked'
}: LogoProps) {
  const isDark = variant === 'dark';

  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-sm shrink-0">
          🏗️
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-lg ${isDark ? 'text-white' : 'text-[#0b2545]'}`}>
              WORKFORT
            </span>
            <span className={`font-black tracking-tight text-lg ${isDark ? 'text-amber-400' : 'text-[#0b2545]'}`}>
              MANAGER
            </span>
          </div>
          {showSubtitle && (
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              SISTEMA DE GESTÃO DE OBRAS
            </span>
          )}
        </div>
      </div>
    );
  }

  // Stacked Layout matching the uploaded logo exactly
  const sizeStyles = {
    sm: {
      main: 'text-xl sm:text-2xl leading-none',
      sub: 'text-[8px] sm:text-[9px] tracking-[0.2em] mt-1.5',
    },
    md: {
      main: 'text-2xl sm:text-3xl leading-[0.95]',
      sub: 'text-[9px] sm:text-[10px] tracking-[0.22em] mt-2',
    },
    lg: {
      main: 'text-3xl sm:text-4xl lg:text-5xl leading-[0.92]',
      sub: 'text-xs sm:text-sm tracking-[0.25em] mt-3',
    },
    xl: {
      main: 'text-4xl sm:text-5xl lg:text-6xl leading-[0.9]',
      sub: 'text-sm sm:text-base tracking-[0.28em] mt-3.5',
    }
  }[size];

  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Linha 1 e 2: WORKFORT MANAGER */}
      <div className={`flex flex-col font-black tracking-tighter uppercase font-sans ${sizeStyles.main}`}>
        <span className={isDark ? 'text-white' : 'text-[#0b2545]'}>
          WORKFORT
        </span>
        <span className={isDark ? 'text-white' : 'text-[#0b2545]'}>
          MANAGER
        </span>
      </div>

      {/* Linha 3: SISTEMA DE GESTÃO DE OBRAS */}
      {showSubtitle && (
        <p className={`font-bold uppercase font-sans ${sizeStyles.sub} ${isDark ? 'text-slate-400' : 'text-[#475569]'}`}>
          SISTEMA DE GESTÃO DE OBRAS
        </p>
      )}
    </div>
  );
}

export default Logo;
