import React, { useRef, useEffect } from 'react';
import { View, Platform, TouchableOpacity, Text, Animated, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen       from '../screens/HomeScreen';
import DictionaryStack  from './DictionaryStack';
import GamesStack       from './GamesStack';
import ProfileScreen    from '../screens/ProfileScreen';

// ── Route param types ─────────────────────────────────────────────
export type AppTabsParamList = {
  Home:       undefined;
  Dictionary: undefined;
  Games:      undefined;
  Profile:    undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

// ── Icon map ──────────────────────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<keyof AppTabsParamList, { active: IconName; inactive: IconName }> = {
  Home:       { active: 'grid',             inactive: 'grid-outline' },
  Dictionary: { active: 'book',             inactive: 'book-outline' },
  Games:      { active: 'game-controller',  inactive: 'game-controller-outline' },
  Profile:    { active: 'person-circle',    inactive: 'person-circle-outline' },
};

// ── Animated tab item ─────────────────────────────────────────────
function TabItem({
  route,
  isFocused,
  onPress,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
}) {
  const icon = ICONS[route.name as keyof AppTabsParamList];
  const scale = useRef(new Animated.Value(isFocused ? 1 : 0.9)).current;
  const dotOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.08 : 0.92,
        friction: 6,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.timing(dotOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItem}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {/* Glow behind active icon */}
        {isFocused && (
          <View style={styles.activeGlow} />
        )}
        <Ionicons
          name={isFocused ? icon.active : icon.inactive}
          size={22}
          color={isFocused ? '#a78bfa' : '#4b5563'}
        />
        <Text style={[
          styles.tabLabel,
          { color: isFocused ? '#c4b5fd' : '#4b5563', fontWeight: isFocused ? '600' : '400' },
        ]}>
          {route.name}
        </Text>
      </Animated.View>

      {/* Active dot indicator */}
      <Animated.View style={[styles.activeDot, { opacity: dotOpacity }]} />
    </TouchableOpacity>
  );
}

// ── Floating glass tab bar ────────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.floatingContainer, { bottom: bottomOffset }]}>
      {/* Outer shadow wrapper */}
      <View style={styles.shadowWrapper}>
        <BlurView
          intensity={70}
          tint="dark"
          style={styles.blurWrapper}
        >
          {/* Inner dark overlay for contrast */}
          <LinearGradient
            colors={['rgba(14,14,35,0.85)', 'rgba(8,8,24,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.innerGradient}
          >
            {/* Top accent line */}
            <LinearGradient
              colors={['transparent', 'rgba(124,58,237,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />

            {/* Tab items */}
            <View style={styles.tabRow}>
              {state.routes.map((route: any, index: number) => {
                const isFocused = state.index === index;

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                return (
                  <TabItem
                    key={route.key}
                    route={route}
                    isFocused={isFocused}
                    onPress={onPress}
                  />
                );
              })}
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  shadowWrapper: {
    marginHorizontal: 20,
    borderRadius: 28,
    // iOS shadow
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    // Android shadow
    elevation: 20,
    // Outer glow ring
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  blurWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  innerGradient: {
    paddingTop: 2,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
  },
  accentLine: {
    height: 1,
    marginBottom: 2,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  activeGlow: {
    position: 'absolute',
    top: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7c3aed',
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
});

// ── Tab Navigator ─────────────────────────────────────────────────
export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"       component={HomeScreen} />
      <Tab.Screen name="Dictionary" component={DictionaryStack} />
      <Tab.Screen name="Games"      component={GamesStack} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}
