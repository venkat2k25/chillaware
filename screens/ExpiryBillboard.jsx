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
import defaultFallbackImage from '../assets/empty.jpg';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import ConfettiCannon from "react-native-confetti-cannon";
import Colors from "../utils/Colors";
import clickSound from "../assets/click.wav";
import { Audio } from "expo-av";
import { foodItem } from "../json/foodItems";

const windowWidth = Dimensions.get("window").width;


const getImageForProduct = (productName) => {
  if (!productName) return null;
  
  const normalized = productName.trim().toLowerCase();

  const matchedItem = foodItem.find((item) => {
    const regex = new RegExp(item.name.replace(/\s+/g, "\\s*"), "i"); 
    return regex.test(normalized);
  });

  return matchedItem ? matchedItem.link : null;
};

const StockItem = ({
  item,
  index,
  scrollX,
  scaleValues,
  onPress,
  onPressIn,
   used,
  onUse,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(scrollX.value / 100 + index) * 10 },
      { scale: scaleValues.value[item.id] || 1 },
    ],
    shadowOpacity:
      item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7
        ? withTiming(0.5, { duration: 1000 })
        : 0,
    shadowRadius:
      item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7
        ? withTiming(10, { duration: 1000 })
        : 0,
  }));

  const getGradientColors = (daysUntilExpiry) => {
    if (daysUntilExpiry !== undefined) {
      if (daysUntilExpiry <= 7) return [Colors.bg, Colors.bg];
      if (daysUntilExpiry <= 30) return [Colors.bg, Colors.bg];
      return [Colors.bg, Colors.bg];
    }
    // Default gradient if no expiry info
    return [Colors.bg, Colors.bg];
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
            source={{ uri: getImageForProduct(item.productName) || defaultFallbackImage }}
            contentFit="cover"
            transition={1000}
          />
        </View>
        <Text style={styles.billboardItemName}>{item.productName}</Text>
        <Text style={styles.billboardItemDetails}>
          {item.quantity || 1} {item.quantity > 1 ? "items" : "item"}
        </Text>
     {(item.daysUntilExpiry === 0 || (item.daysUntilExpiry > 0 && item.daysUntilExpiry <= 7)) && (
  <Text style={styles.billboardItemExpiry}>
    {item.daysUntilExpiry === 0
      ? "Expires Today"
      : `Expires in ${item.daysUntilExpiry} day${item.daysUntilExpiry > 1 ? 's' : ''}`}
  </Text>
)}

        <TouchableOpacity
          style={styles.billboardButton}
          onPressIn={onPressIn}
           onPress={() => {
            if (!used) onUse(item.id);
          }}
          disabled={used}
        >
          <Text style={styles.billboardButtonText}>{used ? "Used" : "Use"}</Text>
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
  const [inventory, setInventory] = useState([]);
const [usedItems, setUsedItems] = useState({});

  const handleUse = (id) => {
    setUsedItems((prev) => ({ ...prev, [id]: true }));
    playSound();
    Vibration.vibrate(10);

    const usedItem = sortedItems.find((item) => item.id === id);
    if (usedItem && usedItem.daysUntilExpiry !== undefined && usedItem.daysUntilExpiry <= 7) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  };

  // Load inventory from AsyncStorage on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const data = await AsyncStorage.getItem("inventory");
        if (data) {
          const parsedData = JSON.parse(data);
          // Add calculated daysUntilExpiry and quantity (default 1 if missing)
          const formattedData = parsedData.map((item, index) => {
            const expiryDateObj = new Date(item.expiry_date);
            const daysUntilExpiry = isNaN(expiryDateObj)
              ? undefined
              : Math.ceil(
                  (expiryDateObj.getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
            return {
              id: index.toString(),
              productName: item.item || "Unknown Item",
              expiryDate: item.expiry_date || "N/A",
              daysUntilExpiry,
              quantity: item.quantity || 1,
              originalIndex: index,
            };
          });
          setInventory(formattedData);
        } else {
          setInventory([]); // no data found
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
      }
    };

    loadInventory();
  }, []);

  // Sort and filter inventory based on daysUntilExpiry and filter
  const sortedItems = useMemo(() => {
  return inventory
    .filter(item => item.daysUntilExpiry !== undefined)  // exclude items with no expiry date
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .filter((item) => {
      if (filter === "urgent") return item.daysUntilExpiry <= 7;
      if (filter === "soon") return item.daysUntilExpiry <= 30;
      return true;
    });
}, [filter, inventory]);


  // Initialize scale values and animate urgent items
  useEffect(() => {
    if (sortedItems.length === 0) {
      scaleValues.value = {};
      return;
    }
    const initialScales = sortedItems.reduce((acc, item) => {
      acc[item.id] = 1;
      return acc;
    }, {});
    scaleValues.value = initialScales;

    const urgentItems = sortedItems.filter(
      (item) => item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7
    );

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

  // Play click sound on press
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

  return (
    <Animated.View
      entering={FadeInUp.delay(600).duration(600)}
      style={styles.billboardContainer}
    >
      <View style={styles.filterContainer}>
        <Text style={styles.billboardTitle}>Expiring Soon</Text>
        {/* Uncomment if you want filter buttons */}
        {/* <View style={styles.filterButtons}>
          {["All", "Urgent", "Soon"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterButton,
                filter.toLowerCase() === option.toLowerCase() &&
                  styles.filterButtonActive,
              ]}
              onPress={() => setFilter(option.toLowerCase())}
            >
              <Text style={styles.filterButtonText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View> */}
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
        {sortedItems.map((item, index) => (
          <StockItem
            key={item.id}
            item={item}
            index={index}
            scrollX={scrollX}
            scaleValues={scaleValues}
            onPressIn={() => {
              Vibration.vibrate(10);
              playSound();
              if (item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 2000);
              }
            }}
            onUse={handleUse}
            used={usedItems[item.id]}
          />
        ))}
      </ScrollView>
      {showConfetti &&
        sortedItems.some(
          (item) => item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7
        ) && (
          <ConfettiCannon
            count={50}
            origin={{ x: windowWidth * 0.35, y: 0 }}
            autoStart
            fadeOut
          />
        )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  billboardContainer: {
    marginVertical: 0,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
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
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  imageContainer: {
    alignItems: "center",
  },
  billboardImage: {
    width: 'auto',
    height: 120,
    borderRadius: 12,
  },
  billboardItemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.secondary,
    marginTop: 10,
    fontFamily: "Syne-Bold",
    textAlign: "center",
  },
  billboardItemDetails: {
    fontSize: 16,
    color: Colors.secondary,
    marginTop: 4,
    fontFamily: "Syne-SemiBold",
    textAlign: "center",
  },
  billboardItemExpiry: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "Syne-Bold",
  },
  billboardButton: {
    marginTop: 10,
    backgroundColor: Colors.text + '80',
    paddingVertical: 8,
    borderRadius: 12,
  },
  billboardButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
    fontFamily: "Syne-Medium",
  },
});

export default ExpiryBillboard;
