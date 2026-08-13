/**
 * GlassView — BlurView o'rnini bosuvchi komponent.
 *
 * NEGA KERAK:
 *   expo-blur iOS da apparat darajasida tezlashtirilgan (UIVisualEffectView) va arzon.
 *   Android da esa har kadrda GPU dan piksellarni qayta o'qib, blur hisoblanadi —
 *   budjet telefonlarda (Mali-G52, Adreno 610) bu kadrlarni tushirib yuboradi.
 *
 *   Bu ilovada BlurView larning deyarli hammasi ichida noshaffof fon bor
 *   (rgba(10,10,26,0.85), rgba(18,18,42,0.9) va h.k.) — ya'ni blur ko'rinmaydi ham,
 *   lekin baribir hisoblanadi. Sof yo'qotilgan kadrlar.
 *
 * NIMA QILADI:
 *   iOS   → haqiqiy BlurView (o'zgarishsiz, "premium" ko'rinish saqlanadi)
 *   Android → tekis to'q fon. Ilova foni bir xil to'q (#0a0a1a) bo'lgani uchun
 *             to'q blur ham amalda tekis to'q rangdek ko'rinadi — farq sezilmaydi.
 *
 * API BlurView bilan bir xil, shuning uchun JSX ni o'zgartirmasdan
 * faqat import qatorini almashtirish yetarli.
 */
import React from 'react';
import { View, Platform, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

/**
 * Haqiqiy blur qaysi platformada ishlatilsin.
 * Androidda blur ni qayta yoqmoqchi bo'lsangiz — shu yerni o'zgartiring.
 */
const USE_REAL_BLUR = Platform.OS === 'ios';

interface GlassViewProps extends ViewProps {
  /** BlurView bilan moslik uchun. Android da fon quyuqligini belgilaydi. */
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * intensity ni tekis fon shaffofligiga o'giradi.
 * To'q fon ustidagi to'q blur ~ biroz "ko'tarilgan" to'q panel bo'lib ko'rinadi,
 * shuni taqlid qilamiz.
 */
function backgroundFor(intensity: number, tint: GlassViewProps['tint']): string {
  const alpha = Math.min(0.35 + (intensity / 100) * 0.35, 0.75);
  return tint === 'light'
    ? `rgba(245,245,255,${alpha})`
    : `rgba(20,20,45,${alpha})`;
}

export default function GlassView({
  intensity = 20,
  tint = 'dark',
  style,
  children,
  ...rest
}: GlassViewProps) {
  if (USE_REAL_BLUR) {
    return (
      <BlurView intensity={intensity} tint={tint} style={style} {...rest}>
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[style, { backgroundColor: backgroundFor(intensity, tint) }]} {...rest}>
      {children}
    </View>
  );
}

/** Nomlangan eksport — `import { GlassView as BlurView }` uslubi uchun. */
export { GlassView };
