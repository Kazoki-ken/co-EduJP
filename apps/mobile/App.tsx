// Must be the first import — loads the NativeWind CSS engine
import './global.css';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import RootStack from './src/navigation/RootStack';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0a0a1a" />
          <RootStack />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
