import { Image, StyleSheet, type ImageProps, type ImageSourcePropType } from 'react-native';
import { cn } from '../../lib/cn';

type EmployeeAvatarImageProps = Omit<ImageProps, 'resizeMode' | 'source'> & {
  className?: string;
  source?: ImageSourcePropType;
};

export function EmployeeAvatarImage({
  className,
  source,
  style,
  ...props
}: EmployeeAvatarImageProps) {
  if (!source) {
    return null;
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      className={cn('shrink-0 bg-[#eef2ff]', className)}
      resizeMode="cover"
      source={source}
      style={[styles.image, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    aspectRatio: 1,
    overflow: 'hidden',
  },
});
