import { Redirect } from 'expo-router';

export default function WorkspaceRedirect() {
  return <Redirect href={'/?tab=today' as never} />;
}
