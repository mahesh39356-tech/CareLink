import React from 'react';
import { Search, Check, FileText } from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { PrimaryButton } from '../common/PrimaryButton';
import { useTelemedicine } from '../../state/telemedicineContext';

export const PatientRegisterScreen: React.FC = () => {
  const {
    draftPatient,
    setDraftPatient,
    setCurrentScreen,
    patientSearch,
    setPatientSearch,
  } = useTelemedicine();

  const handleCreateRecord = () => {
    // Ensure default patient name exists if blank
    if (!draftPatient.fullName?.trim()) {
      setDraftPatient((prev) => ({ ...prev, fullName: 'Amina M.' }));
    }
    setCurrentScreen('vitals');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9]">
      <div>
        <AppHeader title="Patient Register" />

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search registered patients"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full bg-white border border-[#E2E8F0] rounded-2xl pl-11 pr-4 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20 focus:border-[#0B463B] shadow-xs"
            />
          </div>

          {/* Section Heading */}
          <div className="pt-2">
            <span className="text-[11px] font-bold tracking-widest text-[#0B463B] uppercase">
              NEW PATIENT
            </span>
            <h2 className="text-[26px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-0.5">
              Rapid Offline Logging
            </h2>
            <p className="text-[13px] text-[#5C736F] mt-1 leading-relaxed">
              Capture essential details now. Complete the record when your connection improves.
            </p>
          </div>

          {/* Patient Form Card */}
          <div className="bg-white rounded-3xl p-5 shadow-card border border-[#E9EFEF] space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[13px] font-bold text-[#112622] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={draftPatient.fullName || ''}
                onChange={(e) =>
                  setDraftPatient((prev) => ({ ...prev, fullName: e.target.value }))
                }
                className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20 focus:border-[#0B463B]"
              />
            </div>

            {/* Age & Gender Row */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[13px] font-bold text-[#112622] mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  placeholder="Years"
                  value={draftPatient.age || ''}
                  onChange={(e) =>
                    setDraftPatient((prev) => ({ ...prev, age: e.target.value }))
                  }
                  className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20 focus:border-[#0B463B]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#112622] mb-1.5">
                  Gender
                </label>
                <div className="relative">
                  <select
                    value={draftPatient.gender || 'Select'}
                    onChange={(e) =>
                      setDraftPatient((prev) => ({
                        ...prev,
                        gender: e.target.value as any,
                      }))
                    }
                    className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-4 py-3 text-[14px] text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20 focus:border-[#0B463B]"
                  >
                    <option value="Select" disabled>
                      Select
                    </option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Checkbox */}
            <div className="pt-1 flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  setDraftPatient((prev) => ({
                    ...prev,
                    syncHistoryOnConnect: !prev.syncHistoryOnConnect,
                  }))
                }
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                  draftPatient.syncHistoryOnConnect
                    ? 'bg-[#0B463B] text-white shadow-xs'
                    : 'border-2 border-gray-300 bg-white'
                }`}
              >
                {draftPatient.syncHistoryOnConnect && (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
              </button>
              <div>
                <p className="text-[13px] font-bold text-[#112622] leading-tight">
                  Sync history when connected
                </p>
                <p className="text-[11px] text-[#5C736F] mt-0.5">
                  Uses optimized low-data transfer
                </p>
              </div>
            </div>

            {/* Create Record Action Button inside card */}
            <div className="pt-2">
              <PrimaryButton
                label="CREATE RECORD"
                onClick={handleCreateRecord}
                variant="primary"
              />
            </div>
          </div>

          {/* Quick Prescriptions Link */}
          <div className="bg-[#EBF7F4] border border-[#CDECE3] rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0B463B] flex items-center justify-center">
                <FileText className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#0B463B] leading-tight">
                  Doctor Prescriptions
                </p>
                <p className="text-[11px] text-[#5C736F]">
                  View and download issued medical regimens
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentScreen('prescriptions')}
              className="bg-white text-[#0B463B] text-[11px] font-bold px-3 py-1.5 rounded-lg border border-teal-200 shadow-xs hover:bg-teal-50 transition-colors"
            >
              View Prescriptions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
