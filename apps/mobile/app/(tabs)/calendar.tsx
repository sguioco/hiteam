import { Redirect } from 'expo-router';

export default function CalendarRoute() {
  return <Redirect href={'/?tab=calendar' as never} />;
}
