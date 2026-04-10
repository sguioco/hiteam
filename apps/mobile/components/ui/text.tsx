import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react';
import {
  Text as NativeText,
  StyleSheet,
} from 'react-native';
import { getTextDirectionStyle, useI18n } from '../../lib/i18n';

type AppTextProps = ComponentPropsWithoutRef<typeof NativeText>;

export const Text = forwardRef<ElementRef<typeof NativeText>, AppTextProps>(
  function Text({ style, ...props }, ref) {
    const { language } = useI18n();

    return (
      <NativeText
        ref={ref}
        {...props}
        style={StyleSheet.compose(getTextDirectionStyle(language), style)}
      />
    );
  },
);
