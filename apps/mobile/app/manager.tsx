import { Redirect } from 'expo-router';

export default function ManagerRoute() {
  return <Redirect href={'/?tab=manage' as never} />;
}
