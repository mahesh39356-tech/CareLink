import React, { useState } from 'react';
import { User, Phone, Lock, ArrowRight, ShieldCheck, Heart, AlertCircle } from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { PrimaryButton } from '../common/PrimaryButton';
import { useTelemedicine } from '../../state/telemedicineContext';
import { api } from '../../services/api';

export const PatientLoginScreen: React.FC = () => {
  const { setCurrentScreen, setDraftPatient, setCurrentRole } = useTelemedicine();
  const [identifier, setIdentifier] = useState('0418'); // Pre-fill with seeded patient Amina
  const [password, setPassword] = useState('RuralCare2026!');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!fullName.trim()) throw new Error('Please enter your full legal name');
        const regRes = await api.auth.registerPatient({
          fullName: fullName.trim(),
          age: Number(age) || 30,
          gender,
          phone: identifier.includes('@') ? undefined : identifier.trim(),
          email: identifier.includes('@') ? identifier.trim() : undefined,
          password: password || 'RuralCare2026!',
        });
        if (regRes && regRes.data) {
          api.setToken(regRes.data.tokens.accessToken);
          setCurrentRole('PATIENT');
          const p = regRes.data.patientProfile || regRes.data.user?.patientProfile || regRes.data.user?.profile;
          const patientCaseId = p?.nationalId || p?.id || (identifier.includes('@') ? '0418' : identifier.trim());
          if (p) {
            setDraftPatient({
              id: patientCaseId,
              fullName: p.fullName || fullName.trim(),
              age: p.age || Number(age) || 30,
              gender: p.gender || gender,
              syncHistoryOnConnect: true,
              systolic: '120',
              diastolic: '80',
              temperature: '36.8',
              heartRate: '72',
              voiceLanguage: 'English',
              uploadedImages: [],
              photoUrl: undefined,
              photoOriginalSizeKb: undefined,
              photoCompressedSizeKb: undefined,
              photoCompressionRatio: undefined,
              audioBlob: undefined,
              audioUrl: undefined,
            });
          }
          setCurrentScreen('register');
        }
      } else {
        if (!identifier.trim()) throw new Error('Please enter your Patient ID, phone, or email');
        const loginRes = await api.auth.patientLogin({
          identifier: identifier.trim(),
          password: password || 'RuralCare2026!',
        });

        if (loginRes && loginRes.data) {
          api.setToken(loginRes.data.tokens.accessToken);
          setCurrentRole('PATIENT');
          const p = loginRes.data.user?.patientProfile || loginRes.data.user?.profile;
          const patientCaseId = p?.nationalId || p?.id || identifier.trim();
          if (p) {
            setDraftPatient({
              id: patientCaseId,
              fullName: p.fullName,
              age: p.age,
              gender: p.gender,
              syncHistoryOnConnect: true,
              systolic: '120',
              diastolic: '80',
              temperature: '36.8',
              heartRate: '72',
              voiceLanguage: 'English',
              uploadedImages: [],
              photoUrl: undefined,
              photoOriginalSizeKb: undefined,
              photoCompressedSizeKb: undefined,
              photoCompressionRatio: undefined,
              audioBlob: undefined,
              audioUrl: undefined,
            });

            // Fetch only authenticated patient's images from backend
            try {
              const imagesRes = await api.cases.getImages(patientCaseId);
              if (imagesRes && imagesRes.success && Array.isArray(imagesRes.data)) {
                const mappedImages = imagesRes.data.map((img: any) => ({
                  id: img.id,
                  url: api.cases.getImageUrl(img.id),
                  label: img.label,
                  originalSizeBytes: img.originalSizeBytes,
                  compressedSizeBytes: img.compressedSizeBytes,
                  compressionRatio: img.compressionRatio,
                  originalFilename: img.originalFilename || 'clinical_photo.webp',
                  capturedAt: img.capturedAt,
                  downloadUrl: img.downloadUrl || api.cases.getImageUrl(img.id, true),
                  bodySite: img.bodySite,
                }));
                if (mappedImages.length > 0) {
                  setDraftPatient((curr) => ({
                    ...curr,
                    uploadedImages: mappedImages,
                    photoUrl: mappedImages[0].url,
                    photoOriginalSizeKb: +(mappedImages[0].originalSizeBytes / 1024).toFixed(1),
                    photoCompressedSizeKb: +(mappedImages[0].compressedSizeBytes / 1024).toFixed(1),
                    photoCompressionRatio: mappedImages[0].compressionRatio,
                  }));
                }
              }
            } catch (imgErr) {
              console.warn('Notice loading patient images:', imgErr);
            }
          }
          setCurrentScreen('register');
        }
      }
    } catch (err: any) {
      console.warn('Patient auth failed:', err.message);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9] overflow-y-auto no-scrollbar">
      <div>
        <AppHeader title="Patient Portal" />

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Header Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#D8F0EA] text-[#0B463B] text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 fill-[#0B463B]" />
              <span>Rural Tele-Health Intake</span>
            </div>
            <h2 className="text-[25px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-1">
              {isRegistering ? 'Patient Registration' : 'Patient Access'}
            </h2>
            <p className="text-[13px] text-[#5C736F] mt-1">
              Low-bandwidth telemedicine access for remote consultations.
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

            {isRegistering && (
              <>
                <div>
                  <label className="block text-[12px] font-bold text-[#112622] mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amina Mwangi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#112622] mb-1">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 34"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#112622] mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl px-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[12px] font-bold text-[#112622] mb-1">
                {isRegistering ? 'Phone Number or Email' : 'Patient ID, Phone or Email'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. 0418 or +254712345678"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Default Seed Patient ID: <strong className="text-teal-800">0418</strong> (Amina Mwangi)</p>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#112622] mb-1">Access PIN / Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="RuralCare2026!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FAFCFC] border border-[#DCE4E3] rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0B463B]/20"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B463B] hover:bg-[#08382F] text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>{loading ? 'Authenticating...' : isRegistering ? 'Create Case & Register' : 'Continue to Intake Form'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[12px] font-bold text-[#0B463B] hover:underline"
              >
                {isRegistering ? 'Already registered? Log in with Patient ID' : 'New patient? Register rapid clinic intake profile'}
              </button>
            </div>
          </form>

          {/* Quick Doctor Link */}
          <div className="bg-[#EBF7F4] border border-[#CDECE3] rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[#0B463B]">Are you a healthcare provider?</p>
              <p className="text-[11px] text-teal-700">Access specialist tele-consultation inbox</p>
            </div>
            <button
              onClick={() => setCurrentScreen('doctor-login')}
              className="bg-white text-[#0B463B] text-[11px] font-bold px-3 py-1.5 rounded-lg border border-teal-200 shadow-xs"
            >
              Doctor Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};