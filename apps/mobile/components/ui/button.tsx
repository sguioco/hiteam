import { cva, type VariantProps } from 'class-variance-authority';
import { type PressableProps } from 'react-native';
import { Text } from './text';
import { cn } from '../../lib/cn';
import { PressableScale } from './pressable-scale';

const buttonVariants = cva(
  'min-h-11 items-center justify-center rounded-2xl border px-4',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-brand shadow-panel',
        secondary: 'border-white/70 bg-surface',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        md: 'min-h-11 px-4',
        lg: 'min-h-13 px-5',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

const buttonTextVariants = cva('text-center text-[15px] font-extrabold', {
  variants: {
    variant: {
      primary: 'text-brand-foreground',
      secondary: 'text-foreground',
      ghost: 'text-foreground',
    },
    size: {
      md: 'text-[15px]',
      lg: 'text-[17px]',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    label: string;
    textClassName?: string;
  };

export function Button({
  className,
  disabled,
  fullWidth,
  label,
  onPress,
  onPressIn,
  onPressOut,
  size,
  textClassName,
  variant,
  ...props
}: ButtonProps) {
  return (
    <PressableScale
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled}
      haptic="press"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}
    >
      <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>{label}</Text>
    </PressableScale>
  );
}

