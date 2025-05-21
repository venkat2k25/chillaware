import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import CustomHeader from "../layouts/CustomHeader";
import MessageCard from "../components/MessageCard";
import Colors from "../utils/Colors";

const Messages = [
  {
    id: 1,
    text: "Your broccoli called. It’s wilting in despair. 🥦",
    time: "2 mins ago"
  },
  {
    id: 2,
    text: "You’ve got 24 hours before the tomatoes rebel 🍅⏰.",
    time: "10 mins ago"
  },
  {
    id: 3,
    text: "Still edible, still incredible! Use it before you lose it 👏",
    time: "30 mins ago"
  },
  {
    id: 4,
    text: "Don’t ghost your spinach. It deserves a second chance 💚",
    time: "1 hour ago"
  },
  {
    id: 5,
    text: "Turn that sad carrot into a happy soup 🥕✨",
    time: "2 hours ago"
  },
  {
    id: 6,
    text: "Hey snack 😘… rescue the real ones before they expire 💅",
    time: "3 hours ago"
  },
  {
    id: 7,
    text: "Don’t romanticize red flags — or red meats past their prime. 🥩🚩",
    time: "5 hours ago"
  },
  {
    id: 8,
    text: "Aww… your apples are getting old. Give them a sweet goodbye in a pie 🥧🍎",
    time: "Yesterday"
  },
  {
    id: 9,
    text: "Someone’s rotting… and it’s not your vibe 💅🍌",
    time: "Yesterday"
  },
  {
    id: 10,
    text: "Still fresh, still fabulous. Just like you 🫶💚",
    time: "2 days ago"
  },
  {
    id: 11,
    text: "Psst… the berries are blushing. They want to be picked 🫐💕",
    time: "2 days ago"
  }
];



export default function NotificationScreen() {
  return (
    <View style={styles.container}>
      <CustomHeader title={"Notifications"} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} >
        {Messages.map((item) => (
          <MessageCard key={item.id} message={item} />
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
  content: {
    paddingTop: 80,
    paddingHorizontal: 15,
  },
});
