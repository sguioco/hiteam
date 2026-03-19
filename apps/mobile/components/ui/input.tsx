import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '../../lib/cn';

type InputProps = TextInputProps & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        'min-h-12 rounded-2xl border border-white/80 bg-surface-strong px-4 py-3 text-[15px] text-foreground shadow-panel',
        invalid && 'border-danger',
        className,
      )}
      placeholderTextColor="#98a2b3"
      {...props}
    />
  );
}
