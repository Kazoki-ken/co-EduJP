import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Google OAuth sessiyasini yakunlash (redirect callback)
WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const API_URL = 'https://edujp.uz';
const GOOGLE_WEB_CLIENT_ID = '156336295197-pjb6ocbui8t994dhdg4nv827a22f8e84.apps.googleusercontent.com';

interface Word {
  id: string;
  japaneseWord: string;
  hiragana: string;
  meaning: string;
  exampleSentence?: string;
  exampleTranslation?: string;
}

type Screen = 'INITIAL_CHECK' | 'LOGIN' | 'DASHBOARD' | 'PLAY' | 'RESULTS';

// Heights of the 3 zones (must match styles below)
const CARD_BOTTOM_ZONE_H = 52;
const CARD_MIDDLE_ZONE_H = 64;

export default function IndexScreen() {
  const [screen, setScreen] = useState<Screen>('INITIAL_CHECK');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string; email: string } | null>(null);

  // Google OAuth hook (expo-auth-session)
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: '156336295197-3i7sjs5vl3ekpsfm0gp1ht9qectj8te2.apps.googleusercontent.com',
    iosClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Words / game
  const [savedWords, setSavedWords] = useState<Word[]>([]);
  const [gameCards, setGameCards] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSavedCount, setTotalSavedCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [knownWordIds, setKnownWordIds] = useState<string[]>([]);
  const [unknownWordIds, setUnknownWordIds] = useState<string[]>([]);
  const [revealHiragana, setRevealHiragana] = useState<Record<string, boolean>>({});
  const [isFlipped, setIsFlipped] = useState(false);

  // ── REFS (never stale in callbacks) ─────────────────────────────────
  const currentIndexRef = useRef(0);
  const gameCardsRef    = useRef<Word[]>([]);
  const isFlippedRef    = useRef(false);
  const isTransRef      = useRef(false);   // is card transitioning?
  const isDragging      = useRef(false);
  const touchStartX     = useRef(0);
  const touchStartY     = useRef(0);
  const cardH           = useRef(SCREEN_H * 0.52);

  // Keep index & cards refs in sync with state
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { gameCardsRef.current = gameCards; }, [gameCards]);

  // Animated values
  const pan      = useRef(new Animated.ValueXY()).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  // ── Interpolations ───────────────────────────────────────────────────
  const cardRotate = pan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const frontRotY = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotY  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  // ── Auto-login ───────────────────────────────────────────────────────
  useEffect(() => { checkAuthentication(); }, []);

  // ── Google OAuth response handler ─────────────────────────────────────
  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleGoogleLoginOnly(response.authentication.accessToken);
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      setGoogleLoading(false);
      if (response?.type === 'error') {
        setError('Google orqali kirish muvaffaqiyatsiz tugadi.');
      }
    }
  }, [response]);

  // ── Pulse on dashboard ───────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'DASHBOARD') return;
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale,   { toValue: 1.25, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseScale,   { toValue: 1,    duration: 1500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.1,  duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5,  duration: 1500, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [screen]);

  // ── Auth ─────────────────────────────────────────────────────────────
  const checkAuthentication = async () => {
    try {
      const rt = await SecureStore.getItemAsync('auth_token');
      if (rt) {
        const { data: rData } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken: rt });
        const at = rData.accessToken;
        setToken(at);
        const h = { Authorization: `Bearer ${at}` };
        const { data: meData } = await axios.get(`${API_URL}/api/auth/me`, { headers: h });
        setUser(meData.user || meData);
        const { data: wData } = await axios.get(`${API_URL}/api/users/me/saved-words?limit=1`, { headers: h });
        setTotalSavedCount(wData.meta?.total || 0);
        const cached = await AsyncStorage.getItem('cached_words');
        if (cached) setSavedWords(JSON.parse(cached));
        setIsOfflineMode(false);
        setScreen('DASHBOARD');
      } else {
        const cached = await AsyncStorage.getItem('cached_words');
        if (cached) { const p = JSON.parse(cached); if (p.length) { setSavedWords(p); setTotalSavedCount(p.length); } }
        setScreen('LOGIN');
      }
    } catch {
      const cached = await AsyncStorage.getItem('cached_words');
      if (cached) { const p = JSON.parse(cached); if (p.length) { setSavedWords(p); setTotalSavedCount(p.length); setIsOfflineMode(true); setScreen('DASHBOARD'); return; } }
      setScreen('LOGIN');
    }
  };

  const handleLogin = async () => {
    if (!usernameInput.trim() || !passwordInput.trim()) { setError('Login va parolni kiriting'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, {
        email: usernameInput.trim().toLowerCase(), password: passwordInput,
      });
      setToken(data.accessToken); setUser(data.user);
      if (data.refreshToken) await SecureStore.setItemAsync('auth_token', data.refreshToken);
      const h = { Authorization: `Bearer ${data.accessToken}` };
      const { data: wData } = await axios.get(`${API_URL}/api/users/me/saved-words?limit=1`, { headers: h });
      setTotalSavedCount(wData.meta?.total || 0);
      const cached = await AsyncStorage.getItem('cached_words');
      if (cached) setSavedWords(JSON.parse(cached)); else setSavedWords([]);
      setIsOfflineMode(false); setScreen('DASHBOARD');
    } catch (err: any) {
      const cached = await AsyncStorage.getItem('cached_words');
      if (cached) { const p = JSON.parse(cached); if (p.length) { setSavedWords(p); setTotalSavedCount(p.length); setIsOfflineMode(true); setScreen('DASHBOARD'); return; } }
      setError(err.response?.data?.error || err.response?.data?.message || "Email yoki parol noto'g'ri.");
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token').catch(() => {});
    setToken(null); setUser(null); setSavedWords([]); setUsernameInput(''); setPasswordInput('');
    setScreen('LOGIN');
  };

  // Google login — faqat VocabJP da ro'yxatdan o'tgan foydalanuvchilar uchun
  const handleGoogleLoginOnly = async (accessToken: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/google-login-only`, { accessToken });
      setToken(data.accessToken);
      setUser(data.user);
      if (data.refreshToken) await SecureStore.setItemAsync('auth_token', data.refreshToken);
      const h = { Authorization: `Bearer ${data.accessToken}` };
      const { data: wData } = await axios.get(`${API_URL}/api/users/me/saved-words?limit=1`, { headers: h });
      setTotalSavedCount(wData.meta?.total || 0);
      const cached = await AsyncStorage.getItem('cached_words');
      if (cached) setSavedWords(JSON.parse(cached)); else setSavedWords([]);
      setIsOfflineMode(false);
      setScreen('DASHBOARD');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Xatolik yuz berdi.';
      if (status === 403) {
        // Foydalanuvchi bazada yo'q — edujp.uz ga yo'naltirish
        Alert.alert(
          "Ruxsat yo'q",
          "Siz VocabJP ilovasida ro'yxatdan o'tmagansiz.\n\nIltimos, avval edujp.uz saytida ro'yxatdan o'ting.",
          [
            { text: 'Bekor qilish', style: 'cancel' },
            { text: "edujp.uz ga o'tish", onPress: () => Linking.openURL('https://edujp.uz') },
          ]
        );
      } else {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const downloadOfflineWords = async () => {
    if (!token) { Alert.alert('Internet kerak', "Yuklab olish uchun internet kerak."); return; }
    setSyncing(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      let all: any[] = []; let page = 1; let pages = 1;
      do {
        const { data } = await axios.get(`${API_URL}/api/users/me/saved-words?page=${page}&limit=500`, { headers: h });
        all = [...all, ...(data.data || data.savedWords || [])];
        pages = data.meta?.totalPages || 1; page++;
      } while (page <= pages);
      const cleaned: Word[] = all.map((item: any) => {
        const w = item.word || item;
        return { id: w.id, japaneseWord: w.japaneseWord || w.japanese_word || '',
          hiragana: w.hiragana || '', meaning: w.meaning || '',
          exampleSentence: w.exampleSentence || w.example_sentence || '',
          exampleTranslation: w.exampleTranslation || w.example_translation || '' };
      });
      setSavedWords(cleaned); setTotalSavedCount(cleaned.length);
      await AsyncStorage.setItem('cached_words', JSON.stringify(cleaned));
      Alert.alert('✅ Muvaffaqiyatli!', `${cleaned.length} ta so'z saqlandi. Oflayn ham o'ynashingiz mumkin!`);
    } catch {
      Alert.alert('Xatolik', "Yuklab olishda muammo. Internetni tekshiring.");
    } finally { setSyncing(false); }
  };

  // ── Session ──────────────────────────────────────────────────────────
  const startSession = () => {
    if (!savedWords.length) { Alert.alert("So'zlar yo'q", "Avval 'Yuklab olish' tugmasini bosing."); return; }
    const shuffled = [...savedWords].sort(() => 0.5 - Math.random()).slice(0, 20);
    gameCardsRef.current   = shuffled;
    currentIndexRef.current = 0;
    setGameCards(shuffled); setCurrentIndex(0);
    setKnownWordIds([]); setUnknownWordIds([]);
    setRevealHiragana({});
    isFlippedRef.current = false; setIsFlipped(false);
    flipAnim.setValue(0); pan.setValue({ x: 0, y: 0 });
    isTransRef.current = false;
    setScreen('PLAY');
  };

  // ── Flip ─────────────────────────────────────────────────────────────
  const doFlip = () => {
    if (isTransRef.current) return;
    if (isFlippedRef.current) {
      Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
      isFlippedRef.current = false; setIsFlipped(false);
    } else {
      Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
      isFlippedRef.current = true; setIsFlipped(true);
    }
  };

  // ── Swipe ────────────────────────────────────────────────────────────
  const doSwipe = (dir: 'LEFT' | 'RIGHT') => {
    if (isTransRef.current) return;
    const idx   = currentIndexRef.current;
    const cards = gameCardsRef.current;
    if (idx >= cards.length) return;
    const card = cards[idx];
    if (!card) return;

    isTransRef.current = true;
    if (dir === 'RIGHT') setKnownWordIds(p => [...p, card.id]);
    else setUnknownWordIds(p => [...p, card.id]);

    Animated.timing(pan, {
      toValue: { x: dir === 'RIGHT' ? SCREEN_W + 150 : -SCREEN_W - 150, y: 0 },
      duration: 280, useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      flipAnim.setValue(0);
      isFlippedRef.current = false; setIsFlipped(false);
      const next = idx + 1;
      currentIndexRef.current = next;
      if (next < cards.length) { setCurrentIndex(next); isTransRef.current = false; }
      else { isTransRef.current = false; setScreen('RESULTS'); }
    });
  };

  // ── Direct touch handlers (no PanResponder — no conflicts!) ──────────
  const onCardTouchStart = (e: any) => {
    if (isTransRef.current) return;
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
    isDragging.current  = false;
    // start tracking pan
    pan.setOffset({ x: (pan.x as any)._value || 0, y: 0 });
    pan.setValue({ x: 0, y: 0 });
  };

  const onCardTouchMove = (e: any) => {
    if (isTransRef.current) return;
    const dx = e.nativeEvent.pageX - touchStartX.current;
    const dy = e.nativeEvent.pageY - touchStartY.current;
    if (!isDragging.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) isDragging.current = true;
    pan.setValue({ x: dx, y: dy * 0.12 });
  };

  const onCardTouchEnd = (e: any) => {
    if (isTransRef.current) return;
    pan.flattenOffset();
    const panX = (pan.x as any)._value || 0;

    if (!isDragging.current) {
      // ── TAP: determine zone by Y within card ────────────────────
      const tapY = e.nativeEvent.locationY ?? 0;
      const h    = cardH.current;
      const midStart    = h - CARD_BOTTOM_ZONE_H - CARD_MIDDLE_ZONE_H;
      const bottomStart = h - CARD_BOTTOM_ZONE_H;

      if (isFlippedRef.current) {
        // Back face visible → flip back
        pan.setValue({ x: 0, y: 0 });
        doFlip();
      } else if (tapY >= midStart && tapY < bottomStart) {
        // Hiragana zone
        pan.setValue({ x: 0, y: 0 });
        const card = gameCardsRef.current[currentIndexRef.current];
        if (card && card.hiragana && card.hiragana !== card.japaneseWord) {
          setRevealHiragana(prev => ({ ...prev, [card.id]: true }));
        }
      } else {
        // Top / bottom zone → flip
        pan.setValue({ x: 0, y: 0 });
        doFlip();
      }
    } else if (panX > 100) {
      doSwipe('RIGHT');
    } else if (panX < -100) {
      doSwipe('LEFT');
    } else {
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────
  if (screen === 'INITIAL_CHECK') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 12 }}>Yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.bgPurple} />
      <View pointerEvents="none" style={styles.bgEmerald} />

      {/* ── LOGIN ───────────────────────────────────────────────────── */}
      {screen === 'LOGIN' && (
        <SafeAreaView style={styles.safeContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            <View style={styles.authHeader}>
              <View style={styles.logoBadge}><Ionicons name="copy-outline" size={32} color="#a78bfa" /></View>
              <Text style={styles.authTitle}>VocabCards</Text>
              <Text style={styles.authSubtitle}>Saqlangan so'zlarni Tinder usulida o'rganing</Text>
            </View>
            <BlurView intensity={22} tint="dark" style={styles.glassCard}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={{ marginRight: 8 }} />
                <TextInput value={usernameInput} onChangeText={setUsernameInput} placeholder="email@example.com"
                  placeholderTextColor="#4b5563" style={styles.textInput} autoCapitalize="none" />
              </View>
              <Text style={styles.inputLabel}>Parol</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={{ marginRight: 8 }} />
                <TextInput value={passwordInput} onChangeText={setPasswordInput} placeholder="••••••••"
                  placeholderTextColor="#4b5563" secureTextEntry style={styles.textInput} autoCapitalize="none" />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity onPress={handleLogin} disabled={loading || googleLoading} style={styles.authBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authBtnText}>Kirish</Text>}
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <Text style={{ color: '#6b7280', fontSize: 12, marginHorizontal: 10 }}>yoki</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              </View>

              {/* Google Sign-In Button */}
              <TouchableOpacity
                onPress={() => { setGoogleLoading(true); promptAsync(); }}
                disabled={googleLoading || loading || !request}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  opacity: (googleLoading || loading || !request) ? 0.6 : 1,
                }}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#a78bfa" />
                ) : (
                  /* Google G icon */
                  <View style={{ width: 20, height: 20 }}>
                    <Ionicons name="logo-google" size={20} color="#fff" />
                  </View>
                )}
                <Text style={{ color: '#d1d5db', fontSize: 14, fontWeight: '600' }}>
                  {googleLoading ? 'Yuklanmoqda...' : 'Google bilan kirish'}
                </Text>
              </TouchableOpacity>

              {/* Hint */}
              <Text style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
                Faqat edujp.uz da ro'yxatdan o'tgan foydalanuvchilar kira oladi
              </Text>
            </BlurView>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* ── DASHBOARD ───────────────────────────────────────────────── */}
      {screen === 'DASHBOARD' && (
        <SafeAreaView style={styles.safeContainer}>
          {isOfflineMode && (
            <LinearGradient colors={['#ef4444', '#b91c1c']} style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.offlineBannerText}>Oflayn rejim faol — Internet yo'q 📡</Text>
            </LinearGradient>
          )}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcomeSub}>ようこそ 👋</Text>
              <Text style={styles.welcomeName}>{user?.username ?? 'Learner'}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#f87171" />
            </TouchableOpacity>
          </View>

          {!isOfflineMode && token && savedWords.length < totalSavedCount && (
            <View style={styles.recContainer}>
              <BlurView intensity={24} tint="dark" style={styles.recCard}>
                <LinearGradient colors={['rgba(124,58,237,0.16)', 'rgba(16,185,129,0.06)']} style={styles.recGrad}>
                  <View style={styles.recHeader}>
                    <View style={styles.recIconBadge}><Ionicons name="cloud-download-outline" size={18} color="#10b981" /></View>
                    <Text style={styles.recTitle}>Oflayn rejimni faollashtiring</Text>
                  </View>
                  <Text style={styles.recText}>Internet bo'lmasa ham o'ynash uchun so'zlarni yuklab oling!</Text>
                  <TouchableOpacity onPress={downloadOfflineWords} disabled={syncing} style={styles.recBtn}>
                    {syncing ? <ActivityIndicator size="small" color="#fff" /> : (
                      <><Ionicons name="download-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.recBtnText}>Barchasini yuklab olish</Text></>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              </BlurView>
            </View>
          )}

          {!isOfflineMode && token && savedWords.length >= totalSavedCount && totalSavedCount > 0 && (
            <View style={styles.syncedRow}>
              <BlurView intensity={15} tint="dark" style={styles.syncedBadge}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" />
                <Text style={styles.syncedText}>Oflayn tayyor — {totalSavedCount} ta so'z</Text>
                <TouchableOpacity onPress={downloadOfflineWords} disabled={syncing} style={{ padding: 2, marginLeft: 4 }}>
                  <Ionicons name="sync-outline" size={12} color="#a78bfa" />
                </TouchableOpacity>
              </BlurView>
            </View>
          )}

          <View style={styles.dashMain}>
            {savedWords.length === 0 && totalSavedCount === 0 ? (
              <BlurView intensity={18} tint="dark" style={[styles.glassCard, { alignItems: 'center', padding: 28 }]}>
                <Ionicons name="warning-outline" size={48} color="#f59e0b" style={{ marginBottom: 12 }} />
                <Text style={styles.cardHeader}>So'zlar topilmadi!</Text>
                <Text style={styles.warnText}>Asosiy ilovadan so'zlarni saqlang, so'ng "Yuklab olish" tugmasini bosing.</Text>
                <TouchableOpacity onPress={checkAuthentication} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Yangilash 🔄</Text>
                </TouchableOpacity>
              </BlurView>
            ) : (
              <View style={styles.dashCenter}>
                <View style={styles.playBtnWrapper}>
                  <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                  <TouchableOpacity onPress={startSession} style={styles.playBtn}>
                    <LinearGradient colors={['#7c3aed', '#5b21b6']} style={styles.playBtnGrad}>
                      <Ionicons name="play" size={48} color="#fff" style={{ marginLeft: 6 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <Text style={styles.playLabel}>O'yinni boshlash</Text>
                <BlurView intensity={14} tint="dark" style={styles.statsRow}>
                  <Ionicons name="bookmark-outline" size={22} color="#10b981" />
                  <Text style={styles.statsText}>Jami: <Text style={{ color: '#10b981', fontWeight: '800' }}>{totalSavedCount} ta</Text></Text>
                </BlurView>
              </View>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* ── PLAY ────────────────────────────────────────────────────── */}
      {screen === 'PLAY' && (
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.playHeader}>
            <TouchableOpacity onPress={() => setScreen('DASHBOARD')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.progressText}>{currentIndex + 1} / {gameCards.length}</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((currentIndex + 1) / gameCards.length) * 100}%` }]} />
          </View>

          <View style={styles.cardsArena}>
            {gameCards.map((card, index) => {
              if (index < currentIndex) return null;

              // Ghost cards behind
              if (index > currentIndex) {
                const off = Math.min(index - currentIndex, 2);
                return (
                  <View key={card.id} pointerEvents="none" style={[styles.cardContainer, {
                    zIndex: -off, opacity: 1 - off * 0.35,
                    transform: [{ scale: 1 - off * 0.04 }, { translateY: off * 10 }],
                  }]}>
                    <View style={[styles.cardSurface, { backgroundColor: 'rgba(20,20,40,0.8)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: '#374151', fontSize: 28, letterSpacing: 8 }}>• • •</Text>
                    </View>
                  </View>
                );
              }

              // ── Active card ─────────────────────────────────────────
              return (
                <Animated.View
                  key={card.id}
                  style={[styles.cardContainer, {
                    zIndex: 10,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: cardRotate }],
                  }]}
                  onLayout={(e) => { cardH.current = e.nativeEvent.layout.height; }}
                  // Direct responder — no PanResponder conflict with inner views
                  onStartShouldSetResponder={() => !isTransRef.current}
                  onMoveShouldSetResponder={() => !isTransRef.current}
                  onResponderGrant={onCardTouchStart}
                  onResponderMove={onCardTouchMove}
                  onResponderRelease={onCardTouchEnd}
                  onResponderTerminate={() => {
                    pan.flattenOffset();
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
                  }}
                >
                  {/* Swipe badges */}
                  <Animated.View style={[styles.swipeBadge, styles.likeBadge, { opacity: likeOpacity }]}>
                    <Text style={styles.badgeText}>BILAMAN ✓</Text>
                  </Animated.View>
                  <Animated.View style={[styles.swipeBadge, styles.nopeBadge, { opacity: nopeOpacity }]}>
                    <Text style={styles.badgeText}>BILMAYMAN ✗</Text>
                  </Animated.View>

                  {/* ── FRONT FACE ─────────────────────────────────── */}
                  <Animated.View style={[styles.cardSurface, styles.cardFront, { transform: [{ rotateY: frontRotY }] }]}>
                    <LinearGradient pointerEvents="none" colors={['rgba(24,24,52,0.97)', 'rgba(12,12,28,0.99)']} style={StyleSheet.absoluteFill} />

                    {/* 
                      All 3 zones are pointerEvents="none" — touches handled by parent Animated.View.
                      Touch zone by Y coordinate in onCardTouchEnd.
                    */}
                    <View pointerEvents="none" style={styles.frontLayout}>
                      {/* Zone 1 visual: Kanji */}
                      <View style={styles.zoneTop}>
                        <Text style={styles.cardJapanese}>{card.japaneseWord}</Text>
                      </View>

                      {/* Zone 2 visual: Hiragana */}
                      <View style={styles.zoneMiddle}>
                        {card.hiragana && card.hiragana !== card.japaneseWord ? (
                          revealHiragana[card.id] ? (
                            /* Revealed — clear hiragana */
                            <Text style={styles.hiraganaRevealed}>{card.hiragana}</Text>
                          ) : (
                            /* Hidden — only the "ko'rish" pill, no text behind it */
                            <View style={styles.hiraganaRevealBtn}>
                              <Ionicons name="eye-outline" size={14} color="#fff" />
                              <Text style={styles.hiraganaRevealBtnText}>ko'rish</Text>
                            </View>
                          )
                        ) : null}
                      </View>

                      {/* Zone 3 visual: Hint */}
                      <View style={styles.zoneBottom}>
                        <Ionicons name="sync-outline" size={13} color="#4b5563" />
                        <Text style={styles.hintText}> Tarjimasi uchun bosing</Text>
                      </View>
                    </View>
                  </Animated.View>

                  {/* ── BACK FACE ──────────────────────────────────── */}
                  <Animated.View style={[styles.cardSurface, styles.cardBack, { transform: [{ rotateY: backRotY }], zIndex: isFlipped ? 11 : 9 }]}>
                    <LinearGradient pointerEvents="none" colors={['rgba(16,24,48,0.97)', 'rgba(8,12,24,0.99)']} style={StyleSheet.absoluteFill} />

                    <View pointerEvents="none" style={styles.backLayout}>
                      <View style={styles.backTop}>
                        <Text style={styles.backJapanese}>{card.japaneseWord}</Text>
                        <Text style={styles.backHiragana}>{card.hiragana}</Text>
                      </View>
                      <View style={styles.divider} />
                      <ScrollView style={styles.meaningScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.meaningLabel}>Tarjimasi:</Text>
                        <Text style={styles.meaningText}>{card.meaning}</Text>
                        {card.exampleSentence && (
                          <>
                            <Text style={styles.exampleLabel}>Misol:</Text>
                            <Text style={styles.exampleJa}>{card.exampleSentence}</Text>
                            {card.exampleTranslation && <Text style={styles.exampleUz}>{card.exampleTranslation}</Text>}
                          </>
                        )}
                      </ScrollView>
                      <View style={styles.backHint}>
                        <Ionicons name="sync-outline" size={13} color="#10b981" />
                        <Text style={[styles.hintText, { color: '#10b981' }]}> Orqaga qaytarish</Text>
                      </View>
                    </View>
                  </Animated.View>
                </Animated.View>
              );
            })}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => doSwipe('LEFT')} style={[styles.actionBtn, styles.nopeBtn]}>
              <Ionicons name="close" size={30} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => doSwipe('RIGHT')} style={[styles.actionBtn, styles.likeBtn]}>
              <Ionicons name="checkmark" size={30} color="#10b981" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ── RESULTS ─────────────────────────────────────────────────── */}
      {screen === 'RESULTS' && (
        <SafeAreaView style={styles.safeContainer}>
          <Text style={styles.resultTitle}>Mashg'ulot yakunlandi 🎉</Text>
          <Text style={styles.resultSub}>Natijalaringizni tekshiring</Text>
          <View style={styles.statsCards}>
            <BlurView intensity={18} tint="dark" style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
              <Text style={styles.statLabel}>BILGANLAR</Text>
              <Text style={[styles.statNum, { color: '#10b981' }]}>{knownWordIds.length}</Text>
            </BlurView>
            <BlurView intensity={18} tint="dark" style={[styles.statCard, { borderLeftColor: '#ef4444' }]}>
              <Text style={styles.statLabel}>BILMAGANLAR</Text>
              <Text style={[styles.statNum, { color: '#ef4444' }]}>{unknownWordIds.length}</Text>
            </BlurView>
          </View>
          <Text style={styles.sectionLabel}>So'zlar bo'yicha hisobot:</Text>
          <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
            {gameCards.map(card => {
              const known = knownWordIds.includes(card.id);
              return (
                <BlurView key={card.id} intensity={12} tint="dark" style={[styles.wordRow, { borderColor: known ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.wordJa}>{card.japaneseWord}</Text>
                    <Text style={styles.wordHi}>{card.hiragana}</Text>
                    <Text style={styles.wordMean}>{card.meaning}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: known ? '#10b98122' : '#ef444422' }]}>
                    <Ionicons name={known ? 'checkmark-circle-outline' : 'close-circle-outline'} size={18} color={known ? '#10b981' : '#ef4444'} />
                    <Text style={[styles.statusText, { color: known ? '#10b981' : '#ef4444' }]}>{known ? 'Bilindi' : 'Bilinmadi'}</Text>
                  </View>
                </BlurView>
              );
            })}
          </ScrollView>
          <View style={styles.resultBtns}>
            <TouchableOpacity onPress={startSession} style={styles.retryGameBtn}>
              <LinearGradient colors={['#7c3aed', '#5b21b6']} style={styles.retryGameGrad}>
                <Text style={styles.retryGameText}>Qayta o'ynash 🔄</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen('DASHBOARD')} style={styles.exitBtn}>
              <Text style={styles.exitBtnText}>Bosh sahifa 🏠</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  safeContainer: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050510' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  bgPurple: { position: 'absolute', top: -150, left: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(124,58,237,0.1)' },
  bgEmerald: { position: 'absolute', bottom: -150, right: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(16,185,129,0.06)' },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  authHeader: { alignItems: 'center', marginBottom: 36 },
  logoBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  authTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  authSubtitle: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 12, lineHeight: 18 },
  glassCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, overflow: 'hidden' },
  inputLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, height: 48 },
  textInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  authBtn: { height: 48, backgroundColor: '#7c3aed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 28, elevation: 4 },
  authBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginTop: 14, textAlign: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  welcomeSub: { color: '#6b7280', fontSize: 12, fontWeight: '500' },
  welcomeName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  logoutBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  dashMain: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  dashCenter: { alignItems: 'center', justifyContent: 'center' },
  playBtnWrapper: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2.5,
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  playBtn: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 },
  playBtnGrad: { width: '100%', height: '100%', borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  playLabel: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.12)', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, marginTop: 24, gap: 8 },
  statsText: { color: '#d1d5db', fontSize: 13, fontWeight: '500' },
  recContainer: { paddingHorizontal: 24, marginTop: 14, width: '100%' },
  recCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' },
  recGrad: { padding: 16 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  recIconBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.10)', alignItems: 'center', justifyContent: 'center' },
  recTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  recText: { color: '#9ca3af', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  recBtn: { height: 38, backgroundColor: '#10b981', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  recBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  syncedRow: { paddingHorizontal: 24, marginTop: 14, alignItems: 'center' },
  syncedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 16, gap: 8, overflow: 'hidden' },
  syncedText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  cardHeader: { color: '#f9fafb', fontSize: 18, fontWeight: '700', marginTop: 8 },
  warnText: { color: '#6b7280', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginTop: 16 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  playHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  progressText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, marginHorizontal: 24, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 2 },
  cardsArena: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },

  cardContainer: {
    width: SCREEN_W - 48,
    height: SCREEN_H * 0.52,
    position: 'absolute',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  cardSurface: {
    width: '100%', height: '100%', borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardFront: { position: 'absolute' },
  cardBack:  { position: 'absolute' },

  // Front face layout (all 3 zones — no touch handling here, parent handles it)
  frontLayout: { flex: 1, flexDirection: 'column' },

  zoneTop: {
    // Kanji zone — flex: 1 takes all remaining space
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  zoneMiddle: {
    // Hiragana zone — fixed height matching CARD_MIDDLE_ZONE_H
    height: CARD_MIDDLE_ZONE_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  zoneBottom: {
    // Hint zone — fixed height matching CARD_BOTTOM_ZONE_H
    height: CARD_BOTTOM_ZONE_H,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  cardJapanese: { color: '#fff', fontSize: 56, fontWeight: '800', textAlign: 'center', letterSpacing: 2 },

  hiraganaRevealed: { color: '#a78bfa', fontSize: 26, fontWeight: '700', textAlign: 'center' },

  hiraganaRevealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.85)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  hiraganaRevealBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  hintText: { color: '#4b5563', fontSize: 12, fontWeight: '500' },

  // Back face
  backLayout: { flex: 1, paddingTop: 20, paddingHorizontal: 22, paddingBottom: 12 },
  backTop: { alignItems: 'center', paddingBottom: 12 },
  backJapanese: { color: '#fff', fontSize: 30, fontWeight: '700', textAlign: 'center' },
  backHiragana: { color: '#a78bfa', fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 12 },
  meaningScroll: { flex: 1 },
  meaningLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  meaningText: { color: '#f3f4f6', fontSize: 18, fontWeight: '600', marginTop: 4, lineHeight: 26 },
  exampleLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16 },
  exampleJa: { color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 4, lineHeight: 20 },
  exampleUz: { color: '#9ca3af', fontSize: 13, marginTop: 2, lineHeight: 18 },
  backHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },

  swipeBadge: { position: 'absolute', top: 22, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, zIndex: 20 },
  likeBadge: { left: 18, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', transform: [{ rotate: '-12deg' }] },
  nopeBadge: { right: 18, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.12)', transform: [{ rotate: '12deg' }] },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 32 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  nopeBtn: { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)' },
  likeBtn: { borderColor: 'rgba(16,185,129,0.25)', backgroundColor: 'rgba(16,185,129,0.08)' },

  resultTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  resultSub: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  statsCards: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderLeftWidth: 3, paddingVertical: 12, paddingHorizontal: 14 },
  statLabel: { color: '#6b7280', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  statNum: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  sectionLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 24, marginBottom: 8 },
  reviewList: { flex: 1, paddingHorizontal: 24 },
  wordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  wordJa: { color: '#fff', fontSize: 16, fontWeight: '700' },
  wordHi: { color: '#a78bfa', fontSize: 12, fontWeight: '600', marginTop: 2 },
  wordMean: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  resultBtns: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 10 },
  retryGameBtn: { height: 48, borderRadius: 14, overflow: 'hidden' },
  retryGameGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  retryGameText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  exitBtn: { height: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exitBtnText: { color: '#d1d5db', fontSize: 14, fontWeight: '600' },
});
