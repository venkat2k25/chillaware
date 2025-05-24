import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";

const VoiceWave = ({ isRecognizing }) => {
  const animatedValues = useRef(
    Array.from({ length: 15 }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    const listener = (event) => {
      const volume = Math.max(0, Math.min(1, (event.value + 2) / 12)); // Normalize volume (-2 to 10) to 0-1
      const animations = animatedValues.map((value, index) => {
        const baseHeight = 0.2;
        const targetHeight = Math.min(0.9, baseHeight + volume * 0.6);
        return Animated.timing(value, {
          toValue: targetHeight,
          duration: 150,
          useNativeDriver: false,
        });
      });

      Animated.stagger(20, animations).start();
    };

    if (isRecognizing) {
      useSpeechRecognitionEvent("volumechange", listener);
    }

    return () => {
      // Cleanup not strictly necessary for hooks, but kept for consistency
      animatedValues.forEach((value) =>
        Animated.timing(value, {
          toValue: 0.2,
          duration: 300,
          useNativeDriver: false,
        }).start()
      );
    };
  }, [isRecognizing]);

  return (
    <View style={styles.waveContainer}>
      {animatedValues.map((animatedValue, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveLine,
            {
              height: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 35],
              }),
              backgroundColor: isRecognizing ? "#00ff88" : "#4CAF50",
              opacity: isRecognizing ? 1 : 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  waveLine: {
    width: 4,
    borderRadius: 2,
  },
});

export default VoiceWave;