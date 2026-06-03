import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { GlowInput } from './LoginScreen';
import { RootStackParamList } from '../navigation/RootStack';

// ─── UsernameSetupScreen ──────────────────────────────────────────
// Google orqali birinchi marta kirgan foydalanuvchi
// bu ekranda o'z username ini tanlaydi.

type NavProp = NativeStackNavigationProp<RootStackParamList, 'UsernameSetup'>;

export default function UsernameSetupScreen({ navigation }: { navigation: NavProp }) {
  const { setUsername, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = /^[a-zA-Z0-9_]{3,30}$/.test(username.trim());

  const handleSubmit = async () => {
    if (!isValid) {
      setError("Username 3-30 ta harf, raqam yoki _ dan iborat bo'lishi kerak.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await setUsername(username.trim());
      // Navigate to password setup (user can skip if they want)
      navigation.replace('PasswordSetup');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orbs */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -80, left: -60,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(109,40,217,0.15)',
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 60, right: -80,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(16,185,129,0.08)',
      }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1, justifyContent: 'center',
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <LinearGradient
              colors={['#7c3aed', '#4c1d95']}
              style={{
                width: 80, height: 80, borderRadius: 24,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                shadowColor: '#6d28d9',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.6, shadowRadius: 20, elevation: 14,
              }}
            >
              <Text style={{ fontSize: 38 }}>👤</Text>
            </LinearGradient>

            <Text style={{ fontSize: 26, fontWeight: '700', color: '#f9fafb', letterSpacing: -0.5, textAlign: 'center' }}>
              Username tanlang
            </Text>
            <Text style={{ color: '#6b7280', marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {user?.email ? `${user.email} uchun` : 'Hisobingiz uchun'}{'\n'}noyob username kiriting 🎯
            </Text>
          </View>

          {/* Card */}
          <BlurView intensity={18} tint="dark"
            style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(109,40,217,0.22)' }}>
            <View style={{ backgroundColor: 'rgba(10,10,26,0.72)', padding: 24 }}>

              <GlowInput
                label="Username"
                icon="person-outline"
                value={username}
                onChangeText={v => { setUsernameInput(v); setError(null); }}
                placeholder="masalan: nihongo_fan"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              {/* Live validation hint */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -12, marginBottom: 16, gap: 6 }}>
                <Ionicons
                  name={username.length === 0 ? 'information-circle-outline' : isValid ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={username.length === 0 ? '#4b5563' : isValid ? '#10b981' : '#ef4444'}
                />
                <Text style={{
                  fontSize: 12,
                  color: username.length === 0 ? '#4b5563' : isValid ? '#10b981' : '#ef4444',
                }}>
                  {username.length === 0
                    ? '3-30 ta belgi: harf, raqam yoki _'
                    : isValid
                    ? 'Username to\'g\'ri formatda'
                    : 'Faqat harf, raqam va _ ruxsat etilgan (3-30 belgi)'}
                </Text>
              </View>

              {/* Error */}
              {error && (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.35)', borderRadius: 12,
                  padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
                }}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, marginLeft: 8, flex: 1 }}>{error}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity onPress={handleSubmit} disabled={loading || !isValid} activeOpacity={0.85}>
                <LinearGradient
                  colors={isValid ? ['#7c3aed', '#5b21b6'] : ['#374151', '#1f2937']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
                    shadowColor: '#6d28d9',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isValid ? 0.5 : 0,
                    shadowRadius: 14, elevation: isValid ? 10 : 0,
                  }}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 }}>
                          Davom etish
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </View>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
