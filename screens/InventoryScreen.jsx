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
import Svg, { Path, Line } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import Header from "../layouts/Header";
import Colors from "../utils/Colors";
import Ionicons from "@expo/vector-icons/Ionicons";

// Placeholder image for inventory items
const placeholderImage = "https://picsum.photos/200";

const BlobBackground = () => (
  <Svg width="200" height="200" viewBox="0 0 200 200">
    <Path
      fill="#030B3880"
      d="M47.6,-62.9C60.3,-55.2,67.6,-38.3,69.6,-22.6C71.5,-6.9,68,7.6,61.3,20.3C54.6,33,44.7,43.9,32.9,52.3C21.1,60.6,7.5,66.4,-7.7,70.1C-22.9,73.7,-39.6,75.1,-52.8,66.6C-66,58.1,-75.7,39.7,-78.5,21.2C-81.3,2.6,-77.2,-15.9,-68.2,-31.1C-59.2,-46.4,-45.4,-58.4,-30.1,-65.9C-14.8,-73.5,2,-76.5,18.2,-74.4C34.5,-72.3,49.3,-65.7,47.6,-62.9Z"
      transform="translate(100 100)"
    />
  </Svg>
);

const { width: screenWidth } = Dimensions.get("window");

// Voice Wave Visualization Component
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
              backgroundColor: isRecording ? "#00ff88" : "#4CAF50",
              opacity: isRecording ? 1 : 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Recording Card Overlay Component
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
          <Text style={styles.recordingTitle}>🎙️ Recording</Text>
          <Text style={styles.recordingSubtitle}>{itemName}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.waveSection}>
        <VoiceWave isRecording={isRecording} audioLevels={audioLevels} />
      </View>

      <View style={styles.recordingActions}>
        <View style={styles.statusContainer}>
          {recordingState === "processing" ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
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

// ProductCard Component
const ProductCard = ({ item, onMicPress, onDeletePress, recordingState }) => {
  const formattedDate = item.purchaseDate.split("-").reverse().join("-");

  return (
    <View style={styles.productCard}>
      <Image
        source={{ uri: placeholderImage }}
        style={styles.productImage}
        resizeMode="contain"
      />
      <Text style={styles.productName} numberOfLines={2}>
        {item.productName} ({item.quantity})
      </Text>
      {item.weight !== "N/A" && (
        <Text style={styles.productDetail}>Weight: {item.weight}</Text>
      )}
      <Text style={styles.productDetail}>Purchased: {formattedDate}</Text>
      {item.expiryDate !== "N/A" && (
        <Text style={styles.productDetail}>Expiry: {item.expiryDate}</Text>
      )}
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
  );
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
  const numColumns = 2;

  // State for category filters
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [categories, setCategories] = useState({});

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

  const loadInventoryData = async () => {
    try {
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        console.log("Loaded inventory:", parsedData);
        const formattedData = parsedData.map((item, index) => ({
          id: index.toString(),
          productName: item.item || "Unknown Item",
          quantity: item.quantity || 0,
          purchaseDate: item.purchase_date || "Unknown Date",
          weight: item.weight || "N/A",
          expiryDate: item.expiry_date || "N/A",
          parentCategory: item.parentCategory || "Unknown Category",
          subCategory: item.subCategory || "Unknown Subcategory",
          originalIndex: index,
        }));

        // Group items by parentCategory and subCategory
        const categoryMap = {};
        formattedData.forEach((item) => {
          if (!categoryMap[item.parentCategory]) {
            categoryMap[item.parentCategory] = new Set();
          }
          categoryMap[item.parentCategory].add(item.subCategory);
        });

        // Convert Sets to Arrays for rendering
        const categoryStructure = {};
        Object.keys(categoryMap).forEach((parent) => {
          categoryStructure[parent] = Array.from(categoryMap[parent]);
        });

        setCategories(categoryStructure);
        setInventoryData(formattedData);
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

  // Toggle parent category expansion
  const toggleCategory = (parentCategory) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [parentCategory]: !prev[parentCategory],
    }));
  };

  // Handle subcategory selection
  const selectSubCategory = (subCategory) => {
    setSelectedSubCategory(subCategory === selectedSubCategory ? null : subCategory);
  };

  // Filter inventory data based on search query and selected subcategory
  const filteredData = inventoryData.filter((item) => {
    const matchesSearch = item.productName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = selectedSubCategory
      ? item.subCategory === selectedSubCategory
      : true;
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
            size={24}
            style={styles.searchIcon}
            color={Colors.primary}
          />
        </View>

        {/* Category Filter Section */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {Object.keys(categories).map((parentCategory) => (
            <View key={parentCategory} style={styles.categoryContainer}>
              <TouchableOpacity
                style={styles.parentCategoryButton}
                onPress={() => toggleCategory(parentCategory)}
              >
                <Text style={styles.parentCategoryText}>{parentCategory}</Text>
                <Ionicons
                  name={
                    expandedCategories[parentCategory]
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={16}
                  color={Colors.text}
                />
              </TouchableOpacity>
              {expandedCategories[parentCategory] && (
                <View style={styles.subCategoryContainer}>
                  {categories[parentCategory].map((subCategory) => (
                    <TouchableOpacity
                      key={subCategory}
                      style={[
                        styles.subCategoryButton,
                        selectedSubCategory === subCategory &&
                          styles.subCategoryButtonSelected,
                      ]}
                      onPress={() => selectSubCategory(subCategory)}
                    >
                      <Text
                        style={[
                          styles.subCategoryText,
                          selectedSubCategory === subCategory &&
                            styles.subCategoryTextSelected,
                        ]}
                      >
                        {subCategory}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
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
            columnWrapperStyle={styles.columnWrapper}
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
    paddingBottom: 25,
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
  categoryScroll: {
    marginBottom: 20,
  },
  categoryContainer: {
    marginRight: 15,
  },
  parentCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  parentCategoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.blue,
    marginRight: 5,
  },
  subCategoryContainer: {
    marginTop: 10,
    paddingLeft: 10,
  },
  subCategoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: Colors.card,
    marginBottom: 5,
  },
  subCategoryButtonSelected: {
    backgroundColor: Colors.text,
  },
  subCategoryText: {
    fontSize: 12,
    color: Colors.text,
  },
  subCategoryTextSelected: {
    color: Colors.background,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 10,
    margin: 5,
    width: (screenWidth - 40) / 2,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    alignItems: "center",
  },
  productImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 5,
  },
  productDetail: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 5,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 5,
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
  recordingHint: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 5,
  },
});