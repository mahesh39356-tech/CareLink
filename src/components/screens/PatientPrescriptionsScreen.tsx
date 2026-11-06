import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Bell,
  Sparkles,
} from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { useTelemedicine } from '../../state/telemedicineContext';
import { MedicineItem, PrescriptionRecord } from '../../types/telemedicine';
import { api } from '../../services/api';

export const PatientPrescriptionsScreen: React.FC = () => {
  const { setCurrentScreen, draftPatient } = useTelemedicine();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(draftPatient.id || '0418');
  const [notification, setNotification] = useState<string | null>(null);

  const activePatientName = draftPatient.fullName || 'Amina Mwangi';

  const loadPrescriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. First attempt to query by patient ID
      const res = await api.prescriptions.getByPatient(selectedPatientId);
      if (res && res.success && res.data) {
        setPrescriptions(res.data);
      } else {
        // Fallback: query by case
        const caseRes = await api.prescriptions.getByCase(selectedPatientId);
        if (caseRes && caseRes.success && caseRes.data) {
          setPrescriptions(caseRes.data.filter((p: any) => p.status === 'ISSUED' || p.status === 'AMENDED'));
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch patient prescriptions:', err);
      // Try fetching case prescriptions as fallback
      try {
        const caseRes = await api.prescriptions.getByCase(selectedPatientId);
        if (caseRes && caseRes.success && caseRes.data) {
          setPrescriptions(caseRes.data.filter((p: any) => p.status === 'ISSUED' || p.status === 'AMENDED'));
        }
      } catch (innerErr) {
        setError('Unable to load prescriptions. Please check connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [selectedPatientId]);

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9] overflow-y-auto no-scrollbar">
      <div>
        <AppHeader
          title="My Prescriptions"
          backTarget="register"
          stepIndicator="Patient Portal"
        />

        <div className="px-5 pt-4 pb-6 space-y-4">
          {/* Section Heading */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#0B463B] uppercase">
                TELE-CONSULTATION RECORDS
              </span>
              <h2 className="text-[24px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-0.5">
                My Prescriptions
              </h2>
              <p className="text-[13px] text-[#5C736F] mt-0.5">
                Officially signed e-prescriptions for <strong>{activePatientName}</strong> (ID: {selectedPatientId})
              </p>
            </div>

            <button
              type="button"
              onClick={loadPrescriptions}
              className="p-2 rounded-xl bg-white border border-gray-200 text-[#0B463B] hover:bg-emerald-50 shadow-xs transition-transform active:scale-95"
              title="Refresh Prescriptions"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* New Prescription Notification Banner */}
          {prescriptions.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[12px] font-bold text-emerald-900 leading-tight">
                  New Prescription Issued
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                  Prescription #{prescriptions[0].rxNumber} was reviewed, authorized, and digitally signed by Dr. Sarah Kimani.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Prescriptions List */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <div className="w-7 h-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Loading patient prescriptions...</p>
            </div>
          ) : prescriptions.length > 0 ? (
            <div className="space-y-4">
              {prescriptions.map((rx) => {
                let medicinesList: MedicineItem[] = [];
                try {
                  medicinesList = JSON.parse(rx.medicationsJson || '[]');
                } catch {
                  medicinesList = [];
                }

                const issueDateStr = rx.issuedAt
                  ? new Date(rx.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={rx.id}
                    className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-card space-y-3.5 text-left"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0B463B] flex items-center justify-center shadow-xs">
                          <FileText className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[14px] font-extrabold text-[#112622]">
                              {rx.rxNumber || 'Official Prescription'}
                            </h3>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.2 rounded-full">
                              {rx.status}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>Issued on {issueDateStr}</span>
                          </p>
                        </div>
                      </div>

                      {/* Download PDF button */}
                      <a
                        href={`/api/prescriptions/${rx.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0B463B] flex items-center gap-1.5 text-xs font-bold transition-colors shadow-2xs"
                        title="Download Official PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </a>
                    </div>

                    {/* Prescribing Doctor Badge */}
                    <div className="bg-[#F7FAF9] rounded-2xl p-2.5 flex items-center justify-between text-xs border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                          MD
                        </div>
                        <div>
                          <p className="font-bold text-[#112622] text-[11.5px] leading-tight">
                            {rx.doctorName || 'Dr. Sarah Kimani, MD'}
                          </p>
                          <p className="text-[9.5px] text-gray-500">
                            Reg. No: {rx.doctorRegNumber || 'KMPDC-REG-48819'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {/* Diagnosis */}
                    {rx.diagnosis && (
                      <div className="text-xs">
                        <span className="text-[9.5px] font-bold text-[#0B463B] uppercase tracking-wider block mb-0.5">
                          Clinical Diagnosis:
                        </span>
                        <p className="text-gray-800 font-semibold bg-gray-50 p-2 rounded-xl border border-gray-100">
                          {rx.diagnosis}
                        </p>
                      </div>
                    )}

                    {/* Medicines List */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[#0B463B]">
                        <span className="font-serif font-black text-sm">℞</span>
                        <span className="text-[10.5px] font-bold uppercase tracking-wider">
                          Prescribed Medicines ({medicinesList.length})
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {medicinesList.map((med, idx) => (
                          <div
                            key={idx}
                            className="bg-[#FAFCFC] border border-[#E5EBEA] rounded-xl p-2.5 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#112622] text-[12px]">
                                {idx + 1}. {med.name}
                              </span>
                              <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[10px]">
                                {med.strength}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-gray-600">
                              <span>
                                {med.dosage} • {med.frequency}
                              </span>
                              <span className="font-medium text-gray-500">
                                Duration: {med.duration}
                              </span>
                            </div>

                            {med.instructions && (
                              <p className="text-[10px] text-[#0B463B] font-semibold pt-0.5">
                                Instructions: {med.instructions}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Advice & Follow-up */}
                    {rx.clinicalRemarks && (
                      <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-xs text-amber-900 space-y-1">
                        <span className="text-[9.5px] font-bold uppercase tracking-wide block">
                          Doctor's Advice & Instructions:
                        </span>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                          {rx.clinicalRemarks}
                        </p>
                        {rx.followUpDate && (
                          <p className="text-[10.5px] font-bold text-amber-800 pt-0.5">
                            Follow-up: {rx.followUpDate}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Digital Signature Token & Footer Action */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-[9px] text-gray-400">
                        <span>Signature Hash: </span>
                        <span className="font-mono text-emerald-800 font-semibold">
                          {rx.digitalSignature?.substring(0, 14)}...
                        </span>
                      </div>

                      <a
                        href={`/api/prescriptions/${rx.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-[#0B463B] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-700">No Prescriptions Issued Yet</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                  Once your tele-specialist reviews your vitals, images and voice note, their officially signed digital prescription will appear here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentScreen('doctor')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B463B] text-white text-xs font-bold hover:bg-[#083830] transition-colors shadow-xs"
              >
                <span>Go to Doctor Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
