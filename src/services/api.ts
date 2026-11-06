const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private token: string | null = null;
  public baseUrl: string = API_BASE_URL;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('carelink_token', token);
    } else {
      localStorage.removeItem('carelink_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('carelink_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        const text = await response.text().catch(() => '');
        throw new Error(
          `Server returned unexpected response (${response.status}): ${text.slice(0, 100) || response.statusText}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `API request failed with status ${response.status}`);
      }

      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Please verify the CareLink backend is running on port 5000.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Auth & Profile
  auth = {
    registerPatient: (body: any) => this.request<any>('/auth/register-patient', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { identifier: string; password?: string }) => this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    patientLogin: (body: { identifier: string; password?: string }) =>
      this.request<any>('/auth/patient/login', { method: 'POST', body: JSON.stringify(body) }),
    doctorLogin: (body: { identifier: string; password?: string }) =>
      this.request<any>('/auth/doctor/login', { method: 'POST', body: JSON.stringify(body) }),
    getMe: () => this.request<any>('/auth/me'),
  };

  // Patients
  patients = {
    search: (query: string = '') => this.request<any>(`/patients?search=${encodeURIComponent(query)}`),
    getById: (id: string) => this.request<any>(`/patients/${id}`),
    create: (body: any) => this.request<any>('/patients', { method: 'POST', body: JSON.stringify(body) }),
  };

  // Vitals
  vitals = {
    record: (body: any) => this.request<any>('/vitals', { method: 'POST', body: JSON.stringify(body) }),
    recordSymptom: (body: any) => this.request<any>('/vitals/symptoms', { method: 'POST', body: JSON.stringify(body) }),
  };

  // Case Media Endpoints (Images & Voice Notes)
  cases = {
    uploadImage: async (caseId: string, file: File | Blob, label?: string, bodySite?: string, originalSizeBytes?: number) => {
      const formData = new FormData();
      formData.append('image', file, (file as File).name || `medical_photo_${Date.now()}.jpg`);
      if (label) formData.append('label', label);
      if (bodySite) formData.append('bodySite', bodySite);
      if (originalSizeBytes) formData.append('originalSizeBytes', String(originalSizeBytes));

      const headers: Record<string, string> = {};
      const token = api.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(`${API_BASE_URL}/cases/${caseId}/images`, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        });

        let data: any;
        try {
          data = await res.json();
        } catch {
          const text = await res.text().catch(() => '');
          throw new Error(`Server returned unexpected response (${res.status}): ${text.slice(0, 100) || res.statusText}`);
        }

        if (!res.ok) throw new Error(data.error || data.message || 'Failed to upload image');
        return data;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('Image upload timed out. Verify network connection and backend status.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },

    getImages: (caseId: string) => this.request<any>(`/cases/${caseId}/images`),

    getImageUrl: (imageId: string, download = false, original = false) => {
      const params = new URLSearchParams();
      if (download) params.append('download', 'true');
      if (original) params.append('original', 'true');
      const q = params.toString() ? `?${params.toString()}` : '';
      return `${API_BASE_URL}/images/${imageId}${q}`;
    },

    uploadAudio: async (
      caseId: string,
      audioBlob: Blob,
      language: string = 'English',
      durationSeconds?: number,
      convertedBlob?: Blob
    ) => {
      const formData = new FormData();
      const mimeType = audioBlob.type.toLowerCase().split(';')[0];
      const ext = mimeType === 'audio/wav' || mimeType === 'audio/x-wav'
        ? '.wav'
        : mimeType === 'audio/ogg' || mimeType === 'audio/opus'
          ? '.ogg'
          : mimeType === 'audio/mp4' || mimeType === 'audio/m4a' || mimeType === 'audio/aac'
            ? '.m4a'
            : mimeType === 'audio/mpeg'
              ? '.mp3'
              : '.webm';
      formData.append('audio', audioBlob, `voice_note_${Date.now()}${ext}`);
      if (convertedBlob) {
        formData.append('convertedAudio', convertedBlob, `voice_note_${Date.now()}_converted.wav`);
      }
      formData.append('language', language || 'English');
      if (durationSeconds) formData.append('durationSeconds', String(durationSeconds));

      const headers: Record<string, string> = {};
      const token = api.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(`${API_BASE_URL}/cases/${caseId}/audio`, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        });

        let data: any;
        try {
          data = await res.json();
        } catch {
          const text = await res.text().catch(() => '');
          throw new Error(`Server returned unexpected response (${res.status}): ${text.slice(0, 100) || res.statusText}`);
        }

        if (!res.ok) throw new Error(data.error || data.message || 'Failed to upload voice note');
        return data;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('Audio upload timed out. Verify network connection and backend status.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },

    getAudio: (caseId: string) => this.request<any>(`/cases/${caseId}/audio`),

    getAudioUrl: (audioId: string) => `${API_BASE_URL}/audio/${audioId}`,

    getAll: () => this.request<any>('/cases'),

    getById: (id: string) => this.request<any>(`/cases/${id}`),

    fetchAudioBlob: async (audioUrl: string): Promise<{ blob: Blob; objectUrl: string }> => {
      const token = api.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const fullUrl = audioUrl.startsWith('http')
        ? audioUrl
        : `${API_BASE_URL}${audioUrl.replace(/^\/api/, '')}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(fullUrl, { headers, signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Audio fetch failed with status ${response.status}`);
        }

        const blob = await response.blob();
        if (!blob || !blob.size) {
          throw new Error('Retrieved audio file is empty.');
        }

        const objectUrl = URL.createObjectURL(blob);
        return { blob, objectUrl };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('Audio download timed out.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };

  // File Compression Verification APIs
  files = {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    },
    compress: (fileId: string) => this.request<any>(`/files/${fileId}/compress`, { method: 'POST' }),
    decompress: (fileId: string) => this.request<any>(`/files/${fileId}/decompress`, { method: 'POST' }),
    getReport: (fileId: string) => this.request<any>(`/files/${fileId}`),
    getDownloadUrl: (fileId: string, type: 'original' | 'compressed' | 'decompressed') =>
      `${API_BASE_URL}/files/${fileId}/download/${type}`,
  };

  // Offline Synchronization Engine
  sync = {
    batchSync: (body: { clientId: string; idempotencyKey: string; timestamp: string; records: any[] }) =>
      this.request<any>('/sync/batch', { method: 'POST', body: JSON.stringify(body) }),
    getReceipt: (idempotencyKey: string) => this.request<any>(`/sync/receipt/${idempotencyKey}`),
  };

  // Doctor Dashboard
  doctors = {
    getCases: () => this.request<any>('/consultations/cases'),
    prescribe: (body: { consultationId: string; clinicalRemarks: string; medications?: any[] }) =>
      this.request<any>('/consultations/prescribe', { method: 'POST', body: JSON.stringify(body) }),
  };

  // Digital Prescription System
  prescriptions = {
    saveDraft: (body: any) =>
      this.request<any>('/prescriptions/draft', { method: 'POST', body: JSON.stringify(body) }),
    issue: (id: string, body: any) =>
      this.request<any>(`/prescriptions/${id}/issue`, { method: 'POST', body: JSON.stringify(body) }),
    amend: (id: string, body: any) =>
      this.request<any>(`/prescriptions/${id}/amend`, { method: 'POST', body: JSON.stringify(body) }),
    getById: (id: string) => this.request<any>(`/prescriptions/${id}`),
    getByCase: (caseId: string) => this.request<any>(`/cases/${caseId}/prescriptions`),
    getByPatient: (patientId: string) => this.request<any>(`/patients/${patientId}/prescriptions`),
    getPdfUrl: (id: string) => `${API_BASE_URL}/prescriptions/${id}/pdf`,
  };
}

export const api = new ApiService();
