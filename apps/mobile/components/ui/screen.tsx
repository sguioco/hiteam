import { ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../lib/cn';
import { AppGradientBackground } from './app-gradient-background';

type ScreenProps = ScrollViewProps & {
  safeAreaClassName?: string;
  contentClassName?: string;
  withGradient?: boolean;
};

export function Screen({ children, contentClassName, safeAreaClassName, withGradient = false, ...props }: ScreenProps) {
  return (
    <SafeAreaView className={cn('flex-1', withGradient ? 'bg-[#41e4f6]' : 'bg-canvas', safeAreaClassName)}>
      {withGradient ? <AppGradientBackground /> : null}
      <ScrollView className="flex-1 bg-transparent" contentContainerClassName={cn('gap-5 p-5', contentClassName)} {...props}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
