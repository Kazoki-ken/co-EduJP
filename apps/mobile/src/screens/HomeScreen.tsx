import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, Dimensions, PanResponder, TextInput, Vibration, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Speech from 'expo-speech';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { AppTabsParamList } from '../navigation/AppTabs';
import { toggleSaveWord } from '../hooks/useVocabulary';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Animated entrance hook ────────────────────────────────────────
function useEntrance(delay = 0) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ── Glassmorphism stat card ───────────────────────────────────────
interface StatCardProps {
  emoji: string;
  value: string | number;
  label: string;
  colors: [string, string];
  glowColor: string;
}

function StatCard({ emoji, value, label, colors, glowColor }: StatCardProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <BlurView
      intensity={22}
      tint="dark"
      style={{
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginHorizontal: 4,
      }}
    >
      <LinearGradient
        colors={['rgba(18,18,42,0.9)', 'rgba(10,10,26,0.95)']}
        style={{ padding: 16, alignItems: 'center' }}
      >
        <View
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: glowColor + '22',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 8,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
          }}
        >
          <Animated.Text
            style={{ fontSize: 22, transform: [{ scale: pulse }] }}
          >
            {emoji}
          </Animated.Text>
        </View>
        <Text style={{ color: '#f9fafb', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>
          {value}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2, fontWeight: '500' }}>
          {label}
        </Text>
      </LinearGradient>
    </BlurView>
  );
}

// ── Streak flame component ────────────────────────────────────────
function StreakFlame({ streak }: { streak: number }) {
  const flicker = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1.2,  duration: 700, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.95, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Animated.View style={{ transform: [{ scale: flicker }] }}>
        <Ionicons name="flame" size={18} color="#f59e0b" />
      </Animated.View>
      <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 15 }}>{streak} kunlik faollik</Text>
    </View>
  );
}

// ── Bottom Sheet Drawer Helper ────────────────────────────────────
interface BottomDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: any;
}

function BottomDrawer({ visible, onClose, title, children, height = '75%' }: BottomDrawerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      {/* Backdrop */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000', opacity,
      }}>
        <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Drawer content */}
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height,
        backgroundColor: '#0e0e22',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3, shadowRadius: 15, elevation: 20,
        transform: [{ translateY }],
        overflow: 'hidden'
      }}>
        {/* Drag handle line */}
        <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 10 }} />
        
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Inner Content */}
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

// ── Default Words List (Fallback) ──────────────────────────────────
interface WordOfDay {
  id?: string;
  kanji: string;
  hiragana: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  isSaved?: boolean;
}

const DEFAULT_WORDS_OF_DAY: WordOfDay[] = [
  {
    kanji: '日本語',
    hiragana: 'にほんご',
    meaning: 'Yapon tili',
    example: '日本語を勉強しています。',
    exampleTranslation: 'Men yapon tilini o‘rganyapman.'
  },
  {
    kanji: '友達',
    hiragana: 'ともだち',
    meaning: 'Do‘st',
    example: '彼は私の友達です。',
    exampleTranslation: 'U mening do‘stim.'
  },
  {
    kanji: '美味しい',
    hiragana: 'おいしい',
    meaning: 'Shirin, mazali',
    example: 'このラーメンはとても美味しいです。',
    exampleTranslation: 'Bu ramen juda mazali.'
  },
  {
    kanji: '先生',
    hiragana: 'せんせい',
    meaning: 'O‘qituvchi, ustoz',
    example: '日本語の先生に質問しました。',
    exampleTranslation: 'Yapon tili o‘qituvchisidan savol so‘radim.'
  },
  {
    kanji: '猫',
    hiragana: 'ねこ',
    meaning: 'Mushuk',
    example: '黒い猫が道を歩いています。',
    exampleTranslation: 'Qora mushuk yo‘ldan yurib ketmoqda.'
  },
  {
    kanji: '空',
    hiragana: 'そら',
    meaning: 'Osmon',
    example: '今日の空はとても青いです。',
    exampleTranslation: 'Bugun osmon juda ko‘k.'
  },
  {
    kanji: '音楽',
    hiragana: 'おんがく',
    meaning: 'Musiqa',
    example: '毎日音楽を聴きます。',
    exampleTranslation: 'Har kuni muzika tinglayman.'
  },
  {
    kanji: '本',
    hiragana: 'ほん',
    meaning: 'Kitob',
    example: '図書館で本を借りました。',
    exampleTranslation: 'Kutubxonadan kitob qarzga oldim.'
  },
  {
    kanji: '家族',
    hiragana: 'かぞく',
    meaning: 'Oila',
    example: '家族と一緒に旅行に行きます。',
    exampleTranslation: 'Oilam bilan birga sayohatga boraman.'
  },
  {
    kanji: '花',
    hiragana: 'はな',
    meaning: 'Gul',
    example: '庭に綺麗な花が咲きました。',
    exampleTranslation: 'Hovlida chiroyli gul ochildi.'
  }
];

// ── Hiragana & Katakana Data ──────────────────────────────────────
const HIRAGANA_DATA = [
  { char: 'あ', romaji: 'a' }, { char: 'い', romaji: 'i' }, { char: 'う', romaji: 'u' }, { char: 'え', romaji: 'e' }, { char: 'お', romaji: 'o' },
  { char: 'か', romaji: 'ka' }, { char: 'き', romaji: 'ki' }, { char: 'く', romaji: 'ku' }, { char: 'け', romaji: 'ke' }, { char: 'こ', romaji: 'ko' },
  { char: 'さ', romaji: 'sa' }, { char: 'し', romaji: 'shi' }, { char: 'す', romaji: 'su' }, { char: 'せ', romaji: 'se' }, { char: 'そ', romaji: 'so' },
  { char: 'た', romaji: 'ta' }, { char: 'ち', romaji: 'chi' }, { char: 'つ', romaji: 'tsu' }, { char: 'て', romaji: 'te' }, { char: 'と', romaji: 'to' },
  { char: 'な', romaji: 'na' }, { char: 'に', romaji: 'ni' }, { char: 'ぬ', romaji: 'nu' }, { char: 'ね', romaji: 'ne' }, { char: 'の', romaji: 'no' },
  { char: 'は', romaji: 'ha' }, { char: 'ひ', romaji: 'hi' }, { char: 'ふ', romaji: 'fu' }, { char: 'へ', romaji: 'he' }, { char: 'ほ', romaji: 'ho' },
  { char: 'ま', romaji: 'ma' }, { char: 'み', romaji: 'mi' }, { char: 'む', romaji: 'mu' }, { char: 'め', romaji: 'me' }, { char: 'も', romaji: 'mo' },
  { char: 'や', romaji: 'ya' }, { char: '', romaji: '' },    { char: 'ゆ', romaji: 'yu' }, { char: '', romaji: '' },    { char: 'よ', romaji: 'yo' },
  { char: 'ら', romaji: 'ra' }, { char: 'り', romaji: 'ri' }, { char: 'る', romaji: 'ru' }, { char: 'れ', romaji: 're' }, { char: 'ろ', romaji: 'ro' },
  { char: 'わ', romaji: 'wa' }, { char: '', romaji: '' },    { char: '', romaji: '' },    { char: '', romaji: '' },    { char: 'を', romaji: 'wo' },
  { char: 'ん', romaji: 'n' }
];

const KATAKANA_DATA = [
  { char: 'ア', romaji: 'a' }, { char: 'イ', romaji: 'i' }, { char: 'ウ', romaji: 'u' }, { char: 'エ', romaji: 'e' }, { char: 'オ', romaji: 'o' },
  { char: 'カ', romaji: 'ka' }, { char: 'キ', romaji: 'ki' }, { char: 'ク', romaji: 'ku' }, { char: 'ケ', romaji: 'ke' }, { char: 'コ', romaji: 'ko' },
  { char: 'サ', romaji: 'sa' }, { char: 'シ', romaji: 'shi' }, { char: 'ス', romaji: 'su' }, { char: 'セ', romaji: 'se' }, { char: 'ソ', romaji: 'so' },
  { char: 'タ', romaji: 'ta' }, { char: 'チ', romaji: 'chi' }, { char: 'ツ', romaji: 'tsu' }, { char: 'テ', romaji: 'te' }, { char: 'ト', romaji: 'to' },
  { char: 'ナ', romaji: 'na' }, { char: 'ニ', romaji: 'ni' }, { char: 'ヌ', romaji: 'nu' }, { char: 'ネ', romaji: 'ne' }, { char: 'ノ', romaji: 'no' },
  { char: 'ハ', romaji: 'ha' }, { char: 'ヒ', romaji: 'hi' }, { char: 'フ', romaji: 'fu' }, { char: 'ヘ', romaji: 'he' }, { char: 'ホ', romaji: 'ho' },
  { char: 'マ', romaji: 'ma' }, { char: 'ミ', romaji: 'mi' }, { char: 'ム', romaji: 'mu' }, { char: 'メ', romaji: 'me' }, { char: 'モ', romaji: 'mo' },
  { char: 'ヤ', romaji: 'ya' }, { char: '', romaji: '' },    { char: 'ユ', romaji: 'yu' }, { char: '', romaji: '' },    { char: 'ヨ', romaji: 'yo' },
  { char: 'ラ', romaji: 'ra' }, { char: 'リ', romaji: 'ri' }, { char: 'ル', romaji: 'ru' }, { char: 'レ', romaji: 're' }, { char: 'ロ', romaji: 'ro' },
  { char: 'ワ', romaji: 'wa' }, { char: '', romaji: '' },    { char: '', romaji: '' },    { char: '', romaji: '' },    { char: 'ヲ', romaji: 'wo' },
  { char: 'ン', romaji: 'n' }
];

// ── Kanji Guide Data ─────────────────────────────────────────────
const KANJI_DATA = [
  { kanji: '一', meaning: 'Bir', onyomi: 'イチ (ichi)', kunyomi: 'ひと-つ (hito-tsu)', strokes: 1, detail: "Sanoq sonlarining boshlanishi. Shuningdek butunlikni anglatadi." },
  { kanji: '二', meaning: 'Ikki', onyomi: 'ニ (ni)', kunyomi: 'ふた-つ (futa-tsu)', strokes: 2, detail: "Ikkinchi son. Ko'pincha juftlikni ifodalaydi." },
  { kanji: '三', meaning: 'Uch', onyomi: 'サン (san)', kunyomi: 'みっ-つ (mit-tsu)', strokes: 3, detail: "Uchinchi son. Muqaddas yoki to'liq son hisoblanadi." },
  { kanji: '日', meaning: 'Quyosh / Kun', onyomi: 'ニチ (nichi)', kunyomi: 'ひ (hi)', strokes: 4, detail: "Yaponiya (日本) nomida birinchi belgi." },
  { kanji: '本', meaning: 'Kitob / Asos', onyomi: 'ホン (hon)', kunyomi: 'もと (moto)', strokes: 5, detail: "Yaponiya nomida ikkinchi belgi. Kelib chiqish ma'nosi bor." },
  { kanji: '人', meaning: 'Odam', onyomi: 'ジン (jin) / ニン (nin)', kunyomi: 'ひと (hito)', strokes: 2, detail: "Inson yoki millatni bildiradi. Masalan: 日本人 (Yapon odami)." },
  { kanji: '月', meaning: 'Oy', onyomi: 'ゲツ (getsu)', kunyomi: 'つき (tsuki)', strokes: 4, detail: "Oy yoki haftaning dushanba kunini anglatadi (月曜日)." },
  { kanji: '火', meaning: 'Olov', onyomi: 'カ (ka)', kunyomi: 'ひ (hi)', strokes: 4, detail: "Seshanba kunini ifodalaydi (火曜日)." },
  { kanji: '水', meaning: 'Suv', onyomi: 'スイ (sui)', kunyomi: 'みず (mizu)', strokes: 4, detail: "Chorshanba kunini ifodalaydi (水曜日)." },
  { kanji: '木', meaning: 'Daraxt', onyomi: 'モク (moku)', kunyomi: 'き (ki)', strokes: 4, detail: "Payshanba kunini ifodalaydi (木曜日)." }
];

// ── Home Screen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, refreshUser, isAuthenticated } = useAuth();
  const insets   = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // ── Real SRS Count Fetching ──────────────────────────────────────
  const [srsCount, setSrsCount] = useState<number>(0);
  const loadSrsCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/users/me/progress');
      if (res.data && typeof res.data.dueTodayCount === 'number') {
        setSrsCount(res.data.dueTodayCount);
      } else {
        const sessionRes = await apiClient.get('/games/session', {
          params: { type: 'TEST', limit: 50, dueOnly: 'true' },
        });
        setSrsCount((sessionRes.data?.words ?? []).length);
      }
    } catch {
      setSrsCount(0);
    }
  }, []);

  // ── Auto-refresh user data (XP, coins, streak) and SRS count ──────
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshUser();
        loadSrsCount();
      }
    }, [isAuthenticated, refreshUser, loadSrsCount]),
  );

  const profile = user?.profile;
  const streak  = profile?.streak  ?? 0;

  const headerAnim  = useEntrance(0);
  const statsAnim   = useEntrance(100);

  // Navigate into the nested Games or Dictionary stacks
  const goToQuiz = (params: { mode: 'TEST'|'MATCH'|'WRITE'; dueOnly?: boolean }) => {
    if (params.mode === 'MATCH') {
      (navigation as any).navigate('Games', { screen: 'Match', params: {} });
    } else if (params.mode === 'WRITE') {
      (navigation as any).navigate('Games', { screen: 'Write', params: {} });
    } else {
      (navigation as any).navigate('Games', { screen: 'Quiz', params });
    }
  };

  const goToDictionary = () =>
    (navigation as any).navigate('Dictionary', { screen: 'BookList' });

  // League color
  const LEAGUE_COLORS: Record<string, string> = {
    BRONZE: '#cd7f32', SILVER: '#c0c0c0', GOLD: '#ffd700',
    PLATINUM: '#e5e4e2', DIAMOND: '#b9f2ff',
  };
  const leagueColor = LEAGUE_COLORS[profile?.league ?? 'BRONZE'];
  const LEAGUE_LABELS: Record<string, string> = {
    BRONZE: 'Bronza ligasi',
    SILVER: 'Kumush ligasi',
    GOLD: 'Oltin ligasi',
    PLATINUM: 'Platina ligasi',
    DIAMOND: 'Olmos ligasi',
  };
  const leagueLabel = LEAGUE_LABELS[profile?.league ?? 'BRONZE'] ?? 'Bronza ligasi';

  // ── ACTIVE DRAWER STATE ──────────────────────────────────────────
  const [activeDrawer, setActiveDrawer] = useState<'pomodoro' | 'alphabet' | 'kanji' | 'voice' | 'more' | 'sensei' | null>(null);

  // ── 1. POMODORO TIMER STATE ──────────────────────────────────────
  const [pomoState, setPomoState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pomoState === 'running') {
      timerRef.current = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            setPomoState('idle');
            if (timerRef.current) clearInterval(timerRef.current);
            Vibration.vibrate([0, 500, 200, 500]);
            alert("Pomodoro tugadi! 5 daqiqa dam oling. 🌟");
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pomoState]);

  const formatPomoTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── 2. JAPAN ALPHABET STATE ──────────────────────────────────────
  const [alphabetMode, setAlphabetMode] = useState<'hiragana' | 'katakana'>('hiragana');
  const playKanaSound = async (char: string) => {
    try {
      if (char) {
        await Speech.speak(char, { language: 'ja-JP', rate: 0.85 });
      }
    } catch (err) {
      console.warn("TTS speak failed", err);
    }
  };

  // ── 3. KANJI GUIDE STATE ─────────────────────────────────────────
  const [kanjiSearch, setKanjiSearch] = useState('');
  const [selectedKanji, setSelectedKanji] = useState<typeof KANJI_DATA[0] | null>(KANJI_DATA[0]);

  // ── 4. VOICE PRACTICE STATE ──────────────────────────────────────
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'done'>('idle');
  const [voiceBarHeights, setVoiceBarHeights] = useState([20, 20, 20, 20, 20]);
  
  useEffect(() => {
    let waveInterval: NodeJS.Timeout | null = null;
    if (voiceState === 'listening') {
      waveInterval = setInterval(() => {
        setVoiceBarHeights([
          Math.floor(Math.random() * 45) + 12,
          Math.floor(Math.random() * 45) + 12,
          Math.floor(Math.random() * 45) + 12,
          Math.floor(Math.random() * 45) + 12,
          Math.floor(Math.random() * 45) + 12,
        ]);
      }, 100);
    } else {
      setVoiceBarHeights([15, 15, 15, 15, 15]);
    }
    return () => {
      if (waveInterval) clearInterval(waveInterval);
    };
  }, [voiceState]);

  const startVoiceRecording = () => {
    setVoiceState('listening');
    // Simulate recording for 2.5 seconds
    setTimeout(() => {
      setVoiceState('processing');
      // Simulate API processing for 1.2 seconds
      setTimeout(() => {
        setVoiceState('done');
      }, 1200);
    }, 2500);
  };

  // ── 6. AI SENSEI CHAT STATE ──────────────────────────────────────
  interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'Konnichiwa! Men sizning yapon tili o‘qituvchingiz AI Senseiman. Bugun nimani o‘rganamiz? 🌸' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  const handleSendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsBotTyping(true);

    // AI logic response simulation
    setTimeout(() => {
      let botResponse = "Tushunarli! Keling, yapon tilida gaplashishni va so'zlarni yodlashni davom ettiramiz. Savollaringiz bo'lsa yozing. 💮";
      const normalized = text.toLowerCase();
      if (normalized.includes('salom') || normalized.includes('konnichiwa') || normalized.includes('hello')) {
        botResponse = "Konnichiwa! Yaponiyada salomlashish juda muhim. Kunduzi 'Konnichiwa', ertalab 'Ohayou gozaimasu', kechasi esa 'Konbanwa' deyiladi. Siz qaysi birini ko'p ishlatasiz? 😊";
      } else if (normalized.includes('tanishtir') || normalized.includes('ism') || normalized.includes('name')) {
        botResponse = "Hajimemashite! O'zini tanishtirishda 'Watashi wa [Ismingiz] desu. Yoroshiku onegaishimasu' (Tanishganimdan xursandman) iborasi ishlatiladi. Keling, sinab ko'ramiz! 🌸";
      } else if (normalized.includes('grammatika') || normalized.includes('qoida') || normalized.includes('grammar')) {
        botResponse = "JLPT N5 uchun eng muhim grammatikalardan biri: [Mavzu] + wa + [Tavsif] + desu. Masalan: 'Watashi wa nihongo no gakusei desu' (Men yapon tili talabasiman). Savollaringiz bormi? 📚";
      } else if (normalized.includes('savol') || normalized.includes('so\'ra') || normalized.includes('question')) {
        botResponse = "Yapon tilida savol berish juda oson! Gap oxiriga 'ka' (か) yuklamasini qo'shasiz. Masalan: 'Genki desu ka?' (Sog'ligingiz yaxshimi?). Siz ham sinab ko'ring! ❓";
      }

      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'bot', text: botResponse }]);
      setIsBotTyping(false);
    }, 1200);
  };

  // ── WORD OF THE DAY GESTURES & API ──────────────────────────────
  const [wordsList, setWordsList] = useState<WordOfDay[]>(DEFAULT_WORDS_OF_DAY);
  const [wordIndex, setWordIndex] = useState(0);
  const [loadingWords, setLoadingWords] = useState(false);
  const swipePan = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const [savingWordId, setSavingWordId] = useState<string | null>(null);

  const handleToggleSave = async (word: WordOfDay) => {
    if (!word?.id) {
      return;
    }
    if (savingWordId) return;
    setSavingWordId(word.id);
    try {
      const res = await toggleSaveWord(word.id);
      setWordsList(prev =>
        prev.map(w => (w.id === word.id ? { ...w, isSaved: res.saved } : w))
      );
    } catch (err) {
      console.log("Failed to toggle save word", err);
    } finally {
      setSavingWordId(null);
    }
  };

  // Load words from backend vocabulary
  useEffect(() => {
    const fetchWords = async () => {
      try {
        setLoadingWords(true);
        const res = await apiClient.get('/words', { params: { page: 1, limit: 30 } });
        if (res.data?.data?.length > 0) {
          const list = res.data.data.map((w: any) => ({
            id: w.id,
            kanji: w.japaneseWord,
            hiragana: w.hiragana,
            meaning: w.meaning,
            example: w.exampleSentence || 'No example sentence.',
            exampleTranslation: w.exampleTranslation || '',
            isSaved: !!w.isSaved,
          }));
          setWordsList(list);
        }
      } catch (err) {
        console.log("Failed to fetch words for SwipeCard", err);
      } finally {
        setLoadingWords(false);
      }
    };
    if (isAuthenticated) {
      fetchWords();
    }
  }, [isAuthenticated]);

  const currentWord = wordsList[wordIndex % wordsList.length];

  const swipeOut = (direction: 'left' | 'right') => {
    Animated.parallel([
      Animated.timing(swipePan.x, {
        toValue: direction === 'right' ? SCREEN_W * 1.4 : -SCREEN_W * 1.4,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setWordIndex((prev) => (prev + 1) % wordsList.length);
      
      // Move to bottom center hiddenly for rise-up zoom entrance
      swipePan.setValue({ x: 0, y: 35 });
      cardScale.setValue(0.92);
      
      Animated.parallel([
        Animated.spring(swipePan, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 110,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        swipePan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        const threshold = SCREEN_W * 0.35;
        if (gestureState.dx > threshold) {
          swipeOut('right');
        } else if (gestureState.dx < -threshold) {
          swipeOut('left');
        } else {
          Animated.spring(swipePan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const cardRotation = swipePan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const dragOpacity = swipePan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });

  const combinedOpacity = Animated.multiply(dragOpacity, cardOpacity);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient background orbs */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, left: -80,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(109,40,217,0.10)',
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', top: 200, right: -100,
        width: 250, height: 250, borderRadius: 125,
        backgroundColor: 'rgba(16,185,129,0.06)',
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110, // clear floating tab bar
          paddingHorizontal: 20,
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }, headerAnim]}>
          <View>
            <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500', marginBottom: 2 }}>
              こんにちは 👋
            </Text>
            <Text style={{ color: '#f9fafb', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
              {user?.username ?? 'Learner'}
            </Text>
            <View style={{ marginTop: 6 }}>
              <StreakFlame streak={streak} />
            </View>
          </View>

          {/* League badge + avatar */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(109,40,217,0.2)',
              borderWidth: 2, borderColor: '#7c3aed',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 22, color: '#f9fafb', fontWeight: '700' }}>
                {(user?.username?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={{
              backgroundColor: leagueColor + '22',
              borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
              borderWidth: 1, borderColor: leagueColor + '55',
            }}>
              <Text style={{ color: leagueColor, fontSize: 10, fontWeight: '700' }}>
                {leagueLabel}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Combined Streak & Daily Goal side-by-side ───────── */}
        <Animated.View style={[{ flexDirection: 'row', gap: 10, marginBottom: 20 }, statsAnim]}>
          {/* Left: Streak/Faollik Card */}
          <BlurView
            intensity={22}
            tint="dark"
            style={{
              flex: 0.38,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <LinearGradient
              colors={['rgba(18,18,42,0.9)', 'rgba(10,10,26,0.95)']}
              style={{ paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', height: 110 }}
            >
              <View
                style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: '#f59e0b22',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 6,
                  shadowColor: '#f59e0b',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6, shadowRadius: 10, elevation: 4,
                }}
              >
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  <Ionicons name="flame" size={20} color="#f59e0b" />
                </Animated.View>
              </View>
              <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '700', letterSpacing: -0.5 }}>
                {streak}
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                Faollik
              </Text>
            </LinearGradient>
          </BlurView>

          {/* Right: Daily Goal Card with Progress Bar */}
          <BlurView
            intensity={22}
            tint="dark"
            style={{
              flex: 0.62,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(109,40,217,0.2)',
            }}
          >
            <LinearGradient
              colors={['rgba(18,18,42,0.9)', 'rgba(10,10,26,0.95)']}
              style={{ padding: 16, justifyContent: 'center', height: 110 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14 }}>Kunlik maqsad</Text>
                <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 12 }}>
                  {Math.min((profile?.dailyTestCount ?? 0) + (profile?.dailyMatchCount ?? 0) + (profile?.dailyWriteCount ?? 0), 5)}/5
                </Text>
              </View>
              
              {/* Progress track */}
              <View style={{ height: 8, backgroundColor: '#1f2937', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <LinearGradient
                  colors={['#7c3aed', '#10b981']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${Math.min(((profile?.dailyTestCount ?? 0) + (profile?.dailyMatchCount ?? 0) + (profile?.dailyWriteCount ?? 0)) / 5 * 100, 100)}%`,
                  }}
                />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#4b5563', fontSize: 10, fontWeight: '500' }}>
                  Muntazamlik ravonlikka olib keladi!
                </Text>
                <Ionicons name="sparkles" size={10} color="#10b981" />
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>

        {/* ── 1. TOOLS DOCK (Curved Glass Container) ───────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: 8 }}>
          <Ionicons name="construct-outline" size={14} color="#9ca3af" />
          <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Yordamchi Asboblar (Tools Dock)
          </Text>
        </View>

        <BlurView
          intensity={22}
          tint="dark"
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: 24,
          }}
        >
          <LinearGradient
            colors={['rgba(16,16,36,0.95)', 'rgba(8,8,20,0.98)']}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            {/* Pomodoro */}
            <TouchableOpacity onPress={() => { /* TODO: Navigate to Pomodoro screen */ }} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' }}>
                <Ionicons name="timer-outline" size={20} color="#ef4444" />
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 6, fontWeight: '600' }}>Pomo</Text>
            </TouchableOpacity>

            {/* Alphabet */}
            <TouchableOpacity onPress={() => setActiveDrawer('alphabet')} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' }}>
                <Ionicons name="language-outline" size={20} color="#10b981" />
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 6, fontWeight: '600' }}>Alifbo</Text>
            </TouchableOpacity>

            {/* Kanji */}
            <TouchableOpacity onPress={() => { /* TODO: Navigate to Kanji screen */ }} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' }}>
                <Ionicons name="book-outline" size={20} color="#f59e0b" />
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 6, fontWeight: '600' }}>Kanji</Text>
            </TouchableOpacity>

            {/* Voice */}
            <TouchableOpacity onPress={() => { /* TODO: Navigate to Voice screen */ }} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)' }}>
                <Ionicons name="mic-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 6, fontWeight: '600' }}>Ovoz</Text>
            </TouchableOpacity>

            {/* More */}
            <TouchableOpacity onPress={() => { /* TODO: Navigate to More tools screen */ }} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)' }}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#c084fc" />
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 10, marginTop: 6, fontWeight: '600' }}>Ko'proq</Text>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>

        {/* ── 2. LAUNCHPAD ROW (3 Large Buttons) ───────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Ionicons name="flash-outline" size={14} color="#9ca3af" />
          <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Tezkor Amaliyot (Launchpad)
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {/* AI Sensei Button */}
          <TouchableOpacity 
            onPress={() => setActiveDrawer('sensei')}
            activeOpacity={0.82}
            style={{ flex: 1 }}
          >
            <BlurView intensity={18} tint="dark" style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
              <LinearGradient colors={['rgba(109,40,217,0.22)', 'rgba(8,8,20,0.98)']} style={{ padding: 16, height: 115, justifyContent: 'space-between' }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(109,40,217,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#a78bfa" />
                </View>
                <View>
                  <Text style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '700' }}>AI Sensei</Text>
                  <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>AI Chat bot</Text>
                </View>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          {/* Revision (SRS) Button */}
          <TouchableOpacity 
            onPress={() => goToQuiz({ mode: 'TEST', dueOnly: true })}
            activeOpacity={0.82}
            style={{ flex: 1 }}
          >
            <BlurView intensity={18} tint="dark" style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: srsCount > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.07)' }}>
              <LinearGradient colors={srsCount > 0 ? ['rgba(16,185,129,0.18)', 'rgba(8,8,20,0.98)'] : ['rgba(31,41,55,0.2)', 'rgba(8,8,20,0.98)']} style={{ padding: 16, height: 115, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: srsCount > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(75,85,99,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="sync" size={20} color={srsCount > 0 ? '#34d399' : '#9ca3af'} />
                  </View>
                  {srsCount > 0 && (
                    <View style={{ backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{srsCount}</Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '700' }}>Takrorlash</Text>
                  <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{srsCount > 0 ? `${srsCount} ta so'z bor` : "Bajarildi"}</Text>
                </View>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          {/* Dictionary Button */}
          <TouchableOpacity 
            onPress={goToDictionary}
            activeOpacity={0.82}
            style={{ flex: 1 }}
          >
            <BlurView intensity={18} tint="dark" style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
              <LinearGradient colors={['rgba(59,130,246,0.15)', 'rgba(8,8,20,0.98)']} style={{ padding: 16, height: 115, justifyContent: 'space-between' }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="book" size={20} color="#60a5fa" />
                </View>
                <View>
                  <Text style={{ color: '#f3f4f6', fontSize: 14, fontWeight: '700' }}>Lug'at</Text>
                  <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Kitoblar</Text>
                </View>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* ── 3. WORD OF THE DAY (Interactive Swipe Card) ──────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Ionicons name="swap-horizontal-outline" size={14} color="#9ca3af" />
          <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Kun so'zi (Swipe Card)
          </Text>
        </View>

        {loadingWords ? (
          <View style={{ height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f29', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : currentWord ? (
          <View style={{ marginBottom: 10 }}>
            <Animated.View
              {...panResponder.panHandlers}
              style={{
                transform: [
                  { translateX: swipePan.x },
                  { translateY: swipePan.y },
                  { rotate: cardRotation },
                  { scale: cardScale }
                ],
                opacity: combinedOpacity,
              }}
            >
              <BlurView
                intensity={25}
                tint="dark"
                style={{
                  borderRadius: 24,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(124,58,237,0.3)',
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <LinearGradient
                  colors={['rgba(30,27,75,0.95)', 'rgba(10,10,26,0.98)']}
                  style={{ padding: 22, height: 190, justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Bugungi yangi so'z</Text>
                      <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 4, letterSpacing: 1 }}>{currentWord.kanji}</Text>
                      <Text style={{ color: '#a78bfa', fontSize: 15, fontWeight: '600', marginTop: 2 }}>{currentWord.hiragana}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={async () => {
                        Vibration.vibrate(50);
                        await Speech.speak(currentWord.kanji, { language: 'ja-JP' });
                      }}
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' }}
                    >
                      <Ionicons name="volume-high" size={20} color="#c084fc" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#f3f4f6', fontSize: 16, fontWeight: '700' }}>{currentWord.meaning}</Text>
                      <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, fontStyle: 'italic', lineHeight: 18 }} numberOfLines={2}>
                        {currentWord.example} {currentWord.exampleTranslation ? `— ${currentWord.exampleTranslation}` : ''}
                      </Text>
                    </View>
                    {currentWord.id && (
                      <TouchableOpacity
                        onPress={() => handleToggleSave(currentWord)}
                        disabled={savingWordId === currentWord.id}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: currentWord.isSaved ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.06)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: currentWord.isSaved ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {savingWordId === currentWord.id ? (
                          <ActivityIndicator size="small" color={currentWord.isSaved ? '#f59e0b' : '#c084fc'} />
                        ) : (
                          <Ionicons
                            name={currentWord.isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color={currentWord.isSaved ? '#f59e0b' : '#c084fc'}
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>
            <Text style={{ color: '#4b5563', fontSize: 10, textAlign: 'center', marginTop: 8 }}>
              Kartani yangilash uchun chapga yoki o'ngga suring
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── 2. ALPHABET AUDIO CHART DRAWER ──────────────────────────────── */}
      <BottomDrawer visible={activeDrawer === 'alphabet'} onClose={() => setActiveDrawer(null)} title="Yapon alifbosi ovozli jadvali" height="85%">
        {/* Toggle Mode */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setAlphabetMode('hiragana')}
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: alphabetMode === 'hiragana' ? '#10b981' : 'transparent' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Hiragana</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAlphabetMode('katakana')}
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: alphabetMode === 'katakana' ? '#10b981' : 'transparent' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Katakana</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
          <Text style={{ color: '#4b5563', fontSize: 11, textAlign: 'center' }}>
            Harfni bosib talaffuzini eshiting
          </Text>
          <Ionicons name="volume-high-outline" size={12} color="#4b5563" />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {(alphabetMode === 'hiragana' ? HIRAGANA_DATA : KATAKANA_DATA).map((item, index) => {
              if (!item.char) {
                return <View key={`empty-${index}`} style={{ width: '18%', marginVertical: 4, height: 50 }} />;
              }
              return (
                <TouchableOpacity
                  key={`kana-${index}`}
                  onPress={() => playKanaSound(item.char)}
                  activeOpacity={0.7}
                  style={{
                    width: '18%', marginVertical: 4, height: 50,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{item.char}</Text>
                  <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{item.romaji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </BottomDrawer>



      {/* ── 6. AI SENSEI CHAT SIMULATOR DRAWER ───────────────────────────── */}
      <BottomDrawer visible={activeDrawer === 'sensei'} onClose={() => setActiveDrawer(null)} title="💬 AI Sensei chat mashg'uloti" height="85%">
        {/* Messages List */}
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {chatMessages.map((msg) => (
            <View
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'user' ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 16,
                marginVertical: 4,
                maxWidth: '80%',
                borderWidth: msg.sender === 'bot' ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{msg.text}</Text>
            </View>
          ))}
          {isBotTyping && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ color: '#6b7280', fontStyle: 'italic', fontSize: 12 }}>AI Sensei yozmoqda...</Text>
            </View>
          )}
        </ScrollView>

        {/* Prompt Chips */}
        <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 6 }}>
            <TouchableOpacity onPress={() => handleSendChatMessage("Salomlashish qoidalarini bilmoqchiman")} style={{ backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="hand-left-outline" size={12} color="#a78bfa" />
              <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '600' }}>Salomlashish</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSendChatMessage("Yapon tilida o'zimni qanday tanishtiraman?")} style={{ backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="person-outline" size={12} color="#a78bfa" />
              <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '600' }}>O'zini tanishtirish</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSendChatMessage("N5 grammatikasidan misol ko'rsating")} style={{ backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="book-outline" size={12} color="#a78bfa" />
              <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '600' }}>Grammatika</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSendChatMessage("Qanday qilib yaponcha savol bersam bo'ladi?")} style={{ backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="help-circle-outline" size={12} color="#a78bfa" />
              <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: '600' }}>Savol berish</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Chat Input */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#0a0a1a' }}>
          <TextInput
            placeholder="Xabar yozing..."
            placeholderTextColor="#4b5563"
            value={chatInput}
            onChangeText={setChatInput}
            style={{ flex: 1, color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, fontSize: 14 }}
          />
          <TouchableOpacity
            onPress={() => handleSendChatMessage(chatInput)}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </BottomDrawer>
    </View>
  );
}
