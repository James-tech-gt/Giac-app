import React from 'react';
import { StyleSheet, View } from 'react-native';

type GoogleMarkProps = {
  size?: number;
};

export function GoogleMark({ size = 18 }: GoogleMarkProps) {
  const stroke = Math.max(2, Math.round(size * 0.16));

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            borderRadius: size / 2,
            borderWidth: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.cutout,
          {
            top: stroke * 0.7,
            right: 0,
            bottom: stroke * 0.7,
            width: size * 0.34,
          },
        ]}
      />
      <View
        style={[
          styles.bar,
          {
            top: size * 0.47,
            right: 0,
            width: size * 0.4,
            height: stroke,
            borderRadius: stroke / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderTopColor: '#4285F4',
    borderRightColor: '#34A853',
    borderBottomColor: '#FBBC04',
    borderLeftColor: '#EA4335',
  },
  cutout: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  bar: {
    position: 'absolute',
    backgroundColor: '#4285F4',
  },
});
