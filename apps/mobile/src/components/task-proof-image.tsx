import { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';
import { getTaskPhotoAccessToken } from '../../lib/api';
import { API_URL } from '../../lib/api-config';

export function isProtectedTaskPhoto(uri: string) {
  try {
    const url = new URL(uri);
    return url.origin === new URL(API_URL).origin &&
      /^\/api\/v1\/media\/task-photo-proofs\/[^/]+\/file$/.test(url.pathname);
  } catch { return false; }
}

export function TaskProofImage({ source, ...props }: ImageProps & { source: { uri: string } }) {
  const [token, setToken] = useState<string | null>(null);
  const protectedPhoto = isProtectedTaskPhoto(source.uri);
  useEffect(() => {
    let active = true;
    setToken(null);
    if (protectedPhoto) {
      void getTaskPhotoAccessToken().then(value => { if (active) setToken(value); }, () => {
        if (active) props.onError?.({ nativeEvent: { error: 'Unable to authenticate photo request' } } as never);
      });
    }
    return () => { active = false; };
  }, [source.uri, protectedPhoto]);
  if (protectedPhoto && !token) return null;
  return <Image {...props} source={protectedPhoto
    ? { uri: source.uri, headers: { Authorization: `Bearer ${token}` }, cache: 'reload' }
    : source} />;
}
