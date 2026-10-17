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

async function runTests() {
  console.log('\n======================================================');
  console.log('🔱 STARTING SHRI RAM NAAM JAP E2E TEST SUITE 🔱');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message || err);
      failed++;
    }
  }

  const testEmail1 = `devotee_${Date.now()}@ramjap.test`;
  const testPass1 = 'ShriRam@2026';
  let authToken1 = '';
  let userId1 = '';

  // 1. Register Flow
  await test('1. Register using a new email address', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Ram Bhakta Devotee',
        email: testEmail1,
        password: testPass1,
        confirmPassword: testPass1,
      }),
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(res.data.email, testEmail1);
    assert.strictEqual(res.data.isVerified, false);
    userId1 = res.data.userId;
  });

  // 2. Reject Invalid Credentials & Weak Passwords
  await test('2. Reject invalid registration inputs (short password, mismatched pass)', async () => {
    const res1 = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test',
        email: 'invalid-email',
        password: 'short',
        confirmPassword: 'short',
      }),
    });
    assert.strictEqual(res1.status, 400);

    const res2 = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test',
        email: 'valid@test.com',
        password: 'password123',
        confirmPassword: 'different123',
      }),
    });
    assert.strictEqual(res2.status, 400);
  });

  // 3. Email Verification Flow
  let verifyCode = '';
  await test('3. Verify email with time-limited 6-digit code', async () => {
    // Get verification code from dev email inspector
    const devRes = await req('/auth/dev/recent-emails');
    assert.strictEqual(devRes.status, 200);
    const sent = devRes.data.emails.find((e: any) => e.to === testEmail1);
    assert(sent, 'Sent verification email should be logged in dev email inspector');
    verifyCode = sent.code;
    assert.strictEqual(verifyCode.length, 6, 'Verification code must be 6 digits');

    // Submit code
    const vRes = await req('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail1,
        code: verifyCode,
      }),
    });
    assert.strictEqual(vRes.status, 200);
    assert.strictEqual(vRes.data.user.isVerified, true);
    assert(vRes.data.token, 'Should receive JWT token upon verification');
    authToken1 = vRes.data.token;
  });

  // 4. Log in and Log out Flow
  await test('4. Log in with verified email and retrieve user profile', async () => {
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail1,
        password: testPass1,
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.user.email, testEmail1);
    assert(loginRes.data.token);

    // Profile check
    const meRes = await req('/auth/me', {
      headers: { Authorization: `Bearer ${loginRes.data.token}` },
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.user.fullName, 'Ram Bhakta Devotee');
    assert.strictEqual(meRes.data.preferences.malaTarget, 250);
  });

  // 5. Reject Invalid Credentials on Login
  await test('5. Reject invalid credentials during login', async () => {
    const wrongPassRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail1,
        password: 'WrongPassword999',
      }),
    });
    assert.strictEqual(wrongPassRes.status, 401, 'Wrong password must return 401');

    const unknownUserRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nobody_exists@ramjap.test',
        password: 'SomePassword123',
      }),
    });
    assert.strictEqual(unknownUserRes.status, 401, 'Unknown email must return 401');
  });

  // 6. Forgot and Reset Password Flow
  await test('6. Forgot and reset password with 6-digit OTP code', async () => {
    const forgotRes = await req('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail1 }),
    });
    assert.strictEqual(forgotRes.status, 200);

    const devRes = await req('/auth/dev/recent-emails');
    const resetEmail = devRes.data.emails.find((e: any) => e.to === testEmail1 && e.subject.includes('Reset'));
    assert(resetEmail, 'Password reset email must be recorded');
    const resetCode = resetEmail.code;

    const newPass = 'UpdatedRam@2026';
    const resetRes = await req('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail1,
        code: resetCode,
        newPassword: newPass,
      }),
    });
    assert.strictEqual(resetRes.status, 200);

    // Verify old password fails
    const oldLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail1, password: testPass1 }),
    });
    assert.strictEqual(oldLogin.status, 401);

    // Verify new password succeeds
    const newLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail1, password: newPass }),
    });
    assert.strictEqual(newLogin.status, 200);
    authToken1 = newLogin.data.token;
  });

  // 7. Count Repetitions & Persistent Cloud Storage
  const event1Id = `evt_dev1_${Date.now()}_1`;
  const event2Id = `evt_dev1_${Date.now()}_2`;
  await test('7. Count repetitions and confirm persistent storage in SQLite', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pushRes = await req('/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        deviceId: 'phone_pixel_8',
        deviceName: 'Pixel 8 Phone',
        events: [
          {
            clientEventId: event1Id,
            delta: 108,
            timestamp: Date.now(),
            date: todayStr,
          },
          {
            clientEventId: event2Id,
            delta: 216,
            timestamp: Date.now(),
            date: todayStr,
          },
        ],
      }),
    });

    assert.strictEqual(pushRes.status, 200);
    assert.strictEqual(pushRes.data.totalCount, 324, 'Total count should be 108 + 216 = 324');
    assert.strictEqual(pushRes.data.todayCount, 324);
    assert(pushRes.data.processedEventIds.includes(event1Id));
    assert(pushRes.data.processedEventIds.includes(event2Id));
  });

  // 8. Cross-Device Cloud Sync Flow
  await test('8. Log in on another device and confirm cross-device synchronization', async () => {
    // Simulating Laptop browser pulling state
    const pullRes = await req('/sync/pull', {
      headers: { Authorization: `Bearer ${authToken1}` },
    });

    assert.strictEqual(pullRes.status, 200);
    assert.strictEqual(pullRes.data.totalCount, 324, 'Second device should see exact 324 counts');
    assert.strictEqual(pullRes.data.stats[0].totalCount, 324);
  });

  // 9. Concurrent Counting & Retry Scenarios (Idempotency Test)
  await test('9. Retry scenario: sending duplicate event IDs must NOT double count', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Push the EXACT same event1Id and event2Id again (simulating network retry)
    const duplicatePush = await req('/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        deviceId: 'phone_pixel_8',
        deviceName: 'Pixel 8 Phone',
        events: [
          {
            clientEventId: event1Id, // duplicate
            delta: 108,
            timestamp: Date.now(),
            date: todayStr,
          },
        ],
      }),
    });

    assert.strictEqual(duplicatePush.status, 200);
    // Crucial check: Total count MUST STILL BE 324, NOT 432!
    assert.strictEqual(
      duplicatePush.data.totalCount,
      324,
      `Idempotency failed: total count became ${duplicatePush.data.totalCount} instead of 324`
    );
  });

  // 10. Multi-User Isolation & Data Privacy
  await test('10. Multi-user security: Confirm User B cannot access User A data', async () => {
    const testEmail2 = `devotee_b_${Date.now()}@ramjap.test`;
    await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'User B',
        email: testEmail2,
        password: 'PasswordB@2026',
        confirmPassword: 'PasswordB@2026',
      }),
    });

    const devRes = await req('/auth/dev/recent-emails');
    const sentB = devRes.data.emails.find((e: any) => e.to === testEmail2);
    const vResB = await req('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail2, code: sentB.code }),
    });

    const tokenB = vResB.data.token;

    // User B pulls their cloud sync
    const pullB = await req('/sync/pull', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(pullB.status, 200);
    assert.strictEqual(pullB.data.totalCount, 0, 'User B must start with 0 counts');

    // Attempt unauthorized access without token
    const unauth = await req('/sync/pull');
    assert.strictEqual(unauth.status, 401, 'Access without token must be rejected with 401');
  });

  // 11. Backup Export and Legacy Restore
  await test('11. Personal data export & legacy backup format import', async () => {
    const exportRes = await req('/sync/export', {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    assert.strictEqual(exportRes.status, 200);
    assert.strictEqual(exportRes.data.lifetimeCount, 324);
    assert(exportRes.data.legacyBackupFormat.includes('RAM~#@@#~'));

    // Test importing legacy backup data (simulating user restoring their 990,702 Ram Naam backup)
    const legacySample = `mydevotion~#@@#~e30=\n\nRAM~#@@#~e2xpZmVfdGltZV9jb3VudGVyPTk5MDcwMiwgMDUtMTEtMjAyNT0xNjQxN30=\n`;
    const importRes = await req('/sync/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({ legacyString: legacySample }),
    });
    assert.strictEqual(importRes.status, 200);
    assert(importRes.data.totalCount >= 16417, 'Total count should incorporate imported legacy counts');
  });

  // 12. Jap History Query & Pagination Test
  await test('12. Query paginated and filtered Jap history via /sync/history', async () => {
    const histRes = await req('/sync/history?page=1&limit=10', {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    assert.strictEqual(histRes.status, 200);
    assert(Array.isArray(histRes.data.items), 'items must be an array');
    assert(histRes.data.totalItems >= 2, 'Should have at least 2 recorded count events');
    assert.strictEqual(histRes.data.page, 1);
    assert(histRes.data.totalPages >= 1);

    // Verify item fields
    const firstItem = histRes.data.items[0];
    assert(firstItem.clientEventId, 'Must include clientEventId');
    assert(firstItem.delta > 0, 'Delta must be positive');
    assert(firstItem.timestamp > 0, 'Timestamp must be positive');
    assert(firstItem.date, 'Must include date string');
  });

  // 13. Secure Logout Flow
  await test('13. User logout via /auth/logout', async () => {
    const logoutRes = await req('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.data.message, 'Logged out successfully.');

    // Unauthenticated request should fail with 401
    const unauthLogout = await req('/auth/logout', {
      method: 'POST',
    });
    assert.strictEqual(unauthLogout.status, 401);
  });

  // 14. Account Settings & Permanent Deletion
  await test('14. Account deletion with password confirmation', async () => {
    // Wrong password should fail
    const wrongDelete = await req('/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({ password: 'WrongPassword' }),
    });
    assert.strictEqual(wrongDelete.status, 400);

    // Correct password deletes account
    const correctDelete = await req('/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({ password: 'UpdatedRam@2026' }),
    });
    assert.strictEqual(correctDelete.status, 200);

    // Confirm user can no longer log in
    const deadLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail1, password: 'UpdatedRam@2026' }),
    });
    assert.strictEqual(deadLogin.status, 401);
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
