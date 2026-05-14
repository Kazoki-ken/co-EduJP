import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';

// ─── Single shimmer bar ───────────────────────────────────────────
interface ShimmerBarProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function ShimmerBar({ width = '100%', height = 14, borderRadius = 8, style }: ShimmerBarProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#374151', opacity },
        style,
      ]}
    />
  );
}

// ─── Book card skeleton ───────────────────────────────────────────
export function BookCardSkeleton() {
  return (
    <View style={{
      flex: 1, margin: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(18,18,42,0.8)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      padding: 16, minHeight: 140,
    }}>
      <ShimmerBar width={48} height={48} borderRadius={14} style={{ marginBottom: 14 }} />
      <ShimmerBar width="75%" height={15} style={{ marginBottom: 8 }} />
      <ShimmerBar width="55%" height={11} style={{ marginBottom: 12 }} />
      <ShimmerBar width={60}  height={22} borderRadius={11} />
    </View>
  );
}

// ─── Topic row skeleton ───────────────────────────────────────────
export function TopicRowSkeleton() {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 18,
      backgroundColor: 'rgba(18,18,42,0.8)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      padding: 16, marginBottom: 10,
    }}>
      <ShimmerBar width={46} height={46} borderRadius={14} style={{ marginRight: 14 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <ShimmerBar width="60%" height={14} />
        <ShimmerBar width="40%" height={11} />
      </View>
      <ShimmerBar width={18} height={18} borderRadius={9} />
    </View>
  );
}

// ─── Word row skeleton ────────────────────────────────────────────
export function WordRowSkeleton() {
  return (
    <View style={{
      borderRadius: 18,
      backgroundColor: 'rgba(18,18,42,0.8)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      padding: 16, marginBottom: 10,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <ShimmerBar width="40%" height={20} />
        <ShimmerBar width={56} height={22} borderRadius={11} />
      </View>
      <ShimmerBar width="55%" height={13} style={{ marginBottom: 8 }} />
      <ShimmerBar width="70%" height={12} />
    </View>
  );
}
