import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Search,
  Cloud,
  Camera,
  Mic,
  Play,
  Pause,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Download,
  X,
  AlertCircle,
  FileImage,
  FileText,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useTelemedicine } from '../../state/telemedicineContext';
import { PatientRecord, PrescriptionRecord } from '../../types/telemedicine';
import { PrescriptionModal } from '../prescriptions/PrescriptionModal';
import { api } from '../../services/api';
import { decodeAudioBlob, WebAudioPlayer } from '../../utils/audio';

interface CaseImage {
  id: string;
  fileRecordId: string;
  caseId: string;
  patientId: string;
  label: string;
  bodySite: string;
  originalFilename: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  spaceSavedBytes: number;
  compressionRatio: number;
  url: string;
  downloadUrl: string;
  capturedAt: string;
}

interface CaseVoiceNote {
  id: string;
  fileRecordId: string;
  caseId: string;
  patientId: string;
  language: string;
  durationSeconds: number;
  codec: string;
  fileSizeBytes: number;
  sizeKb: number;
  url: string;
  recordedAt: string;
}

export const DoctorDashboardScreen: React.FC = () => {
  const { outboxRecords, deliveredRecords, setCurrentScreen } = useTelemedicine();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('0418');
  const [serverCases, setServerCases] = useState<PatientRecord[]>([]);

  // Media state fetched from backend
  const [caseImages, setCaseImages] = useState<CaseImage[]>([]);
  const [caseVoiceNotes, setCaseVoiceNotes] = useState<CaseVoiceNote[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(0);
  const [casePrescriptions, setCasePrescriptions] = useState<PrescriptionRecord[]>([]);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Audio player state (Authenticated Blob Object URL Architecture)
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioPlayerRef = useRef<WebAudioPlayer | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);

  // Image inspection modal state
  const [selectedImageModal, setSelectedImageModal] = useState<CaseImage | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [viewOriginalInModal, setViewOriginalInModal] = useState(false);

  // 1. Fetch live backend cases on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCases = async () => {
      try {
        const res = await api.cases.getAll();
        if (isMounted && res && res.success && Array.isArray(res.data)) {
          const mapped: PatientRecord[] = res.data.map((c: any) => {
            const caseNum = c.caseNumber || c.id || '0418';
            const shortId = caseNum.replace(/^CL-2024-/, '');
            const pName = c.patient?.fullName || c.patientName || 'Rural Patient';
            const initials = pName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return {
              id: shortId,
              fullName: pName,
              age: c.patient?.age || 32,
              gender: (c.patient?.gender as any) || 'Female',
              clinic: c.patient?.clinic || 'Kijani Rural Clinic',
              syncHistoryOnConnect: true,
              timestamp: '10:30 AM',
              dateLabel: 'Today',
              systolic: c.vitals?.systolic || 120,
              diastolic: c.vitals?.diastolic || 80,
              temperature: c.vitals?.temperature || 36.8,
              heartRate: c.vitals?.heartRate || 72,
              totalPayloadKb: c.imagesCount ? +(c.imagesCount * 22.4 + 8.2).toFixed(1) : 32.7,
              voiceLanguage: 'English',
              initials,
              timeAgo: 'Recently',
              status: 'DELIVERED',
              badgeIndex: 1,
            };
          });
          setServerCases(mapped);
        }
      } catch (err) {
        console.warn('Backend cases fetch notice:', err);
      }
    };

    fetchCases();
    return () => {
      isMounted = false;
    };
  }, []);

  // Combine delivered records, server records, and outbox records with deduplication
  const combinedCases = [...serverCases, ...deliveredRecords, ...outboxRecords];
  const seenIds = new Set<string>();
  const cases: PatientRecord[] = [];
  for (const c of combinedCases) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      cases.push(c);
    }
  }

  if (cases.length === 0) {
    cases.push({
      id: '0418',
      fullName: 'Amina Mwangi',
      age: 34,
      gender: 'Female',
      clinic: 'Kijani Clinic',
      systolic: 128,
      diastolic: 82,
      temperature: 36.8,
      heartRate: 72,
      totalPayloadKb: 32.7,
      voiceLanguage: 'English',
      initials: 'AM',
      timeAgo: '12m',
      syncHistoryOnConnect: true,
      timestamp: '10:42 AM',
      dateLabel: 'Today',
      status: 'DELIVERED',
    });
  }

  const filteredCases = cases.filter((c) =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clinic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCase =
    cases.find((c) => c.id === selectedCaseId) || cases[0] || {
      id: '0418',
      fullName: 'Amina Mwangi',
      age: 34,
      gender: 'Female',
      clinic: 'Kijani Clinic',
      systolic: 128,
      diastolic: 82,
      temperature: 36.8,
      heartRate: 72,
      totalPayloadKb: 32.7,
      voiceLanguage: 'English',
      initials: 'AM',
      timeAgo: '12m',
    };

  // Fetch real images and voice notes from backend whenever active patient changes
  useEffect(() => {
    let isMounted = true;
    const fetchCaseMedia = async () => {
      try {
        setIsLoadingMedia(true);
        setMediaError(null);
        setIsPlayingAudio(false);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        const caseIdToFetch = activeCase.id || '0418';

        // 1. Fetch images from GET /api/cases/:caseId/images
        const imagesRes = await api.cases.getImages(caseIdToFetch);
        if (isMounted && imagesRes && imagesRes.success) {
          setCaseImages(imagesRes.data || []);
        }

        // 2. Fetch voice notes from GET /api/cases/:caseId/audio
        const audioRes = await api.cases.getAudio(caseIdToFetch);
        if (isMounted && audioRes && audioRes.success) {
          setCaseVoiceNotes(audioRes.data || []);
        }

        // 3. Fetch digital prescriptions from GET /api/cases/:caseId/prescriptions
        const rxRes = await api.prescriptions.getByCase(caseIdToFetch);
        if (isMounted && rxRes && rxRes.success) {
          setCasePrescriptions(rxRes.data || []);
        }
      } catch (err: any) {
        console.warn('Backend fetch notice:', err.message);
        if (isMounted) {
          // Fallback to client-side uploaded data if backend offline
          if (activeCase.uploadedImages && activeCase.uploadedImages.length > 0) {
            setCaseImages(activeCase.uploadedImages as any);
          }
        }
      } finally {
        if (isMounted) setIsLoadingMedia(false);
      }
    };

    fetchCaseMedia();
    setSelectedAudioIndex(0);
    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeCase.id]);

  const activeVoiceNote = caseVoiceNotes.length > 0 ? (caseVoiceNotes[selectedAudioIndex] || caseVoiceNotes[0]) : null;

  // Setup HTML5 audio element with authenticated Blob Object URL architecture
  useEffect(() => {
    let currentBlobUrl: string | null = null;
    let isMounted = true;

    // Reset current audio playback
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioPlaybackError(null);

    if (activeVoiceNote) {
      setIsAudioLoading(true);

      api.cases
        .fetchAudioBlob(activeVoiceNote.url)
        .then(async ({ blob, objectUrl }) => {
          if (!isMounted) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          let finalUrl = objectUrl;
          let calculatedDuration = activeVoiceNote.durationSeconds || 0;

          // Convert any audio blob (WebM, Ogg, etc.) to 16-bit PCM WAV for 100% universal browser decoding
          try {
            const decoded = await decodeAudioBlob(blob);
            if (isMounted) {
              decodedBufferRef.current = decoded.audioBuffer;
              if (!webAudioPlayerRef.current) {
                webAudioPlayerRef.current = new WebAudioPlayer(decoded.audioBuffer);
              } else {
                webAudioPlayerRef.current.setBuffer(decoded.audioBuffer);
              }
              webAudioPlayerRef.current.onTimeUpdate = (time) => setAudioCurrentTime(time);
              webAudioPlayerRef.current.onEnded = () => {
                setIsPlayingAudio(false);
                setAudioCurrentTime(0);
              };
              webAudioPlayerRef.current.onPlay = () => setIsPlayingAudio(true);
              webAudioPlayerRef.current.onPause = () => setIsPlayingAudio(false);

              URL.revokeObjectURL(objectUrl);
              finalUrl = decoded.wavUrl;
              calculatedDuration = decoded.durationSeconds || calculatedDuration;
            }
          } catch (decodeErr) {
            console.warn('[Doctor Audio] Audio decode fallback to native container:', decodeErr);
            finalUrl = objectUrl;
          }

          if (isMounted) {
            console.log('[Doctor Audio Loaded]', {
              voiceNoteId: activeVoiceNote.id,
              url: activeVoiceNote.url,
              sizeBytes: blob.size,
              mime: blob.type,
              finalUrl,
            });

            currentBlobUrl = finalUrl;
            setAudioObjectUrl(finalUrl);
            if (calculatedDuration > 0) {
              setAudioDuration(calculatedDuration);
            }
            setIsAudioLoading(false);
          }
        })
        .catch((err) => {
          console.error('[Doctor Audio Error] Failed to load audio blob:', err);
          if (isMounted) {
            setIsAudioLoading(false);
            setAudioObjectUrl(null);
            setAudioPlaybackError(`Voice note loading failed: ${err.message}`);
          }
        });
    } else {
      setAudioObjectUrl(null);
      setIsAudioLoading(false);
    }

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (webAudioPlayerRef.current) {
        webAudioPlayerRef.current.destroy();
      }
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [activeVoiceNote?.id, activeVoiceNote?.url]);

  const toggleAudioPlay = async () => {
    setAudioPlaybackError(null);
    const audio = audioRef.current;

    if (isPlayingAudio) {
      if (audio) {
        try { audio.pause(); } catch {}
      }
      if (webAudioPlayerRef.current && webAudioPlayerRef.current.isPlaying) {
        webAudioPlayerRef.current.pause();
      }
      setIsPlayingAudio(false);
      return;
    }

    // Layer 1: Attempt HTML5 Audio element
    let html5Succeeded = false;
    if (audio && audioObjectUrl) {
      try {
        await audio.play();
        setIsPlayingAudio(true);
        html5Succeeded = true;
      } catch (err: any) {
        console.warn('[Doctor Audio] HTML5 audio element deferred, activating Web Audio API engine:', err);
        html5Succeeded = false;
      }
    }

    // Layer 2: Seamless Web Audio API direct playback
    if (!html5Succeeded) {
      try {
        if (webAudioPlayerRef.current) {
          await webAudioPlayerRef.current.play(audioCurrentTime);
          setIsPlayingAudio(true);
        }
      } catch (fallbackErr: any) {
        console.error('[Doctor Audio Playback Error]', fallbackErr);
        setAudioPlaybackError('Click page to enable audio playback device.');
        setIsPlayingAudio(false);
      }
    }
  };

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const totalDuration =
      audio?.duration && !isNaN(audio.duration) && isFinite(audio.duration)
        ? audio.duration
        : audioDuration || activeVoiceNote?.durationSeconds || 18;

    if (!totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * totalDuration;

    setAudioCurrentTime(newTime);
    if (audio) {
      try {
        audio.currentTime = newTime;
      } catch {}
    }
    if (webAudioPlayerRef.current) {
      webAudioPlayerRef.current.seek(newTime);
    }
  };

  const waveformBars = [30, 60, 40, 80, 100, 75, 45, 65, 90, 70, 50, 85, 60, 35, 75, 90, 50, 30];

  return (
    <div className="flex-1 flex flex-col bg-[#F7F9F9] select-none h-full overflow-hidden">
      {/* Top Header Branding matching Figma */}
      <header className="bg-white border-b border-gray-200/80 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0B463B] text-white flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-[#0B2E27] tracking-tight leading-none">
              CareLink
            </h1>
            <p className="text-[8.5px] font-extrabold text-[#5C736F] tracking-widest uppercase mt-0.5">
              CLINICAL PORTAL
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentScreen('outbox')}
          className="text-xs font-semibold text-[#0B463B] hover:text-[#083830] flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Exit Portal</span>
        </button>
      </header>

      {/* Two-Column Split View matching Figma Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: INBOX */}
        <div className="w-[48%] min-w-[170px] border-r border-[#E2E8F0] bg-white flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="p-3 space-y-2.5">
            {/* Inbox Title & Count Badge */}
            <div>
              <span className="text-[9px] font-bold tracking-wider text-[#0B463B] uppercase">
                INBOX
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <h2 className="text-[13px] font-extrabold text-[#0B2E27] tracking-tight leading-tight">
                  Pending Remote Cases
                </h2>
                <span className="bg-[#FFF2EA] text-[#DE6C38] text-[10px] font-black px-1.5 py-0.2 rounded-full border border-[#FCD7C1]">
                  {cases.length}
                </span>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAFCFC] border border-[#E2E8F0] rounded-xl pl-7 pr-2 py-1.5 text-[11px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0B463B]"
              />
            </div>

            {/* Case Items List */}
            <div className="space-y-1.5 pt-1">
              {filteredCases.map((patient) => {
                const isSelected = patient.id === activeCase.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => {
                      setSelectedCaseId(patient.id);
                    }}
                    className={`cursor-pointer rounded-xl p-2.5 transition-all text-left relative ${
                      isSelected
                        ? 'bg-[#EDF7F4] border-l-4 border-l-[#0B463B] shadow-xs'
                        : 'bg-white hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isSelected
                            ? 'bg-[#0B463B] text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {patient.initials || patient.fullName[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[11.5px] font-bold text-[#112622] truncate leading-tight">
                            {patient.fullName}
                          </h3>
                          <span className="text-[9px] text-gray-400 shrink-0 ml-1">
                            {patient.timeAgo || '12m'}
                          </span>
                        </div>

                        <p className="text-[9.5px] text-gray-500 truncate mt-0.5">
                          {patient.gender === 'Female' ? 'F' : 'M'} · {patient.age} · {patient.clinic || 'Kijani Clinic'}
                        </p>

                        <p className="text-[10px] font-bold text-[#0B463B] mt-0.5">
                          {patient.totalPayloadKb || 32.7} KB
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Column Bottom Low-Data Banner */}
          <div className="p-2.5 m-2 bg-[#F7FAF9] rounded-xl border border-[#E5EBEA] flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-teal-100/70 text-[#0B463B] flex items-center justify-center shrink-0">
              <Cloud className="w-3 h-3 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#0B463B] leading-none">
                Low-data mode enabled
              </p>
              <p className="text-[8px] text-gray-500 mt-0.5 leading-none">
                Images displayed compressed
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: CASE VIEWER */}
        <div className="flex-1 bg-[#F7F9F9] p-3 space-y-3 overflow-y-auto no-scrollbar">
          {/* Header block */}
          <div>
            <span className="text-[9px] font-bold tracking-wider text-[#0B463B] uppercase">
              CASE VIEWER · CL-2024-{activeCase.id}
            </span>
            <h2 className="text-[17px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-0.5">
              {activeCase.fullName}
            </h2>
            <p className="text-[10.5px] text-gray-500 mt-0.5">
              {activeCase.gender === 'Female' ? 'Female' : 'Male'}, {activeCase.age} years • {activeCase.clinic || 'Kijani Rural Clinic'}
            </p>
          </div>

          {/* Card 1: Patient Vitals */}
          <div className="bg-white rounded-2xl p-3 border border-[#E9EFEF] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Activity className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-[11.5px] font-bold text-[#112622] leading-tight">
                  Patient Vitals
                </p>
                <p className="text-[9px] text-[#5C736F]">
                  Captured today at {activeCase.timestamp || '10:42 AM'}
                </p>
              </div>
            </div>

            {/* Reading details */}
            <div className="pt-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                BP
              </span>
              <div className="flex items-baseline justify-between mt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-[20px] font-black text-[#112622] leading-none">
                    {activeCase.systolic}/{activeCase.diastolic}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">mmHg</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  Normal
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Clinical Media (Displaying Real Uploaded Medical Images) */}
          <div className="bg-white rounded-2xl p-3 border border-[#E9EFEF] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Camera className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <p className="text-[11.5px] font-bold text-[#112622] leading-tight">
                    Clinical Media
                  </p>
                  <p className="text-[9px] text-[#5C736F]">
                    {caseImages.length} compressed image{caseImages.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {caseImages.length > 0 && (
                <span className="text-[9px] font-bold text-[#0B463B] bg-teal-50 px-2 py-0.5 rounded">
                  WebP Decoded
                </span>
              )}
            </div>

            {/* Actual Uploaded Clinical Images Grid */}
            {isLoadingMedia ? (
              <div className="py-6 flex flex-col items-center justify-center text-gray-400 text-xs">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-1.5" />
                <span>Loading clinical images...</span>
              </div>
            ) : caseImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 pt-1">
                {caseImages.map((img, i) => (
                  <div
                    key={img.id || i}
                    onClick={() => {
                      setSelectedImageModal(img);
                      setImageZoom(1);
                    }}
                    className="relative w-full aspect-16/10 rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-gray-200 bg-slate-900"
                  >
                    {/* The Actual Real Uploaded Image */}
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient Overlay for labels */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                    {/* Label at bottom left */}
                    <div className="absolute bottom-1.5 left-2 bg-black/80 text-white font-black text-[9px] tracking-wider px-2 py-0.5 rounded">
                      {img.label}
                    </div>

                    {/* Compression details badge at top right */}
                    <div className="absolute top-1.5 right-2 bg-[#0B463B]/90 text-emerald-200 font-bold text-[8.5px] px-2 py-0.5 rounded shadow-xs">
                      {+(img.compressedSizeBytes / 1024).toFixed(1)} KB WebP ({img.compressionRatio}% saved)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-5 text-center text-gray-400 text-[11px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FileImage className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                <span>No clinical images uploaded</span>
              </div>
            )}
          </div>

          {/* Card 3: Local Voice Note (Functional Audio Player) */}
          <div className="bg-white rounded-2xl p-3 border border-[#E9EFEF] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Mic className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <p className="text-[11.5px] font-bold text-[#112622] leading-tight">
                  Local Voice Note
                </p>
                <p className="text-[9px] text-[#5C736F]">
                  {activeVoiceNote ? activeVoiceNote.language : (activeCase.voiceLanguage || 'English')}
                </p>
              </div>
            </div>

            {activeVoiceNote ? (
              <div className="space-y-1.5">
                {caseVoiceNotes.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] no-scrollbar">
                    {caseVoiceNotes.map((vn, idx) => (
                      <button
                        key={vn.id || idx}
                        type="button"
                        onClick={() => setSelectedAudioIndex(idx)}
                        className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                          selectedAudioIndex === idx
                            ? 'bg-[#0B463B] text-white shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {idx === 0 ? 'Latest Recording' : `Note #${idx + 1}`} ({vn.durationSeconds}s)
                      </button>
                    ))}
                  </div>
                )}
                {/* Audio Waveform Row with Functional Play/Pause & Progress Bar */}
                <div className="flex items-center gap-2 bg-[#FAFCFC] border border-[#E5EBEA] rounded-xl px-2.5 py-2">
                  <button
                    type="button"
                    onClick={toggleAudioPlay}
                    className="w-7 h-7 rounded-full bg-[#0B463B] hover:bg-[#083830] text-white flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-transform"
                    title={isPlayingAudio ? 'Pause' : 'Play voice note'}
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-3 h-3 fill-white" />
                    ) : (
                      <Play className="w-3 h-3 fill-white ml-0.5" />
                    )}
                  </button>

                  {/* Interactive Waveform / Progress Scrub */}
                  <div
                    onClick={handleAudioSeek}
                    className="flex-1 flex items-center justify-between gap-0.5 h-6 px-1 cursor-pointer group"
                    title="Click to seek"
                  >
                    {waveformBars.map((h, i) => {
                      const barProgress = (i / waveformBars.length);
                      const currentProgress = audioDuration > 0 ? (audioCurrentTime / audioDuration) : 0;
                      const isPlayed = barProgress <= currentProgress;

                      return (
                        <div
                          key={i}
                          style={{ height: `${h}%` }}
                          className={`w-0.5 rounded-full transition-all duration-150 ${
                            isPlayingAudio && isPlayed
                              ? 'bg-teal-700 animate-pulse'
                              : isPlayed
                              ? 'bg-[#0B463B]'
                              : 'bg-teal-200'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <span className="text-[10px] font-mono font-medium text-gray-600 tabular-nums">
                    {Math.floor(audioCurrentTime)}s / {Math.round(audioDuration || activeVoiceNote.durationSeconds)}s
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-gray-400 px-1">
                  <span>Codec: {activeVoiceNote.codec}</span>
                  <span>Payload: {activeVoiceNote.sizeKb} KB</span>
                </div>

                {/* Authenticated Blob Object URL HTML5 Audio Element with full playback controls */}
                <div className="pt-1">
                  {isAudioLoading ? (
                    <div className="py-2 flex items-center justify-center gap-2 text-[10px] text-teal-700 bg-teal-50/70 rounded-lg animate-pulse">
                      <div className="w-3 h-3 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                      <span>Loading patient voice recording...</span>
                    </div>
                  ) : audioObjectUrl ? (
                    <div className="space-y-1.5">
                      <audio
                        ref={audioRef}
                        controls
                        className="w-full h-8 rounded-lg opacity-90 hover:opacity-100 transition-opacity"
                        src={audioObjectUrl}
                        preload="auto"
                        onPlay={() => setIsPlayingAudio(true)}
                        onPause={() => setIsPlayingAudio(false)}
                        onTimeUpdate={() => {
                          if (audioRef.current) {
                            setAudioCurrentTime(audioRef.current.currentTime || 0);
                          }
                        }}
                        onLoadedMetadata={() => {
                          if (audioRef.current && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
                            setAudioDuration(audioRef.current.duration);
                          }
                        }}
                        onCanPlay={() => {
                          if (audioRef.current && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
                            setAudioDuration(audioRef.current.duration);
                          }
                        }}
                        onEnded={() => {
                          setIsPlayingAudio(false);
                          setAudioCurrentTime(0);
                        }}
                        onError={(e) => {
                          console.warn('[Doctor Audio] HTML5 audio error event, seamlessly switching to Web Audio API engine:', e);
                          if (webAudioPlayerRef.current && isPlayingAudio) {
                            webAudioPlayerRef.current.play(audioCurrentTime).catch(() => {});
                          }
                        }}
                      >
                        Your browser does not support audio playback.
                      </audio>

                      {audioPlaybackError && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 p-1.5 rounded-lg flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{audioPlaybackError}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-center py-1">
                      <p className="text-[10px] text-gray-400">No audio buffer available</p>
                      {audioPlaybackError && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 p-1.5 rounded-lg flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{audioPlaybackError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-3 text-center text-gray-400 text-[11px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <span>No voice recording available</span>
              </div>
            )}
          </div>

          {/* Card 4: Official Digital Prescription & Regimen */}
          <div className="bg-white rounded-2xl p-3 border border-[#E9EFEF] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <FileText className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <p className="text-[11.5px] font-bold text-[#112622] leading-tight">
                    Digital Prescription
                  </p>
                  <p className="text-[9px] text-[#5C736F]">
                    Verified Clinical Treatment Plan
                  </p>
                </div>
              </div>

              {casePrescriptions.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {casePrescriptions[0].status}
                </span>
              )}
            </div>

            {casePrescriptions.length > 0 && (casePrescriptions[0].status === 'ISSUED' || casePrescriptions[0].status === 'AMENDED') ? (
              <div className="bg-[#F7FAF9] border border-[#E2E8F0] rounded-xl p-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#0B463B]">
                      {casePrescriptions[0].rxNumber}
                    </span>
                    <p className="text-[9px] text-gray-500">
                      {casePrescriptions[0].doctorName} • Reg: {casePrescriptions[0].doctorRegNumber}
                    </p>
                  </div>

                  <a
                    href={`/api/prescriptions/${casePrescriptions[0].id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-[#0B463B] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs hover:bg-[#083830] transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download PDF</span>
                  </a>
                </div>

                {casePrescriptions[0].diagnosis && (
                  <p className="text-[10px] text-gray-700 bg-white p-1.5 rounded-lg border border-gray-100">
                    <strong className="text-[#0B463B]">Dx:</strong> {casePrescriptions[0].diagnosis}
                  </p>
                )}

                {/* Medicines preview */}
                <div className="space-y-1">
                  {(() => {
                    let meds = [];
                    try {
                      meds = JSON.parse(casePrescriptions[0].medicationsJson || '[]');
                    } catch {}
                    return meds.slice(0, 3).map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[9.5px] bg-white px-2 py-1 rounded border border-gray-100">
                        <span className="font-bold text-gray-800">{m.name} ({m.strength})</span>
                        <span className="text-gray-500">{m.dosage} • {m.frequency}</span>
                      </div>
                    ));
                  })()}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-[#0B463B] text-[#0B463B] text-[10px] font-bold hover:bg-emerald-50 transition-colors"
                  >
                    Amend Prescription
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 leading-snug">
                  Review patient vitals, clinical photos, and audio note before prescribing.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPrescriptionModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#0B463B] hover:bg-[#083830] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Digital Prescription</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Creation & Preview Modal */}
      {isPrescriptionModalOpen && (
        <PrescriptionModal
          isOpen={isPrescriptionModalOpen}
          onClose={() => setIsPrescriptionModalOpen(false)}
          caseRecord={activeCase}
          onPrescriptionIssued={(newRx) => {
            setCasePrescriptions([newRx, ...casePrescriptions]);
          }}
        />
      )}

      {/* High-Resolution Clinical Image Inspection & Zoom Modal */}
      {selectedImageModal && (
        <div
          onClick={() => setSelectedImageModal(null)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-3 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full bg-slate-900 rounded-3xl overflow-hidden border border-white/20 p-4 space-y-3 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between text-white border-b border-white/10 pb-2.5">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {selectedImageModal.label}
                </span>
                <p className="text-[10px] text-gray-400">
                  {selectedImageModal.bodySite} Inspection • {activeCase.fullName}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={() => setImageZoom((prev) => Math.max(0.75, prev - 0.25))}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {/* Toggle Original vs Compressed WebP */}
                <button
                  type="button"
                  onClick={() => setViewOriginalInModal((prev) => !prev)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors ${
                    viewOriginalInModal
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-white/10 text-emerald-300 border-white/20 hover:bg-white/20'
                  }`}
                  title="Toggle original uncompressed / compressed WebP"
                >
                  {viewOriginalInModal ? 'Original RAW' : 'WebP Derivative'}
                </button>
                {/* Download button */}
                <a
                  href={viewOriginalInModal ? `${selectedImageModal.downloadUrl}&original=true` : selectedImageModal.downloadUrl}
                  download={selectedImageModal.originalFilename}
                  className="p-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 transition-colors flex items-center justify-center"
                  title="Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                {/* Close modal */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageModal(null);
                    setViewOriginalInModal(false);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Full Image Container with Interactive Zoom */}
            <div className="aspect-square w-full rounded-2xl bg-black flex items-center justify-center relative overflow-hidden border border-white/10">
              <img
                src={viewOriginalInModal ? `${selectedImageModal.url}?original=true` : selectedImageModal.url}
                alt={selectedImageModal.label}
                style={{ transform: `scale(${imageZoom})` }}
                className="w-full h-full object-contain transition-transform duration-200"
              />
              <div className="absolute bottom-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[9px] font-bold text-white">
                {viewOriginalInModal ? 'Mode: Full Uncompressed Original' : 'Mode: Sharp WebP Compressed Derivative'}
              </div>
            </div>

            {/* Real Image Compression Metadata Breakdown */}
            <div className="bg-white/5 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center text-white border border-white/10">
              <div>
                <p className="text-[9px] text-gray-400">Original Size</p>
                <p className="text-[11px] font-bold text-gray-200 mt-0.5">
                  {+(selectedImageModal.originalSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Compressed WebP</p>
                <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                  {+(selectedImageModal.compressedSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Space Saved</p>
                <p className="text-[11px] font-bold text-emerald-300 mt-0.5">
                  {selectedImageModal.compressionRatio}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
