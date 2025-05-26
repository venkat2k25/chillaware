import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Image } from "expo-image";
import Carousel from "react-native-reanimated-carousel";
import Header from "../layouts/Header";
import Colors from "../utils/Colors";
import fillerImage from "../assets/boy.png";
import Stock from "../assets/stock.png";
import ExpiryBillboard from "./ExpiryBillboard";

const windowWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const navigation = useNavigation();
  const [featuredItems] = useState([
  {
    id: 1,
    title: "Upload Invoice",
    description: "Add invoices directly to inventory",
    image: Stock,
  },
  {
    id: 2,
    title: "Inventory Filter",
    description: "Filter by category and search items",
    image: Stock,
  },
  {
    id: 3,
    title: "Smart Recipe Suggestions",
    description: "Recipes based on diet, servings, and food type",
    image: Stock,
  },
  {
    id: 4,
    title: "Virtual Fridge",
    description: "View and manage fridge contents with photos",
    image: Stock,
  },
]);


  return (
    <LinearGradient
      colors={[Colors.bg, Colors.background]}
      style={styles.container}
    >
      <Header />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(600)} style={styles.card}>
          <View style={styles.circleContainer}>
            <Image
              style={styles.image}
              source={fillerImage}
              contentFit="contain"
              transition={1000}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.text}>No More</Text>
            <Text style={styles.htext}> Grocery </Text>
            <Text style={styles.text}>Guesswork</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.carouselContainer}>
          <Text style={styles.carouselTitle}>Featured Content</Text>
          <Carousel
            loop
            width={windowWidth - 30}
            height={150}
            autoPlay
            data={featuredItems}
            scrollAnimationDuration={1000}
            renderItem={({ item }) => (
              <View style={styles.carouselItem}>
                <Image
                  style={styles.carouselImage}
                  source={item.image}
                  contentFit="contain"
                  transition={1000}
                />
                <View style={styles.carouselTextContainer}>
                  <Text style={styles.carouselItemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.carouselItemDescription} numberOfLines={2}>{item.description}</Text>
                </View>
              </View>
            )}
          />
        </Animated.View>

        <ExpiryBillboard navigation={navigation} />
      </ScrollView>
    </LinearGradient>
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
  card: {
    width: "100%",
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: "hidden",
  },
  circleContainer: {
    width: windowWidth * 0.6,
    height: windowWidth * 0.6,
    borderRadius: windowWidth * 0.3,
    overflow: "hidden",
    marginTop: 20,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: windowWidth * 0.3,
  },
  textContainer: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: Colors.text,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Syne-Bold",
  },
  htext: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Syne-ExtraBold",
  },
  carouselContainer: {
    marginTop: 20,
    marginBottom: 0,
    alignItems: "center",
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 20,
    fontFamily: "Syne-Bold",
  },
  carouselItem: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 25,
    marginHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  carouselImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 25,
  },
  carouselTextContainer: {
    flex: 1,
  },
  carouselItemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    fontFamily: "Syne-Bold",
  },
  carouselItemDescription: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: "Syne-Regular",
  },
});