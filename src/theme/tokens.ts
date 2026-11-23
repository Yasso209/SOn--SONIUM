export const colors = {
  dark: { bg: '#0a0b09', card: '#161814', card2: '#1f221c', line: 'rgba(255,255,255,0.07)', fg: '#f3f5ee', muted: '#9ba292', accent: '#c8f04a', accentInk: '#11160a', flame: '#ff8a3d', gold: '#f2b632' },
  light: { bg: '#f2f4ec', card: '#ffffff', card2: '#e8ebdf', line: 'rgba(20,30,10,0.1)', fg: '#151a0f', muted: '#5f6657', accent: '#c3ee3a', accentInk: '#11160a', flame: '#e8661a', gold: '#c98a00' }
} as const;
export type ThemeMode = 'dark' | 'light' | 'system';
