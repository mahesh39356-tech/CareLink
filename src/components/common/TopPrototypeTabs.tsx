import React from 'react';
import { useTelemedicine } from '../../state/telemedicineContext';
import { ScreenId } from '../../types/telemedicine';

export const TopPrototypeTabs: React.FC = () => {
  const { currentScreen, setCurrentScreen, currentRole, logout } = useTelemedicine();

  const tabs: { id: ScreenId; label: string }[] = [
    { id: 'portal-select', label: '🏠 Select Portal' },
    { id: 'patient-login', label: 'Patient Login' },
    { id: 'register', label: 'Patient Register' },
    { id: 'vitals', label: 'Vitals Capt' },
    { id: 'media', label: 'Media Capture' },
    { id: 'outbox', label: 'Outbox' },
    { id: 'success', label: 'Success' },
    { id: 'doctor-login', label: 'Doctor Login' },
    { id: 'doctor', label: "Doctor's Dashboard" },
    { id: 'prescriptions', label: 'My Prescriptions' },
  ];

  return (
    <div className="bg-[#062E27] px-3 py-2 border-b border-emerald-950/60 overflow-x-auto no-scrollbar flex items-center gap-1.5 z-40 select-none">
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentScreen(tab.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
              isActive
                ? 'bg-[#0B463B] text-white border border-emerald-400/50 shadow-sm shadow-emerald-900/50'
                : 'text-emerald-300/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
