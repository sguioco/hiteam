import { type TextProps } from 'react-native';
import { Text } from '../../components/ui/text';

export function BrandWordmark(props: TextProps) {
  return (
    <Text accessibilityLabel="HiTeam" {...props}>
      <Text style={{ fontFamily: 'TeodorTRIAL-Regular' }}>Hi</Text>
      <Text style={{ fontFamily: 'TeodorTRIAL-RegularItalic' }}>Team</Text>
    </Text>
  );
}

