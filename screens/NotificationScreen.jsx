import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "../layouts/CustomHeader";
import MessageCard from "../components/MessageCard";
import Colors from "../utils/Colors";
import { useFocusEffect } from "@react-navigation/native";

const SENTENCES = [
  "⏳ Hurry up! Only 24 hours left before the {title product} vanishes into the void.",
  "⏰ Tick-tock... The {title product} deal disappears tomorrow! 🕛",
  "⚡ The clock’s running out — grab your {title product} before it’s history! 📦",
  "🚨 Final countdown: The {title product} exits in just one day! 🔥",
  "👋 Say goodbye to {title product} — it's almost gone for good!",
  "⛔ Last chance! Your {title product} rebels at midnight! 🌙",
  "⌛ Time’s almost up — don’t let the {title product} escape your grasp! 🏃‍♂️",
  "⚠️ Warning: {title product} is in its final hours. Don’t miss it! 🕒",
  "🫣 The end is near — {title product} won’t stick around much longer.",
  "👀 Blink and you’ll miss it — {title product} expires in 24 hours! 🚀",
];

export default function NotificationScreen() {
  const [inventory, setInventory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifiedIds, setNotifiedIds] = useState([]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (days > 5) return "a long time ago";
    if (days > 1) return `${days} days ago`;
    if (days === 1) return "1 day ago";
    if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes >= 1) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const loadInventoryAndMessages = async () => {
    try {
      const invData = await AsyncStorage.getItem("inventory");
      const msgData = await AsyncStorage.getItem("messages");
      if (invData) {
        const parsed = JSON.parse(invData);
        const formatted = parsed.map((item, i) => ({
          id: i.toString(),
          productName: item.item || "Unknown",
          expiryDate: item.expiry_date || "N/A",
        }));
        setInventory(formatted);
      }
      if (msgData) {
        const parsed = JSON.parse(msgData);
        setMessages(parsed);
        const ids = parsed.map((m) => m.idRef).filter(Boolean);
        setNotifiedIds(ids);
      }
    } catch (e) {
      console.error("Loading Error", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInventoryAndMessages();
    }, [])
  );

  useEffect(() => {
    const checkExpiryAndNotify = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const newMessages = [];

      for (const item of inventory) {
        if (item.expiryDate === tomorrowStr && !notifiedIds.includes(item.id)) {
          const template = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
          const messageText = template.replace("{title product}", item.productName);
          const newMessage = {
            id: Date.now() + Math.random(),
            idRef: item.id, // To prevent duplicate
            text: messageText,
            time: new Date().toISOString(),
          };
          newMessages.push(newMessage);
        }
      }

      if (newMessages.length > 0) {
        const updated = [...newMessages, ...messages];
        setMessages(updated);
        setNotifiedIds((prev) => [...prev, ...newMessages.map((m) => m.idRef)]);
        try {
          await AsyncStorage.setItem("messages", JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to store messages", err);
        }
      }
    };

    if (inventory.length > 0) checkExpiryAndNotify();
  }, [inventory]);

  const handleClearMessages = async () => {
    setMessages([]);
    setNotifiedIds([]);
    try {
      await AsyncStorage.removeItem("messages");
    } catch (err) {
      console.error("Failed to clear messages:", err);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Notifications" />
      <View style={styles.topBar}>
        <Text style={styles.heading}>Messages</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClearMessages}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <MessageCard key={msg.id} message={{ ...msg, time: getTimeAgo(msg.time) }} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 75,
    paddingBottom: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.primary,
  },
  clearText: {
    fontSize: 12,
    textDecorationLine: "underline",
    paddingBottom: 3,
    color: Colors.text,
    fontWeight: "bold",
  },
  content: {
    paddingHorizontal: 15,
  },
});
