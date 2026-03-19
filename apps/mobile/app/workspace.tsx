import { Redirect } from 'expo-router';

export default function WorkspaceRedirect() {
  return <Redirect href={'/say-hi' as never} />;
}
