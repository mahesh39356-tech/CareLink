import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Award } from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { useTelemedicine } from '../../state/telemedicineContext';
import { api } from '../../services/api';

export const DoctorLoginScreen: React.FC = () => {
  const { setCurrentScreen, setCurrentRole } = useTelemedicine();
  const [identifier, setIdentifier] = useState('doctor@carelink.org');
  const [password, setPassword] = useState('RuralCare2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.doctorLogin({
        identifier: identifier.trim(),
        password,
      });

      if (res && res.data) {
        api.setToken(res.data.tokens.accessToken);
        setCurrentRole('DOCTOR');
        setCurrentScreen('doctor');
      }
    } catch (err: any) {
      console.warn('Doctor auth failed:', err.message);
      setError(err.message || 'Doctor authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9] overflow-y-auto no-scrollbar">
      <div>
        <AppHeader title="Doctor Portal" />

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Header Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#0B463B] text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Physician Portal</span>
            </div>
            <h2 className="text-[25px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-1">
              Tele-Specialist Access
            </h2>
            <p className="text-[13px] text-[#5C736F] mt-1">
              Secure clinical portal for reviewing rural patient cases, inspecting diagnostic media, and authorizing digital prescriptions.
            </p>
          </div>

          {/* Form Box */}
          <form onSubmit={handleLogin} className="bg-white rounded-3xl p-5 shadow-card border border-[#E9EFEF] space-y-4">
            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-[#112622] mb-1">
                Medical License or Official Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="doctor@carelink.org"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Default Doctor Account: <strong className="text-teal-800">doctor@carelink.org</strong>
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#112622] mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="RuralCare2026!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Doctor Credentials Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-start gap-2.5">
              <Award className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600">
                <p className="font-bold text-slate-800">Verified Clinical Credentials:</p>
                <p>Physician: <strong>Dr. Sarah Kimani, MD</strong></p>
                <p>Registration: <strong>KMPDC-REG-48819</strong></p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B463B] hover:bg-[#08382F] text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>{loading ? 'Verifying Credentials...' : 'Authenticate & Open Case Inbox'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Patient Switch */}
          <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-slate-700">Looking for Patient Intake?</p>
              <p className="text-[11px] text-slate-500">Submit a medical case or check vitals</p>
            </div>
            <button
              onClick={() => setCurrentScreen('patient-login')}
              className="bg-white text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 shadow-xs"
            >
              Patient Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};