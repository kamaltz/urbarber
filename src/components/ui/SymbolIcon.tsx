import { SymbolView, type AndroidSymbol, type SymbolViewProps } from 'expo-symbols';
import React from 'react';

export interface SymbolIconProps {
  name: SymbolViewProps['name'] | string;
  size?: number;
  color?: any;
}

/**
 * expo-symbols renders native SF Symbols on iOS, but Android/web require a
 * *separate* icon name from Google's Material Symbols set -- a different
 * icon library with different names. SymbolView only reads name.android /
 * name.web when `name` is an object (see expo-symbols/src/SymbolView.tsx);
 * every call site in this app passes a bare SF-Symbol-style string, which
 * satisfies iOS only -- on Android/web the typeof check fails, the resolved
 * name is null, and the icon silently renders nothing. This maps the SF
 * Symbol names actually used in this app to their Material Symbols
 * equivalent so the existing string-based call sites work cross-platform
 * without every one of them needing to change.
 */
const ANDROID_SYMBOL_MAP: Record<string, AndroidSymbol> = {
  'person.fill': 'person',
  scissors: 'content_cut',
  'checkmark.circle': 'check_circle_outline',
  'checkmark.circle.fill': 'check_circle',
  clock: 'schedule',
  'chart.bar.fill': 'bar_chart',
  'list.bullet': 'format_list_bulleted',
  'chevron.right': 'chevron_right',
  calendar: 'calendar_month',
  'star.fill': 'star',
  'xmark.circle.fill': 'highlight_off',
  xmark: 'close',
  pencil: 'edit',
  ellipsis: 'more_vert',
  lock: 'lock',
  'questionmark.circle': 'help_outline',
  'info.circle': 'info',
  gearshape: 'settings',
  'slider.horizontal.3': 'tune',
};

const FALLBACK_ANDROID_SYMBOL: AndroidSymbol = 'help';

export function SymbolIcon({ name, size = 20, color }: SymbolIconProps) {
  const resolvedName: SymbolViewProps['name'] =
    typeof name === 'string'
      ? {
          ios: name as any,
          android: ANDROID_SYMBOL_MAP[name] ?? FALLBACK_ANDROID_SYMBOL,
          web: ANDROID_SYMBOL_MAP[name] ?? FALLBACK_ANDROID_SYMBOL,
        }
      : name;

  return <SymbolView name={resolvedName} size={size} tintColor={color} />;
}
