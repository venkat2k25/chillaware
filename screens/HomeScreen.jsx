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
    { id: 1, title: "Recent Scan", description: "Tomato Sauce", image: Stock },
    { id: 2, title: "Featured Recipe", description: "Spaghetti Bolognese", image: Stock },
    { id: 3, title: "Stock Item", description: "Olive Oil", image: Stock },
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
                  <Text style={styles.carouselItemTitle}>{item.title}</Text>
                  <Text style={styles.carouselItemDescription}>{item.description}</Text>
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
    backgroundColor: "#131417",
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
    color: Colors.secondary,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Syne-Bold",
  },
  htext: {
    color: Colors.bg,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Syne-ExtraBold",
  },
  carouselContainer: {
    marginVertical: 20,
    alignItems: "center",
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 10,
    fontFamily: "Syne-Bold",
  },
  carouselItem: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  carouselImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
  },
  carouselTextContainer: {
    flex: 1,
  },
  carouselItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.bg,
    fontFamily: "Syne-Bold",
  },
  carouselItemDescription: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: "Syne-Regular",
  },
});