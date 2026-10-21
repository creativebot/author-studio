import fs from 'fs';
import path from 'path';
import { DebugSnapshot } from './types.js';

const SNAPSHOTS_DIR = path.resolve(process.cwd(), 'debug_snapshots');

// Ensure directory exists
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

export class SnapshotService {
  static saveSnapshot(snapshot: Partial<DebugSnapshot>): DebugSnapshot {
    const timestamp = new Date().toISOString();
    const id = snapshot.snapshot_id || `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const fullSnapshot: DebugSnapshot = {
      snapshot_id: id,
      timestamp: snapshot.timestamp || timestamp,
      feature_context: snapshot.feature_context || 'general_system',
      user_notes: snapshot.user_notes || '',
      state: snapshot.state || {},
      llm_telemetry: snapshot.llm_telemetry,
      audio_telemetry: snapshot.audio_telemetry,
      client_info: snapshot.client_info || { platform: 'web', version: '1.0.0', screen: 'default' }
    };

    const filePath = path.join(SNAPSHOTS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fullSnapshot, null, 2), 'utf-8');
    console.log(`[SnapshotService] Saved snapshot ${id} to ${filePath}`);

    return fullSnapshot;
  }

  static listSnapshots(): Array<{ snapshot_id: string; timestamp: string; feature_context: string; user_notes?: string }> {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return [];

    const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'));
    const summaries: Array<{ snapshot_id: string; timestamp: string; feature_context: string; user_notes?: string }> = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(SNAPSHOTS_DIR, file), 'utf-8');
        const data = JSON.parse(raw);
        summaries.push({
          snapshot_id: data.snapshot_id || path.basename(file, '.json'),
          timestamp: data.timestamp || '',
          feature_context: data.feature_context || 'unknown',
          user_notes: data.user_notes || ''
        });
      } catch (err) {
        console.error(`[SnapshotService] Failed to parse ${file}:`, err);
      }
    }

    return summaries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  static getSnapshot(id: string): DebugSnapshot | null {
    const filePath = path.join(SNAPSHOTS_DIR, id.endsWith('.json') ? id : `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as DebugSnapshot;
    } catch (err) {
      console.error(`[SnapshotService] Failed to read snapshot ${id}:`, err);
      return null;
    }
  }
}
