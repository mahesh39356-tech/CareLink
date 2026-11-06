import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  TrendingDown,
  Mic,
  Play,
  Pause,
  Square,
  Plus,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Clock,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
} from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { PrimaryButton } from '../common/PrimaryButton';
import { useTelemedicine } from '../../state/telemedicineContext';
import { VoiceNoteRecorder, WebAudioPlayer, decodeAudioBlob } from '../../utils/audio';
import { compressClinicalImage } from '../../utils/compression';
import { api } from '../../services/api';

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([uint8Array], { type: mime });
}

interface PendingImageUpload {
  file: File;
  previewUrl: string;
  originalSizeBytes: number;
  compressedFile: File;
  compressedSizeBytes: number;
  compressionRatio: number;
}

export const MediaCaptureScreen: React.FC = () => {
  const { draftPatient, setDraftPatient, addDraftToOutbox, setCurrentScreen } = useTelemedicine();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Image Upload States (Clean Upload Area)
  const [pendingImage, setPendingImage] = useState<PendingImageUpload | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadSuccess, setImageUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Medical Image Inspection Modal States
  const [selectedImageModal, setSelectedImageModal] = useState<any | null>(null);
  const [modalZoom, setModalZoom] = useState(1);
  const [viewOriginalInModal, setViewOriginalInModal] = useState(false);

  // Audio recording & playback states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(draftPatient.audioBlob || null);
  const [convertedAudioBlob, setConvertedAudioBlob] = useState<Blob | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(draftPatient.audioUrl || null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(draftPatient.audioDurationSeconds || 0);
  const [isAudioUploaded, setIsAudioUploaded] = useState(Boolean(draftPatient.audioUrl && !draftPatient.audioBlob));
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploadSuccess, setAudioUploadSuccess] = useState<string | null>(null);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);
  const [micStatusMessage, setMicStatusMessage] = useState<string | null>(null);

  const recorderRef = useRef<VoiceNoteRecorder | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const webAudioPlayerRef = useRef<WebAudioPlayer | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);

  const activeCaseId = draftPatient.id || '0418';
  const existingImageHistory = draftPatient.uploadedImages || [];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (webAudioPlayerRef.current) {
        webAudioPlayerRef.current.destroy();
      }
    };
  }, []);

  // Refresh medical image history from backend
  const refreshImages = async () => {
    if (!activeCaseId) return;
    try {
      const res = await api.cases.getImages(activeCaseId);
      if (res && res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((img: any) => ({
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
        setDraftPatient((prev) => ({
          ...prev,
          uploadedImages: mapped,
          photoUrl: mapped.length > 0 ? mapped[0].url : prev.photoUrl,
          photoOriginalSizeKb: mapped.length > 0 ? +(mapped[0].originalSizeBytes / 1024).toFixed(1) : prev.photoOriginalSizeKb,
          photoCompressedSizeKb: mapped.length > 0 ? +(mapped[0].compressedSizeBytes / 1024).toFixed(1) : prev.photoCompressedSizeKb,
          photoCompressionRatio: mapped.length > 0 ? mapped[0].compressionRatio : prev.photoCompressionRatio,
        }));
      }
    } catch (err) {
      console.warn('Patient images history notice:', err);
    }
  };

  // Fetch all images for this authenticated patient on mount
  useEffect(() => {
    refreshImages();
  }, [activeCaseId]);

  // Load existing voice note for this case on mount if not already in draft state
  useEffect(() => {
    let isMounted = true;
    const loadCaseAudio = async () => {
      let audioUrlToFetch = draftPatient.audioUrl;
      if (!audioUrlToFetch && activeCaseId) {
        try {
          const res = await api.cases.getAudio(activeCaseId);
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            audioUrlToFetch = res.data[0].url;
            setAudioDuration(res.data[0].durationSeconds || 5);
          }
        } catch {}
      }

      if (audioUrlToFetch && !recordedAudioBlob) {
        try {
          const { blob, objectUrl } = await api.cases.fetchAudioBlob(audioUrlToFetch);
          if (!isMounted) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
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

            setRecordedAudioBlob(blob);
            setConvertedAudioBlob(decoded.wavBlob);
            setAudioPlaybackUrl(decoded.wavUrl);
            setAudioDuration(decoded.durationSeconds || draftPatient.audioDurationSeconds || 5);
            setIsAudioUploaded(true);
          }
        } catch (audioFetchErr) {
          console.warn('Existing audio load notice:', audioFetchErr);
        }
      }
    };

    loadCaseAudio();

    return () => {
      isMounted = false;
    };
  }, [activeCaseId, draftPatient.audioUrl]);

  // 1. Handle Selection of a NEW Image (Clean Upload Selection)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setUploadError(null);
      setImageUploadSuccess(null);

      const originalSizeBytes = file.size;

      // Real Client-Side WebP Compression via HTML5 Canvas
      let uploadFile: File = file;
      let compressedBytes = originalSizeBytes;
      let ratio = 0;
      let previewUrl = URL.createObjectURL(file);

      try {
        const clientCompression = await compressClinicalImage(file);
        const compressedBlob = dataUrlToBlob(clientCompression.compressedDataUrl);
        compressedBytes = compressedBlob.size;
        ratio = clientCompression.reductionPercentage;
        previewUrl = clientCompression.compressedDataUrl;

        if (compressedBlob.size < originalSizeBytes) {
          uploadFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: 'image/webp',
          });
        }
      } catch (compErr) {
        console.warn('Client-side compression fallback to raw file:', compErr);
      }

      setPendingImage({
        file,
        previewUrl,
        originalSizeBytes,
        compressedFile: uploadFile,
        compressedSizeBytes: compressedBytes,
        compressionRatio: ratio,
      });
    } catch (err: any) {
      console.error('Image compression error:', err);
      setUploadError(err.message || 'Failed to process image');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Confirm & Upload the New Image to Backend
  const handleConfirmImageUpload = async () => {
    if (!pendingImage) return;

    try {
      setIsUploadingImage(true);
      setUploadError(null);

      const label = `IMAGE 0${existingImageHistory.length + 1}`;
      const response = await api.cases.uploadImage(
        activeCaseId,
        pendingImage.compressedFile,
        label,
        'DERMATOLOGY',
        pendingImage.originalSizeBytes
      );

      if (response && response.success) {
        setImageUploadSuccess(`Saved "${label}" to Medical Image History.`);
        setPendingImage(null); // Reset upload area to clean state
        await refreshImages();
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Cancel new image selection
  const handleCancelNewImage = () => {
    setPendingImage(null);
    setUploadError(null);
  };

  // ==================== AUDIO RECORDING & PLAYBACK ====================

  // Start Recording
  const startRecording = async () => {
    setMicStatusMessage(null);
    setAudioUploadSuccess(null);
    setAudioPlaybackError(null);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    }

    const recorder = new VoiceNoteRecorder();
    recorderRef.current = recorder;
    const startResult = await recorder.start();

    setIsRecording(true);
    setIsPaused(false);
    setRecordingSeconds(0);
    setAudioCurrentTime(0);

    if (!startResult.success) {
      setMicStatusMessage(startResult.error || 'Microphone unavailable. Using audio fallback generator.');
    }

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Pause Recording
  const pauseRecording = () => {
    if (recorderRef.current && isRecording && !isPaused) {
      recorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Resume Recording
  const resumeRecording = () => {
    if (recorderRef.current && isRecording && isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  // Stop Recording: Creates Blob and local URL for pre-upload playback (DOES NOT AUTO-UPLOAD)
  const stopRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      if (recorderRef.current) {
        const result = await recorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        setRecordedAudioBlob(result.audioBlob);
        setConvertedAudioBlob(result.convertedBlob || null);
        setAudioPlaybackUrl(result.playbackUrl);
        setAudioDuration(result.durationSeconds);
        setIsAudioUploaded(false);

        // Initialize Web Audio API Player with decoded buffer
        if (result.audioBuffer) {
          decodedBufferRef.current = result.audioBuffer;
          if (!webAudioPlayerRef.current) {
            webAudioPlayerRef.current = new WebAudioPlayer(result.audioBuffer);
          } else {
            webAudioPlayerRef.current.setBuffer(result.audioBuffer);
          }
          webAudioPlayerRef.current.onTimeUpdate = (time) => setAudioCurrentTime(time);
          webAudioPlayerRef.current.onEnded = () => {
            setIsPlayingAudio(false);
            setAudioCurrentTime(0);
          };
          webAudioPlayerRef.current.onPlay = () => setIsPlayingAudio(true);
          webAudioPlayerRef.current.onPause = () => setIsPlayingAudio(false);
        }

        if (result.isSimulatedFallback) {
          setMicStatusMessage('Microphone access denied. Using speech simulator for testing.');
        } else {
          setMicStatusMessage(null);
        }

        // Keep local blob in draft
        setDraftPatient((prev) => ({
          ...prev,
          audioBlob: result.audioBlob,
          audioUrl: result.playbackUrl,
          audioDurationSeconds: result.durationSeconds,
          audioSizeKb: result.sizeKb,
        }));
      } else {
        setIsRecording(false);
        setIsPaused(false);
      }
    } catch (err: any) {
      console.warn('Audio recording stop error:', err);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Upload Voice Note to Backend
  const handleUploadAudio = async () => {
    if (!recordedAudioBlob && !draftPatient.audioBlob) return;
    const blobToUpload = recordedAudioBlob || draftPatient.audioBlob!;
    const duration = audioDuration || draftPatient.audioDurationSeconds || 5;

    try {
      setIsUploadingAudio(true);
      setAudioUploadSuccess(null);
      setAudioPlaybackError(null);

      const uploadRes = await api.cases.uploadAudio(
        activeCaseId,
        blobToUpload,
        draftPatient.voiceLanguage || 'English',
        duration,
        convertedAudioBlob || undefined
      );

      if (uploadRes && uploadRes.success) {
        const uploadedVoice = uploadRes.data;
        const serverUrl = api.cases.getAudioUrl(uploadedVoice.id);
        setIsAudioUploaded(true);
        setDraftPatient((prev) => ({
          ...prev,
          audioBlob: blobToUpload,
          audioUrl: serverUrl,
          audioDurationSeconds: uploadedVoice.durationSeconds || duration,
          audioSizeKb: uploadedVoice.sizeKb || +(blobToUpload.size / 1024).toFixed(2),
        }));
        setAudioUploadSuccess(`Voice note saved securely to Case CL-2024-${activeCaseId}`);
      }
    } catch (uploadErr: any) {
      console.warn('Audio upload notice:', uploadErr);
      setAudioPlaybackError(uploadErr.message || 'Failed to upload voice note to backend');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Play / Pause Audio Control with Automatic Web Audio API Fallback
  const handleToggleAudioPlay = async () => {
    setAudioPlaybackError(null);
    const audio = audioPlayerRef.current;

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
    if (audio && audioPlaybackUrl) {
      try {
        await audio.play();
        setIsPlayingAudio(true);
        html5Succeeded = true;
      } catch (err: any) {
        console.warn('[Audio Playback] HTML5 audio element deferred, activating Web Audio API engine:', err);
        html5Succeeded = false;
      }
    }

    // Layer 2: Seamless Web Audio API direct playback
    if (!html5Succeeded) {
      try {
        if (!webAudioPlayerRef.current && (convertedAudioBlob || recordedAudioBlob)) {
          const blobToDecode = convertedAudioBlob || recordedAudioBlob!;
          const decoded = await decodeAudioBlob(blobToDecode);
          decodedBufferRef.current = decoded.audioBuffer;
          webAudioPlayerRef.current = new WebAudioPlayer(decoded.audioBuffer);
          webAudioPlayerRef.current.onTimeUpdate = (time) => setAudioCurrentTime(time);
          webAudioPlayerRef.current.onEnded = () => {
            setIsPlayingAudio(false);
            setAudioCurrentTime(0);
          };
          webAudioPlayerRef.current.onPlay = () => setIsPlayingAudio(true);
          webAudioPlayerRef.current.onPause = () => setIsPlayingAudio(false);
        }

        if (webAudioPlayerRef.current) {
          await webAudioPlayerRef.current.play(audioCurrentTime);
          setIsPlayingAudio(true);
        }
      } catch (fallbackErr: any) {
        console.error('Audio playback error:', fallbackErr);
        setAudioPlaybackError('Click page to enable audio playback device.');
        setIsPlayingAudio(false);
      }
    }
  };

  // Seek along waveform
  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const totalDuration = audioDuration || draftPatient.audioDurationSeconds || 10;
    if (!totalDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * totalDuration;

    setAudioCurrentTime(newTime);

    const audio = audioPlayerRef.current;
    if (audio) {
      try {
        audio.currentTime = newTime;
      } catch {}
    }
    if (webAudioPlayerRef.current) {
      webAudioPlayerRef.current.seek(newTime);
    }
  };

  // Discard & Re-record
  const handleDeleteAndRerecord = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (webAudioPlayerRef.current) {
      webAudioPlayerRef.current.stop();
    }
    decodedBufferRef.current = null;
    setIsPlayingAudio(false);
    setAudioPlaybackUrl(null);
    setRecordedAudioBlob(null);
    setConvertedAudioBlob(null);
    setRecordingSeconds(0);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setIsAudioUploaded(false);
    setAudioUploadSuccess(null);
    setAudioPlaybackError(null);
    setMicStatusMessage(null);

    setDraftPatient((prev) => ({
      ...prev,
      audioBlob: undefined,
      audioUrl: undefined,
      audioDurationSeconds: undefined,
      audioSizeKb: undefined,
    }));
  };

  const handleNext = () => {
    addDraftToOutbox();
    setCurrentScreen('outbox');
  };

  const hasAudioRecording = Boolean(audioPlaybackUrl || draftPatient.audioUrl || recordedAudioBlob);
  const waveformBars = [40, 65, 30, 85, 95, 70, 50, 75, 45, 60, 90, 100, 80, 55, 35, 70, 85, 60, 40, 25];

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9] overflow-y-auto no-scrollbar">
      <div>
        <AppHeader
          title="Media Capture"
          backTarget="vitals"
          stepIndicator="3 / 4"
        />

        <div className="px-5 pt-4 pb-2 space-y-5">
          {/* Section Heading */}
          <div>
            <span className="text-[11px] font-bold tracking-widest text-[#0B463B] uppercase">
              VISUAL EVIDENCE & VOICE NOTE
            </span>
            <h2 className="text-[24px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-0.5">
              Add clinical media
            </h2>
            <p className="text-[13px] text-[#5C736F] mt-1">
              Select new images to upload, and record voice symptoms.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* ========================================================= */}
          {/* 1. UPLOAD IMAGE SECTION (Always Clean Area for New Files) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-3xl p-4 border border-[#E9EFEF] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#112622] uppercase tracking-wide">
                Upload New Image
              </span>
              <span className="bg-teal-50 text-teal-800 font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md">
                JPG / PNG / WebP
              </span>
            </div>

            {/* If NO new image is currently selected, show the clean dropzone */}
            {!pendingImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-7 border-2 border-dashed border-[#D2DFDC] hover:border-teal-500 rounded-2xl flex flex-col items-center justify-center group bg-[#FAFCFC] hover:bg-teal-50/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-teal-50 group-hover:bg-teal-100 text-[#0B463B] flex items-center justify-center mb-2 transition-colors">
                  <Camera className="w-6 h-6 stroke-[2]" />
                </div>
                <p className="text-[14px] font-bold text-[#112622] text-center">
                  Tap to capture photo
                </p>
                <p className="text-[12px] text-[#5C736F] text-center mt-0.5">
                  or choose from device
                </p>
              </div>
            ) : (
              /* If a new image was chosen, show the New Image Upload Preview with Before/After metrics */
              <div className="border border-teal-200 bg-teal-50/40 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-900 uppercase">
                    New Image Preview (Ready to Upload)
                  </span>
                  <span className="bg-teal-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {pendingImage.compressionRatio}% SMALLER
                  </span>
                </div>

                {/* Preview Thumbnail & Metrics */}
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-teal-100">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-gray-200">
                    <img
                      src={pendingImage.previewUrl}
                      alt="New selection preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#112622] truncate">
                      {pendingImage.file.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      <span>{(pendingImage.originalSizeBytes / 1024).toFixed(1)} KB</span>{' '}
                      <span className="text-gray-400">→</span>{' '}
                      <span className="font-bold text-teal-800">
                        {(pendingImage.compressedSizeBytes / 1024).toFixed(1)} KB (WebP)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons for New Selection */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmImageUpload}
                    disabled={isUploadingImage}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#0B463B] hover:bg-[#083830] text-white shadow-xs disabled:opacity-50 transition-all"
                  >
                    {isUploadingImage ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Confirm & Upload Photo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelNewImage}
                    disabled={isUploadingImage}
                    className="py-2 px-3 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isCompressing && (
              <div className="text-xs font-semibold text-teal-800 bg-teal-50 p-2 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                <div className="w-3 h-3 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                <span>Compressing photo to WebP...</span>
              </div>
            )}

            {imageUploadSuccess && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{imageUploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 2. MEDICAL IMAGE HISTORY (Previously Uploaded Images)     */}
          {/* ========================================================= */}
          <div className="bg-white rounded-3xl p-4 border border-[#E9EFEF] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#0B463B]" />
                <span className="text-[12px] font-bold text-[#112622] uppercase tracking-wide">
                  Medical Image History
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshImages}
                  className="p-1 rounded-md text-gray-400 hover:text-[#0B463B] hover:bg-gray-100 transition-colors"
                  title="Refresh image history"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md">
                  {existingImageHistory.length} Saved {existingImageHistory.length === 1 ? 'Photo' : 'Photos'}
                </span>
              </div>
            </div>

            {existingImageHistory.length > 0 ? (
              <div className="space-y-2">
                {/* Scrollable list of ALL images with rich metadata */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {existingImageHistory.map((img, i) => (
                    <div
                      key={img.id || i}
                      onClick={() => {
                        setSelectedImageModal(img);
                        setModalZoom(1);
                        setViewOriginalInModal(false);
                      }}
                      className="bg-[#FAFCFC] border border-[#E5EBEA] hover:border-teal-500 rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer transition-all hover:shadow-xs group"
                      title="Click to inspect full resolution image"
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-gray-200">
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-bold text-[#112622] truncate">
                            {img.label} – Previous upload
                          </p>
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                            {img.compressionRatio || 0}% smaller
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {img.originalFilename || 'clinical_photo.webp'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                          <span>
                            {+(img.originalSizeBytes / 1024).toFixed(1)} KB → {+(img.compressedSizeBytes / 1024).toFixed(1)} KB (WebP)
                          </span>
                          {img.capturedAt && (
                            <>
                              <span>•</span>
                              <span>
                                {new Date(img.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 pt-1">
                  Existing clinical images stored securely for Case CL-2024-{activeCaseId}. Tap any photo to view full size.
                </p>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-gray-400 bg-gray-50/60 rounded-xl border border-gray-100">
                No previous images uploaded for this consultation.
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3. PATIENT AUDIO RECORDER & PLAYBACK SECTION              */}
          {/* ========================================================= */}
          <div className="bg-white rounded-3xl p-4 border border-[#E9EFEF] shadow-card space-y-3.5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Mic className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#112622]">
                    Audio Recorder
                  </p>
                  <p className="text-[11px] text-[#5C736F]">
                    {isRecording
                      ? isPaused
                        ? '⏸️ Recording Paused'
                        : '🔴 Live Recording in progress'
                      : hasAudioRecording
                      ? isAudioUploaded
                        ? 'Voice Note Saved to Case'
                        : 'Voice Note Ready — Listen below'
                      : 'Record symptoms with microphone'}
                  </p>
                </div>
              </div>

              <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                {draftPatient.audioSizeKb
                  ? `${draftPatient.audioSizeKb} KB`
                  : hasAudioRecording
                  ? 'Ready'
                  : '0.0 KB'}
              </span>
            </div>

            {/* Hidden HTML5 Audio Element for Playback */}
            {audioPlaybackUrl && (
              <audio
                ref={audioPlayerRef}
                src={audioPlaybackUrl}
                preload="metadata"
                onPlay={() => setIsPlayingAudio(true)}
                onPause={() => setIsPlayingAudio(false)}
                onTimeUpdate={() => {
                  if (audioPlayerRef.current) {
                    setAudioCurrentTime(audioPlayerRef.current.currentTime || 0);
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioPlayerRef.current && !isNaN(audioPlayerRef.current.duration) && isFinite(audioPlayerRef.current.duration)) {
                    setAudioDuration(audioPlayerRef.current.duration);
                  }
                }}
                onCanPlay={() => {
                  if (audioPlayerRef.current && !isNaN(audioPlayerRef.current.duration) && isFinite(audioPlayerRef.current.duration)) {
                    setAudioDuration(audioPlayerRef.current.duration);
                  }
                }}
                onEnded={() => {
                  setIsPlayingAudio(false);
                  setAudioCurrentTime(0);
                }}
                onError={(e) => {
                  console.warn('[Audio Player] HTML5 audio decoding error, seamlessly falling back to Web Audio API engine:', e);
                  if (webAudioPlayerRef.current && isPlayingAudio) {
                    webAudioPlayerRef.current.play(audioCurrentTime).catch(() => {});
                  }
                }}
                className="hidden"
              />
            )}

            {/* Waveform Player Row with Functional Play/Pause & Scrubbing */}
            <div className="flex items-center gap-3 bg-[#FAFCFC] border border-[#E5EBEA] rounded-2xl px-3.5 py-2.5">
              <button
                type="button"
                onClick={handleToggleAudioPlay}
                disabled={isRecording || !hasAudioRecording}
                className="w-9 h-9 rounded-full bg-[#0B463B] hover:bg-[#083830] disabled:bg-gray-300 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
                title={isPlayingAudio ? 'Pause playback' : 'Play voice note'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>

              {/* Interactive Waveform / Progress Scrub */}
              <div
                onClick={hasAudioRecording ? handleAudioSeek : undefined}
                className={`flex-1 flex items-center justify-between gap-1 h-7 px-1 ${hasAudioRecording ? 'cursor-pointer' : ''}`}
                title={hasAudioRecording ? 'Click to seek' : ''}
              >
                {waveformBars.map((height, i) => {
                  const barProgress = i / waveformBars.length;
                  const currentProgress = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
                  const isPlayed = barProgress <= currentProgress;

                  return (
                    <div
                      key={i}
                      style={{ height: `${height}%` }}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isPlayingAudio && isPlayed
                          ? 'bg-teal-700 animate-pulse'
                          : isPlayed
                          ? 'bg-[#0B463B]'
                          : isRecording && !isPaused
                          ? 'bg-teal-600 animate-pulse'
                          : isPaused
                          ? 'bg-amber-400'
                          : 'bg-teal-200'
                      }`}
                    />
                  );
                })}
              </div>

              <span className="text-[12px] font-medium text-gray-600 tabular-nums font-mono">
                {isRecording
                  ? `0:${recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}`
                  : hasAudioRecording
                  ? `${Math.floor(audioCurrentTime)}s / ${Math.round(audioDuration || draftPatient.audioDurationSeconds || 0)}s`
                  : '0:00'}
              </span>
            </div>

            {/* Alerts & Status Messages */}
            {micStatusMessage && (
              <p className="text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>{micStatusMessage}</span>
              </p>
            )}

            {audioPlaybackError && (
              <div className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{audioPlaybackError}</span>
              </div>
            )}

            {isUploadingAudio && (
              <div className="text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-2 animate-pulse">
                <div className="w-3 h-3 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                <span>Uploading voice note to backend...</span>
              </div>
            )}

            {audioUploadSuccess && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{audioUploadSuccess}</span>
              </p>
            )}

            {/* Recording & Upload Action Controls */}
            <div className="flex flex-col gap-2 pt-1">
              {isRecording ? (
                /* 1. Active Recording Controls */
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isPaused
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-teal-700 hover:bg-teal-800 text-white'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-white" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              ) : hasAudioRecording ? (
                /* 2. Post-Recording Actions: Listen before submitting, Upload to backend, or Discard */
                <div className="space-y-2">
                  {!isAudioUploaded && (
                    <button
                      type="button"
                      onClick={handleUploadAudio}
                      disabled={isUploadingAudio}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-[#0B463B] hover:bg-[#083830] text-white shadow-xs transition-all"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Save & Upload Voice Note</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAndRerecord}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete & Re-record</span>
                    </button>

                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B463B] hover:bg-[#0B463B]/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>New Recording</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* 3. Idle: Start Recording Button */
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0B463B] hover:bg-[#083830] text-white transition-all shadow-xs"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record Voice Note</span>
                </button>
              )}

              {/* Language Selector Row */}
              <div className="flex items-center justify-between pt-1 text-[13px] border-t border-gray-100">
                <span className="text-gray-500 font-medium text-xs">Voice language</span>
                <div className="relative">
                  <select
                    value={draftPatient.voiceLanguage || 'English'}
                    onChange={(e) =>
                      setDraftPatient((prev) => ({
                        ...prev,
                        voiceLanguage: e.target.value,
                      }))
                    }
                    className="bg-transparent font-bold text-[#112622] text-xs pr-5 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Swahili">Swahili</option>
                    <option value="Luganda">Luganda</option>
                    <option value="Kinyarwanda">Kinyarwanda</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-500">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="p-5 pb-6">
        <PrimaryButton label="NEXT" onClick={handleNext} variant="primary" />
      </div>

      {/* ========================================================= */}
      {/* 4. CLINICAL IMAGE INSPECTION MODAL (Full Size + Zoom)     */}
      {/* ========================================================= */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#112622] border border-white/20 rounded-3xl max-w-lg w-full p-4 space-y-3.5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-400" />
                  <span>{selectedImageModal.label || 'Medical Photo'}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedImageModal.originalFilename || 'clinical_photo.webp'}
                  {selectedImageModal.capturedAt && ` • ${new Date(selectedImageModal.capturedAt).toLocaleDateString()}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Zoom buttons */}
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.max(0.7, +(z - 0.25).toFixed(2)))}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {modalZoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setModalZoom(1)}
                    className="px-2 py-1 rounded-lg bg-white/10 text-xs font-bold text-white hover:bg-white/20"
                  >
                    100%
                  </button>
                )}

                {/* Original vs WebP toggle */}
                <button
                  type="button"
                  onClick={() => setViewOriginalInModal((v) => !v)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                    viewOriginalInModal
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-white/10 text-teal-300 border-white/20 hover:bg-white/20'
                  }`}
                  title="Toggle original uncompressed / compressed WebP"
                >
                  {viewOriginalInModal ? 'Original RAW' : 'WebP Derivative'}
                </button>

                {/* Download */}
                <a
                  href={viewOriginalInModal ? `${selectedImageModal.url}?original=true&download=true` : `${selectedImageModal.url}?download=true`}
                  download={selectedImageModal.originalFilename || 'clinical_photo.webp'}
                  className="p-1.5 rounded-lg bg-teal-700 text-white hover:bg-teal-600 transition-colors flex items-center justify-center"
                  title="Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageModal(null);
                    setViewOriginalInModal(false);
                    setModalZoom(1);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Full Image Container */}
            <div className="aspect-square w-full rounded-2xl bg-black flex items-center justify-center relative overflow-hidden border border-white/10">
              <img
                src={viewOriginalInModal ? `${selectedImageModal.url}?original=true` : selectedImageModal.url}
                alt={selectedImageModal.label}
                style={{ transform: `scale(${modalZoom})` }}
                className="w-full h-full object-contain transition-transform duration-200"
              />
              <div className="absolute bottom-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[9px] font-bold text-white">
                {viewOriginalInModal ? 'Mode: Full Uncompressed Original' : 'Mode: Sharp WebP Compressed Derivative'}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="bg-white/5 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center text-white border border-white/10">
              <div>
                <p className="text-[9px] text-gray-400">Original Size</p>
                <p className="text-[11px] font-bold text-gray-200 mt-0.5">
                  {+(selectedImageModal.originalSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Compressed WebP</p>
                <p className="text-[11px] font-bold text-teal-400 mt-0.5">
                  {+(selectedImageModal.compressedSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-400">Space Saved</p>
                <p className="text-[11px] font-bold text-teal-300 mt-0.5">
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
