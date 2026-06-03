import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
  type TextInput as TextInputType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStack';
import { useAuth } from '../context/AuthContext';
import { GlowInput } from './LoginScreen';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

// ─── Strength bar for password ────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score = [password.length >= 8, /[A-Z]/.test(password),
    /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
    .filter(Boolean).length;
  const labels = ['', 'Zaif', 'O\'rtacha', 'Yaxshi', 'Kuchli'];
  const colors = ['#374151', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  if (!password) return null;
  return (
    <View style={{ marginTop: -12, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            backgroundColor: i <= score ? colors[score] : '#1f2937',
          }} />
        ))}
      </View>
      {score > 0 && (
        <Text style={{ color: colors[score], fontSize: 11, marginTop: 4 }}>
          {labels[score]}
        </Text>
      )}
    </View>
  );
}

// ─── Error classifier ─────────────────────────────────────────────
type AxiosLike = {
  response?: { status?: number; data?: { error?: string; message?: string } };
  request?: unknown;
  message?: string;
};

function classifyRegisterError(err: unknown): string {
  const e = err as AxiosLike;
  const status  = e?.response?.status;
  const payload = e?.response?.data?.error ?? e?.response?.data?.message ?? '';

  // ── HTTP-status based ────────────────────────────────────────────
  if (status === 409) return "Ushbu email yoki foydalanuvchi nomi allaqachon ro'yxatdan o'tgan.";
  if (status === 400) {
    // Forward specific backend validation messages
    if (/email/i.test(payload))    return "Ushbu email allaqachon ro'yxatdan o'tgan.";
    if (/username/i.test(payload)) return "Foydalanuvchi nomi allaqachon band qilingan.";
    if (/password/i.test(payload)) return payload || "Parol talablarga javob bermaydi.";
    return payload || "Noto'g'ri ma'lumotlar. Iltimos, ma'lumotlaringizni tekshiring.";
  }
  if (status === 429) return "Urinishlar soni juda ko'p. Iltimos, biroz kutib qaytadan urinib ko'ring.";
  if (status && status >= 500)
    return "Server xatoligi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.";

  // ── Network / no response ────────────────────────────────────────
  if (!e?.response && e?.request) {
    return (
      "Serverga ulanib bo'lmadi.\n" +
      "Telefoningiz va kompyuteringiz bir xil Wi-Fi tarmog'iga ulanganini\n" +
      "va backend ishlayotganini tekshiring."
    );
  }

  // ── Fallback: use backend message if present ─────────────────────
  return payload || "Ro'yxatdan o'tish muvaffaqiyatsiz tugadi. Iltimos, qaytadan urinib ko'ring.";
}

// ─── Register Screen ─────────────────────────────────────────────────
export default function RegisterScreen({ navigation }: Props) {
  const { register, googleLogin } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const confirmRef = useRef<TextInputType>(null);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError("Iltimos, barcha maydonlarni to'ldiring."); return;
    }
    if (password !== confirm) {
      setError("Parollar mos kelmadi."); return;
    }
    if (password.length < 8) {
      setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak."); return;
    }
    setError(null); setLoading(true);
    try {
      await register(username.trim(), email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      setError(classifyRegisterError(err));
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Google token olinmadi');
      await googleLogin(idToken);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code !== statusCodes.SIGN_IN_CANCELLED && e.code !== statusCodes.IN_PROGRESS) {
        setError("Google orqali kirish muvaffaqiyatsiz tugadi.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient orbs */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -60, right: -80,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(109,40,217,0.13)',
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 40, left: -60,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(16,185,129,0.07)',
      }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' }}>
            <Ionicons name="arrow-back" size={20} color="#7c3aed" />
            <Text style={{ color: '#7c3aed', marginLeft: 6, fontSize: 14, fontWeight: '500' }}>Orqaga</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#f9fafb', letterSpacing: -0.5 }}>
              Hisob yaratish
            </Text>
            <Text style={{ color: '#6b7280', marginTop: 6, fontSize: 14 }}>
              Yapon tili so'zlarini o'zlashtirayotgan minglab o'quvchilarga qo'shiling ✨
            </Text>
          </View>

          {/* Glass card */}
          <BlurView intensity={18} tint="dark"
            style={{ borderRadius: 24, overflow: 'hidden',
              borderWidth: 1, borderColor: 'rgba(109,40,217,0.22)' }}>
            <View style={{ backgroundColor: 'rgba(10,10,26,0.72)', padding: 24 }}>

              <GlowInput label="Foydalanuvchi nomi" icon="person-outline" value={username}
                onChangeText={setUsername} placeholder="cool_nihongo_fan"
                autoCapitalize="none" returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()} />

              <GlowInput ref={emailRef} label="Email" icon="mail-outline" value={email}
                onChangeText={setEmail} placeholder="you@example.com"
                keyboardType="email-address" returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()} />

              <GlowInput ref={passwordRef} label="Parol" icon="lock-closed-outline"
                value={password} onChangeText={setPassword}
                placeholder="Kamida 8 ta belgi" secureTextEntry
                returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} />

              <PasswordStrength password={password} />

              {/* Confirm password with inline match indicator */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600',
                    letterSpacing: 1.5, textTransform: 'uppercase', flex: 1 }}>
                    Parolni tasdiqlash
                  </Text>
                  {passwordsMatch && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      <Text style={{ color: '#10b981', fontSize: 11, marginLeft: 4 }}>Mos keldi</Text>
                    </View>
                  )}
                  {passwordsMismatch && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="close-circle" size={14} color="#ef4444" />
                      <Text style={{ color: '#ef4444', fontSize: 11, marginLeft: 4 }}>Mos kelmadi</Text>
                    </View>
                  )}
                </View>
                <GlowInput ref={confirmRef} label="" icon="shield-checkmark-outline"
                  value={confirm} onChangeText={setConfirm}
                  placeholder="Parolni qayta kiriting" secureTextEntry
                  returnKeyType="done" onSubmitEditing={handleRegister} />
              </View>

              {/* Error */}
              {error && (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.35)', borderRadius: 12,
                  padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
                }}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, marginLeft: 8, flex: 1 }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity onPress={handleRegister} disabled={loading}
                activeOpacity={0.85}>
                <LinearGradient colors={['#10b981', '#047857']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
                    shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
                  }}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 }}>
                          Hisob yaratish
                        </Text>
                        <Ionicons name="rocket-outline" size={18} color="#fff" />
                      </View>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* ─── Divider ─── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(109,40,217,0.2)' }} />
                <Text style={{ color: '#4b5563', marginHorizontal: 12, fontSize: 13 }}>yoki</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(109,40,217,0.2)' }} />
              </View>

              {/* ─── Google Button ─── */}
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 16, paddingVertical: 14, gap: 10,
                }}
              >
                {googleLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#4285F4' }}>G</Text>
                      </View>
                      <Text style={{ color: '#e5e7eb', fontSize: 15, fontWeight: '600' }}>
                        Google bilan ro'yxatdan o'tish
                      </Text>
                    </>
                }
              </TouchableOpacity>

              {/* T&C note */}
              <Text style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
                Ro'yxatdan o'tish orqali siz har kuni yapon tilini o'rganishga va'da berasiz 🇯🇵
              </Text>
            </View>
          </BlurView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Hisobingiz bormi? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: '#7c3aed', fontSize: 14, fontWeight: '600' }}>Kirish</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
