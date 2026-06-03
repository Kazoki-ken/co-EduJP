import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GamesStackParamList } from '../navigation/GamesStack';
import type { SrsUpdate, EarnedBadge } from '@vocabjp/shared';

type Props = NativeStackScreenProps<GamesStackParamList, 'Result'>;

// ── Animated counter ──────────────────────────────────────────────
function AnimatedCounter({ target, color }: { target: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [val, setVal] = React.useState(0);
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 1200, useNativeDriver: false }).start();
    anim.addListener(({ value }) => setVal(Math.round(value)));
    return () => anim.removeAllListeners();
  }, [target]);
  return <Text style={{ color, fontSize: 42, fontWeight: '800', letterSpacing: -1 }}>{val}</Text>;
}

// ── Accuracy ring ─────────────────────────────────────────────────
// FIX 1: backend sends accuracy as 0-100 integer. Normalise so both
// fraction (0-1) and integer (0-100) inputs render the right percentage.
function AccuracyRing({ accuracy }: { accuracy: number }) {
  const pct   = Math.min(100, Math.max(0,
    accuracy > 1 ? Math.round(accuracy) : Math.round(accuracy * 100),
  ));
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const label = pct >= 80 ? 'Ajoyib!' : pct >= 50 ? 'Yaxshi ish!' : 'Davom eting!';
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪';
  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <View style={{
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 5, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: color + '15',
        shadowColor: color, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 18, elevation: 10, marginBottom: 10,
      }}>
        <Text style={{ fontSize: 28, marginBottom: 2 }}>{emoji}</Text>
        <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{pct}%</Text>
      </View>
      <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────
function StatTile({ emoji, label, value, color }: {
  emoji: string; label: string; value: number; color: string;
}) {
  return (
    <BlurView intensity={18} tint="dark" style={{
      flex: 1, borderRadius: 18, overflow: 'hidden',
      borderWidth: 1, borderColor: color + '30',
    }}>
      <View style={{ backgroundColor: color + '10', padding: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</Text>
        <AnimatedCounter target={value} color={color} />
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{label}</Text>
      </View>
    </BlurView>
  );
}

// ── SRS update row ────────────────────────────────────────────────
// FIX 4: show japaneseWord if available; raw ID only as absolute fallback.
function SrsRow({ update }: { update: SrsUpdate & { japaneseWord?: string } }) {
  const wentUp   = update.newLevel > update.oldLevel;
  const wentDown = update.newLevel < update.oldLevel;
  const color    = update.correct ? '#10b981' : '#ef4444';
  const display  = (update.japaneseWord ?? '').trim()
    ? update.japaneseWord!
    : `${update.wordId.slice(0, 8)}…`;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    }}>
      <Ionicons
        name={update.correct ? 'checkmark-circle' : 'close-circle'}
        size={18} color={color} style={{ marginRight: 10 }}
      />
      <Text style={{ color: '#f3f4f6', fontSize: 15, flex: 1, letterSpacing: 1 }}>
        {display}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: '#6b7280', fontSize: 12 }}>Lv {update.oldLevel}</Text>
        <Ionicons
          name={wentUp ? 'arrow-up' : wentDown ? 'arrow-down' : 'remove'}
          size={12}
          color={wentUp ? '#10b981' : wentDown ? '#ef4444' : '#4b5563'}
        />
        <Text style={{ color: wentUp ? '#10b981' : wentDown ? '#ef4444' : '#6b7280',
          fontSize: 12, fontWeight: '600' }}>
          Lv {update.newLevel}
        </Text>
      </View>
    </View>
  );
}

// ── Badge card ────────────────────────────────────────────────────
function BadgeCard({ badge }: { badge: EarnedBadge }) {
  return (
    <BlurView intensity={18} tint="dark" style={{
      borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', marginBottom: 8,
    }}>
      <LinearGradient
        colors={['rgba(245,158,11,0.12)', 'rgba(10,10,26,0.96)']}
        style={{ flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14 }}
      >
        <Text style={{ fontSize: 28, marginRight: 14 }}>{badge.icon ?? '🏅'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '700' }}>{badge.name}</Text>
          <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{badge.description}</Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 8,
          paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700' }}>NEW</Text>
        </View>
      </LinearGradient>
    </BlurView>
  );
}

// ── Play Again router ─────────────────────────────────────────────
// FIX 2: navigate back to the exact screen the user came from.
type SourceScreen = GamesStackParamList['Result']['sourceScreen'];
function goPlayAgain(
  nav: Props['navigation'],
  sourceScreen: SourceScreen,
  mode: string,
) {
  switch (sourceScreen) {
    case 'Mixed':   nav.replace('Mixed',   {}); break;
    case 'Match':   nav.replace('Match',   {}); break;
    case 'Write':   nav.replace('Write',   {}); break;
    case 'Shooter': nav.replace('Shooter', {}); break;
    default:        nav.replace('Quiz', { mode: mode as any }); break;
  }
}

const MODE_LABELS: Record<string, string> = {
  TEST:    'Variantli test',
  MATCH:   'Mos juftliklar',
  WRITE:   'Yozish amaliyoti',
  Mixed:   'Aralash sinov',
  Shooter: 'Kosmik otishma',
};

// ── Result Screen ─────────────────────────────────────────────────
export default function ResultScreen({ route, navigation }: Props) {
  const { result, mode, sourceScreen } = route.params;
  const insets    = useSafeAreaInsets();
  const entranceY = useRef(new Animated.Value(40)).current;
  const entranceO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceY, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(entranceO, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const displayLabel = MODE_LABELS[sourceScreen ?? ''] ?? MODE_LABELS[mode] ?? mode;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orb */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, right: -60,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(16,185,129,0.08)',
      }} />

      {/* FIX 3: paddingBottom 120 ensures buttons clear the tab bar */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 120,
          paddingHorizontal: 20,
        }}
      >
        <Animated.View style={{ opacity: entranceO, transform: [{ translateY: entranceY }] }}>

          {/* Header */}
          <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
            {displayLabel}
          </Text>
          <Text style={{ color: '#f9fafb', fontSize: 26, fontWeight: '800',
            textAlign: 'center', letterSpacing: -0.5, marginBottom: 24 }}>
            Mashg'ulot yakunlandi! 🎉
          </Text>

          {/* Accuracy ring */}
          <AccuracyRing accuracy={result.accuracy} />

          {/* Stat tiles */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 20 }}>
            <StatTile emoji="✅" label="To'g'ri"   value={result.totalCorrect} color="#10b981" />
            <StatTile emoji="⚡" label="To'plangan XP" value={result.xpEarned}     color="#7c3aed" />
            <StatTile emoji="🪙" label="Tangalar"     value={result.coinsEarned}  color="#f59e0b" />
          </View>

          {/* New badges */}
          {result.badgesEarned.length > 0 && (
            <>
              <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
                🏅 Yangi qo'lga kiritilgan nishonlar
              </Text>
              {result.badgesEarned.map(b => <BadgeCard key={b.id} badge={b} />)}
            </>
          )}

          {/* SRS breakdown */}
          {result.srsUpdates.length > 0 && (
            <>
              <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700',
                letterSpacing: 1.5, textTransform: 'uppercase',
                marginTop: 20, marginBottom: 8 }}>
                SRS taraqqiyoti
              </Text>
              <BlurView intensity={18} tint="dark" style={{
                borderRadius: 18, overflow: 'hidden',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 20,
              }}>
                <View style={{ backgroundColor: 'rgba(10,10,26,0.85)', padding: 16 }}>
                  {result.srsUpdates.map(u => <SrsRow key={u.wordId} update={u} />)}
                </View>
              </BlurView>
            </>
          )}

          {/* Play Again */}
          <TouchableOpacity
            onPress={() => goPlayAgain(navigation, sourceScreen, mode)}
            activeOpacity={0.85}
            style={{ marginBottom: 12 }}
          >
            <LinearGradient
              colors={['#7c3aed', '#4c1d95']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 16, borderRadius: 18, alignItems: 'center',
                shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Yana o'ynash</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to Games */}
          <TouchableOpacity onPress={() => navigation.navigate('GameHub')} activeOpacity={0.85}>
            <BlurView intensity={18} tint="dark" style={{
              borderRadius: 18, overflow: 'hidden',
              borderWidth: 1, borderColor: 'rgba(109,40,217,0.3)',
            }}>
              <View style={{ paddingVertical: 15, alignItems: 'center',
                backgroundColor: 'rgba(10,10,26,0.8)' }}>
                <Text style={{ color: '#7c3aed', fontSize: 16, fontWeight: '600' }}>
                  O'yinlarga qaytish
                </Text>
              </View>
            </BlurView>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
}
