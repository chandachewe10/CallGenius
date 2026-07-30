import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { COLORS } from '../constants';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused?: boolean;
  onPress: () => void;
  size?: number;
}

export function RecordButton({ isRecording, isPaused = false, onPress, size = 80 }: RecordButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const innerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.35,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.6);
    }
  }, [isRecording, isPaused, pulseAnim, pulseOpacity]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(innerScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(innerScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const buttonColor = isRecording ? COLORS.danger : COLORS.primary;
  const innerShape = isRecording && !isPaused ? 'square' : 'circle';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.container, { width: size + 40, height: size + 40 }]}
    >
      {isRecording && !isPaused && (
        <Animated.View
          style={[
            styles.pulse,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              backgroundColor: COLORS.recording,
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.outerRing,
          {
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
            borderColor: buttonColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonColor,
              transform: [{ scale: innerScale }],
            },
          ]}
        >
          <View
            style={[
              styles.innerShape,
              innerShape === 'square'
                ? {
                    width: size * 0.38,
                    height: size * 0.38,
                    borderRadius: 6,
                    backgroundColor: COLORS.white,
                  }
                : {
                    width: size * 0.42,
                    height: size * 0.42,
                    borderRadius: (size * 0.42) / 2,
                    backgroundColor: COLORS.white,
                  },
            ]}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  outerRing: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerShape: {},
});
