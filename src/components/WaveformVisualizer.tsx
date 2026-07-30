import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants';

interface WaveformVisualizerProps {
  metering: number;
  isRecording: boolean;
  barCount?: number;
  height?: number;
  color?: string;
}

export function WaveformVisualizer({
  metering,
  isRecording,
  barCount = 20,
  height = 60,
  color = COLORS.recording,
}: WaveformVisualizerProps) {
  const barAnimations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.1))
  ).current;

  const idleAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!isRecording) {
      idleAnimation.current?.stop();
      barAnimations.forEach(anim => {
        Animated.spring(anim, { toValue: 0.1, useNativeDriver: false }).start();
      });
      return;
    }

    const updateBars = () => {
      barAnimations.forEach((anim, i) => {
        const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
        const centerBoost = 1 - centerDistance * 0.4;
        const random = 0.3 + Math.random() * 0.7;
        const targetValue = Math.max(0.05, metering * random * centerBoost);

        Animated.spring(anim, {
          toValue: targetValue,
          tension: 120,
          friction: 8,
          useNativeDriver: false,
        }).start();
      });
    };

    updateBars();
  }, [metering, isRecording, barAnimations, barCount]);

  return (
    <View style={[styles.container, { height }]}>
      {barAnimations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, height],
              }),
              opacity: anim.interpolate({
                inputRange: [0.05, 1],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
