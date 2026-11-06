import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  ShieldCheck,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { MedicineItem, PatientRecord, PrescriptionRecord } from '../../types/telemedicine';
import { api } from '../../services/api';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseRecord: PatientRecord;
  onPrescriptionIssued?: (prescription: PrescriptionRecord) => void;
}

const COMMON_MEDICINES = [
  { name: 'Amoxicillin', strength: '500mg', dosage: '1 capsule', frequency: 'Three times daily', duration: '7 days', instructions: 'After food with water' },
  { name: 'Paracetamol', strength: '500mg', dosage: '1-2 tablets', frequency: 'Every 6 hours as needed', duration: '3 days', instructions: 'After meals' },
  { name: 'Cetirizine', strength: '10mg', dosage: '1 tablet', frequency: 'Once daily at bedtime', duration: '5 days', instructions: 'Before sleep' },
  { name: 'Oral Rehydration Salts (ORS)', strength: '1 sachet in 1L water', dosage: '200ml', frequency: 'After every loose motion', duration: '3 days', instructions: 'Sip slowly' },
  { name: 'Azithromycin', strength: '250mg', dosage: '2 tablets on day 1, then 1 daily', frequency: 'Once daily', duration: '5 days', instructions: '1 hour before food' },
  { name: 'Hydrocortisone 1% Cream', strength: '15g tube', dosage: 'Thin layer', frequency: 'Twice daily', duration: '7 days', instructions: 'Apply topically to clean affected area' },
];

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  caseRecord,
  onPrescriptionIssued,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    {
      name: 'Amoxicillin',
      strength: '500mg',
      dosage: '1 capsule',
      frequency: 'Three times daily (TID)',
      duration: '7 days',
      instructions: 'Take after meals with plenty of water',
    },
  ]);
  const [clinicalRemarks, setClinicalRemarks] = useState(
    'Complete the entire course of medication. Maintain adequate hydration and rest. Return if symptoms worsen.'
  );
  const [followUpDate, setFollowUpDate] = useState('In 7 days at Kijani Rural Clinic');
  const [doctorName, setDoctorName] = useState('Dr. Sarah Kimani, MD');
  const [doctorRegNumber, setDoctorRegNumber] = useState('KMPDC-REG-48819');
  const [isSigning, setIsSigning] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [issuedResult, setIssuedResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Auto-fill diagnosis based on case if blank
  useEffect(() => {
    if (!diagnosis) {
      setDiagnosis('Acute upper respiratory infection & mild cutaneous dermatitis');
    }
  }, [caseRecord]);

  if (!isOpen) return null;

  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        strength: '',
        dosage: '1 tablet',
        frequency: 'Twice daily',
        duration: '5 days',
        instructions: 'After food',
      },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof MedicineItem, value: string) => {
    setMedicines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleQuickAdd = (preset: typeof COMMON_MEDICINES[0]) => {
    setMedicines((prev) => {
      // If only 1 empty medicine, replace it
      if (prev.length === 1 && !prev[0].name) {
        return [{ ...preset }];
      }
      return [...prev, { ...preset }];
    });
  };

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      setErrorMessage(null);
      await api.prescriptions.saveDraft({
        caseId: caseRecord.id,
        diagnosis,
        medicines,
        clinicalRemarks,
        followUpDate,
        doctorName,
        doctorRegNumber,
      });
      alert('Draft prescription saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleConfirmIssue = async () => {
    try {
      setIsIssuing(true);
      setErrorMessage(null);

      // 1. Save draft first to get/update DB ID
      const draftRes = await api.prescriptions.saveDraft({
        caseId: caseRecord.id,
        diagnosis,
        medicines,
        clinicalRemarks,
        followUpDate,
        doctorName,
        doctorRegNumber,
      });

      const draftId = draftRes.data.id;

      // 2. Issue and digitally sign
      const issueRes = await api.prescriptions.issue(draftId, {
        doctorName,
        doctorRegNumber,
        clinicalRemarks,
        followUpDate,
      });

      if (issueRes.success) {
        setIssuedResult(issueRes.data);
        setShowConfirmDialog(false);
        if (onPrescriptionIssued) {
          onPrescriptionIssued(issueRes.data);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to issue prescription');
    } finally {
      setIsIssuing(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-200">
        {/* Modal Header */}
        <div className="bg-[#0B463B] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold tracking-tight">
                {issuedResult ? 'Prescription Issued' : 'Create Digital Prescription'}
              </h2>
              <p className="text-[10px] text-emerald-200/80 font-medium">
                Case CL-2024-{caseRecord.id} • {caseRecord.fullName} ({caseRecord.age}y, {caseRecord.gender})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!issuedResult && (
              <div className="bg-black/20 p-0.5 rounded-lg flex text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    activeTab === 'edit' ? 'bg-white text-[#0B463B]' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    activeTab === 'preview' ? 'bg-white text-[#0B463B]' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left no-scrollbar">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {issuedResult ? (
            /* SUCCESS ISSUANCE SCREEN */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0B463B] bg-emerald-50 px-2.5 py-0.5 rounded-md">
                  AUTHENTICATED & DIGITALLY SIGNED
                </span>
                <h3 className="text-[18px] font-extrabold text-[#0B2E27] mt-1.5">
                  Prescription {issuedResult.rxNumber} Issued
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  The prescription has been linked to patient <strong>{caseRecord.fullName}</strong> and recorded in the audit trail.
                </p>
              </div>

              {/* Digital Signature Card */}
              <div className="bg-[#EDF7F4] border border-[#A3E2D3] rounded-2xl p-3.5 max-w-sm mx-auto text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#0B463B]">
                  <span>Authorized Physician:</span>
                  <span>{issuedResult.doctorName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>Reg. Number:</span>
                  <span className="font-mono">{issuedResult.doctorRegNumber}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>Digital Token:</span>
                  <span className="font-mono text-[10px] text-emerald-800">{issuedResult.digitalSignature}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={`/api/prescriptions/${issuedResult.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#0B463B] hover:bg-[#083830] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Official PDF</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          ) : activeTab === 'edit' ? (
            /* EDIT FORM */
            <div className="space-y-4">
              {/* Patient Badge */}
              <div className="bg-[#F7FAF9] border border-[#E2E8F0] rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
                    PATIENT INTAKE
                  </span>
                  <h4 className="text-[13px] font-bold text-[#112622]">{caseRecord.fullName}</h4>
                  <p className="text-[10px] text-gray-500">
                    ID: CL-2024-{caseRecord.id} • {caseRecord.gender}, {caseRecord.age}y • BP {caseRecord.systolic}/{caseRecord.diastolic} mmHg
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Tele-Consult
                </span>
              </div>

              {/* Diagnosis Field */}
              <div>
                <label className="block text-[11px] font-bold text-[#0B463B] uppercase mb-1">
                  Primary Clinical Diagnosis
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute tonsillitis, Contact dermatitis"
                  className="w-full bg-[#FAFCFC] border border-[#D2DFDC] rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#0B463B]"
                />
              </div>

              {/* Quick Preset Medicines */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Quick Add Common Medicines:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MEDICINES.slice(0, 4).map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleQuickAdd(preset)}
                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0B463B] border border-emerald-200/60 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{preset.name} ({preset.strength})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Medicines Form Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#0B463B] uppercase">
                    Prescribed Medicines ({medicines.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="text-xs font-bold text-[#0B463B] hover:text-[#083830] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {medicines.map((med, index) => (
                    <div
                      key={index}
                      className="bg-[#FAFCFC] border border-[#E2E8F0] rounded-2xl p-3 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#0B463B] bg-emerald-50 px-2 py-0.5 rounded">
                          Item #{index + 1}
                        </span>
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(index)}
                            className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                            title="Remove Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Medicine Name</label>
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                            placeholder="e.g. Amoxicillin"
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Strength</label>
                          <input
                            type="text"
                            value={med.strength}
                            onChange={(e) => handleMedicineChange(index, 'strength', e.target.value)}
                            placeholder="e.g. 500mg, 10ml"
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Dosage</label>
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                            placeholder="1 capsule"
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Frequency</label>
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                            placeholder="3x daily"
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Duration</label>
                          <input
                            type="text"
                            value={med.duration}
                            onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                            placeholder="7 days"
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Instructions</label>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                          placeholder="After food, with water"
                          className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Remarks & Follow-up */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#0B463B] uppercase mb-1">
                    Additional Medical Advice & Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={clinicalRemarks}
                    onChange={(e) => setClinicalRemarks(e.target.value)}
                    className="w-full bg-[#FAFCFC] border border-[#D2DFDC] rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0B463B] uppercase mb-1">
                    Recommended Follow-up
                  </label>
                  <input
                    type="text"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    placeholder="e.g. In 7 days or if fever persists"
                    className="w-full bg-[#FAFCFC] border border-[#D2DFDC] rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#0B463B]"
                  />
                </div>
              </div>

              {/* Doctor Registration Block */}
              <div className="p-3 bg-[#EDF7F4] border border-[#CDECE3] rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B463B]">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Physician Verification & Signature</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Doctor Name</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="w-full bg-white border border-[#CDECE3] rounded-lg px-2 py-1 text-xs font-bold text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Reg Number</label>
                    <input
                      type="text"
                      value={doctorRegNumber}
                      onChange={(e) => setDoctorRegNumber(e.target.value)}
                      className="w-full bg-white border border-[#CDECE3] rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW SCREEN */
            <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-inner">
              {/* Official Header */}
              <div className="border-b-2 border-[#0B463B] pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#0B463B] leading-tight">
                    CareLink Rural Health Telemedicine
                  </h3>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
                    Official Digital Prescription
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    Rx Preview
                  </span>
                  <p className="text-[9px] text-gray-400 mt-1">{formattedDate}</p>
                </div>
              </div>

              {/* Metadata columns */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">PATIENT</p>
                  <p className="font-bold text-[#112622] text-[12px]">{caseRecord.fullName}</p>
                  <p className="text-[10px] text-gray-500">
                    {caseRecord.age} yrs, {caseRecord.gender} • ID: CL-2024-{caseRecord.id}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">PRESCRIBER</p>
                  <p className="font-bold text-[#112622] text-[12px]">{doctorName}</p>
                  <p className="text-[10px] text-gray-500">Reg: {doctorRegNumber}</p>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-xs">
                <span className="font-bold text-[#0B463B] mr-2 text-[10px] uppercase">DIAGNOSIS:</span>
                <span className="font-semibold text-gray-800">{diagnosis}</span>
              </div>

              {/* Rx Medicines List */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-[#0B463B]">
                  <span className="text-xl font-serif font-black">℞</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Medication Regimen</span>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-[#0B463B] text-white text-[9.5px] font-bold grid grid-cols-12 px-2.5 py-1.5">
                    <span className="col-span-5">MEDICINE & STRENGTH</span>
                    <span className="col-span-3">DOSAGE</span>
                    <span className="col-span-2">DURATION</span>
                    <span className="col-span-2 text-right">TIMING</span>
                  </div>
                  {medicines.map((m, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 px-2.5 py-2 text-[10.5px] items-center border-t border-gray-100 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="col-span-5">
                        <p className="font-bold text-gray-900 leading-tight">{m.name}</p>
                        <p className="text-[9px] text-gray-500">{m.strength}</p>
                      </div>
                      <div className="col-span-3 text-gray-700">
                        {m.dosage} • {m.frequency}
                      </div>
                      <div className="col-span-2 text-gray-700 font-medium">{m.duration}</div>
                      <div className="col-span-2 text-right font-semibold text-[#0B463B] text-[9.5px]">
                        {m.instructions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advice */}
              <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <p className="font-bold text-gray-800 text-[10px] uppercase mb-0.5">Advice & Follow-Up</p>
                <p className="text-[11px]">{clinicalRemarks}</p>
                <p className="text-[10px] font-bold text-[#0B463B] mt-1.5">Follow-up: {followUpDate}</p>
              </div>

              {/* Stamp Preview */}
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-[10px] text-gray-500">
                <span>Verified E-Prescription</span>
                <span className="font-mono text-emerald-800 font-bold">DIGITAL SIGNATURE ATTESTED</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!issuedResult && (
          <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <div className="flex items-center gap-2">
              {activeTab === 'edit' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#0B463B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <span>Back to Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isIssuing || medicines.length === 0 || !medicines[0].name}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B463B] hover:bg-[#083830] disabled:bg-gray-300 text-white flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Issue & Sign Prescription</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-3 text-center border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B463B] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#0B2E27]">Confirm Prescription Issuance</h4>
              <p className="text-xs text-gray-500 mt-1">
                You are officially issuing this prescription under license <strong>{doctorRegNumber}</strong> for patient <strong>{caseRecord.fullName}</strong>. Once signed, an official PDF will be generated.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmIssue}
                disabled={isIssuing}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#0B463B] hover:bg-[#083830] rounded-xl flex items-center justify-center gap-1"
              >
                {isIssuing ? 'Signing...' : 'Sign & Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
