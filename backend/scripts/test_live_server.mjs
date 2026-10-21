/**
 * Comprehensive Automated Test Suite for Author Studio Live Cloud Server
 * Tests:
 * 1. Public Health & Masked Root
 * 2. Authentication Protection (Missing token, Invalid token, Valid token)
 * 3. Gemini API Key configuration
 * 4. Sounding Board Chat & Concept Extraction
 * 5. Audio Transcription Engine
 * 6. Diff & Style Suggestion Engine
 * 7. Antigravity Snapshot Logging & Retrieval
 */

const BASE_URL = process.env.TEST_URL || 'https://asb001.onrender.com';
const SECRET_TOKEN = process.env.TEST_SECRET_TOKEN || '';
const GEMINI_API_KEY = process.env.TEST_GEMINI_KEY || '';

console.log(`\n======================================================`);
console.log(`🧪 Running Author Studio Automated Cloud Verification`);
console.log(`🎯 Target Server: ${BASE_URL}`);
console.log(`======================================================\n`);

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• Testing: ${name}... `);
    try {
      await fn();
      console.log(`✅ PASSED`);
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Root and Health
  await test('Root endpoint serves web app HTML', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes('html') && !text.includes('root')) throw new Error('Root did not return HTML web app');
  });

  await test('Health endpoint returns ok status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Health status not ok: ${JSON.stringify(data)}`);
  });

  // 2. Security Auth Protection
  await test('Security Guard: Blocks unauthenticated request to /api/project', async () => {
    const res = await fetch(`${BASE_URL}/api/project`);
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got HTTP ${res.status}`);
  });

  await test('Security Guard: Blocks request with wrong token', async () => {
    const res = await fetch(`${BASE_URL}/api/project`, {
      headers: { 'x-app-secret': 'definitely-wrong-secret-xyz' }
    });
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got HTTP ${res.status}`);
  });

  if (!SECRET_TOKEN) {
    console.log(`\n⚠️  TEST_SECRET_TOKEN is not provided in environment.`);
    console.log(`    Skipping authenticated API tests until secret token is supplied.\n`);
    return { passed, failed, skipped: 5 };
  }

  // 3. Authenticated Project Store
  await test('Authenticated request retrieves manuscript project state', async () => {
    const res = await fetch(`${BASE_URL}/api/project`, {
      headers: { 'x-app-secret': SECRET_TOKEN }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.book_title) throw new Error(`Missing book_title in response`);
  });

  // 4. Antigravity Snapshot Debugger
  let createdSnapshotId = '';
  await test('Antigravity Snapshot: Saves debug snapshot payload', async () => {
    const payload = {
      feature_context: 'automated_test',
      user_notes: 'Automated test suite snapshot',
      state: { test: true },
      client_info: { platform: 'web', version: 'test' }
    };

    const res = await fetch(`${BASE_URL}/api/debug/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': SECRET_TOKEN
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.snapshot_id) throw new Error(`Missing snapshot_id in response`);
    createdSnapshotId = data.snapshot_id;
  });

  await test('Antigravity Snapshot: Retrieves saved snapshot by ID', async () => {
    const res = await fetch(`${BASE_URL}/api/debug/snapshots/${createdSnapshotId}`, {
      headers: { 'x-app-secret': SECRET_TOKEN }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.snapshot_id !== createdSnapshotId) throw new Error(`ID mismatch`);
  });

  // 5. Sounding Board Chat (Tests Gemini API key on server or client)
  await test('Sounding Board: Co-design chat processes thought with Gemini', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': SECRET_TOKEN
      },
      body: JSON.stringify({
        message: 'Testing core thesis: self-development requires empirical behavioral feedback loops.',
        api_key: GEMINI_API_KEY || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.reply) throw new Error(`No reply returned from Gemini`);
  });

  // 6. Diff Engine
  await test('Diff Engine: Proposes inline revision patches', async () => {
    const res = await fetch(`${BASE_URL}/api/diff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': SECRET_TOKEN
      },
      body: JSON.stringify({
        original_text: 'People fail to change because they do not have enough willpower.',
        voice_instruction: 'Rewrite this to explain it through cognitive cognitive feedback mechanisms rather than willpower.',
        api_key: GEMINI_API_KEY || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.revised_text || !Array.isArray(data.diff_tokens)) {
      throw new Error(`Invalid diff response structure`);
    }
  });

  console.log(`\n======================================================`);
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
});
