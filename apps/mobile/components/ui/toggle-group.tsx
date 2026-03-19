import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '../../lib/cn';

type ToggleGroupType = 'single';

type ToggleGroupContextValue = {
  onValueChange?: (value: string) => void;
  type: ToggleGroupType;
  value?: string;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

type ToggleGroupProps = {
  children: ReactNode;
  className?: string;
  onValueChange?: (value: string) => void;
  type?: ToggleGroupType;
  value?: string;
};

type ToggleGroupItemProps = {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  value: string;
};

export function ToggleGroup({
  children,
  className,
  onValueChange,
  type = 'single',
  value,
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ onValueChange, type, value }}>
      <View className={cn('flex-row rounded-[18px] border border-border bg-[#f3f5f9] p-1', className)}>{children}</View>
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({
  children,
  className,
  textClassName,
  value,
}: ToggleGroupItemProps) {
  const context = useContext(ToggleGroupContext);

  if (!context) {
    throw new Error('ToggleGroupItem must be used within ToggleGroup');
  }

  const isSelected = context.value === value;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={() => context.onValueChange?.(value)}
      style={{ flex: 1 }}
    >
      <View
        className={cn(
          'flex-1 items-center justify-center rounded-[14px] px-4 py-3',
          isSelected ? 'bg-white shadow-sm shadow-[#1f2937]/8' : 'bg-transparent',
          className,
        )}
      >
        {typeof children === 'string' ? (
          <Text className={cn('text-[14px] font-bold', isSelected ? 'text-foreground' : 'text-muted-foreground', textClassName)}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}
