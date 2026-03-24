import { Redirect } from 'expo-router';

export default function ProfileRoute() {
  return <Redirect href={'/?tab=profile' as never} />;
}
