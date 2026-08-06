import { SymbolView, SymbolViewProps } from 'expo-symbols';
import React from 'react';

export interface SymbolIconProps {
  name: SymbolViewProps['name'] | string;
  size?: number;
  color?: any;
}

export function SymbolIcon({ name, size = 20, color }: SymbolIconProps) {
  return <SymbolView name={name as SymbolViewProps['name']} size={size} tintColor={color} />;
}
