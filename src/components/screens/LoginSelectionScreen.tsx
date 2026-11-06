import React from 'react';
import { User, Stethoscope, ArrowRight, Shield, HeartPulse, Sparkles, Activity, CheckCircle2 } from 'lucide-react';
import { useTelemedicine } from '../../state/telemedicineContext';

export const LoginSelectionScreen: React.FC = () => {
  const { setCurrentScreen, setCurrentRole } = useTelemedicine();

  const handleSelectPatient = () => {
    setCurrentRole('PATIENT');
    setCurrentScreen('patient-login');
  };

  const handleSelectDoctor = () => {
    setCurrentRole('DOCTOR');
    setCurrentScreen('doctor-login');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-[#062E27] via-[#0B463B] to-[#041F1A] text-white p-6 select-none overflow-y-auto no-scrollbar">
      {/* Top Branding */}
      <div className="pt-4 space-y-3">
        <div className="inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-300 tracking-wider uppercase">
          <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
          <span>TAH-013 · Rural Telemedicine</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
          CareLink Tele-Health
        </h1>
        <p className="text-[13.5px] text-emerald-200/80 leading-relaxed">
          Low-bandwidth medical network connecting remote rural dispensaries with regional specialist physicians.
        </p>
      </div>

      {/* Main Two-Role Selection Cards */}
      <div className="my-auto py-6 space-y-4">
        <div className="text-[11px] font-bold tracking-widest text-emerald-400/90 uppercase px-1">
          Select Your Portal to Sign In
        </div>

        {/* 1. Patient Portal Card */}
        <div
          onClick={handleSelectPatient}
          className="bg-white/10 hover:bg-white/15 border border-emerald-400/30 hover:border-emerald-400/60 rounded-3xl p-5 cursor-pointer transition-all duration-200 active:scale-[0.98] shadow-lg backdrop-blur-md group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <User className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Rural Patient
            </span>
          </div>

          <div className="mt-3.5">
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-200 transition-colors">
              Patient Login
            </h3>
            <p className="text-xs text-emerald-100/75 mt-1 leading-snug">
              Intake form, record symptoms, upload clinical photos & voice notes, view doctor prescriptions.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-300">
            <span>Access Patient Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. Doctor Portal Card */}
        <div
          onClick={handleSelectDoctor}
          className="bg-white/10 hover:bg-white/15 border border-teal-300/30 hover:border-teal-300/60 rounded-3xl p-5 cursor-pointer transition-all duration-200 active:scale-[0.98] shadow-lg backdrop-blur-md group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-800 flex items-center justify-center text-white shadow-md">
              <Stethoscope className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="bg-cyan-400/20 text-cyan-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Tele-Specialist
            </span>
          </div>

          <div className="mt-3.5">
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
              Doctor Login
            </h3>
            <p className="text-xs text-emerald-100/75 mt-1 leading-snug">
              Clinical case inbox, WebP medical image inspection, audio voice playback, issue digital prescriptions.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-cyan-300">
            <span>Access Doctor Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Security & Low-Bandwidth Guarantee */}
      <div className="pt-2 pb-1 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 justify-center">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Role-Based End-to-End Encryption · 2G / Offline Compatible</span>
        </div>
      </div>
    </div>
  );
};
