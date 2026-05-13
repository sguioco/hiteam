import React from 'react';
import { Text, View, type ViewProps } from 'react-native';

type MapShimProps = ViewProps & {
  children?: React.ReactNode;
};

function MapViewShim({ children, style, ...props }: MapShimProps) {
  return (
    <View
      {...props}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#edf2f7',
        },
        style,
      ]}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        Map preview is available in the mobile app
      </Text>
      {children}
    </View>
  );
}

function MapChildShim() {
  return null;
}

export const Marker = MapChildShim;
export const Circle = MapChildShim;
export const PROVIDER_GOOGLE = 'google';
export default MapViewShim;
