/**
 * usePulse — takrorlanuvchi (pulsatsiya/miltillash) animatsiyasi uchun hook.
 *
 * NEGA KERAK:
 *   Animated.loop(...).start() chaqirilgandan keyin animatsiya O'ZI TO'XTAMAYDI.
 *   Komponent unmount bo'lsa ham, ekran fokusdan chiqsa ham davom etaveradi —
 *   har kadrda JS/UI thread ni band qiladi va batareyani yeydi.
 *
 *   Bu hook animatsiyani unmount da va ekran fokusdan chiqqanda avtomatik to'xtatadi.
 */
import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

interface PulseOptions {
  /** Boshlang'ich qiymat */
  from?: number;
  /** Cho'qqi qiymat */
  to?: number;
  /** Bir tomonga o'tish davomiyligi (ms) */
  duration?: number;
  /** Boshlanishdan oldingi kechikish (ms) */
  delay?: number;
  /** false bo'lsa animatsiya to'xtaydi (masalan ekran fokusda emas) */
  enabled?: boolean;
}

export function usePulse({
  from = 1,
  to = 1.15,
  duration = 1400,
  delay = 0,
  enabled = true,
}: PulseOptions = {}): Animated.Value {
  const value = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    if (!enabled) {
      // Fokusdan chiqdi — to'xtatib, boshlang'ich holatga qaytaramiz
      value.stopAnimation();
      value.setValue(from);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: to,
          duration,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: from,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    // MUHIM: unmount / enabled o'zgarganda to'xtatamiz
    return () => {
      loop.stop();
      value.stopAnimation();
    };
  }, [enabled, from, to, duration, delay, value]);

  return value;
}
