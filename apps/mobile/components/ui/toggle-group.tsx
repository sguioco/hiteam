import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ToggleGroupType = 'single';

type ToggleGroupContextValue = {
  onValueChange?: (value: string) => void;
  type: ToggleGroupType;
  value?: string;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

type ToggleGroupProps = {
  children: ReactNode;
  onValueChange?: (value: string) => void;
  type?: ToggleGroupType;
  value?: string;
};

type ToggleGroupItemProps = {
  children: ReactNode;
  value: string;
};

export function ToggleGroup({
  children,
  onValueChange,
  type = 'single',
  value,
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ onValueChange, type, value }}>
      <View style={styles.group}>{children}</View>
    </ToggleGroupContext.Provider>
  );
}

export function ToggleGroupItem({
  children,
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
      style={styles.pressable}
    >
      <View style={[styles.item, isSelected ? styles.itemSelected : styles.itemIdle]}>
        {typeof children === 'string' ? (
          <Text style={[styles.label, isSelected ? styles.labelSelected : styles.labelIdle]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: '#eef2fb',
    padding: 4,
  },
  pressable: {
    flex: 1,
    flexBasis: 0,
  },
  item: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemIdle: {
    backgroundColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#1f2937',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  labelIdle: {
    color: '#7a869a',
  },
  labelSelected: {
    color: '#24314b',
  },
});
