// Must be the first import — loads the NativeWind CSS engine
import './global.css';

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider } from './src/context/AuthContext';
import RootStack from './src/navigation/RootStack';

export default function App() {
  // ── Android: make system nav bar transparent & immersive ──────
  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        try {
          await NavigationBar.setBackgroundColorAsync('#0a0a1a');
          await NavigationBar.setButtonStyleAsync('light');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setVisibilityAsync('hidden');
        } catch (e) {
          console.warn('System navigation bar customization failed:', e);
        }
      })();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <RootStack />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
