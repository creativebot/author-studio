import { ProjectData, DiffSuggestion } from '../types';

let customBackendUrl = typeof window !== 'undefined' && window.location.origin.includes('onrender.com')
  ? window.location.origin
  : 'https://asb001.onrender.com';

let userApiKey = '';
let appSecretToken = '';
let googleIdToken = '';
let sessionToken = '';
let authorProfile: { name: string; email: string; picture?: string } | null = null;

// Load persisted credentials on web
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    sessionToken = window.localStorage.getItem('asb_session_token') || '';
    appSecretToken = window.localStorage.getItem('asb_secret_token') || '';
    userApiKey = window.localStorage.getItem('asb_api_key') || '';
    googleIdToken = window.localStorage.getItem('asb_google_token') || '';
    const savedProfile = window.localStorage.getItem('asb_author_profile');
    if (savedProfile) authorProfile = JSON.parse(savedProfile);
    const savedUrl = window.localStorage.getItem('asb_backend_url');
    if (savedUrl) customBackendUrl = savedUrl;
  } catch (e) {
    console.warn('Could not read localStorage:', e);
  }
}

export const ApiConfig = {
  getBackendUrl: () => customBackendUrl,
  setBackendUrl: (url: string) => {
    customBackendUrl = url.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asb_backend_url', customBackendUrl);
    }
  },
  getApiKey: () => userApiKey,
  setApiKey: (key: string) => {
    userApiKey = key;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asb_api_key', key);
    }
  },
  getSecretToken: () => appSecretToken,
  setSecretToken: (token: string) => {
    appSecretToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asb_secret_token', token);
    }
  },
  getSessionToken: () => sessionToken,
  setSessionToken: (token: string) => {
    sessionToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asb_session_token', token);
    }
  },
  getGoogleToken: () => googleIdToken,
  setGoogleToken: (token: string) => {
    googleIdToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('asb_google_token', token);
    }
  },
  getAuthorProfile: () => authorProfile,
  setAuthorProfile: (profile: { name: string; email: string; picture?: string } | null) => {
    authorProfile = profile;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (profile) {
        window.localStorage.setItem('asb_author_profile', JSON.stringify(profile));
      } else {
        window.localStorage.removeItem('asb_author_profile');
      }
    }
  },
  getLocalProjectBackup: (): ProjectData | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('asb_project_backup');
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to read local project backup:', e);
      }
    }
    return null;
  },
  saveLocalProjectBackup: (project: ProjectData) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('asb_project_backup', JSON.stringify(project));
      } catch (e) {
        console.warn('Failed to save local project backup:', e);
      }
    }
  },
  logout: () => {
    googleIdToken = '';
    sessionToken = '';
    authorProfile = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('asb_session_token');
      window.localStorage.removeItem('asb_google_token');
      window.localStorage.removeItem('asb_author_profile');
    }
  }
};

const getHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    ...extra
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
    headers['x-session-token'] = sessionToken;
  } else if (googleIdToken) {
    headers['Authorization'] = `Bearer ${googleIdToken}`;
    headers['x-google-token'] = googleIdToken;
  } else if (appSecretToken) {
    headers['x-app-secret'] = appSecretToken;
  }
  if (userApiKey) {
    headers['x-gemini-api-key'] = userApiKey;
  }
  return headers;
};

export const ApiService = {
  async verifyGoogleToken(idToken: string): Promise<any> {
    const res = await fetch(`${customBackendUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Google login failed');
    }
    const data = await res.json();
    if (data.session_token) {
      ApiConfig.setSessionToken(data.session_token);
    }
    ApiConfig.setGoogleToken(idToken);
    ApiConfig.setAuthorProfile(data.user);
    return data.user;
  },

  async getProject(): Promise<ProjectData> {
    const res = await fetch(`${customBackendUrl}/api/project`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch project: ${res.statusText}`);
    }
    return res.json();
  },

  async updateProject(updates: Partial<ProjectData>): Promise<ProjectData> {
    const res = await fetch(`${customBackendUrl}/api/project`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update project: ${res.statusText}`);
    }
    return res.json();
  },

  async sendSoundingBoardMessage(message: string): Promise<any> {
    const res = await fetch(`${customBackendUrl}/api/chat`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message,
        api_key: userApiKey || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Chat failed: ${res.statusText}`);
    }
    return res.json();
  },

  async transcribeAudioBlob(blob: Blob): Promise<{ transcript: string; latency_ms: number }> {
    const formData = new FormData();
    formData.append('audio', blob, 'dictation.webm');

    const headers: Record<string, string> = {};
    if (googleIdToken) {
      headers['Authorization'] = `Bearer ${googleIdToken}`;
      headers['x-google-token'] = googleIdToken;
    } else if (appSecretToken) {
      headers['x-app-secret'] = appSecretToken;
    }
    if (userApiKey) {
      headers['x-gemini-api-key'] = userApiKey;
    }

    const res = await fetch(`${customBackendUrl}/api/transcribe`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Transcription failed: ${res.statusText}`);
    }
    return res.json();
  },

  async requestDiff(originalText: string, voiceInstruction: string, fullSectionContext?: string): Promise<DiffSuggestion> {
    const res = await fetch(`${customBackendUrl}/api/diff`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        original_text: originalText,
        voice_instruction: voiceInstruction,
        full_section_context: fullSectionContext,
        api_key: userApiKey || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Diff request failed: ${res.statusText}`);
    }
    return res.json();
  },

  async rejectDiff(originalText: string, proposedText: string, reason: string): Promise<void> {
    await fetch(`${customBackendUrl}/api/feedback/reject`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        original_text: originalText,
        proposed_text: proposedText,
        reason
      })
    });
  },

  async saveDebugSnapshot(snapshotPayload: any): Promise<{ snapshot_id: string; file_path: string }> {
    const res = await fetch(`${customBackendUrl}/api/debug/snapshot`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(snapshotPayload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Snapshot capture failed: ${res.statusText}`);
    }
    return res.json();
  }
};
