import React from 'react';
import { Activity, Thermometer, Heart, Cloud, Check } from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { ConnectionBanner } from '../common/ConnectionBanner';
import { PrimaryButton } from '../common/PrimaryButton';
import { useTelemedicine } from '../../state/telemedicineContext';

export const VitalsCaptureScreen: React.FC = () => {
  const { draftPatient, setDraftPatient, setCurrentScreen } = useTelemedicine();

  const handleSaveOffline = () => {
    setCurrentScreen('media');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9]">
      <div>
        <AppHeader
          title="Vitals Capture"
          backTarget="register"
          stepIndicator="2 / 4"
        />

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Connection status banner */}
          <ConnectionBanner
            statusText="Connection: Poor 2G"
            badgeText="Offline ready"
          />

          {/* Active Patient Pill */}
          <div className="bg-white rounded-2xl p-3 border border-[#E9EFEF] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D1EBE5] text-[#0B463B] font-bold text-sm flex items-center justify-center">
                {draftPatient.fullName
                  ? draftPatient.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'AM'}
              </div>
              <div>
                <p className="text-[11px] text-[#5C736F] font-medium leading-none mb-1">
                  Recording vitals for
                </p>
                <p className="text-[15px] font-bold text-[#112622] leading-none">
                  {draftPatient.fullName || 'Amina M.'}
                </p>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600">
              ID {draftPatient.id || '0418'}
            </div>
          </div>

          {/* Section Heading */}
          <div className="pt-1">
            <span className="text-[11px] font-bold tracking-widest text-[#0B463B] uppercase">
              CLINICAL READINGS
            </span>
            <h2 className="text-[24px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-0.5">
              Enter current vitals
            </h2>
          </div>

          {/* Vitals Input Cards List */}
          <div className="space-y-3">
            {/* Blood Pressure */}
            <div className="bg-white rounded-2xl p-4 border border-[#E9EFEF] shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Activity className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#112622]">
                    Blood Pressure
                  </p>
                  <p className="text-[11px] text-[#5C736F]">
                    Systolic / diastolic
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-3 py-2 text-right">
                <input
                  type="text"
                  value={draftPatient.systolic ? `${draftPatient.systolic} / ${draftPatient.diastolic}` : '120 / 80'}
                  onChange={(e) => {
                    const parts = e.target.value.split('/');
                    setDraftPatient((prev) => ({
                      ...prev,
                      systolic: parts[0]?.trim() || '',
                      diastolic: parts[1]?.trim() || '',
                    }));
                  }}
                  className="w-16 text-right font-semibold text-[14px] text-gray-900 bg-transparent focus:outline-none"
                />
                <span className="text-[11px] font-medium text-gray-500">mmHg</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-white rounded-2xl p-4 border border-[#E9EFEF] shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Thermometer className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#112622]">
                    Temperature
                  </p>
                  <p className="text-[11px] text-[#5C736F]">
                    Body temperature
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-3 py-2 text-right">
                <input
                  type="text"
                  value={draftPatient.temperature || '36.8'}
                  onChange={(e) =>
                    setDraftPatient((prev) => ({ ...prev, temperature: e.target.value }))
                  }
                  className="w-12 text-right font-semibold text-[14px] text-gray-900 bg-transparent focus:outline-none"
                />
                <span className="text-[11px] font-medium text-gray-500">°C</span>
              </div>
            </div>

            {/* Heart Rate */}
            <div className="bg-white rounded-2xl p-4 border border-[#E9EFEF] shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#112622]">
                    Heart Rate
                  </p>
                  <p className="text-[11px] text-[#5C736F]">
                    Beats per minute
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-3 py-2 text-right">
                <input
                  type="text"
                  value={draftPatient.heartRate || '72'}
                  onChange={(e) =>
                    setDraftPatient((prev) => ({ ...prev, heartRate: e.target.value }))
                  }
                  className="w-10 text-right font-semibold text-[14px] text-gray-900 bg-transparent focus:outline-none"
                />
                <span className="text-[11px] font-medium text-gray-500">bpm</span>
              </div>
            </div>
          </div>

          {/* Stored Offline Status */}
          <div className="bg-white/80 rounded-2xl px-4 py-3 border border-[#E9EFEF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <Cloud className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#112622]">Stored Offline</p>
                <p className="text-[11px] text-[#5C736F]">Encrypted on this device</p>
              </div>
            </div>
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="p-5 pb-6">
        <PrimaryButton
          label="SAVE OFFLINE"
          onClick={handleSaveOffline}
          variant="primary"
        />
      </div>
    </div>
  );
};
