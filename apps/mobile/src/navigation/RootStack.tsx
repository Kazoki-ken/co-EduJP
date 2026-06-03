import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Navigators
import AppTabs from './AppTabs';

// Auth Screens
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import UsernameSetupScreen from '../screens/UsernameSetupScreen';
import PasswordSetupScreen from '../screens/PasswordSetupScreen';

// ── Route param types ─────────────────────────────────────────────
export type RootStackParamList = {
  Login:         undefined;
  Register:      undefined;
  UsernameSetup: undefined;
  PasswordSetup: undefined;
  AppTabs:       undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const { isAuthenticated, isLoading, needsUsername } = useAuth();

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
        <>
          {needsUsername ? (
            // Google login — birinchi marta kirgan, username kerak
            <Stack.Screen
              name="UsernameSetup"
              component={UsernameSetupScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          ) : (
            <Stack.Screen name="AppTabs" component={AppTabs} />
          )}
          {/* PasswordSetup is always available for authenticated users (after UsernameSetup) */}
          <Stack.Screen
            name="PasswordSetup"
            options={{ animation: 'slide_from_right' }}
          >
            {(props) => (
              <PasswordSetupScreen
                onDone={() => props.navigation.replace('AppTabs')}
              />
            )}
          </Stack.Screen>
        </>
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
