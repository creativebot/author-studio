import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { ProjectStore } from './projectStore.js';
import { SnapshotService } from './snapshotService.js';
import { GeminiService } from './gemini.js';
import { DebugSnapshot } from './types.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const APP_SECRET_TOKEN = process.env.APP_SECRET_TOKEN || '';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// --- Discreet Root Landing & Health ---
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'active', version: '2.1' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    auth_enabled: !!APP_SECRET_TOKEN
  });
});

// --- Security Authentication Middleware ---
app.use((req: Request, res: Response, next: NextFunction) => {
  // If no secret token is configured yet, allow requests (backward compatibility until user sets secret)
  if (!APP_SECRET_TOKEN) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const secretHeader = req.headers['x-app-secret'];

  const token = secretHeader || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (!token || token !== APP_SECRET_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing Author Secret Token. Please check your App Settings.'
    });
  }

  next();
});

// --- Project & Structure State ---
app.get('/api/project', (req: Request, res: Response) => {
  const data = ProjectStore.get();
  res.json(data);
});

app.post('/api/project', (req: Request, res: Response) => {
  const updates = req.body;
  const updated = ProjectStore.update(data => {
    Object.assign(data, updates);
  });
  res.json(updated);
});

// --- Socratic Sounding Board ---
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, api_key } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const startTime = Date.now();
  try {
    const result = await GeminiService.chatSoundingBoard(message, api_key);
    const latency = Date.now() - startTime;

    // Log message to history
    ProjectStore.update(data => {
      data.sounding_board_history.push({
        id: `msg_u_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      data.sounding_board_history.push({
        id: `msg_m_${Date.now()}`,
        role: 'model',
        content: result.reply,
        timestamp: new Date().toISOString(),
        extracted_concepts: result.extracted_concepts
      });
    });

    res.json({
      ...result,
      latency_ms: latency
    });
  } catch (error: any) {
    console.error('[API /chat error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to process chat message',
      latency_ms: Date.now() - startTime
    });
  }
});

// --- Voice Audio Transcription ---
app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const apiKey = req.headers['x-gemini-api-key'] as string | undefined;

  try {
    const transcript = await GeminiService.transcribeAudio(
      req.file.buffer,
      req.file.mimetype || 'audio/webm',
      apiKey
    );
    res.json({
      transcript,
      bytes_size: req.file.size,
      mime_type: req.file.mimetype,
      latency_ms: Date.now() - startTime
    });
  } catch (error: any) {
    console.error('[API /transcribe error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to transcribe audio',
      latency_ms: Date.now() - startTime
    });
  }
});

// --- Diff Suggestions ---
app.post('/api/diff', async (req: Request, res: Response) => {
  const { original_text, voice_instruction, full_section_context, api_key } = req.body;
  if (!original_text || !voice_instruction) {
    return res.status(400).json({ error: 'original_text and voice_instruction are required' });
  }

  const startTime = Date.now();
  try {
    const diff = await GeminiService.generateDiff(
      original_text,
      voice_instruction,
      full_section_context,
      api_key
    );
    res.json({
      ...diff,
      latency_ms: Date.now() - startTime
    });
  } catch (error: any) {
    console.error('[API /diff error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate diff',
      latency_ms: Date.now() - startTime
    });
  }
});

// --- Feedback on Rejections ---
app.post('/api/feedback/reject', (req: Request, res: Response) => {
  const { original_text, proposed_text, reason } = req.body;
  if (!original_text || !proposed_text) {
    return res.status(400).json({ error: 'original_text and proposed_text are required' });
  }

  const logged = ProjectStore.addRejectedEdit({
    original_text,
    proposed_text,
    reason: reason || 'Author rejected this edit.'
  });

  res.json({ status: 'ok', logged_feedback: logged });
});

// --- Antigravity Snapshot Debugger ---
app.post('/api/debug/snapshot', (req: Request, res: Response) => {
  const snapshotData: Partial<DebugSnapshot> = req.body;
  try {
    const saved = SnapshotService.saveSnapshot(snapshotData);
    res.json({
      status: 'saved',
      snapshot_id: saved.snapshot_id,
      file_path: `debug_snapshots/${saved.snapshot_id}.json`,
      timestamp: saved.timestamp
    });
  } catch (error: any) {
    console.error('[API /debug/snapshot error]:', error);
    res.status(500).json({ error: error.message || 'Failed to save snapshot' });
  }
});

app.get('/api/debug/snapshots', (req: Request, res: Response) => {
  const list = SnapshotService.listSnapshots();
  res.json({ count: list.length, snapshots: list });
});

app.get('/api/debug/snapshots/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const snapshot = SnapshotService.getSnapshot(id);
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }
  res.json(snapshot);
});

// Start Server
app.listen(port, () => {
  console.log(`\n=================================================`);
  console.log(`🎙️  Author Studio API running at http://localhost:${port}`);
  console.log(`📸  Snapshots stored in: ${process.cwd()}\\debug_snapshots`);
  console.log(`=================================================\n`);
});
