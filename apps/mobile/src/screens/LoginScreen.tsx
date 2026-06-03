import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Image,
  type TextInput as TextInputType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootStack';
import { useAuth } from '../context/AuthContext';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Google Sign-In sozlamalari (bir marta chaqiriladi)
GoogleSignin.configure({
  webClientId: '156336295197-pjb6ocbui8t994dhdg4nv827a22f8e84.apps.googleusercontent.com',
  offlineAccess: false,
});

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// ─── Reusable animated glow input ────────────────────────────────
interface GlowInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputType['props']['keyboardType'];
  autoCapitalize?: TextInputType['props']['autoCapitalize'];
  returnKeyType?: TextInputType['props']['returnKeyType'];
  onSubmitEditing?: () => void;
}

export const GlowInput = React.forwardRef<TextInputType, GlowInputProps>(
  ({ label, icon, value, onChangeText, placeholder, secureTextEntry = false,
    keyboardType = 'default', autoCapitalize = 'none', returnKeyType, onSubmitEditing }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(secureTextEntry);
    const glowAnim = useRef(new Animated.Value(0)).current;

    const animate = (toValue: number) =>
      Animated.timing(glowAnim, { toValue, duration: 220, useNativeDriver: false }).start();

    const borderColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(109,40,217,0.25)', 'rgba(124,58,237,1)'],
    });

    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600',
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </Text>
        <Animated.View style={{
          borderRadius: 16, borderWidth: 1.5, borderColor,
          shadowColor: '#6d28d9', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: focused ? 0.55 : 0, shadowRadius: 14, elevation: focused ? 8 : 0,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(18,18,42,0.95)',
            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
          }}>
            <Ionicons name={icon} size={18} color={focused ? '#7c3aed' : '#4b5563'}
              style={{ marginRight: 10 }} />
            <TextInput
              ref={ref} value={value} onChangeText={onChangeText}
              placeholder={placeholder} placeholderTextColor="#374151"
              secureTextEntry={hidden} keyboardType={keyboardType}
              autoCapitalize={autoCapitalize} returnKeyType={returnKeyType}
              onSubmitEditing={onSubmitEditing}
              onFocus={() => { setFocused(true); animate(1); }}
              onBlur={() => { setFocused(false); animate(0); }}
              style={{ flex: 1, color: '#f3f4f6', fontSize: 15 }}
            />
            {secureTextEntry && (
              <TouchableOpacity onPress={() => setHidden(h => !h)}>
                <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color="#4b5563" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    );
  },
);
GlowInput.displayName = 'GlowInput';

// ─── Login Screen ─────────────────────────────────────────────────
export default function LoginScreen({ navigation }: Props) {
  const { login, googleLogin } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputType>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Iltimos, barcha maydonlarni to'ldiring."); return; }
    setError(null); setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? "Kirish muvaffaqiyatsiz tugadi. Ma'lumotlaringizni tekshiring.";
      setError(msg);
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
      // needsUsername = true bo'lsa, RootStack avtomatik UsernameSetup ga o'tadi
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // foydalanuvchi bekor qildi — xato ko'rsatmaymiz
      } else if (e.code === statusCodes.IN_PROGRESS) {
        // allaqachon jarayonda
      } else {
        setError("Google orqali kirish muvaffaqiyatsiz tugadi. Qaytadan urinib ko'ring.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Ambient glow orbs */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: -100, left: -60,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: 'rgba(109,40,217,0.15)',
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 80, right: -80,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(245,158,11,0.07)',
      }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1, justifyContent: 'center',
            paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <LinearGradient colors={['#7c3aed', '#4c1d95']}
              style={{
                width: 74, height: 74, borderRadius: 22,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 18, shadowColor: '#6d28d9',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.65, shadowRadius: 20, elevation: 14,
              }}>
              <Text style={{ fontSize: 36 }}>語</Text>
            </LinearGradient>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#f9fafb', letterSpacing: -0.5 }}>
              Xush kelibsiz
            </Text>
            <Text style={{ color: '#6b7280', marginTop: 6, fontSize: 14 }}>
              Faollikni davom ettirish uchun tizimga kiring 🔥
            </Text>
          </View>

          {/* Glass card */}
          <BlurView intensity={18} tint="dark"
            style={{ borderRadius: 24, overflow: 'hidden',
              borderWidth: 1, borderColor: 'rgba(109,40,217,0.22)' }}>
            <View style={{ backgroundColor: 'rgba(10,10,26,0.72)', padding: 24 }}>
              <GlowInput label="Email" icon="mail-outline" value={email}
                onChangeText={setEmail} placeholder="you@example.com"
                keyboardType="email-address" returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()} />

              <GlowInput ref={passwordRef} label="Parol" icon="lock-closed-outline"
                value={password} onChangeText={setPassword}
                placeholder="••••••••" secureTextEntry
                returnKeyType="done" onSubmitEditing={handleLogin} />

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

              <TouchableOpacity onPress={handleLogin} disabled={loading}
                activeOpacity={0.85} style={{ marginTop: 4 }}>
                <LinearGradient colors={['#7c3aed', '#5b21b6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
                    shadowColor: '#6d28d9', shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
                  }}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 }}>
                        Tizimga kirish
                      </Text>
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
                      {/* Google G icon */}
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#4285F4' }}>G</Text>
                      </View>
                      <Text style={{ color: '#e5e7eb', fontSize: 15, fontWeight: '600' }}>
                        Google bilan kirish
                      </Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Hisobingiz yo'qmi? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: '#7c3aed', fontSize: 14, fontWeight: '600' }}>Ro'yxatdan o'tish</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
