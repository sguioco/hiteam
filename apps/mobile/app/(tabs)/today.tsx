import { Redirect } from 'expo-router';

export default function TodayRoute() {
  return <Redirect href={'/?tab=today' as never} />;
}
