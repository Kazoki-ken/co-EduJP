import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GameType, GameResult } from '@vocabjp/shared';

import GamesScreen        from '../screens/GamesScreen';
import QuizScreen         from '../screens/QuizScreen';
import MixedScreen        from '../screens/MixedScreen';
import MatchScreen        from '../screens/MatchScreen';
import WriteScreen        from '../screens/WriteScreen';
import SpaceShooterScreen from '../screens/SpaceShooterScreen';
import ResultScreen       from '../screens/ResultScreen';

export type GamesStackParamList = {
  GameHub:  undefined;
  Quiz:     { mode: GameType; topicId?: string; bookId?: string; dueOnly?: boolean };
  Mixed:    { topicId?: string; bookId?: string };
  Match:    { topicId?: string; bookId?: string; dueOnly?: boolean };
  Write:    { topicId?: string; bookId?: string; dueOnly?: boolean };
  Shooter:  { topicId?: string; bookId?: string };
  Result:   { result: GameResult; mode: GameType; sourceScreen?: 'Quiz' | 'Mixed' | 'Match' | 'Write' | 'Shooter' };
};

const Stack = createNativeStackNavigator<GamesStackParamList>();

export default function GamesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: '#0a0a1a' },
        animation:    'slide_from_right',
      }}
    >
      <Stack.Screen name="GameHub"  component={GamesScreen}  />
      <Stack.Screen name="Quiz"     component={QuizScreen}
        options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Mixed"    component={MixedScreen}
        options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Match"    component={MatchScreen}
        options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Write"    component={WriteScreen}
        options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Shooter"  component={SpaceShooterScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="Result"   component={ResultScreen} />
    </Stack.Navigator>
  );
}
