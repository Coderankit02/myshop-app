/**
 * ToastContext — lightweight toast notifications (Hinglish messages).
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';

interface ToastContextValue {
  showToast: (msg: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, durationMs = 2600) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMsg(message);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
          setMsg(null);
        });
      }, durationMs);
    },
    [opacity]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg != null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { backgroundColor: theme.isDark ? '#1E293B' : '#1E293B', opacity }]}>
          <Text style={styles.toastText}>{msg}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 96,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center', fontFamily: 'Poppins_500Medium' },
});

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
