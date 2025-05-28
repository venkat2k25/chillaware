
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Entypo, MaterialIcons } from "@expo/vector-icons";
import Colors from "../utils/Colors"; // Adjust path as needed
import { FOOD_ICONS } from "../json/foods"; // Adjust path as needed
import Header from "../layouts/Header"; // Adjust path as needed

// API Configuration
const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";
const API_KEY = "AIzaSyDKa8f41czTEQoL-PpG-AdzLu0y_qp5NDU"; // Replace with your secure key

// Logger utility
const logger = {
  error: (message) => console.error(`[ERROR] ${new Date().toISOString()}: ${message}`),
  info: (message) => console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
};

// Local FridgeScanner class for inventory management
class FridgeScanner {
  constructor() {
    this.fridgeItems = {};
    this.detectionHistory = [];
    this.confidenceThreshold = 0.5;
    this.detectionCooldown = {};
    this.cooldownDuration = 2.0; // seconds
    this.foodCategories = {
      apple: "Fruits", banana: "Fruits", orange: "Fruits", lemon: "Fruits", pear: "Fruits",
      grape: "Fruits", strawberry: "Fruits", watermelon: "Fruits", pineapple: "Fruits",
      mango: "Fruits", avocado: "Fruits", peach: "Fruits", carrot: "Vegetables",
      broccoli: "Vegetables", potato: "Vegetables", tomato: "Vegetables", onion: "Vegetables",
      pepper: "Vegetables", cucumber: "Vegetables", lettuce: "Vegetables", cabbage: "Vegetables",
      corn: "Vegetables", celery: "Vegetables", mushroom: "Vegetables",
    };
  }

  async addDetectedItems(detections) {
  try {
    let totalAdded = 0;
    const currentTime = Date.now() / 1000; // seconds
    const itemCounts = {};
    const itemConfidences = {};

    // Aggregate counts and confidences
    detections.forEach((d) => {
      const itemName = d.item.toLowerCase();
      itemCounts[itemName] = (itemCounts[itemName] || 0) + (d.count || 1);
      itemConfidences[itemName] = itemConfidences[itemName] || [];
      itemConfidences[itemName].push(d.confidence);
    });

    for (const [itemName, count] of Object.entries(itemCounts)) {
      if (this.detectionCooldown[itemName] && currentTime - this.detectionCooldown[itemName] < this.cooldownDuration) {
        logger.info(`Skipping ${itemName} due to cooldown`);
        continue;
      }

      const avgConfidence = itemConfidences[itemName].reduce((sum, c) => sum + c, 0) / itemConfidences[itemName].length;
      this.fridgeItems[itemName] = {
        name: itemName,
        count: (this.fridgeItems[itemName]?.count || 0) + count,
        category: this.foodCategories[itemName] || d.category || "Other",
        last_detected: new Date().toISOString(),
        confidence: avgConfidence,
      };
      this.detectionCooldown[itemName] = currentTime;
      totalAdded += count;

      this.detectionHistory.push({
        item: itemName,
        count,
        confidence: avgConfidence,
        timestamp: new Date().toISOString(),
      });
    }

    await this.saveInventoryToStorage();
    logger.info(`Added ${totalAdded} items to inventory`);
    return totalAdded;
  } catch (error) {
    logger.error(`Error in addDetectedItems: ${error.message}, Stack: ${error.stack}`);
    return 0;
  }
}

  async getInventory() {
    const items = {};
    let totalItems = 0;
    let uniqueItems = 0;
    const categories = {};

    for (const [itemName, itemData] of Object.entries(this.fridgeItems)) {
      if (itemData.count > 0) {
        items[itemName] = { ...itemData };
        totalItems += itemData.count;
        uniqueItems += 1;
        categories[itemData.category] = (categories[itemData.category] || 0) + itemData.count;
      }
    }

    return {
      items,
      total_items: totalItems,
      unique_items: uniqueItems,
      categories,
    };
  }

  async clearInventory() {
    this.fridgeItems = {};
    this.detectionCooldown = {};
    this.detectionHistory = [];
    await AsyncStorage.setItem("inventory", JSON.stringify([]));
  }

  async removeItem(itemName, count = 1) {
    itemName = itemName.toLowerCase();
    if (this.fridgeItems[itemName] && this.fridgeItems[itemName].count >= count) {
      this.fridgeItems[itemName].count -= count;
      if (this.fridgeItems[itemName].count <= 0) {
        delete this.fridgeItems[itemName];
      }
      await this.saveInventoryToStorage();
      return true;
    }
    return false;
  }

  async loadInventoryFromStorage() {
    try {
      const storedData = await AsyncStorage.getItem("inventory");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        this.fridgeItems = {};
        parsedData.forEach((item) => {
          const itemName = item.item.toLowerCase();
          this.fridgeItems[itemName] = {
            name: itemName,
            count: item.quantity || 1,
            category: item.category || this.foodCategories[itemName] || "Other",
            last_detected: item.purchase_date || new Date().toISOString(),
            confidence: item.confidence || 0.5,
          };
        });
      }
    } catch (error) {
      logger.error(`Failed to load inventory from storage: ${error.message}`);
    }
  }

  async saveInventoryToStorage() {
    try {
      const inventoryData = Object.values(this.fridgeItems).map((item) => ({
        item: item.name,
        quantity: item.count,
        category: item.category,
        purchase_date: item.last_detected,
        confidence: item.confidence,
      }));
      await AsyncStorage.setItem("inventory", JSON.stringify(inventoryData));
    } catch (error) {
      logger.error(`Failed to save inventory to storage: ${error.message}`);
    }
  }
}

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Helper function to process Vision API response
const processApiResponse = (response) => {
  try {
    if (!response.responses || !Array.isArray(response.responses)) {
      logger.error("Invalid Vision API response format: 'responses' missing or not an array");
      return [];
    }

    const detections = [];
    const EXCLUDED_TERMS = [
      "Vegetable", "Produce", "Ingredient", "Food", "Food group", "Cruciferous vegetables",
      "Leaf vegetable", "Natural foods", "Superfood", "Staple food", "Vegetarian cuisine",
      "Cabbages", "Fruit", "Nightshade", "Still life photography", "Macro photography",
      "Plant", "Flowering plant", "Flower", "Close-up",
    ];
    const ITEM_VARIANTS = {
      Tomato: ["Bush tomato", "Plum tomato", "Cherry tomato", "Beefsteak tomato", "Roma tomato"],
      Apple: ["Granny Smith apple", "Fuji apple"],
      Pepper: ["Chili pepper", "Bell pepper", "Jalapeno"],
    };

    const getCanonicalItem = (name) => {
      const lowerName = name.toLowerCase();
      for (const [canonical, variants] of Object.entries(ITEM_VARIANTS)) {
        if (lowerName === canonical.toLowerCase() || variants.map(v => v.toLowerCase()).includes(lowerName)) {
          return canonical;
        }
      }
      return name;
    };

    response.responses.forEach((res, index) => {
      logger.info(`Processing response[${index}]`);
      // Process localizedObjectAnnotations for accurate counting
      if (res.localizedObjectAnnotations && Array.isArray(res.localizedObjectAnnotations)) {
        res.localizedObjectAnnotations.forEach((obj, objIndex) => {
          logger.info(`Processing localizedObjectAnnotations[${objIndex}]: ${JSON.stringify(obj)}`);
          if (obj.score > 0.5 && !EXCLUDED_TERMS.includes(obj.name)) {
            const itemName = getCanonicalItem(obj.name);
            const existing = detections.find((d) => d.item.toLowerCase() === itemName.toLowerCase());
            if (!existing) {
              detections.push({
                item: itemName,
                count: 1,
                category: itemName.toLowerCase().includes("pepper") ? "Spices" : "Vegetables",
                confidence: obj.score,
              });
            } else {
              existing.count += 1;
              existing.confidence = Math.max(existing.confidence, obj.score);
            }
          }
        });
      }

      // Process labelAnnotations only for new items
      if (res.labelAnnotations && Array.isArray(res.labelAnnotations)) {
        const specificItems = res.labelAnnotations
          .filter(
            (annotation) =>
              annotation.score > 0.6 &&
              !EXCLUDED_TERMS.includes(annotation.description) &&
              !detections.some((d) => d.item.toLowerCase() === getCanonicalItem(annotation.description).toLowerCase())
          )
          .sort((a, b) => b.score - a.score);

        specificItems.forEach((item, itemIndex) => {
          logger.info(`Processing labelAnnotations[${itemIndex}]: ${JSON.stringify(item)}`);
          const itemName = getCanonicalItem(item.description);
          detections.push({
            item: itemName,
            count: 1,
            category: itemName.toLowerCase().includes("pepper") ? "Spices" : "Vegetables",
            confidence: item.score,
          });
        });
      }
    });

    logger.info(`Final detections: ${JSON.stringify(detections, null, 2)}`);
    return detections;
  } catch (error) {
    logger.error(`Error in processApiResponse: ${error.message}, Stack: ${error.stack}`);
    return [];
  }
};

// Component
export default function RealtimeFridgeScanner() {
  const [inventory, setInventory] = useState({
    items: {},
    total_items: 0,
    unique_items: 0,
    categories: {},
  });
  const [cameraPermission, setCameraPermission] = useState(null);
  const [libraryPermission, setLibraryPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [apiStatus, setApiStatus] = useState("online"); // Assume online since no backend
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [detectedInventory, setDetectedInventory] = useState([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanner = useRef(new FridgeScanner()).current;

  useEffect(() => {
    checkPermissions();
    loadInventory();
    startPulseAnimation();
    const loadLastImage = async () => {
      try {
        const storedImageUri = await AsyncStorage.getItem("lastImage");
        if (storedImageUri) {
          setPhoto({ uri: storedImageUri });
          setIsUploaded(true);
        }
      } catch (error) {
        logger.error(`Failed to load last image: ${error.message}`);
      }
    };
    loadLastImage();
    return () => Animated.timing(pulseAnim).stop();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkPermissions = async () => {
    try {
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(cameraResult.status === "granted");
      const libraryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setLibraryPermission(libraryResult.status === "granted");
    } catch (error) {
      logger.error(`Permission check failed: ${error.message}`);
      setCameraPermission(false);
      setLibraryPermission(false);
    }
  };

  const loadInventory = async () => {
    try {
      await scanner.loadInventoryFromStorage();
      const inventoryData = await scanner.getInventory();
      setInventory(inventoryData);
    } catch (error) {
      logger.error(`Failed to load inventory: ${error.message}`);
    }
  };

  const processImage = async (imageData) => {
    try {
      const base64Image = await FileSystem.readAsStringAsync(imageData.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const requestBody = {
        requests: [
          {
            image: { content: base64Image },
            features: [
              { type: "LABEL_DETECTION", maxResults: 15 },
              { type: "OBJECT_LOCALIZATION", maxResults: 10 },
            ],
          },
        ],
      };

      const response = await axios.post(`${VISION_API_URL}?key=${API_KEY}`, requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 45000,
      });

      logger.info(`Vision API response: ${JSON.stringify(response.data, null, 2)}`);
      return response.data;
    } catch (error) {
      logger.error(`Image processing API error: ${error.message}`);
      throw error;
    }
  };

  const captureImageWithCamera = async () => {
    if (!cameraPermission) {
      Alert.alert("Permission Required", "Camera permission is required to take photos.");
      return;
    }
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const image = result.assets[0];
        if (!image.mimeType?.includes("image/jpeg")) {
          Alert.alert("Invalid Format", "Please capture a JPEG image.");
          setIsProcessing(false);
          return;
        }
        setPhoto(image);
        setIsUploaded(false);
        setDetectedInventory([]);
        await processImageLocally(image);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      logger.error(`Error capturing photo: ${error.message}`);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
      setIsProcessing(false);
    }
  };

  const pickImageFromLibrary = async () => {
    if (!libraryPermission) {
      Alert.alert("Permission Required", "Media library permission is required to select photos.");
      return;
    }
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const image = result.assets[0];
        if (!image.mimeType?.includes("image/jpeg")) {
          Alert.alert("Invalid Format", "Please select a JPEG image.");
          setIsProcessing(false);
          return;
        }
        setPhoto(image);
        setIsUploaded(false);
        setDetectedInventory([]);
        await processImageLocally(image);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      logger.error(`Error picking image: ${error.message}`);
      Alert.alert("Error", "Failed to select image. Please try again.");
      setIsProcessing(false);
    }
  };

 const processImageLocally = async (image, retries = 2) => {
  try {
    setLoadingInventory(true);
    const visionRes = await processImage(image);
    logger.info(`Vision API response received: ${JSON.stringify(visionRes, null, 2)}`);

    if (!visionRes.responses || !Array.isArray(visionRes.responses)) {
      throw new Error("Invalid Vision API response: 'responses' missing or not an array");
    }

    setLoadingInventory(false);
    setIsUploaded(true);

    const detections = processApiResponse(visionRes);
    logger.info(`Processed detections: ${JSON.stringify(detections, null, 2)}`);
    setDetectedInventory(detections);

    if (detections.length > 0) {
      setLoadingInventory(true);
      const totalAdded = await scanner.addDetectedItems(detections);
      logger.info(`Added ${totalAdded} items to inventory`);
      await loadInventory();
      setLoadingInventory(false);
      await AsyncStorage.setItem("lastImage", image.uri);

      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      Alert.alert(
        "Items Detected",
        `Detected ${detections.reduce((sum, d) => sum + d.count, 0)} item(s): ${detections
          .map((d) => `${d.item} (x${d.count})`)
          .join(", ")}`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "No Food Items Detected",
        "No specific food items were found. Try a clearer image with better lighting."
      );
      setPhoto(null);
      setIsUploaded(false);
      await AsyncStorage.removeItem("lastImage");
    }
  } catch (err) {
    setLoadingInventory(false);
    setIsUploaded(false);
    logger.error(`Image processing error: ${err.message}, Stack: ${err.stack}`);

    if (retries > 0) {
      logger.info(`Retrying image processing (${retries} attempts left)...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return processImageLocally(image, retries - 1);
    }

    let errorMessage = "Could not process the image. Please check your internet connection.";
    if (err.response) {
      errorMessage = `Vision API Error: ${err.response.status} - ${
        err.response.data?.error?.message || err.response.data || err.message
      }`;
      if (err.response.status === 403) {
        errorMessage = "Invalid API key. Please check your Google Cloud Vision API key.";
      } else if (err.response.status === 429) {
        errorMessage = "API quota exceeded. Please check your Google Cloud Console.";
      }
    } else if (err.request) {
      errorMessage = "Network Error: Could not connect to Vision API.";
    } else {
      errorMessage = `Request Error: ${err.message}`;
    }
    Alert.alert("Processing Failed", errorMessage);
    setDetectedInventory([]);
    setPhoto(null);
    await AsyncStorage.removeItem("lastImage");
  } finally {
    setIsProcessing(false);
  }
};

  const toggleCamera = () => {
    if (!cameraPermission) {
      Alert.alert("Permission Required", "Camera permission is required to scan items.");
      return;
    }
    setCameraActive(!cameraActive);
    setPhoto(null);
    setIsUploaded(false);
    setDetectedInventory([]);
    AsyncStorage.removeItem("lastImage").catch((error) =>
      logger.error(`Failed to clear last image on toggle: ${error.message}`)
    );
  };

  const clearFridge = () => {
    Alert.alert("Clear Fridge", "Are you sure you want to remove all items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await scanner.clearInventory();
            await loadInventory();
            await AsyncStorage.removeItem("lastImage");
            Alert.alert("Success", "Fridge cleared successfully!");
          } catch (error) {
            logger.error(`Failed to clear inventory: ${error.message}`);
            Alert.alert("Error", "Failed to clear fridge");
          }
        },
      },
    ]);
  };

  const removeItemFromInventory = async (itemName, count = 1) => {
    try {
      const success = await scanner.removeItem(itemName, count);
      if (success) {
        await loadInventory();
      } else {
        Alert.alert("Error", "Item not found or insufficient quantity");
      }
    } catch (error) {
      logger.error(`Failed to remove item: ${error.message}`);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  if (cameraPermission === null || libraryPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking Permissions...</Text>
        </View>
      </View>
    );
  }

  if (!cameraPermission || !libraryPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionSubtitle}>
            Please grant camera and media library permissions to scan food items
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={checkPermissions}>
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      {cameraActive ? (
        <View style={styles.cameraContainer}>
          <View style={styles.cameraOverlay}>
            {loadingInventory ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color={Colors.background} />
                <Text style={styles.scanningText}>Processing Image...</Text>
                <Text style={styles.scanningSubtext}>This may take up to 45 seconds</Text>
              </View>
            ) : isProcessing ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color={Colors.background} />
                <Text style={styles.scanningText}>Preparing Image...</Text>
              </View>
            ) : detectedInventory.length > 0 || isUploaded ? (
              <View style={styles.detectionResults}>
                <Text style={styles.scanningText}>Detected Items</Text>
                {detectedInventory.length > 0 ? (
                  detectedInventory.map((item, index) => (
                    <View key={index} style={styles.detectedItem}>
                      <Text style={styles.detectedItemText}>
                        {FOOD_ICONS[item.item.toLowerCase()] || FOOD_ICONS.default}{" "}
                        {item.item} (x{item.count}, {Math.round(item.confidence * 100)}%, {item.category})
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.scanningSubtext}>No specific food items detected</Text>
                )}
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={async () => {
                      setPhoto(null);
                      setIsUploaded(false);
                      setDetectedInventory([]);
                      try {
                        await AsyncStorage.removeItem("lastImage");
                      } catch (error) {
                        logger.error(`Failed to clear last image: ${error.message}`);
                      }
                    }}
                  >
                    <Text style={styles.cameraButtonText}>🔄 Scan Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cameraButton, styles.cancelButton]}
                    onPress={toggleCamera}
                  >
                    <Text style={styles.cameraButtonText}>❌ Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.scanningText}>📷 Scan Food Items</Text>
                <Text style={styles.scanningSubtext}>Choose an option to add items to your inventory</Text>
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={captureImageWithCamera}
                    disabled={isProcessing || loadingInventory}
                  >
                    <Text style={styles.cameraButtonText}>📸 Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={pickImageFromLibrary}
                    disabled={isProcessing || loadingInventory}
                  >
                    <Text style={styles.cameraButtonText}>🖼️ Pick from Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cameraButton, styles.cancelButton]}
                    onPress={toggleCamera}
                  >
                    <Text style={styles.cameraButtonText}>❌ Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Fridge</Text>
              <View style={styles.summaryStats}>
                <Text style={styles.summaryStatText}>{inventory.total_items} total items</Text>
              </View>
            </View>
            {photo && isUploaded && (
              <View style={styles.capturedImageContainer}>
                <Image source={{ uri: photo.uri }} style={styles.capturedImage} resizeMode="contain" />
              </View>
            )}
            {Object.keys(inventory.items).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🥡</Text>
                <Text style={styles.emptyText}>Your fridge is empty!</Text>
                <Text style={styles.emptySubtext}>Scan items to add them to your inventory</Text>
              </View>
            ) : (
              <View style={styles.cardContainer}>
                {Object.entries(inventory.items).map(([itemName, itemData]) => (
                  <View key={itemName} style={styles.card}>
                    <View style={styles.cardImageContainer}>
                      <Text style={styles.cardImage}>
                        {FOOD_ICONS[itemName.toLowerCase()] || FOOD_ICONS.default}
                      </Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{itemName}</Text>
                      <Text style={styles.cardSubtitle}>Quantity: {itemData.count}</Text>
                      <Text style={styles.cardSubtitle}>Last Taken: {formatDate(itemData.last_detected)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeItemFromInventory(itemName, 1)}
                    >
                      <MaterialIcons name="delete" size={20} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
      {!cameraActive && (
        <Animated.View style={[styles.fab, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity onPress={captureImageWithCamera}>
            <Entypo name="camera" size={24} color={Colors.background} />
          </TouchableOpacity>
        </Animated.View>
      )}
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
  cameraContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    width: "100%",
  },
  scanningIndicator: {
    alignItems: "center",
  },
  scanningText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.background,
    marginBottom: 10,
  },
  scanningSubtext: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.8,
    marginBottom: 20,
  },
  detectionResults: {
    alignItems: "center",
    padding: 20,
    width: "100%",
  },
  detectedItem: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    width: "80%",
  },
  detectedText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  cameraControls: {
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  cameraButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: Colors.destructive,
  },
  cameraButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 10,
  },
  permissionSubtitle: {
    fontSize: 16,
    color: Colors.text,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 10,
  },
  summaryContainer: {
    backgroundColor: Colors.background,
    borderRadius: 15,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStatText: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.6,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  capturedImageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  capturedImage: {
    width: "100%",
    height: 300,
    borderRadius: 30,
    marginVertical: 10,
  },
  cardContainer: {
    flexDirection: "column",
    gap: 10,
  },
  card: {
    flexDirection: "row",
    borderRadius: 5,
    padding: 8,
    alignItems: "center",
    backgroundColor: Colors.background + "50",
    marginBottom: 5,
  },
  cardImageContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardImage: {
    fontSize: 30,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    textTransform: "uppercase",
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
  },
});
