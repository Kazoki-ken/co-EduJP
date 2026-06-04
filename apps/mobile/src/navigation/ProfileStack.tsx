import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import SavedItemsScreen from '../screens/SavedItemsScreen';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  SavedItems: { type: 'words' | 'books' };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a1a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="SavedItems" component={SavedItemsScreen} />
    </Stack.Navigator>
  );
}
