import { Fonts } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  value: string;          // YYYY-MM-DD  or  YYYY-MM-DDTHH:MM
  onChange: (v: string) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ITEM_H = 46;
const VISIBLE = 5; // must be odd

function pad(n: number) { return String(n).padStart(2, '0'); }

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function parseValue(value: string) {
  const now = new Date();
  if (!value) return { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear(), h: 9, min: 0 };
  const [datePart, timePart] = value.split('T');
  const [y, mo, d] = (datePart || '').split('-').map(Number);
  const [h, mn] = (timePart || '09:00').split(':').map(Number);
  return {
    d: d || now.getDate(),
    m: mo || now.getMonth() + 1,
    y: y || now.getFullYear(),
    h: h ?? 9,
    min: mn ?? 0,
  };
}

function formatDisplay(value: string, mode: 'date' | 'datetime') {
  if (!value) return '';
  const { d, m, y, h, min } = parseValue(value);
  const datePart = `${pad(d)} ${MONTHS[m - 1]} ${y}`;
  return mode === 'datetime' ? `${datePart}  ${pad(h)}:${pad(min)}` : datePart;
}

// ─── Scroll Wheel Column ──────────────────────────────────────────────────────
function Wheel({
  items,
  selectedIndex,
  onSelect,
  width = 60,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  width?: number;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Delay slightly so the modal has laid out first
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 30);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  function snapTo(i: number) {
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    scrollRef.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
    onSelect(clamped);
  }

  return (
    <View style={[styles.wheelOuter, { width }]}>
      {/* top fade */}
      <View style={styles.fadeTop} pointerEvents="none" />
      {/* selection highlight */}
      <View style={styles.selectionBar} pointerEvents="none" />
      {/* bottom fade */}
      <View style={styles.fadeBottom} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}
        style={{ height: ITEM_H * VISIBLE }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onSelect(Math.max(0, Math.min(i, items.length - 1)));
        }}
      >
        {items.map((label, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => snapTo(i)}
            style={styles.wheelItem}
          >
            <Text style={[styles.wheelText, i === selectedIndex && styles.wheelTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DatePickerField({ value, onChange, mode = 'date', placeholder = 'Select date' }: Props) {

  // Web: browser's native date/datetime-local input
  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: mode === 'datetime' ? 'datetime-local' : 'date',
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      style: {
        width: '100%',
        height: 48,
        border: '1.5px solid #E3E9F2',
        borderRadius: 12,
        padding: '0 14px',
        fontSize: 14,
        color: value ? '#1F2A44' : '#7A7F8A',
        backgroundColor: '#F8FAFD',
        outline: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      },
    });
  }

  // Native: custom scroll-wheel modal
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);

  const [pickedDay, setPickedDay]     = useState(parsed.d);
  const [pickedMonth, setPickedMonth] = useState(parsed.m);
  const [pickedYear, setPickedYear]   = useState(parsed.y);
  const [pickedHour, setPickedHour]   = useState(parsed.h);
  const [pickedMin, setPickedMin]     = useState(parsed.min);

  function openPicker() {
    const p = parseValue(value);
    setPickedDay(p.d); setPickedMonth(p.m); setPickedYear(p.y);
    setPickedHour(p.h); setPickedMin(p.min);
    setOpen(true);
  }

  function confirm() {
    const maxDay = daysInMonth(pickedYear, pickedMonth);
    const safeDay = Math.min(pickedDay, maxDay);
    const date = `${pickedYear}-${pad(pickedMonth)}-${pad(safeDay)}`;
    const result = mode === 'datetime' ? `${date}T${pad(pickedHour)}:${pad(pickedMin)}` : date;
    onChange(result);
    setOpen(false);
  }

  // Build column data
  const now = new Date();
  const yearStart = now.getFullYear() - 1;
  const years  = Array.from({ length: 12 }, (_, i) => String(yearStart + i));
  const months = MONTHS;
  const maxDay = daysInMonth(pickedYear, pickedMonth);
  const days   = Array.from({ length: maxDay }, (_, i) => pad(i + 1));
  const hours  = Array.from({ length: 24 }, (_, i) => pad(i));
  const mins   = Array.from({ length: 12 }, (_, i) => pad(i * 5));

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <FontAwesome6 name="calendar" size={14} color="#2E4A8A" />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value ? formatDisplay(value, mode) : placeholder}
        </Text>
        <FontAwesome6 name="chevron-down" size={12} color="#7A7F8A" />
      </Pressable>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {mode === 'datetime' ? 'Select Date & Time' : 'Select Date'}
              </Text>
            </View>

            <View style={styles.wheels}>
              {/* Day */}
              <View style={styles.wheelGroup}>
                <Text style={styles.wheelLabel}>Day</Text>
                <Wheel
                  items={days}
                  selectedIndex={Math.min(pickedDay - 1, days.length - 1)}
                  onSelect={(i) => setPickedDay(i + 1)}
                  width={58}
                />
              </View>

              <View style={styles.wheelDivider} />

              {/* Month */}
              <View style={styles.wheelGroup}>
                <Text style={styles.wheelLabel}>Month</Text>
                <Wheel
                  items={months}
                  selectedIndex={pickedMonth - 1}
                  onSelect={(i) => setPickedMonth(i + 1)}
                  width={58}
                />
              </View>

              <View style={styles.wheelDivider} />

              {/* Year */}
              <View style={styles.wheelGroup}>
                <Text style={styles.wheelLabel}>Year</Text>
                <Wheel
                  items={years}
                  selectedIndex={Math.max(0, pickedYear - yearStart)}
                  onSelect={(i) => setPickedYear(yearStart + i)}
                  width={68}
                />
              </View>

              {mode === 'datetime' && (
                <>
                  <View style={styles.wheelDivider} />

                  {/* Hour */}
                  <View style={styles.wheelGroup}>
                    <Text style={styles.wheelLabel}>Hr</Text>
                    <Wheel
                      items={hours}
                      selectedIndex={pickedHour}
                      onSelect={setPickedHour}
                      width={52}
                    />
                  </View>

                  <Text style={styles.colonSep}>:</Text>

                  {/* Minute */}
                  <View style={styles.wheelGroup}>
                    <Text style={styles.wheelLabel}>Min</Text>
                    <Wheel
                      items={mins}
                      selectedIndex={Math.round(pickedMin / 5)}
                      onSelect={(i) => setPickedMin(i * 5)}
                      width={52}
                    />
                  </View>
                </>
              )}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>Set Date</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  primary: '#1F2A44',
  secondary: '#2E4A8A',
  secondarySoft: '#E9EEF8',
  textPrimary: '#1F2A44',
  textMuted: '#7A7F8A',
  border: '#E3E9F2',
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: C.bg,
  },
  triggerText: { flex: 1, fontSize: 14, fontFamily: Fonts.sans, color: C.textPrimary },
  triggerPlaceholder: { color: C.textMuted },
  pressed: { opacity: 0.85 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  sheetHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    textAlign: 'center',
  },

  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 0,
  },
  wheelGroup: {
    alignItems: 'center',
    gap: 4,
  },
  wheelLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wheelDivider: {
    width: 1,
    height: ITEM_H * VISIBLE,
    backgroundColor: C.border,
    marginHorizontal: 6,
    marginTop: 20,
  },
  colonSep: {
    fontSize: 22,
    fontFamily: Fonts.sansBold,
    color: C.primary,
    marginTop: 20,
    marginHorizontal: 2,
    alignSelf: 'center',
  },

  wheelOuter: {
    position: 'relative',
    overflow: 'hidden',
    height: ITEM_H * VISIBLE,
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 18,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  wheelTextActive: {
    fontSize: 20,
    fontFamily: Fonts.sansBold,
    color: C.primary,
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_H * Math.floor(VISIBLE / 2),
    left: 4,
    right: 4,
    height: ITEM_H,
    borderRadius: 10,
    backgroundColor: C.secondarySoft,
    zIndex: 1,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
    // gradient-like fade using opacity on parent isn't possible in RN without LinearGradient
    // just a subtle overlay
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontFamily: Fonts.sansSemiBold, color: C.textMuted },
  confirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 15, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
});
