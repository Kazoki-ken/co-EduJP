import React from 'react';
import { View, Platform, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// ── Custom glass tab bar ──────────────────────────────────────────
function GlassTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Blur backdrop */}
      <BlurView
        intensity={60}
        tint="dark"
        style={{
          borderTopWidth: 1,
          borderTopColor: 'rgba(109,40,217,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gradient line at top */}
        <View
          style={{
            height: 1,
            backgroundColor: 'rgba(124,58,237,0.4)',
            marginHorizontal: 0,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(8,8,20,0.75)',
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 4 : 12,
          }}
        >
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const icon = ICONS[route.name as keyof AppTabsParamList];

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
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.75}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                }}
              >
                {/* Active indicator pill */}
                {isFocused && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      width: 48,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: '#7c3aed',
                      shadowColor: '#7c3aed',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  />
                )}

                <Ionicons
                  name={isFocused ? icon.active : icon.inactive}
                  size={24}
                  color={isFocused ? '#7c3aed' : '#4b5563'}
                />

                {/* Tab label */}
                <Text style={{
                  color: isFocused ? '#7c3aed' : '#4b5563',
                  fontSize: 10,
                  fontWeight: isFocused ? '600' : '400',
                  marginTop: 3,
                }}>
                  {route.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// ── Tab Navigator ─────────────────────────────────────────────────
export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"       component={HomeScreen} />
      <Tab.Screen name="Dictionary" component={DictionaryStack} />
      <Tab.Screen name="Games"      component={GamesStack} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}
