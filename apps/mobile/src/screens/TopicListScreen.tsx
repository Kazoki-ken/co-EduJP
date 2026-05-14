import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DictionaryStackParamList } from '../navigation/DictionaryStack';
import { useBookTopics } from '../hooks/useVocabulary';
import { TopicRowSkeleton } from '../components/Skeletons';
import type { Topic } from '@vocabjp/shared';

type Props = NativeStackScreenProps<DictionaryStackParamList, 'TopicList'>;

// ─── Topic palette ────────────────────────────────────────────────
const TOPIC_COLORS = [
  '#7c3aed', '#ec4899', '#10b981', '#3b82f6',
  '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6',
];

// ─── Topic row card ───────────────────────────────────────────────
function TopicRow({
  topic, index, onPress,
}: {
  topic: Topic; index: number; onPress: () => void;
}) {
  const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
  const wordCount = topic._count.wordTopics;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ marginBottom: 10 }}>
      <BlurView intensity={18} tint="dark" style={{
        borderRadius: 18, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
      }}>
        <LinearGradient
          colors={['rgba(14,14,32,0.96)', 'rgba(8,8,20,0.99)']}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
        >
          {/* Icon */}
          <View style={{
            width: 46, height: 46, borderRadius: 14,
            backgroundColor: color + '22',
            borderWidth: 1, borderColor: color + '44',
            alignItems: 'center', justifyContent: 'center',
            marginRight: 14,
          }}>
            <Ionicons name="bookmark" size={20} color={color} />
          </View>

          {/* Text */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#f3f4f6', fontSize: 15, fontWeight: '600' }}>
              {topic.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Ionicons name="text-outline" size={12} color="#4b5563" />
              <Text style={{ color: '#6b7280', fontSize: 12 }}>
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#374151" />
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

// ─── Topic List Screen ────────────────────────────────────────────
export default function TopicListScreen({ route, navigation }: Props) {
  const { book } = route.params;
  const insets = useSafeAreaInsets();
  const { data: topics, loading, error, refetch } = useBookTopics(book.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, left: -80,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(109,40,217,0.08)',
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch}
            tintColor="#7c3aed" colors={['#7c3aed']} />
        }
      >
        {/* ── Back + Header ───────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start' }}
        >
          <Ionicons name="arrow-back" size={20} color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginLeft: 6, fontSize: 14, fontWeight: '500' }}>Books</Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500' }}>Topics in</Text>
          <Text style={{ color: '#f9fafb', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }} numberOfLines={2}>
            {book.title}
          </Text>
          {topics && (
            <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>
              {topics.length} topic{topics.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <View style={{
            padding: 16, borderRadius: 16,
            backgroundColor: 'rgba(239,68,68,0.1)',
            borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
            marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
            <TouchableOpacity onPress={refetch}>
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Skeletons ──────────────────────────────────────── */}
        {loading && !topics && (
          [0,1,2,3,4,5].map(i => <TopicRowSkeleton key={i} />)
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!loading && !error && topics?.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>🗂️</Text>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>No topics in this book yet</Text>
          </View>
        )}

        {/* ── Topic rows ──────────────────────────────────────── */}
        {topics?.map((topic, i) => (
          <TopicRow
            key={topic.id}
            topic={topic}
            index={i}
            onPress={() => navigation.navigate('TopicWords', { topic, book })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
