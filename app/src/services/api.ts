import { ProjectData, DiffSuggestion } from '../types';

let customBackendUrl = 'https://author-studio-backend.onrender.com';
let userApiKey = '';
let appSecretToken = '';

export const ApiConfig = {
  getBackendUrl: () => customBackendUrl,
  setBackendUrl: (url: string) => { customBackendUrl = url.replace(/\/$/, ''); },
  getApiKey: () => userApiKey,
  setApiKey: (key: string) => { userApiKey = key; },
  getSecretToken: () => appSecretToken,
  setSecretToken: (token: string) => { appSecretToken = token; }
};

const getHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    ...extra
  };
  if (appSecretToken) {
    headers['x-app-secret'] = appSecretToken;
  }
  if (userApiKey) {
    headers['x-gemini-api-key'] = userApiKey;
  }
  return headers;
};

export const ApiService = {
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
    if (appSecretToken) headers['x-app-secret'] = appSecretToken;
    if (userApiKey) headers['x-gemini-api-key'] = userApiKey;

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
