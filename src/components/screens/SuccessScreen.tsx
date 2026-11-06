import React from 'react';
import { Activity, Check, Camera, Mic, Home, Lock } from 'lucide-react';
import { useTelemedicine } from '../../state/telemedicineContext';

export const SuccessScreen: React.FC = () => {
  const { setCurrentScreen, transmissionStats } = useTelemedicine();

  return (
    <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-[#093D34] to-[#062923] text-white p-6 relative overflow-hidden select-none">
      {/* Top Header Branding */}
      <div className="pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-emerald-300">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-[17px] font-extrabold text-white leading-tight tracking-tight">
              CareLink
            </h1>
            <p className="text-[9px] font-bold text-emerald-300/80 tracking-widest uppercase">
              RURAL HEALTH
            </p>
          </div>
        </div>
      </div>

      {/* Center Hero Checkmark Badge with Concentric Rings */}
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outermost ring */}
          <div className="w-36 h-36 rounded-full bg-emerald-500/10 absolute animate-pulse-subtle" />
          {/* Middle ring */}
          <div className="w-28 h-28 rounded-full bg-emerald-500/20 absolute" />
          {/* Core Green Check Badge */}
          <div className="w-20 h-20 rounded-full bg-[#10B981] flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 relative z-10">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
        </div>

        <span className="text-[11px] font-bold tracking-widest text-emerald-300 uppercase">
          TRANSMISSION COMPLETE
        </span>
        <h2 className="text-[26px] font-extrabold text-white tracking-tight mt-1 leading-snug px-2">
          Packets Transmitted Successfully
        </h2>
        <p className="text-[13px] text-emerald-200/80 mt-1 font-medium">
          over 2G / 3G network
        </p>

        {/* Payload Inspection Card */}
        <div className="w-full max-w-sm mt-7 bg-white/[0.06] backdrop-blur-md rounded-3xl border border-white/10 p-4.5 space-y-3.5 text-left">
          {/* Row 1: Image Payload */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-medium text-emerald-100">
                Estimated image payload
              </span>
            </div>
            <span className="text-[14px] font-bold text-white tabular-nums">
              {transmissionStats.imagePayloadKb} KB
            </span>
          </div>

          {/* Row 2: Audio Payload */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                <Mic className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-medium text-emerald-100">
                Estimated audio payload
              </span>
            </div>
            <span className="text-[14px] font-bold text-white tabular-nums">
              {transmissionStats.audioPayloadKb} KB
            </span>
          </div>

          <div className="border-t border-white/10 pt-3 flex items-center justify-center gap-2 text-[12px] font-semibold text-emerald-300">
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{transmissionStats.deliveredCount} patient records delivered securely</span>
          </div>
        </div>
      </div>

      {/* Bottom Home Action & Security Disclaimer */}
      <div className="space-y-4 pb-2">
        <button
          onClick={() => setCurrentScreen('register')}
          className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-emerald-50 text-[#083830] font-extrabold text-[14px] tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-black/20 active:scale-[0.99] transition-transform"
        >
          <Home className="w-4 h-4 stroke-[2.5]" />
          <span>RETURN TO HOME</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-300/60 font-medium">
          <Lock className="w-3 h-3 text-emerald-400/60" />
          <span>End-to-end encrypted transmission</span>
        </div>
      </div>
    </div>
  );
};
