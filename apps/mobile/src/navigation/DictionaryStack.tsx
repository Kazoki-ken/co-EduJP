import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Book, Topic } from '@vocabjp/shared';

import DictionaryScreen  from '../screens/DictionaryScreen';
import TopicListScreen   from '../screens/TopicListScreen';
import TopicWordsScreen  from '../screens/TopicWordsScreen';

// ── Route param types ─────────────────────────────────────────────
export type DictionaryStackParamList = {
  BookList:   undefined;
  TopicList:  { book: Book };
  TopicWords: { topic: Topic; book: Book };
};

const Stack = createNativeStackNavigator<DictionaryStackParamList>();

export default function DictionaryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle:  { backgroundColor: '#0a0a1a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="BookList"   component={DictionaryScreen}  />
      <Stack.Screen name="TopicList"  component={TopicListScreen}   />
      <Stack.Screen name="TopicWords" component={TopicWordsScreen}  />
    </Stack.Navigator>
  );
}
