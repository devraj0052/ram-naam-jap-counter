import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Default backend API URL: Use LAN IP (e.g. http://192.168.1.X:5000) or tunnel for physical mobile devices
const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

export default function App() {
  const [tab, setTab] = useState<'counter' | 'history' | 'account'>('counter');
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [targetMalas, setTargetMalas] = useState(250);
  const [lang, setLang] = useState<'en' | 'gu' | 'hi'>('en');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'guest'>('guest');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string; fullName: string } | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState('');

  // Daily Stats & Sessions
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const savedLife = await AsyncStorage.getItem('ramjap_life');
      const savedToday = await AsyncStorage.getItem('ramjap_today');
      const savedToken = await AsyncStorage.getItem('ramjap_token');
      const savedUser = await AsyncStorage.getItem('ramjap_user');

      if (savedLife) setLifetimeCount(parseInt(savedLife, 10));
      if (savedToday) setTodayCount(parseInt(savedToday, 10));

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setSyncStatus('synced');
        pullCloudData(savedToken);
      }
    } catch {}
  };

  const handleTap = async () => {
    const newToday = todayCount + 1;
    const newLife = lifetimeCount + 1;

    setTodayCount(newToday);
    setLifetimeCount(newLife);

    AsyncStorage.setItem('ramjap_today', String(newToday)).catch(() => {});
    AsyncStorage.setItem('ramjap_life', String(newLife)).catch(() => {});

    // Trigger celebration haptic on Mala completion (108)
    if (newToday % 108 === 0) {
      try {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {}
    }

    // Cloud sync queueing if logged in
    if (token) {
      queueCountSync(1);
    }
  };

  const syncTimerRef = useRef<any>(null);
  const pendingDeltaRef = useRef(0);

  const queueCountSync = (delta: number) => {
    pendingDeltaRef.current += delta;
    setSyncStatus('syncing');

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const countToSend = pendingDeltaRef.current;
      pendingDeltaRef.current = 0;
      if (countToSend <= 0) return;

      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const res = await fetch(`${API_BASE}/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId: 'mobile_expo_client',
            deviceName: Platform.OS + ' Native App',
            events: [
              {
                clientEventId: `mobile_${Date.now()}_${Math.random()}`,
                delta: countToSend,
                timestamp: Date.now(),
                date: todayStr,
              },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSyncStatus('synced');
          if (data.totalCount) setLifetimeCount(data.totalCount);
          if (data.todayCount) setTodayCount(data.todayCount);
        } else {
          setSyncStatus('offline');
        }
      } catch {
        setSyncStatus('offline');
      }
    }, 1000);
  };

  const pullCloudData = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/sync/pull`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLifetimeCount(data.totalCount || 0);
        setTodayCount(data.todayCount || 0);
        if (data.stats) setStats(data.stats);
        if (data.preferences?.malaTarget) setTargetMalas(data.preferences.malaTarget);
        setSyncStatus('synced');
      }
    } catch {
      setSyncStatus('offline');
    }
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('ramjap_token', data.token);
      await AsyncStorage.setItem('ramjap_user', JSON.stringify(data.user));
      setTab('counter');
      pullCloudData(data.token);
    } catch (e: any) {
      setAuthMsg(e.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthLoading(true);
    setAuthMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setAuthMsg(data.message);
      setAuthMode('verify');
    } catch (e: any) {
      setAuthMsg(e.message || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify = async () => {
    setAuthLoading(true);
    setAuthMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem('ramjap_token', data.token);
      await AsyncStorage.setItem('ramjap_user', JSON.stringify(data.user));
      setTab('counter');
      pullCloudData(data.token);
    } catch (e: any) {
      setAuthMsg(e.message || 'Invalid code');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } catch {}
    setToken(null);
    setUser(null);
    setSyncStatus('guest');
    await AsyncStorage.removeItem('ramjap_token');
    await AsyncStorage.removeItem('ramjap_user');
    Alert.alert('Logged Out', 'You have been safely signed out.');
  };

  const currentBead = todayCount % 108;
  const todayMalas = Math.floor(todayCount / 108);
  const targetCount = targetMalas * 108;
  const progressPct = Math.min(100, Math.round((todayCount / targetCount) * 100));

  const ramTitle = lang === 'gu' ? 'શ્રી રામ' : lang === 'hi' ? 'श्री राम' : 'Shri Ram';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ea580c" />

      {/* Top Mobile Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>राम</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Shri Ram Naam Jap</Text>
            <Text style={styles.headerSub}>|| Jai Shri Ram ||</Text>
          </View>
        </View>

        <View style={styles.syncBadge}>
          <View
            style={[
              styles.syncDot,
              {
                backgroundColor:
                  syncStatus === 'synced'
                    ? '#10b981'
                    : syncStatus === 'syncing'
                    ? '#f59e0b'
                    : '#78716c',
              },
            ]}
          />
          <Text style={styles.syncText}>{syncStatus.toUpperCase()}</Text>
        </View>
      </View>

      {/* Main Tab Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'counter' && (
          <View style={styles.counterView}>
            {/* Mala Progress Card */}
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Current Mala Bead:</Text>
                <Text style={styles.cardValue}>
                  {currentBead} / 108 (Sumeru)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(currentBead / 108) * 100}%` }]} />
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.subtext}>Today: {todayMalas} Malas Completed</Text>
                <Text style={styles.subtext}>Goal: {targetMalas} Malas ({progressPct}%)</Text>
              </View>
            </View>

            {/* Giant Sacred Tap Button */}
            <TouchableOpacity activeOpacity={0.85} onPress={handleTap} style={styles.tapButton}>
              <Text style={styles.tapSub}>|| JAI SHRI RAM ||</Text>
              <Text style={styles.tapText}>{ramTitle}</Text>
              <Text style={styles.tapAction}>TAP TO JAP</Text>
              <View style={styles.beadBadge}>
                <Text style={styles.beadBadgeText}>Bead #{currentBead === 0 ? 108 : currentBead}</Text>
              </View>
            </TouchableOpacity>

            {/* Summary KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>Today's Jap</Text>
                <Text style={styles.kpiValue}>{todayCount.toLocaleString()}</Text>
                <Text style={styles.kpiSub}>({todayMalas} malas)</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>Lifetime Jap</Text>
                <Text style={[styles.kpiValue, { color: '#431407' }]}>
                  {lifetimeCount.toLocaleString()}
                </Text>
                <Text style={styles.kpiSub}>({Math.floor(lifetimeCount / 108)} malas)</Text>
              </View>
            </View>

            {/* Language Switcher */}
            <View style={styles.langRow}>
              {(['en', 'gu', 'hi'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLang(l)}
                  style={[styles.langBtn, lang === l && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                    {l === 'en' ? 'English' : l === 'gu' ? 'ગુજરાતી' : 'हिन्दी'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tab === 'history' && (
          <View style={styles.historyView}>
            <Text style={styles.sectionTitle}>Daily Jap Log & Streaks</Text>
            {stats.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  No past records synced yet. Start counting to build your daily history!
                </Text>
              </View>
            ) : (
              stats.map((s, idx) => (
                <View key={idx} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{s.date}</Text>
                  <Text style={styles.historyCount}>
                    {s.totalCount.toLocaleString()} Jap ({Math.floor(s.totalCount / 108)} Malas)
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'account' && (
          <View style={styles.accountView}>
            {user ? (
              <View style={styles.card}>
                <Text style={styles.accountTitle}>Account & Cloud Sync</Text>
                <Text style={styles.userLabel}>Name: {user.fullName}</Text>
                <Text style={styles.userLabel}>Email: {user.email}</Text>
                <Text style={styles.userLabel}>Sync Status: {syncStatus.toUpperCase()}</Text>
                <Text style={styles.userLabel}>
                  Total Cloud Counts: {lifetimeCount.toLocaleString()}
                </Text>

                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                  <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.accountTitle}>
                  {authMode === 'login'
                    ? 'Login to Cloud'
                    : authMode === 'register'
                    ? 'Create Verified Account'
                    : 'Verify Your Email'}
                </Text>

                {authMsg ? <Text style={styles.authMsgText}>{authMsg}</Text> : null}

                {authMode === 'register' && (
                  <TextInput
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                  />
                )}

                {authMode !== 'verify' && (
                  <>
                    <TextInput
                      placeholder="Email Address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                    />
                  </>
                )}

                {authMode === 'register' && (
                  <TextInput
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={styles.input}
                  />
                )}

                {authMode === 'verify' && (
                  <>
                    <TextInput
                      placeholder="Email Address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="6-Digit Verification Code"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.input, { letterSpacing: 4, textAlign: 'center' }]}
                    />
                  </>
                )}

                <TouchableOpacity
                  disabled={authLoading}
                  onPress={
                    authMode === 'login'
                      ? handleLogin
                      : authMode === 'register'
                      ? handleRegister
                      : handleVerify
                  }
                  style={styles.submitBtn}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {authMode === 'login'
                        ? 'Sign In'
                        : authMode === 'register'
                        ? 'Create Account'
                        : 'Confirm Code'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.authSwitchRow}>
                  {authMode === 'login' ? (
                    <TouchableOpacity onPress={() => setAuthMode('register')}>
                      <Text style={styles.switchText}>Need an account? Register</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setAuthMode('login')}>
                      <Text style={styles.switchText}>Already registered? Log In</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => setTab('counter')}
          style={[styles.navItem, tab === 'counter' && styles.navItemActive]}
        >
          <Text style={[styles.navText, tab === 'counter' && styles.navTextActive]}>
            Counter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('history')}
          style={[styles.navItem, tab === 'history' && styles.navItemActive]}
        >
          <Text style={[styles.navText, tab === 'history' && styles.navTextActive]}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('account')}
          style={[styles.navItem, tab === 'account' && styles.navItemActive]}
        >
          <Text style={[styles.navText, tab === 'account' && styles.navTextActive]}>
            Account
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ea580c',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerSub: {
    color: '#fed7aa',
    fontSize: 11,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  counterView: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: '#78716c',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#f5f5f4',
    borderRadius: 5,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 5,
  },
  subtext: {
    fontSize: 11,
    color: '#a8a29e',
  },
  tapButton: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#fde047',
    marginVertical: 12,
    shadowColor: '#ea580c',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  tapSub: {
    color: '#fed7aa',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  tapText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    marginVertical: 4,
  },
  tapAction: {
    color: '#ffedd5',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  beadBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 8,
  },
  beadBadgeText: {
    color: '#fef08a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#78716c',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  kpiSub: {
    fontSize: 10,
    color: '#a8a29e',
    marginTop: 2,
  },
  langRow: {
    flexDirection: 'row',
    backgroundColor: '#ffedd5',
    borderRadius: 20,
    padding: 3,
    marginTop: 18,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  langBtnActive: {
    backgroundColor: '#ffffff',
  },
  langBtnText: {
    fontSize: 12,
    color: '#7c2d12',
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: '#ea580c',
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#fed7aa',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    borderTopWidth: 3,
    borderColor: '#ea580c',
  },
  navText: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#ea580c',
    fontWeight: 'bold',
  },
  historyView: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#431407',
    marginBottom: 12,
  },
  historyRow: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#292524',
  },
  historyCount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  emptyText: {
    color: '#a8a29e',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  accountView: {
    width: '100%',
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ea580c',
    marginBottom: 12,
  },
  userLabel: {
    fontSize: 13,
    color: '#44403c',
    marginVertical: 4,
  },
  logoutBtn: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#ffffff',
    marginVertical: 5,
  },
  submitBtn: {
    backgroundColor: '#ea580c',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  authMsgText: {
    fontSize: 12,
    color: '#ea580c',
    marginBottom: 8,
  },
  authSwitchRow: {
    marginTop: 14,
    alignItems: 'center',
  },
  switchText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '600',
  },
});
