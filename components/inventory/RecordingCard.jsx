import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import VoiceWave from "./VoiceWave";
import Colors from "../../utils/Colors";

const RecordingCard = ({
  visible,
  onClose,
  onStopRecognition,
  isRecognizing,
  itemName,
  recognitionState,
  transcript,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (isRecognizing) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isRecognizing) pulse();
        });
      };
      pulse();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecognizing]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.recordingCard,
        {
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      <View style={styles.recordingHeader}>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingTitle}>🎙️ Speech Recognition</Text>
          <Text style={styles.recordingSubtitle}>{itemName}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.waveSection}>
        <VoiceWave isRecognizing={isRecognizing} />
      </View>

      <View style={styles.recordingActions}>
        <View style={styles.statusContainer}>
          {recognitionState === "processing" ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.statusText}>Processing...</Text>
            </View>
          ) : isRecognizing ? (
            <Text style={styles.statusText}>🔴 Recognizing...</Text>
          ) : (
            <Text style={styles.statusText}>Ready to recognize</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.recordActionButton,
            isRecognizing && styles.stopButton,
            recognitionState === "processing" && styles.disabledButton,
          ]}
          onPress={isRecognizing ? onStopRecognition : null}
          disabled={recognitionState === "processing"}
        >
          <Ionicons
            name={isRecognizing ? "stop" : "mic"}
            size={18}
            color="white"
          />
          <Text style={styles.recordActionText}>
            {isRecognizing ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.transcriptText}>
        {transcript || "Say: 'Expires May 15th 2025' or 'Best before June 2026'"}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  recordingCard: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.card,
    borderRadius: 15,
    padding: 15,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  recordingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  recordingSubtitle: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  closeButton: {
    padding: 5,
  },
  waveSection: {
    alignItems: "center",
    marginVertical: 10,
  },
  recordingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  statusContainer: {
    flex: 1,
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusText: {
    fontSize: 14,
    color: Colors.text,
  },
  recordActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    gap: 5,
  },
  stopButton: {
    backgroundColor: "#ff4444",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  recordActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  transcriptText: {
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
    marginTop: 5,
  },
});

export default RecordingCard;