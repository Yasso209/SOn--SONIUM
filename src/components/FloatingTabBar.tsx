import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TabItem = { key: string; label: string; icon: string; iconActive: string };
type Palette = { card: string; line: string; accent: string; accentInk: string; muted: string };
type Props = { tabs: TabItem[]; active: string; onChange: (key: string) => void; colors: Palette };

const PAD = 6;

/**
 * Floating pill tab bar. The accent indicator springs between tabs, and the user can
 * press and drag it across the bar: the page changes while the finger moves.
 */
export default function FloatingTabBar({ tabs, active, onChange, colors }: Props) {
  const [width, setWidth] = useState(0);
  const slot = width > 0 ? (width - PAD * 2) / tabs.length : 0;
  const activeIndex = Math.max(0, tabs.findIndex(t => t.key === active));
  const x = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const box = useRef<View>(null);
  const left = useRef(0);
  const slotRef = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);
  const dragIndex = useRef(activeIndex);
  const placed = useRef(false);
  const latest = useRef({ tabs, onChange });
  latest.current = { tabs, onChange };
  slotRef.current = slot;

  useEffect(() => {
    if (!slot) return;
    if (!placed.current) {
      placed.current = true;
      x.setValue(activeIndex * slot);
      return;
    }
    if (dragging.current) return;
    Animated.spring(x, { toValue: activeIndex * slot, useNativeDriver: true, friction: 7, tension: 130 }).start();
  }, [activeIndex, slot, x]);

  const indexAt = (pageX: number) => {
    const s = slotRef.current;
    if (!s) return 0;
    const raw = Math.floor((pageX - left.current - PAD) / s);
    return Math.max(0, Math.min(latest.current.tabs.length - 1, raw));
  };

  const finish = (pageX: number | null) => {
    dragging.current = false;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    let idx = dragIndex.current;
    if (!moved.current) {
      if (pageX !== null) idx = indexAt(pageX);
      dragIndex.current = idx;
      latest.current.onChange(latest.current.tabs[idx].key);
    }
    moved.current = false;
    Animated.spring(x, { toValue: idx * slotRef.current, useNativeDriver: true, friction: 7, tension: 130 }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => {
        dragging.current = true;
        moved.current = false;
        box.current?.measureInWindow(px => { left.current = px; });
        dragIndex.current = indexAt(e.nativeEvent.pageX);
        Animated.spring(scale, { toValue: 1.07, useNativeDriver: true, friction: 6 }).start();
      },
      onPanResponderMove: (_, g) => {
        const s = slotRef.current;
        if (!s) return;
        if (Math.abs(g.dx) > 4) moved.current = true;
        if (!moved.current) return;
        const max = (latest.current.tabs.length - 1) * s;
        x.setValue(Math.max(0, Math.min(max, g.moveX - left.current - PAD - s / 2)));
        const idx = indexAt(g.moveX);
        if (idx !== dragIndex.current) {
          dragIndex.current = idx;
          latest.current.onChange(latest.current.tabs[idx].key);
        }
      },
      onPanResponderRelease: e => finish(e.nativeEvent.pageX),
      onPanResponderTerminate: () => finish(null),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    box.current?.measureInWindow(px => { left.current = px; });
  };

  return (
    <View
      ref={box}
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.line }]}
      {...pan.panHandlers}
    >
      {slot > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: slot, backgroundColor: colors.accent, transform: [{ translateX: x }, { scale }] }]}
        />
      )}
      {tabs.map(t => {
        const on = t.key === active;
        return (
          <View
            key={t.key}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: on }}
            onAccessibilityTap={() => onChange(t.key)}
            style={styles.item}
          >
            <Ionicons name={(on ? t.iconActive : t.icon) as any} size={23} color={on ? colors.accentInk : colors.muted} />
            <Text style={{ fontSize: 11, fontWeight: '900', color: on ? colors.accentInk : colors.muted }}>{t.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 10, alignSelf: 'center', width: '94%', maxWidth: 440, borderWidth: 1, borderRadius: 40, padding: PAD, flexDirection: 'row', elevation: 16 },
  indicator: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: 30 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
});
