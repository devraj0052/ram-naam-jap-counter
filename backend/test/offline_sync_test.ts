import assert from 'node:assert';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint: string, options: any = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runOfflineSyncScenarioTests() {
  console.log('\n======================================================');
  console.log('📱 TESTING OFFLINE COUNTING & RECONNECTION SYNC 📱');
  console.log('======================================================\n');

  // 1. Create a test user for this scenario
  const userEmail = `offline_devotee_${Date.now()}@ramjap.test`;
  const regRes = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Offline Chanting Devotee',
      email: userEmail,
      password: 'ShriRam@2026',
      confirmPassword: 'ShriRam@2026',
    }),
  });
  assert.strictEqual(regRes.status, 201);

  // Retrieve verification code from dev recent emails
  const devEmails = await req('/auth/dev/recent-emails');
  const code = devEmails.data.emails.find((e: any) => e.to === userEmail)?.code;
  assert(code, 'Verification code must be present');

  const verifyRes = await req('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, code }),
  });
  assert.strictEqual(verifyRes.status, 200);
  const token = verifyRes.data.token;

  console.log('✅ Scenario 1: Initial user session verified');

  // Scenario 2: Simulate 50 offline counts recorded on mobile (Airplane mode)
  // Each count generated an idempotent clientEventId and exact timestamp
  const offlineQueue: any[] = [];
  const baseTime = Date.now() - 3600000; // 1 hour ago
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 1; i <= 5; i++) {
    offlineQueue.push({
      clientEventId: `mobile_offline_event_${i}_${Date.now()}_${Math.random()}`,
      delta: 108, // 1 Mala
      timestamp: baseTime + i * 60000, // 1 min apart
      date: todayStr,
    });
  }

  console.log(`✅ Scenario 2: Generated 5 offline events (+540 Ram Naam) queued locally`);

  // Scenario 3: Internet connection restored -> Automatic background synchronization
  const syncPushRes = await req('/sync/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      deviceId: 'android_samsung_galaxy',
      deviceName: 'Samsung Galaxy S24 (Android PWA)',
      events: offlineQueue,
    }),
  });

  assert.strictEqual(syncPushRes.status, 200);
  assert.strictEqual(syncPushRes.data.processedEventIds.length, 5);
  assert.strictEqual(syncPushRes.data.totalCount, 540, 'Authoritative total must be exactly 540');
  assert.strictEqual(syncPushRes.data.todayCount, 540);
  console.log('✅ Scenario 3: All 5 offline events pushed to server. Confirmed total: 540');

  // Scenario 4: Network retry / duplicate push (Airplane mode flicker)
  // Must NOT count twice
  const retryRes = await req('/sync/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      deviceId: 'android_samsung_galaxy',
      deviceName: 'Samsung Galaxy S24 (Android PWA)',
      events: offlineQueue, // identical queue
    }),
  });
  assert.strictEqual(retryRes.status, 200);
  assert.strictEqual(retryRes.data.totalCount, 540, 'Duplicate events must NOT increase count');
  console.log('✅ Scenario 4: Idempotency verified - Re-sent events did not duplicate');

  // Scenario 5: Verify History endpoint retrieves granular timestamped events
  const historyRes = await req('/sync/history?page=1&limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(historyRes.status, 200);
  assert.strictEqual(historyRes.data.totalItems, 5);
  assert.strictEqual(historyRes.data.items.length, 5);

  // Check that timestamps are in chronological order
  for (let i = 0; i < historyRes.data.items.length - 1; i++) {
    assert(
      historyRes.data.items[i].timestamp >= historyRes.data.items[i + 1].timestamp,
      'History must be ordered descending by timestamp'
    );
  }
  console.log('✅ Scenario 5: History timeline verified with date and exact timestamps');

  // Scenario 6: Verify Pull returns recentEvents and authoritative stats
  const pullRes = await req('/sync/pull', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(pullRes.status, 200);
  assert.strictEqual(pullRes.data.totalCount, 540);
  assert(pullRes.data.recentEvents.length >= 5, 'recentEvents must be included in pull response');
  console.log('✅ Scenario 6: Pull endpoint returns authoritative state and recentEvents');

  console.log('\n======================================================');
  console.log('🏁 ALL OFFLINE SYNC SCENARIOS PASSED SUCCESSFULLY 🏁');
  console.log('======================================================\n');
}

runOfflineSyncScenarioTests().catch((err) => {
  console.error('Offline scenario test error:', err);
  process.exit(1);
});
