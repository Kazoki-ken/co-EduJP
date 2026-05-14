import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Navigators
import AppTabs from './AppTabs';

// Auth Screens
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ── Route param types ─────────────────────────────────────────────
export type RootStackParamList = {
  Login:    undefined;
  Register: undefined;
  AppTabs:  undefined;   // replaces the old 'Home' screen
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        <Stack.Screen name="AppTabs" component={AppTabs} />
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
