import React from 'react';
import { TopPrototypeTabs } from './TopPrototypeTabs';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0A1118] flex flex-col items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Outer Phone Shell */}
      <div className="w-full max-w-[420px] h-[100dvh] sm:h-[890px] bg-[#062E27] sm:rounded-[44px] shadow-2xl border-0 sm:border-[8px] sm:border-[#1E293B] flex flex-col overflow-hidden relative">
        {/* Dynamic Island / Speaker Notch on mobile mockup */}
        <div className="bg-[#062E27] pt-2 px-6 pb-1 flex items-center justify-between select-none z-50">
          <span className="text-[12px] font-semibold text-emerald-100/80 tracking-tight">9:41</span>
          
          {/* Dynamic Island Pill */}
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end px-2 gap-1.5 shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-[#111827] border border-emerald-950 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-900/40" />
            </div>
            <div className="w-2 h-2 rounded-full bg-[#0a1f18]" />
          </div>

          <div className="flex items-center gap-1.5 text-emerald-100/80">
            <div className="flex gap-0.5 items-end h-2.5">
              <div className="w-0.5 h-1 bg-current rounded-xs" />
              <div className="w-0.5 h-1.5 bg-current rounded-xs" />
              <div className="w-0.5 h-2 bg-current rounded-xs" />
              <div className="w-0.5 h-2.5 bg-current/40 rounded-xs" />
            </div>
            <span className="text-[10px] font-bold">2G</span>
            <div className="w-4 h-2 border border-current rounded-xs p-0.5 flex items-center">
              <div className="w-2 h-full bg-current rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Top Figma Prototype Tab Switcher Bar */}
        <TopPrototypeTabs />

        {/* Screen Viewport */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-[#F7F9F9] relative no-scrollbar">
          {children}
        </div>

        {/* Bottom Home Indicator Bar */}
        <div className="bg-[#F7F9F9] py-1.5 flex justify-center items-center shrink-0 z-30">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};
