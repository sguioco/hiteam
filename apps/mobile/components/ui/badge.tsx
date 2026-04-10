import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';
import { Text } from './text';
import { cn } from '../../lib/cn';

const badgeVariants = cva('self-start flex-row items-center gap-1.5 rounded-full border px-3 py-1', {
  variants: {
    variant: {
      muted: 'border-white/70 bg-surface',
      alert: 'border-transparent bg-[#ffe4e8]',
      brand: 'border-transparent bg-brand',
    },
  },
  defaultVariants: {
    variant: 'muted',
  },
});

const badgeTextVariants = cva('text-[12px] font-bold', {
  variants: {
    variant: {
      muted: 'text-foreground',
      alert: 'text-danger',
      brand: 'text-brand-foreground',
    },
  },
  defaultVariants: {
    variant: 'muted',
  },
});

type BadgeProps = VariantProps<typeof badgeVariants> & {
  children?: ReactNode;
  className?: string;
  label?: string;
  textClassName?: string;
};

export function Badge({ children, className, label, textClassName, variant }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      {children}
      {label ? <Text className={cn(badgeTextVariants({ variant }), textClassName)}>{label}</Text> : null}
    </View>
  );
}

