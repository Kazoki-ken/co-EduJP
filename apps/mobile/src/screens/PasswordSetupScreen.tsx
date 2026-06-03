import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/client';

// ─── PasswordSetupScreen ────────────────────────────────────────────────
// Shown after UsernameSetupScreen for Google OAuth users.
// Setting a password is optional – user can skip and always log in via Google.

interface Props {
  /** Called when the user finishes (saved or skipped) */
  onDone: () => void;
}

export default function PasswordSetupScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [password, setPasswordInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmRef = useRef<TextInput>(null);

  const passwordValid = password.length >= 8;
  const confirmValid = password === confirm && confirm.length > 0;
  const canSubmit = passwordValid && confirmValid;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!passwordValid) {
        setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      } else {
        setError('Parollar mos kelmadi.');
      }
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiClient.patch('/auth/set-password', { password });
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orbs */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: 'rgba(109,40,217,0.14)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 80,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(16,185,129,0.07)',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
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
                width: 80,
                height: 80,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                shadowColor: '#6d28d9',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 14,
              }}
            >
              <Ionicons name="lock-closed" size={36} color="#fff" />
            </LinearGradient>

            <Text
              style={{
                fontSize: 26,
                fontWeight: '700',
                color: '#f9fafb',
                letterSpacing: -0.5,
                textAlign: 'center',
              }}
            >
              Parol yarating
            </Text>
            <Text
              style={{
                color: '#6b7280',
                marginTop: 8,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Email/parol bilan ham kirish uchun{'\n'}parol o'rnating{' '}
              <Text style={{ color: '#7c3aed', fontWeight: '600' }}>(ixtiyoriy)</Text>
            </Text>
          </View>

          {/* Card */}
          <BlurView
            intensity={18}
            tint="dark"
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(109,40,217,0.22)',
            }}
          >
            <View style={{ backgroundColor: 'rgba(10,10,26,0.72)', padding: 24 }}>
              {/* Password field */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: '#9ca3af',
                    fontSize: 13,
                    fontWeight: '500',
                    marginBottom: 8,
                    marginLeft: 4,
                  }}
                >
                  Parol
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: password.length > 0
                      ? passwordValid
                        ? 'rgba(16,185,129,0.4)'
                        : 'rgba(239,68,68,0.4)'
                      : 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 14,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
                  <TextInput
                    value={password}
                    onChangeText={(v) => { setPasswordInput(v); setError(null); }}
                    placeholder="Kamida 8 ta belgi"
                    placeholderTextColor="#4b5563"
                    secureTextEntry={!showPwd}
                    style={{ flex: 1, color: '#f9fafb', fontSize: 15, paddingVertical: 12 }}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                      name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
                {password.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4, gap: 4 }}>
                    <Ionicons
                      name={passwordValid ? 'checkmark-circle' : 'close-circle'}
                      size={13}
                      color={passwordValid ? '#10b981' : '#ef4444'}
                    />
                    <Text style={{ fontSize: 12, color: passwordValid ? '#10b981' : '#ef4444' }}>
                      {passwordValid ? "Parol yetarli" : "Parol kamida 8 ta belgi bo'lishi kerak"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm password field */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: '#9ca3af',
                    fontSize: 13,
                    fontWeight: '500',
                    marginBottom: 8,
                    marginLeft: 4,
                  }}
                >
                  Parolni tasdiqlang
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: confirm.length > 0
                      ? confirmValid
                        ? 'rgba(16,185,129,0.4)'
                        : 'rgba(239,68,68,0.4)'
                      : 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 14,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={confirmRef}
                    value={confirm}
                    onChangeText={(v) => { setConfirm(v); setError(null); }}
                    placeholder="Parolni qaytaring"
                    placeholderTextColor="#4b5563"
                    secureTextEntry={!showConfirm}
                    style={{ flex: 1, color: '#f9fafb', fontSize: 15, paddingVertical: 12 }}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
                {confirm.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4, gap: 4 }}>
                    <Ionicons
                      name={confirmValid ? 'checkmark-circle' : 'close-circle'}
                      size={13}
                      color={confirmValid ? '#10b981' : '#ef4444'}
                    />
                    <Text style={{ fontSize: 12, color: confirmValid ? '#10b981' : '#ef4444' }}>
                      {confirmValid ? 'Parollar mos keldi' : 'Parollar mos kelmadi'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Error */}
              {error && (
                <View
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.35)',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, marginLeft: 8, flex: 1 }}>{error}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !canSubmit}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={canSubmit ? ['#7c3aed', '#5b21b6'] : ['#374151', '#1f2937']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: 'center',
                    shadowColor: '#6d28d9',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: canSubmit ? 0.5 : 0,
                    shadowRadius: 14,
                    elevation: canSubmit ? 10 : 0,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 }}>
                        Parol saqlash
                      </Text>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Skip */}
              <TouchableOpacity
                onPress={onDone}
                activeOpacity={0.7}
                style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={{ color: '#6b7280', fontSize: 14 }}>
                  O'tkazib yuborish — keyinroq o'rnataman
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
