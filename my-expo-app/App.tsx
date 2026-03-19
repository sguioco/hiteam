import './global.css';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Index from '@/pages/Index';

export default function App() {
  return (
    <SafeAreaProvider>
      <Index />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
