import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "../utils/Colors";

export default function MessageCard({ message, style }) {
  return (
    <View
      style={styles.gradientBorder}
    >
      <View  style={[styles.messageInner, style]}>
        <Text style={styles.messageText}>{message.text}</Text>
        <Text style={styles.messageTime}>{message.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 10,
    marginVertical: 6,
    borderColor: Colors.bg + "90",
    borderWidth: 1,
  },
  messageInner: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Colors.bg + "40",
    borderRadius: 10,
    padding: 14,
  },
  messageText: {
    flex: 1,
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  messageTime: {
    color: Colors.text,
    fontSize: 12,
    textAlign: "right",
    alignSelf: 'flex-end',
    marginTop: 0,
  },
});
