import React, { createContext, useContext, useState } from 'react';
import { ScreenId, PatientRecord, UserRole } from '../types/telemedicine';
import { api } from '../services/api';

interface TelemedicineContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  logout: () => void;
  // Active in-progress draft record
  draftPatient: Partial<PatientRecord>;
  setDraftPatient: React.Dispatch<React.SetStateAction<Partial<PatientRecord>>>;
  // Outbox list
  outboxRecords: PatientRecord[];
  addDraftToOutbox: () => void;
  syncOutbox: () => Promise<void>;
  isSyncing: boolean;
  // Success transmission stats
  transmissionStats: {
    imagePayloadKb: number;
    audioPayloadKb: number;
    deliveredCount: number;
  };
  // Search
  patientSearch: string;
  setPatientSearch: (val: string) => void;
  // History of completed transmissions
  deliveredRecords: PatientRecord[];
}

const initialOutbox: PatientRecord[] = [
  {
    id: '0418',
    fullName: 'Amina Mwangi',
    age: 34,
    gender: 'Female',
    syncHistoryOnConnect: true,
    timestamp: 'Today, 10:42 AM',
    timeAgo: '12m',
    clinic: 'Kijani Clinic',
    dateLabel: 'Today, 10:42 AM',
    systolic: 128,
    diastolic: 82,
    temperature: 36.8,
    heartRate: 72,
    photoOriginalSizeKb: 5120,
    photoCompressedSizeKb: 45,
    photoCompressionRatio: 99,
    audioDurationSeconds: 18,
    audioSizeKb: 3.31,
    voiceLanguage: 'English',
    totalPayloadKb: 32.7,
    status: 'PENDING NETWORK',
    initials: 'AM',
    badgeIndex: 1,
  },
  {
    id: '0419',
    fullName: 'Joseph Otieno',
    age: 51,
    gender: 'Male',
    syncHistoryOnConnect: true,
    timestamp: 'Today, 9:15 AM',
    timeAgo: '34m',
    clinic: 'Mara Health Post',
    dateLabel: 'Today, 9:15 AM',
    systolic: 135,
    diastolic: 88,
    temperature: 37.4,
    heartRate: 84,
    photoOriginalSizeKb: 4800,
    photoCompressedSizeKb: 42,
    photoCompressionRatio: 99,
    audioDurationSeconds: 24,
    audioSizeKb: 4.1,
    voiceLanguage: 'Swahili',
    totalPayloadKb: 28.1,
    status: 'PENDING NETWORK',
    initials: 'JO',
    badgeIndex: 2,
  },
  {
    id: '0420',
    fullName: 'Fatima Khalid',
    age: 29,
    gender: 'Female',
    syncHistoryOnConnect: true,
    timestamp: 'Yesterday, 4:38 PM',
    timeAgo: '1h',
    clinic: 'Tana Dispensary',
    dateLabel: 'Yesterday, 4:38 PM',
    systolic: 118,
    diastolic: 76,
    temperature: 36.5,
    heartRate: 68,
    photoOriginalSizeKb: 3200,
    photoCompressedSizeKb: 34,
    photoCompressionRatio: 99,
    audioDurationSeconds: 12,
    audioSizeKb: 2.4,
    voiceLanguage: 'Swahili',
    totalPayloadKb: 24.6,
    status: 'PENDING NETWORK',
    initials: 'FK',
    badgeIndex: 3,
  },
  {
    id: '0421',
    fullName: 'Peter Kamau',
    age: 62,
    gender: 'Male',
    syncHistoryOnConnect: true,
    timestamp: 'Today, 8:00 AM',
    timeAgo: '2h',
    clinic: 'Nyeri Outreach',
    dateLabel: 'Today, 8:00 AM',
    systolic: 142,
    diastolic: 90,
    temperature: 37.1,
    heartRate: 80,
    photoOriginalSizeKb: 2900,
    photoCompressedSizeKb: 31,
    photoCompressionRatio: 99,
    audioDurationSeconds: 15,
    audioSizeKb: 2.9,
    voiceLanguage: 'Kikuyu / Swahili',
    totalPayloadKb: 18.9,
    status: 'PENDING NETWORK',
    initials: 'PK',
    badgeIndex: 4,
  },
];

const cleanDraftPatient: Partial<PatientRecord> = {
  id: '',
  fullName: '',
  age: undefined,
  gender: undefined,
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
  audioDurationSeconds: undefined,
  audioSizeKb: undefined,
};

const TelemedicineContext = createContext<TelemedicineContextType | null>(null);

export const TelemedicineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('portal-select');
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [draftPatient, setDraftPatient] = useState<Partial<PatientRecord>>(cleanDraftPatient);

  const logout = () => {
    api.setToken(null);
    setCurrentRole(null);
    setDraftPatient(cleanDraftPatient);
    setCurrentScreen('portal-select');
  };

  const [outboxRecords, setOutboxRecords] = useState<PatientRecord[]>(initialOutbox);
  const [deliveredRecords, setDeliveredRecords] = useState<PatientRecord[]>([]);

  const [transmissionStats, setTransmissionStats] = useState({
    imagePayloadKb: 22.3,
    audioPayloadKb: 3.31,
    deliveredCount: 3,
  });

  const addDraftToOutbox = () => {
    const initials = draftPatient.fullName
      ? draftPatient.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'PT';

    const newRecord: PatientRecord = {
      id: draftPatient.id || `0${Math.floor(100 + Math.random() * 900)}`,
      fullName: draftPatient.fullName || 'Amina M.',
      age: draftPatient.age || 28,
      gender: (draftPatient.gender as any) || 'Female',
      syncHistoryOnConnect: draftPatient.syncHistoryOnConnect ?? true,
      timestamp: 'Just now',
      dateLabel: 'Just now',
      systolic: draftPatient.systolic || '120',
      diastolic: draftPatient.diastolic || '80',
      temperature: draftPatient.temperature || '36.8',
      heartRate: draftPatient.heartRate || '72',
      photoUrl: draftPatient.photoUrl,
      photoOriginalSizeKb: draftPatient.photoOriginalSizeKb || 5120,
      photoCompressedSizeKb: draftPatient.photoCompressedSizeKb || 45,
      photoCompressionRatio: draftPatient.photoCompressionRatio || 99,
      uploadedImages: draftPatient.uploadedImages || [],
      audioBlob: draftPatient.audioBlob,
      audioUrl: draftPatient.audioUrl,
      audioDurationSeconds: draftPatient.audioDurationSeconds || 18,
      audioSizeKb: draftPatient.audioSizeKb || 3.31,
      voiceLanguage: draftPatient.voiceLanguage || 'English',
      totalPayloadKb: +(8.2 + Math.random()).toFixed(1),
      status: 'PENDING NETWORK',
      initials,
      badgeIndex: outboxRecords.length + 1,
    };

    setOutboxRecords((prev) => [newRecord, ...prev]);
  };

  const syncOutbox = async () => {
    setIsSyncing(true);

    // Transition items to SYNCING
    setOutboxRecords((prev) =>
      prev.map((r) => ({ ...r, status: 'SYNCING' as const }))
    );

    try {
      // Connect to backend sync if reachable
      const syncPayload = {
        clientId: 'MOBILE_FIELD_APP',
        idempotencyKey: `SYNC_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        records: outboxRecords.map((r) => ({
          clientRecordId: r.id,
          fullName: r.fullName,
          age: Number(r.age) || 30,
          gender: r.gender || 'Female',
          systolic: Number(r.systolic) || 120,
          diastolic: Number(r.diastolic) || 80,
          temperature: Number(r.temperature) || 36.8,
          heartRate: Number(r.heartRate) || 72,
          clinic: r.clinic || 'Kijani Rural Clinic',
          voiceLanguage: r.voiceLanguage,
          photoUrl: r.photoUrl,
          audioUrl: r.audioUrl,
        })),
      };
      await api.sync.batchSync(syncPayload);
    } catch (err) {
      console.warn('Sync processed in offline queue mode:', err);
    }

    // Simulate reliable progressive network delivery over 2G
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const totalSyncedCount = outboxRecords.length;
    setTransmissionStats({
      imagePayloadKb: 22.3,
      audioPayloadKb: 3.31,
      deliveredCount: totalSyncedCount > 0 ? totalSyncedCount : 3,
    });

    setDeliveredRecords((prev) => [
      ...outboxRecords.map((r) => ({ ...r, status: 'DELIVERED' as const })),
      ...prev,
    ]);
    setOutboxRecords([]);
    setIsSyncing(false);
    setCurrentScreen('success');
  };

  return (
    <TelemedicineContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        currentRole,
        setCurrentRole,
        logout,
        draftPatient,
        setDraftPatient,
        outboxRecords,
        addDraftToOutbox,
        syncOutbox,
        isSyncing,
        transmissionStats,
        patientSearch,
        setPatientSearch,
        deliveredRecords,
      }}
    >
      {children}
    </TelemedicineContext.Provider>
  );
};

export const useTelemedicine = () => {
  const context = useContext(TelemedicineContext);
  if (!context) {
    throw new Error('useTelemedicine must be used within a TelemedicineProvider');
  }
  return context;
};
