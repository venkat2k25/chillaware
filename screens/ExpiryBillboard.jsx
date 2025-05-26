import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import ConfettiCannon from "react-native-confetti-cannon";
import Colors from "../utils/Colors";
import Egg from "../assets/egg.png";
import Milk from "../assets/milk.png";
import Yogurt from "../assets/yogurt.png";
import Cheese from "../assets/cheese.png";
import clickSound from "../assets/click.wav";
import { Audio } from "expo-av";

const windowWidth = Dimensions.get("window").width;

// Mock stock data with expiry dates
const mockStockItems = [
  { id: 1, name: "Milk", expiryDate: "2025-06-01", quantity: 2, image: Milk },
  { id: 2, name: "Eggs", expiryDate: "2025-05-30", quantity: 12, image: Egg },
  { id: 3, name: "Yogurt", expiryDate: "2025-06-15", quantity: 4, image: Yogurt },
  { id: 4, name: "Cheese", expiryDate: "2025-07-01", quantity: 1, image: Cheese },
];

// Component for individual stock items
const StockItem = ({ item, index, scrollX, scaleValues, onPress, onPressIn }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(scrollX.value / 100 + index) * 10 },
      { scale: scaleValues.value[item.id] || 1 },
    ],
    shadowOpacity: item.daysUntilExpiry <= 7 ? withTiming(0.5, { duration: 1000 }) : 0,
    shadowRadius: item.daysUntilExpiry <= 7 ? withTiming(10, { duration: 1000 }) : 0,
  }));

  const getGradientColors = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 7) return ["#FF6B6B", "#FF8E8E"];
    if (daysUntilExpiry <= 30) return ["#FFB74D", "#FFD54F"];
    return [Colors.bg, "#81C784"];
  };

  return (
    <Animated.View style={[styles.billboardCard, animatedStyle]}>
      <LinearGradient
        colors={getGradientColors(item.daysUntilExpiry)}
        style={styles.billboardCardGradient}
      >
        <View style={styles.imageContainer}>
          <Image
            style={styles.billboardImage}
            source={item.image}
            contentFit="contain"
            transition={1000}
          />
        </View>
        <Text style={styles.billboardItemName}>{item.name}</Text>
        <Text style={styles.billboardItemDetails}>
          {item.quantity} {item.quantity > 1 ? "items" : "item"}
        </Text>
        <Text style={styles.billboardItemExpiry}>
          Expires in {item.daysUntilExpiry} days
        </Text>
        <TouchableOpacity
          style={styles.billboardButton}
          onPressIn={onPressIn}
          onPress={onPress}
        >
          <Text style={styles.billboardButtonText}>Manage</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const ExpiryBillboard = ({ navigation }) => {
  const [filter, setFilter] = useState("all");
  const [showConfetti, setShowConfetti] = useState(false);
  const scrollX = useSharedValue(0);
  const scaleValues = useSharedValue({});

  // Initialize stockItems synchronously
  const [stockItems, setStockItems] = useState(
    (mockStockItems || []).map((item) => ({
      ...item,
      daysUntilExpiry: Math.ceil(
        (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }))
  );

  // Memoize sorted and filtered items
  const sortedItems = useMemo(() => {
    return (mockStockItems || [])
      .map((item) => {
        const expiry = new Date(item.expiryDate);
        const daysUntilExpiry = isNaN(expiry)
          ? Infinity
          : Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
        return { ...item, daysUntilExpiry };
      })
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .filter((item) => {
        if (filter === "urgent") return item.daysUntilExpiry <= 7;
        if (filter === "soon") return item.daysUntilExpiry <= 30;
        return true;
      });
  }, [filter]);

  // Memoize playSound to prevent unnecessary recreations
  const playSound = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(clickSound);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {
      console.log("Sound error:", error);
    }
  }, []);

  useEffect(() => {
    // Guard against undefined mockStockItems
    if (!mockStockItems) {
      setStockItems([]);
      scaleValues.value = {};
      return;
    }

    // Initialize scale values for all items
    const initialScales = mockStockItems.reduce((acc, item) => {
      acc[item.id] = 1;
      return acc;
    }, {});
    scaleValues.value = initialScales;

    // Update stockItems
    setStockItems(sortedItems);

    // Pulse animation for urgent items
    const urgentItems = sortedItems.filter((item) => item.daysUntilExpiry <= 7);
    let interval;
    if (urgentItems.length > 0) {
      interval = setInterval(() => {
        scaleValues.value = {
          ...scaleValues.value,
          ...urgentItems.reduce((acc, item) => {
            acc[item.id] = scaleValues.value[item.id] === 1 ? 1.05 : 1;
            return acc;
          }, {}),
        };
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sortedItems, scaleValues]);

  return (
    <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.billboardContainer}>
      <View style={styles.filterContainer}>
        <Text style={styles.billboardTitle}>Expiring Soon</Text>
        <View style={styles.filterButtons}>
          {["All", "Urgent", "Soon"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.filterButton, filter.toLowerCase() === option.toLowerCase() && styles.filterButtonActive]}
              onPress={() => setFilter(option.toLowerCase())}
            >
              <Text style={styles.filterButtonText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.billboardScroll}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      >
        {stockItems.map((item, index) => (
          <StockItem
            key={item.id}
            item={item}
            index={index}
            scrollX={scrollX}
            scaleValues={scaleValues}
            onPressIn={() => {
              Vibration.vibrate(10);
              playSound();
              if (item.daysUntilExpiry <= 7) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 2000); // Reset confetti
              }
            }}
            onPress={() => {
              try {
                navigation.navigate("InstructionNav", { screen: "StockInstructionScreen", params: { itemId: item.id } });
              } catch (error) {
                console.error("Navigation error:", error);
              }
            }}
          />
        ))}
      </ScrollView>
      {showConfetti && stockItems.some((item) => item.daysUntilExpiry <= 7) && (
        <ConfettiCannon count={50} origin={{ x: windowWidth * 0.35, y: 0 }} autoStart fadeOut />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  billboardContainer: {
    marginVertical: 20,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 10,
  },
  billboardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.secondary,
    fontFamily: "Syne-Bold",
  },
  filterButtons: {
    flexDirection: "row",
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginLeft: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.bg,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.secondary,
    fontFamily: "Syne-SemiBold",
  },
  billboardScroll: {
    paddingVertical: 10,
  },
  billboardCard: {
    width: windowWidth * 0.7,
    marginHorizontal: 10,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
  },
  billboardCardGradient: {
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  billboardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  billboardItemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    fontFamily: "Syne-Bold",
  },
  billboardItemDetails: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginVertical: 5,
    fontFamily: "Syne-Regular",
  },
  billboardItemExpiry: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "Syne-SemiBold",
  },
  billboardButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  billboardButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.bg,
    fontFamily: "Syne-SemiBold",
  },
});

export default ExpiryBillboard;