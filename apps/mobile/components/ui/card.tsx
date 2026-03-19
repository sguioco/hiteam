import { View, type ViewProps } from 'react-native';
import { cn } from '../../lib/cn';

type CardProps = ViewProps & {
  inset?: 'default' | 'compact';
};

export function Card({ children, className, inset = 'default', ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-white/70 bg-surface shadow-panel',
        inset === 'default' ? 'p-[18px]' : 'p-3',
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}
