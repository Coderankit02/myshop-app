/**
 * Field — themed text input (mirrors the site's input styles)
 */
import React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';

interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
}

export function Field({ label, error, hint, rightIcon, style, ...rest }: FieldProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="captionBold" color={theme.gray} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={theme.muted}
          style={[
            styles.input,
            {
              backgroundColor: theme.light,
              borderColor: error ? theme.red : theme.border,
              color: theme.dark,
            },
            rightIcon ? styles.inputWithIcon : null,
            style,
          ]}
          {...rest}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <AppText variant="tiny" color={theme.red} style={styles.msg}>
          ⚠️ {error}
        </AppText>
      ) : hint ? (
        <AppText variant="tiny" color={theme.gray} style={styles.msg}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { marginBottom: 5 },
  inputWrap: { position: 'relative' },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  inputWithIcon: { paddingRight: 42 },
  rightIcon: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  msg: { marginTop: 4 },
});
