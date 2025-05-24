import React, { useState, useEffect } from "react";
import { View, ScrollView, Text, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import Header from "../layouts/Header";
import SearchBar from "../components/inventory/SearchBar";
import CategoryFilter from "../components/inventory/CategoryFilter";
import ProductList from "../components/inventory/ProductList";
import RecordingCard from "../components/inventory/RecordingCard";
import Colors from "../utils/Colors";

const extractExpiryDate = (transcript) => {
  if (!transcript) return null;

  const today = new Date();
  const patterns = [
    /(?:expires|best before|use by)\s*(?:on)?\s*(\w+\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4})/i,
    /(?:expires|best before|use by)\s*(?:in)?\s*(\d+)\s*months?/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) {
      if (pattern.test(/months/i)) {
        const months = parseInt(match[1], 10);
        const date = new Date(today.setMonth(today.getMonth() + months));
        return date.toISOString().split("T")[0];
      } else {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date)) {
            return date.toISOString().split("T")[0];
          }
        } catch {
          return null;
        }
      }
    }
  }

  return null;
};

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryData, setInventoryData] = useState([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionStates, setRecognitionStates] = useState({});
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [currentRecognitionItem, setCurrentRecognitionItem] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [categories, setCategories] = useState({});
  const numColumns = 2;

  useEffect(() => {
    loadInventoryData();
  }, []);

  useSpeechRecognitionEvent("start", () => {
    setIsRecognizing(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsRecognizing(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (event.results[0]?.transcript) {
      setTranscript(event.results[0].transcript);
      if (event.isFinal && currentRecognitionItem) {
        setRecognitionStates((prev) => ({
          ...prev,
          [currentRecognitionItem.id]: "processing",
        }));
        const expiryDate = extractExpiryDate(event.results[0].transcript);
        if (expiryDate) {
          updateItemExpiryDate(currentRecognitionItem.id, expiryDate);
          Alert.alert("Success! 🎉", `Expiry date updated to: ${expiryDate}`);
        } else {
          Alert.alert(
            "Could not understand 🤔",
            'Please try again. Say something like "expires May 15th 2025" or "best before June 2026"'
          );
        }
        setRecognitionStates((prev) => ({
          ...prev,
          [currentRecognitionItem.id]: null,
        }));
        setShowRecognitionModal(false);
        setCurrentRecognitionItem(null);
        setTranscript("");
      }
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error, event.message);
    if (currentRecognitionItem) {
      setRecognitionStates((prev) => ({
        ...prev,
        [currentRecognitionItem.id]: null,
      }));
    }
    setIsRecognizing(false);
    setShowRecognitionModal(false);
    setCurrentRecognitionItem(null);
    setTranscript("");
    Alert.alert("Error 😞", `Speech recognition failed: ${event.message}`);
  });

  const loadInventoryData = async () => {
    try {
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
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

        const categoryMap = {};
        formattedData.forEach((item) => {
          if (!categoryMap[item.parentCategory]) {
            categoryMap[item.parentCategory] = new Set();
          }
          categoryMap[item.parentCategory].add(item.subCategory);
        });

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

  const startRecognition = async (itemId) => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert("Error", "Microphone and speech recognition permissions are required.");
        return;
      }

      const item = inventoryData.find((item) => item.id === itemId);
      setCurrentRecognitionItem(item);
      setShowRecognitionModal(true);
      setRecognitionStates((prev) => ({ ...prev, [itemId]: "recognizing" }));
      setIsRecognizing(true);

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 300,
        },
        iosTaskHint: "dictation",
      });
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setRecognitionStates((prev) => ({ ...prev, [itemId]: null }));
      setIsRecognizing(false);
      setShowRecognitionModal(false);
      Alert.alert("Error", "Failed to start speech recognition.");
    }
  };

  const stopRecognition = async () => {
    try {
      if (!currentRecognitionItem) return;
      setRecognitionStates((prev) => ({
        ...prev,
        [currentRecognitionItem.id]: "processing",
      }));
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error("Failed to stop recognition:", error);
      setRecognitionStates((prev) => ({
        ...prev,
        [currentRecognitionItem.id]: null,
      }));
      setIsRecognizing(false);
      setShowRecognitionModal(false);
      setCurrentRecognitionItem(null);
      setTranscript("");
      Alert.alert("Error", "Failed to stop speech recognition.");
    }
  };

  const cancelRecognition = async () => {
    try {
      ExpoSpeechRecognitionModule.abort();
      if (currentRecognitionItem) {
        setRecognitionStates((prev) => ({
          ...prev,
          [currentRecognitionItem.id]: null,
        }));
      }
      setIsRecognizing(false);
      setShowRecognitionModal(false);
      setCurrentRecognitionItem(null);
      setTranscript("");
    } catch (error) {
      console.error("Error canceling recognition:", error);
    }
  };

  const updateItemExpiryDate = async (itemId, expiryDate) => {
    try {
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        const itemIndex = inventoryData.find(
          (item) => item.id === itemId
        )?.originalIndex;

        if (itemIndex !== undefined && parsedData[itemIndex]) {
          parsedData[itemIndex].expiry_date = expiryDate;
          await AsyncStorage.setItem("inventory", JSON.stringify(parsedData));
          setInventoryData((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, expiryDate } : item
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to update expiry date:", error);
    }
  };

  const handleMicPress = async (itemId) => {
    const currentState = recognitionStates[itemId];
    if (!currentState) {
      await startRecognition(itemId);
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
              await AsyncStorage.setItem("inventory", JSON.stringify(parsedData));
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

  const filteredData = inventoryData.filter((item) => {
    const matchesSearch = item.productName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = selectedSubCategory
      ? item.subCategory === selectedSubCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          iconColor={Colors.primary}
        />
        <CategoryFilter
          categories={categories}
          expandedCategories={expandedCategories}
          toggleCategory={(parentCategory) =>
            setExpandedCategories((prev) => ({
              ...prev,
              [parentCategory]: !prev[parentCategory],
            }))
          }
          selectedSubCategory={selectedSubCategory}
          selectSubCategory={(subCategory) =>
            setSelectedSubCategory(
              subCategory === selectedSubCategory ? null : subCategory
            )
          }
        />
        <ProductList
          filteredData={filteredData}
          recognitionStates={recognitionStates}
          handleMicPress={handleMicPress}
          deleteItem={deleteItem}
          numColumns={numColumns}
        />
      </ScrollView>
      <RecordingCard
        visible={showRecognitionModal}
        onClose={cancelRecognition}
        onStopRecognition={stopRecognition}
        isRecognizing={isRecognizing}
        itemName={currentRecognitionItem?.productName || ""}
        recognitionState={
          currentRecognitionItem ? recognitionStates[currentRecognitionItem.id] : null
        }
        transcript={transcript}
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
});