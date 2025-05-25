import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Image,
} from "react-native";
import placeholderImage from '../assets/empty.jpg';
import Svg, { Path, Line } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import Header from "../layouts/Header";
import Colors from "../utils/Colors";
import Ionicons from "@expo/vector-icons/Ionicons";

// VoiceWave Component
const VoiceWave = ({ isRecording, audioLevels }) => {
  const animatedValues = useRef(
    Array.from({ length: 15 }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    if (isRecording) {
      const animate = () => {
        const animations = animatedValues.map((value, index) => {
          const baseHeight = 0.2;
          const targetHeight = Math.min(
            0.9,
            baseHeight + (audioLevels[index] || Math.random() * 0.6)
          );
          return Animated.timing(value, {
            toValue: targetHeight,
            duration: 150,
            useNativeDriver: false,
          });
        });

        Animated.stagger(20, animations).start(() => {
          if (isRecording) {
            setTimeout(animate, 50);
          }
        });
      };
      animate();
    } else {
      const resetAnimations = animatedValues.map((value) =>
        Animated.timing(value, {
          toValue: 0.2,
          duration: 300,
          useNativeDriver: false,
        })
      );
      Animated.parallel(resetAnimations).start();
    }
  }, [isRecording]);

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
              backgroundColor: isRecording ? Colors.bg : Colors.background,
              opacity: isRecording ? 1 : 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
};

// RecordingCard Component
const RecordingCard = ({
  visible,
  onClose,
  onStopRecording,
  isRecording,
  audioLevels,
  itemName,
  recordingState,
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
    if (isRecording) {
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
          if (isRecording) pulse();
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
  }, [isRecording]);

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
          <Text style={styles.recordingSubtitle}>{itemName}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.waveSection}>
        <VoiceWave isRecording={isRecording} audioLevels={audioLevels} />
      </View>

      <View style={styles.recordingActions}>
        <View style={styles.statusContainer}>
          {recordingState === "processing" ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={Colors.background} />
              <Text style={styles.statusText}>Processing...</Text>
            </View>
          ) : isRecording ? (
            <Text style={styles.statusText}>🔴 Recording...</Text>
          ) : (
            <Text style={styles.statusText}>Ready to record</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.recordActionButton,
            isRecording && styles.stopButton,
            recordingState === "processing" && styles.disabledButton,
          ]}
          onPress={isRecording ? onStopRecording : null}
          disabled={recordingState === "processing"}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={18}
            color="white"
          />
          <Text style={styles.recordActionText}>
            {isRecording ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.recordingHint}>
        Say: "Expires May 15th 2025" or "Best before June 2026"
      </Text>
    </Animated.View>
  );
};

// FoodItem Array
const foodItem = [
  {
    name: "eggs",
    link: "https://images.pexels.com/photos/4045561/pexels-photo-4045561.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  },
  {
    name: "milk",
    link: "https://images.pexels.com/photos/2198626/pexels-photo-2198626.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  {
    name: "bread",
    link: "https://assets.bonappetit.com/photos/5c62e4a3e81bbf522a9579ce/1:1/w_1920,c_limit/milk-bread.jpg",
  },
  {
    name: "double cream",
    link: "https://www.spar.co.uk/media/lttcmxsg/5bbc048c-7bfb-4acf-a0e1-7f5243bc2ab1.jpg?anchor=center&mode=crop&heightratio=1&width=720&format=webp&quality=80&rnd=133051920326000000",
  },
  {
    name: "sweetcorn",
    link: "https://images.pexels.com/photos/547263/pexels-photo-547263.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  {
    name: "green pesto",
    link: "https://theviewfromgreatisland.com/wp-content/uploads/2022/08/basil-pesto-Genovese-3132-August-28-2022-2.jpg",
  },
  {
    name: "moroccan salmon",
    link: "https://www.feastingathome.com/wp-content/uploads/2016/02/moroccan-salmon-106-1.jpg",
  },
  {
    name: "carrot",
    link: "https://t4.ftcdn.net/jpg/02/28/90/67/360_F_228906712_r4bb71gSmKvyDHq54JvjXAhKWpQiqWvX.jpg",
  },
  {
    name: "avocado",
    link: "https://nutritionsource.hsph.harvard.edu/wp-content/uploads/2022/04/pexels-antonio-filigno-8538296-1024x657.jpg",
  },
  {
    name: "tomato",
    link: "https://t4.ftcdn.net/jpg/03/27/96/23/360_F_327962332_6mb5jQLnTOjhYeXML7v45Hc5eED2GYOD.jpg",
  },
  {
    name: "yoghurt",
    link: "https://images.getrecipekit.com/20240109191538-homemade-yogurt.jpg?width=650&quality=90&",
  },
  {
    name: "cucumber",
    link: "https://th.bing.com/th/id/OIP.VKG1qNp4bQnOTWVzO1DJiwHaEo?cb=iwp2&rs=1&pid=ImgDetMain",
  },
];

// ProductCard Component
const ProductCard = ({ item, onMicPress, onDeletePress, recordingState }) => {
  const date = new Date(item.purchaseDate);
  const formattedDate = date.toLocaleDateString('default', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const match = foodItem.find((food) =>
    item.productName.toLowerCase().includes(food.name.toLowerCase())
  );

  return (
    <View style={styles.productCard}>
      <Image
        source={match ? { uri: match.link } : placeholderImage}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName} ({item.quantity})
        </Text>
        {item.weight !== "N/A" && (
          <Text style={styles.productDetail}>📟 {item.weight}</Text>
        )}
        <Text style={styles.productDetail}>🛒 {formattedDate}</Text>
        {item.expiryDate !== "N/A" && (() => {
          const date = new Date(item.expiryDate);
          const formattedDate = date.toLocaleDateString('default', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          return <Text style={styles.productDetail}>⏰ {formattedDate}</Text>;
        })()}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.micIconContainer,
              recordingState === "recording" && styles.micRecording,
            ]}
            onPress={onMicPress}
            disabled={recordingState === "processing"}
          >
            {recordingState === "processing" ? (
              <ActivityIndicator size={12} color={Colors.background} />
            ) : (
              <Ionicons
                name={recordingState === "recording" ? "stop" : "mic"}
                size={12}
                color={Colors.background}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteIconContainer}
            onPress={onDeletePress}
          >
            <Ionicons name="trash-outline" size={12} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Subcategory JSON
const subcategories = {
  "🥦 Vegetarian": {
    "Leafy Vegetables": ["Spinach", "Lettuce", "Kale", "Cabbage"],
    "Root Vegetables": ["Carrot", "Potato", "Beetroot", "Radish"],
    "Cruciferous Vegetables": ["Broccoli", "Cauliflower", "Brussels Sprouts"],
    "Other Vegetables": ["Cucumber", "Onion", "Tomato", "Bell Pepper", "Zucchini", "Aubergine"],
  },
  "🍗 Non-Vegetarian": {
    "Poultry": ["Chicken Breast", "Chicken Thigh", "Turkey"],
    "Red Meat": ["Beef", "Lamb", "Pork"],
    "Seafood": ["Salmon", "Tuna", "Shrimp", "Crab"],
    "Eggs": ["Chicken Eggs", "Quail Eggs", "Eggs"],
  },
  "🥛 Dairy Products": {
    "Milk": ["Whole Milk", "Skim Milk", "Almond Milk", "Soy Milk", "Oat Milk"],
    "Cheese": ["Cheddar", "Mozzarella", "Parmesan", "Cream Cheese"],
    "Yogurt": ["Plain Yogurt", "Greek Yogurt", "Flavored Yogurt", "Yoghurt"],
    "Butter & Cream": ["Salted Butter", "Unsalted Butter", "Heavy Cream", "Double Cream"],
  },
  "🧃 Drinks & Beverages": {
    "Soft Drinks": ["Cola", "Lemonade", "Ginger Ale"],
    "Juices": ["Orange Juice", "Apple Juice", "Mango Juice"],
    "Tea & Coffee": ["Green Tea", "Black Coffee", "Herbal Tea"],
    "Alcoholic Beverages": ["Beer", "Wine", "Whiskey"],
    "Water": ["Still Water", "Sparkling Water"],
  },
  "🍿 Snacks": {
    "Chips & Crisps": ["Potato Chips", "Tortilla Chips", "Pita Chips"],
    "Nuts & Seeds": ["Almonds", "Cashews", "Sunflower Seeds", "Nuts"],
    "Popcorn": ["Butter Popcorn", "Caramel Popcorn"],
    "Candy & Sweets": ["Chocolate Bars", "Gummies", "Hard Candy", "Caramel", "Strawberry Laces", "Oreo"],
  },
  "🌿 Greens & Herbs": {
    "Fresh Herbs": ["Basil", "Cilantro", "Parsley", "Mint"],
    "Salad Greens": ["Arugula", "Romaine", "Mixed Greens", "Spinach"],
    "Microgreens": ["Pea Shoots", "Radish Sprouts", "Sunflower Sprouts"],
  },
  "🧂 Condiments & Essentials": {
    "Sauces": ["Ketchup", "Mustard", "Soy Sauce", "Hot Sauce", "Pesto", "Houmous"],
    "Spices": ["Black Pepper", "Cumin", "Paprika", "Turmeric"],
    "Oils": ["Olive Oil", "Vegetable Oil", "Coconut Oil"],
    "Vinegars": ["Balsamic Vinegar", "Apple Cider Vinegar", "White Vinegar"],
  },
  "🌾 Grains & Staples": {
    "Rice": ["White Rice", "Brown Rice", "Basmati Rice", "Quinoa"],
    "Pasta": ["Spaghetti", "Penne", "Fusilli", "Noodles"],
    "Flours": ["All-Purpose Flour", "Whole Wheat Flour", "Almond Flour"],
    "Legumes": ["Lentils", "Chickpeas", "Black Beans", "Mixed Pulses", "Green Pea"],
  },
  "🥐 Bakery & Breakfast Items": {
    "Bread": ["White Bread", "Sourdough", "Whole Grain Bread", "Rye Bread", "Brioche", "Multigrain Thins"],
    "Pastries": ["Croissant", "Danish", "Muffin"],
    "Cereals": ["Oatmeal", "Corn Flakes", "Granola"],
    "Breakfast Spreads": ["Peanut Butter", "Jam", "Honey", "Maple"],
  },
};

const GEMINI_API_KEY = "AIzaSyD57P0SmXEGmRorqT9qh2ngZ8Cgnbt-wAk";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const DEEPGRAM_API_KEY = "22b51946896734c28b59d086c3f758aa4e0db542";
const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryData, setInventoryData] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStates, setRecordingStates] = useState({});
  const [recording, setRecording] = useState(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [currentRecordingItem, setCurrentRecordingItem] = useState(null);
  const [audioLevels, setAudioLevels] = useState(Array(20).fill(0.1));
  const audioLevelInterval = useRef(null);
  const numColumns = 1;

  // State for category filters
  const [selected, setSelected] = useState([]);

  const category = [
    "🥦 Vegetarian",
    "🍗 Non-Vegetarian",
    "🥛 Dairy Products",
    "🧃 Drinks & Beverages",
    "🍿 Snacks",
    "🌿 Greens & Herbs",
    "🧂 Condiments & Essentials",
    "🌾 Grains & Staples",
    "🥐 Bakery & Breakfast Items",
  ];

  useEffect(() => {
    loadInventoryData();
    setupAudio();

    return () => {
      if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current);
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error("Error setting up audio:", error);
    }
  };

  const assignCategoryAndSubcategory = (itemName) => {
    let parentCategory = "Unknown Category";
    let subCategory = "Unknown Subcategory";

    // Normalize itemName for matching
    const normalizedItem = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // Search through subcategories
    for (const [parent, subCats] of Object.entries(subcategories)) {
      for (const [subCat, items] of Object.entries(subCats)) {
        if (
          items.some((subItem) =>
            normalizedItem.includes(subItem.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
          ) ||
          normalizedItem.includes(subCat.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
        ) {
          parentCategory = parent;
          subCategory = subCat;
          return { parentCategory, subCategory };
        }
      }
    }

    // Fallback mappings for specific items
    if (normalizedItem.includes("strawbs") || normalizedItem.includes("strawberry")) {
      parentCategory = "🥦 Vegetarian";
      subCategory = "Other Vegetables";
    } else if (normalizedItem.includes("tofu")) {
      parentCategory = "🥦 Vegetarian";
      subCategory = "Other Vegetables";
    } else if (normalizedItem.includes("apple")) {
      parentCategory = "🥦 Vegetarian";
      subCategory = "Other Vegetables";
    } else if (normalizedItem.includes("banana")) {
      parentCategory = "🥦 Vegetarian";
      subCategory = "Other Vegetables";
    }

    return { parentCategory, subCategory };
  };

  const loadInventoryData = async () => {
    try {
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        console.log("Loaded inventory:", parsedData);
        const formattedData = parsedData.map((item, index) => {
          const { parentCategory, subCategory } = assignCategoryAndSubcategory(item.item);
          return {
            id: index.toString(),
            productName: item.item || "Unknown Item",
            quantity: item.quantity || 0,
            purchaseDate: item.purchase_date || "Unknown Date",
            weight: item.weight || "N/A",
            expiryDate: item.expiry_date || "N/A",
            parentCategory: item.parentCategory || parentCategory,
            subCategory: item.subCategory || subCategory,
            originalIndex: index,
          };
        });

        setInventoryData(formattedData);

        // Update AsyncStorage with assigned categories
        const updatedData = formattedData.map((item) => ({
          item: item.productName,
          quantity: item.quantity,
          purchase_date: item.purchaseDate,
          weight: item.weight,
          expiry_date: item.expiryDate,
          parentCategory: item.parentCategory,
          subCategory: item.subCategory,
        }));
        await AsyncStorage.setItem("inventory", JSON.stringify(updatedData));
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    }
  };

  const startRecording = async (itemId) => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }

      console.log("Starting recording for item:", itemId);
      const item = inventoryData.find((item) => item.id === itemId);
      setCurrentRecordingItem(item);
      setShowRecordingModal(true);
      setRecordingStates((prev) => ({ ...prev, [itemId]: "recording" }));
      setIsRecording(true);

      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          const normalizedLevel = Math.max(
            0,
            Math.min(1, (status.metering + 60) / 60)
          );
          updateAudioLevels(normalizedLevel);
        }
      });

      await newRecording.startAsync();
      setRecording(newRecording);

      startAudioLevelSimulation();

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Failed to start recording:", error);
      setRecordingStates((prev) => ({ ...prev, [itemId]: null }));
      setIsRecording(false);
      setShowRecordingModal(false);
      Alert.alert("Error", "Failed to start recording. Please check microphone permissions.");
    }
  };

  const updateAudioLevels = (newLevel) => {
    setAudioLevels((prev) => {
      const newLevels = [...prev.slice(1), newLevel];
      return newLevels;
    });
  };

  const startAudioLevelSimulation = () => {
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
    }

    audioLevelInterval.current = setInterval(() => {
      const randomLevel = Math.random() * 0.8 + 0.2;
      updateAudioLevels(randomLevel);
    }, 100);
  };

  const stopAudioLevelSimulation = () => {
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }
  };

  const stopRecording = async () => {
    try {
      console.log("🛑 Stopping recording...");

      if (!recording || !currentRecordingItem) {
        console.log("❌ No recording or item found");
        return;
      }

      const itemId = currentRecordingItem.id;
      console.log("📦 Processing item:", itemId, currentRecordingItem.productName);

      setRecordingStates((prev) => ({ ...prev, [itemId]: "processing" }));
      setIsRecording(false);
      stopAudioLevelSimulation();

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("🎵 Audio saved to:", uri);

      const expiryDate = await processAudioWithGemini(uri);

      if (expiryDate) {
        console.log("✅ SUCCESS! Updating item with expiry date:", expiryDate);
        await updateItemExpiryDate(itemId, expiryDate);
        console.log("💾 Item updated in storage");
        Alert.alert("Success! 🎉", `Expiry date updated to: ${expiryDate}`);
      } else {
        console.log("❌ FAILED: Could not extract expiry date");
        Alert.alert(
          "Could not understand 🤔",
          'Please try again. Say something like "expires May 15th 2025" or "best before June 2026"'
        );
      }

      setRecording(null);
      setRecordingStates((prev) => ({ ...prev, [itemId]: null }));
      setShowRecordingModal(false);
      setCurrentRecordingItem(null);
    } catch (error) {
      console.error("❌ Failed to stop recording:", error.message);
      console.error("🔧 Full error:", error);

      if (currentRecordingItem) {
        setRecordingStates((prev) => ({ ...prev, [currentRecordingItem.id]: null }));
      }
      setIsRecording(false);
      setShowRecordingModal(false);
      stopAudioLevelSimulation();
      Alert.alert("Error 😞", "Failed to process recording. Please try again.");
    }
  };

  const cancelRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      if (currentRecordingItem) {
        setRecordingStates((prev) => ({ ...prev, [currentRecordingItem.id]: null }));
      }

      setIsRecording(false);
      setShowRecordingModal(false);
      setCurrentRecordingItem(null);
      stopAudioLevelSimulation();
    } catch (error) {
      console.error("Error canceling recording:", error);
    }
  };

  const processAudioWithGemini = async (audioUri) => {
    try {
      console.log("🤖 Starting Gemini processing...");

      const transcribedText = await transcribeAudio(audioUri);
      console.log("🗣️ USER SAID:", `"${transcribedText}"`);

      if (!transcribedText || transcribedText.trim().length === 0) {
        console.log("❌ Empty transcript, cannot process");
        return null;
      }

      const prompt = `
        Extract the expiry date from this spoken text: "${transcribedText}"
        
        The text might contain phrases like:
        - "Mfg 13 May 2025, expires in 8 months"
        - "Expiry 13 May 2026" 
        - "Best before June 2025"
        - "Use by 15/06/2025"
        - "Expires in 6 months" (calculate from today)
        - "Good until December 2025"
        
        Today's date is ${new Date().toISOString().split("T")[0]} for reference.
        
        Return ONLY the expiry date in YYYY-MM-DD format. If no clear expiry date is found, return "null".
        
        Examples:
        - Input: "expires May fifteenth twenty twenty six" → Output: 15-05-2026
        - Input: "best before June 2025" → Output: 30-06-2025
        - Input: "expires in six months" → Output: ${
          new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        }
      `;

      console.log("📤 Sending to Gemini API...");

      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          },
        }),
      });

      console.log("🤖 Gemini response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("📋 Full Gemini response:", JSON.stringify(data, null, 2));

      const extractedDate =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log("📅 GEMINI EXTRACTED DATE:", `"${extractedDate}"`);

      if (
        extractedDate &&
        extractedDate !== "null" &&
        /^\d{4}-\d{2}-\d{2}$/.test(extractedDate)
      ) {
        console.log("✅ Valid date format confirmed:", extractedDate);
        return extractedDate;
      } else {
        console.log("❌ Invalid date format or null result");
        return null;
      }
    } catch (error) {
      console.error("❌ Error processing with Gemini:", error.message);
      console.error("🔧 Full error details:", error);
      return null;
    }
  };

  const transcribeAudio = async (audioUri) => {
    try {
      console.log("🎙️ Starting transcription for:", audioUri);

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log("📁 File info:", fileInfo);

      if (!fileInfo.exists) {
        throw new Error("Audio file does not exist");
      }

      const formData = new FormData();
      formData.append("audio", {
        uri: audioUri,
        type: "audio/wav",
        name: "recording.wav",
      });

      console.log("📤 Sending request to Deepgram...");

      const response = await fetch(
        `${DEEPGRAM_URL}?punctuate=true&language=en-US&model=nova-2&smart_format=true&diarize=false`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      console.log("📡 Deepgram response status:", response.status);
      console.log("📡 Deepgram response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Deepgram API error response:", errorText);
        console.log("🔄 Trying alternative audio format...");
        return await transcribeAudioAlternative(audioUri);
      }

      const result = await response.json();
      console.log("📝 Full Deepgram result:", JSON.stringify(result, null, 2));

      const transcript =
        result.results?.channels?.[0]?.alternatives?.[0]?.transcript;

      if (transcript && transcript.trim()) {
        console.log("✅ TRANSCRIPT EXTRACTED:", transcript);
        return transcript.trim();
      } else {
        console.log("⚠️ No transcript found in response");
        console.log(
          "🔍 Available channels:",
          result.results?.channels?.length || 0
        );
        throw new Error("No transcript found in Deepgram response");
      }
    } catch (error) {
      console.error("❌ Deepgram transcription error:", error.message);
      console.error("🔧 Full error:", error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  };

  const transcribeAudioAlternative = async (audioUri) => {
    try {
      console.log("🔄 Trying base64 approach...");

      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("📊 Audio data size:", audioBase64.length, "characters");

      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const response = await fetch(
        `${DEEPGRAM_URL}?punctuate=true&language=en-US&model=nova-2`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "audio/wav",
          },
          body: bytes,
        }
      );

      console.log("📡 Alternative response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Alternative method also failed:", errorText);
        throw new Error(`Alternative transcription failed: ${response.status}`);
      }

      const result = await response.json();
      const transcript =
        result.results?.channels?.[0]?.alternatives?.[0]?.transcript;

      if (transcript && transcript.trim()) {
        console.log("✅ ALTERNATIVE METHOD SUCCESS:", transcript);
        return transcript.trim();
      }

      throw new Error("No transcript from alternative method");
    } catch (error) {
      console.error("❌ Alternative transcription failed:", error);
      throw error;
    }
  };

  const updateItemExpiryDate = async (itemId, expiryDate) => {
    try {
      console.log(
        "💾 Updating storage for item:",
        itemId,
        "with date:",
        expiryDate
      );

      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        console.log("📋 Current inventory data:", parsedData.length, "items");

        const itemIndex = inventoryData.find(
          (item) => item.id === itemId
        )?.originalIndex;
        console.log("🔍 Found item at index:", itemIndex);

        if (itemIndex !== undefined && parsedData[itemIndex]) {
          console.log("📝 Before update:", parsedData[itemIndex]);
          parsedData[itemIndex].expiry_date = expiryDate;
          console.log("📝 After update:", parsedData[itemIndex]);

          await AsyncStorage.setItem("inventory", JSON.stringify(parsedData));
          console.log("💾 Saved to AsyncStorage");

          setInventoryData((prev) => {
            const updated = prev.map((item) =>
              item.id === itemId ? { ...item, expiryDate } : item
            );
            console.log("🔄 Updated local state");
            return updated;
          });

          console.log("✅ Item update completed successfully");
        } else {
          console.error("❌ Item not found in storage at index:", itemIndex);
        }
      } else {
        console.error("❌ No inventory data found in storage");
      }
    } catch (error) {
      console.error("❌ Failed to update expiry date:", error.message);
      console.error("🔧 Full error:", error);
    }
  };

  const handleMicPress = async (itemId) => {
    const currentState = recordingStates[itemId];

    if (!currentState) {
      await startRecording(itemId);
    }
  };

  const deleteItem = async (itemId, originalIndex) => {
    try {
      Alert.alert("Delete", "Are you sure you want to delete this item?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const data = await AsyncStorage.getItem("inventory");
            if (data) {
              const parsedData = JSON.parse(data);
              parsedData.splice(originalIndex, 1);
              await AsyncStorage.setItem(
                "inventory",
                JSON.stringify(parsedData)
              );
              setInventoryData(
                inventoryData.filter((item) => item.id !== itemId)
              );
            }
          },
        },
      ]);
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const toggleCategory = (category) => {
    setSelected((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };


  // Filter inventory data based on search query and selected categories
  const filteredData = inventoryData.filter((item) => {
    const matchesSearch = item.productName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // If no categories are selected, show all items that match the search query
    if (selected.length === 0) {
      return matchesSearch;
    }

    // Check if the item's parentCategory is in the selected categories
    const matchesCategory = selected.includes(item.parentCategory);
    console.log(`Item: ${item.productName}, Matches Search: ${matchesSearch}, Matches Category: ${matchesCategory}`);
    return matchesSearch && matchesCategory;
  });

  const renderItem = ({ item }) => (
    <ProductCard
      item={item}
      onMicPress={() => handleMicPress(item.id)}
      onDeletePress={() => deleteItem(item.id, item.originalIndex)}
      recordingState={recordingStates[item.id]}
    />
  );

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons
            name="search"
            size={22}
            style={styles.searchIcon}
            color={Colors.primary}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryScroll, { marginRight: -15 }]}
        >
          {category.map((cat, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => toggleCategory(cat)}
              style={[
                styles.button,
                selected.includes(cat) ? styles.selected : styles.unselected,
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  selected.includes(cat) ? styles.selectedText : styles.unselectedText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {inventoryData.length === 0 ? (
          <Text style={styles.noDataText}>No inventory items found.</Text>
        ) : filteredData.length === 0 ? (
          <Text style={styles.noDataText}>No items match your filter.</Text>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            numColumns={numColumns}
            key={`flatlist-${numColumns}`}
          />
        )}
      </ScrollView>

      <RecordingCard
        visible={showRecordingModal}
        onClose={cancelRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        audioLevels={audioLevels}
        itemName={currentRecordingItem?.productName || ""}
        recordingState={
          currentRecordingItem ? recordingStates[currentRecordingItem.id] : null
        }
      />
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
  searchContainer: {
    paddingBottom: 15,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.bg,
  },
  searchIcon: {
    backgroundColor: Colors.bg,
    padding: 10,
    borderRadius: 50,
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  deselectButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.error,
    borderRadius: 15,
  },
  deselectButtonText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: "600",
  },
  categoryScroll: {
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: Colors.card,
    borderRadius: 15,
    padding: 10,
    marginBottom: 18,
    flexDirection: 'row',
    gap: 15,
    alignItems: "center",
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 15,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "left",
    marginBottom: 8,
  },
  productDetail: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 5,
    fontWeight: '500',
    textAlign: "left",
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
    alignSelf: "flex-end",
  },
  micIconContainer: {
    backgroundColor: Colors.text,
    padding: 8,
    borderRadius: 50,
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  micRecording: {
    backgroundColor: "#ff4444",
  },
  deleteIconContainer: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 50,
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  noDataText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginTop: 20,
  },
  recordingCard: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: Colors.text,
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
  recordingSubtitle: {
    fontSize: 16,
    color: Colors.background,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  waveSection: {
    alignItems: "center",
    marginVertical: 10,
  },
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
    color: Colors.background,
  },
  recordActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    gap: 5,
  },
  stopButton: {
    backgroundColor: Colors.error,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  recordActionText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: "600",
  },
  recordingHint: {
    fontSize: 12,
    color: Colors.background,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 5,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    margin: 5,
  },
  selected: {
    backgroundColor: Colors.text,
  },
  unselected: {
    backgroundColor: Colors.bg,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  selectedText: {
    color: Colors.background,
  },
  unselectedText: {
    color: Colors.text,
  },
});