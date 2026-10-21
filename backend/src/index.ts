import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ProjectStore } from './projectStore.js';
import { SnapshotService } from './snapshotService.js';
import { GeminiService } from './gemini.js';
import { DebugSnapshot } from './types.js';
import { AuthService } from './auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const APP_SECRET_TOKEN = process.env.APP_SECRET_TOKEN || '';
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Serve static frontend UI (if built)
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    auth_enabled: true,
    author_email: AuthService.getAuthorEmail()
  });
});

// --- Google Auth Verification Endpoint ---
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ error: 'id_token is required' });
  }

  const user = await AuthService.verifyGoogleToken(id_token);
  if (!user) {
    return res.status(403).json({
      error: `Access Denied: Only the book author (${AuthService.getAuthorEmail()}) is authorized to access Author Studio.`
    });
  }

  res.json({
    authorized: true,
    user
  });
});

// --- Security Authentication Middleware for API ---
app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/auth/google') return next();

  const authHeader = req.headers['authorization'];
  const secretHeader = req.headers['x-app-secret'];
  const googleTokenHeader = req.headers['x-google-token'];

  // Check 1: Google ID Token (Bearer token or x-google-token)
  const candidateGoogleToken = (googleTokenHeader as string) ||
    (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 50 ? authHeader.substring(7) : null);

  if (candidateGoogleToken) {
    const verifiedUser = await AuthService.verifyGoogleToken(candidateGoogleToken);
    if (verifiedUser) {
      (req as any).user = verifiedUser;
      return next();
    }
  }

  // Check 2: Fallback Secret Token (for scripts and backend-to-backend calls)
  const candidateSecret = (secretHeader as string) ||
    (authHeader && authHeader.startsWith('Bearer ') && authHeader.length < 50 ? authHeader.substring(7) : null);

  if (APP_SECRET_TOKEN && candidateSecret === APP_SECRET_TOKEN) {
    return next();
  }

  // If no auth succeeded
  return res.status(401).json({
    error: `Unauthorized: Please sign in with your Google Account (${AuthService.getAuthorEmail()}).`
  });
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

// --- SPA Client Fallback ---
app.get('*', (req: Request, res: Response) => {
  const indexHtml = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.status(200).json({ status: 'active', version: '2.1' });
});

// Start Server
app.listen(port, async () => {
  console.log(`\n=================================================`);
  console.log(`🎙️  Author Studio API running at http://localhost:${port}`);
  console.log(`📸  Snapshots stored in: ${process.cwd()}\\debug_snapshots`);
  console.log(`=================================================\n`);

  // Initialize latest manuscript from GitHub if available
  await ProjectStore.initFromGitHub();
});
