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
  Platform,
  PermissionsAndroid,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Header from "../layouts/Header"; // Adjust path as needed
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Entypo, MaterialIcons } from "@expo/vector-icons";
import Colors from "../utils/Colors"; // Adjust path as needed
import { FOOD_ICONS } from "../json/foods"; // Adjust path as needed

// API Configuration
const BACKEND_URL =
  Platform.OS === "ios"
    ? "http://192.168.0.215:8001"
    : "http://192.168.0.215:8001";

// Logger utility
const logger = {
  error: (message) =>
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`),
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
};

// FridgeAPI class
class FridgeAPI {
  static async processImage(imageData) {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: imageData.uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      });

      const response = await axios.post(
        `${BACKEND_URL}/process_image`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 45000,
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Image processing API error: ${error.message}`);
      throw error;
    }
  }

  static async getInventory() {
    try {
      const response = await fetch(`${BACKEND_URL}/inventory`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error(`Get inventory API error: ${error.message}`);
      throw error;
    }
  }

  static async saveToInventory(inventoryItems) {
    try {
      const response = await axios.post(`${BACKEND_URL}/inventory/save`, {
        items: inventoryItems,
      });
      return response.data;
    } catch (error) {
      logger.error(`Save inventory API error: ${error.message}`);
      throw error;
    }
  }

  static async clearInventory() {
    try {
      const response = await fetch(`${BACKEND_URL}/inventory`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error(`Clear inventory API error: ${error.message}`);
      throw error;
    }
  }

  static async removeItem(itemName, count = 1) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/inventory/${itemName}?count=${count}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error(`Remove item API error: ${error.message}`);
      throw error;
    }
  }

  static async getHealth() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return await response.json();
    } catch (error) {
      logger.error(`Health check failed: ${error.message}`);
      return { status: "offline" };
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

export default function RealtimeFridgeScanner() {
  // State declarations
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
  const [apiStatus, setApiStatus] = useState("checking");
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [detectedInventory, setDetectedInventory] = useState([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // useEffect for initialization
  useEffect(() => {
    checkPermissions();
    checkApiHealth();
    loadInventory();
    startPulseAnimation();
    // Load last image from AsyncStorage
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
      const libraryResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setLibraryPermission(libraryResult.status === "granted");
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "This app needs camera access to scan food items",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        setCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      }
    } catch (error) {
      logger.error(`Permission check failed: ${error.message}`);
      setCameraPermission(false);
      setLibraryPermission(false);
    }
  };

  const checkApiHealth = async () => {
    try {
      const health = await FridgeAPI.getHealth();
      setApiStatus(health.status === "healthy" ? "online" : "offline");
    } catch (error) {
      setApiStatus("offline");
    }
  };

  const loadInventory = async () => {
    try {
      const inventoryData = await FridgeAPI.getInventory();
      setInventory(inventoryData);
    } catch (error) {
      logger.error(`Failed to load inventory: ${error.message}`);
    }
  };

  const captureImageWithCamera = async () => {
    if (!cameraPermission) {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos."
      );
      return;
    }
    if (apiStatus === "offline") {
      Alert.alert("API Offline", "Backend server is not available.");
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
        await uploadToBackend(image);
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
      Alert.alert(
        "Permission Required",
        "Media library permission is required to select photos."
      );
      return;
    }
    if (apiStatus === "offline") {
      Alert.alert("API Offline", "Backend server is not available.");
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
        await uploadToBackend(image);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      logger.error(`Error picking image: ${error.message}`);
      Alert.alert("Error", "Failed to select image. Please try again.");
      setIsProcessing(false);
    }
  };

  const uploadToBackend = async (image, retries = 2) => {
    const data = new FormData();
    data.append("file", {
      uri: image.uri,
      type: "image/jpeg",
      name: `photo_${Date.now()}.jpg`,
    });

    try {
      setLoadingInventory(true);
      const backendRes = await axios.post(
        `${BACKEND_URL}/process_image`,
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 45000,
        }
      );

      setLoadingInventory(false);
      setIsUploaded(true);
      const detections = backendRes.data?.detections || [];
      if (Array.isArray(detections)) {
        setDetectedInventory(detections);
        if (detections.length > 0) {
          setLoadingInventory(true);
          await saveToInventory(detections);
          await loadInventory();
          setLoadingInventory(false);
          // Store the image URI in AsyncStorage
          await AsyncStorage.setItem("lastImage", image.uri);
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0.7,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
          Alert.alert(
            "Items Detected",
            `Successfully detected ${detections.length} item(s): ${detections
              .map((d) => d.item)
              .join(", ")}`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "No Items Detected",
            "No items were detected in the image. Try a clearer image with better lighting."
          );
          setPhoto(null);
          setIsUploaded(false);
          await AsyncStorage.removeItem("lastImage");
        }
      } else {
        logger.error(
          `Invalid detections format: ${JSON.stringify(backendRes.data)}`
        );
        setDetectedInventory([]);
        Alert.alert(
          "Error",
          "Received invalid detection data from backend. Please try again."
        );
        setPhoto(null);
        setIsUploaded(false);
        await AsyncStorage.removeItem("lastImage");
      }
    } catch (err) {
      setLoadingInventory(false);
      setIsUploaded(false);
      if (retries > 0) {
        logger.info(`Retrying upload (${retries} attempts left)...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return uploadToBackend(image, retries - 1);
      }
      let errorMessage =
        "Could not process the image. Please ensure the backend server is running and try again.";
      if (err.response) {
        errorMessage = `Backend Error: ${err.response.status} - ${
          err.response.data?.detail || err.response.data || err.message
        }`;
      } else if (err.request) {
        errorMessage = `Network Error: Could not connect to ${BACKEND_URL}.`;
      } else {
        errorMessage = `Request Error: ${err.message}`;
      }
      Alert.alert("Upload Failed", errorMessage);
      setDetectedInventory([]);
      setPhoto(null);
      await AsyncStorage.removeItem("lastImage");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToInventory = async (detections) => {
    try {
      const inventoryItems = detections.map((detection) => ({
        name: detection.item,
        count: detection.count || 1,
        category: detection.category || "Other",
        confidence: detection.confidence || 0.5,
      }));

      await FridgeAPI.saveToInventory(inventoryItems);

      const storedData = await AsyncStorage.getItem("inventory");
      const existingData = storedData ? JSON.parse(storedData) : [];
      const newItems = inventoryItems.map((item) => ({
        item: item.name,
        quantity: item.count,
        purchase_date: new Date().toISOString().split("T")[0],
        weight: "N/A",
        expiry_date: "N/A",
      }));
      const updatedData = [...existingData, ...newItems];
      await AsyncStorage.setItem("inventory", JSON.stringify(updatedData));

      const newInventory = { ...inventory };
      inventoryItems.forEach((item) => {
        const itemName = item.name;
        if (newInventory.items[itemName]) {
          newInventory.items[itemName].count += item.count;
        } else {
          newInventory.items[itemName] = {
            name: itemName,
            count: item.count,
            last_detected: new Date().toISOString(),
            category: item.category,
          };
        }
      });

      newInventory.total_items = Object.values(newInventory.items).reduce(
        (sum, item) => sum + item.count,
        0
      );
      newInventory.unique_items = Object.keys(newInventory.items).length;
      const categories = {};
      Object.values(newInventory.items).forEach((item) => {
        if (categories[item.category]) {
          categories[item.category] += item.count;
        } else {
          categories[item.category] = item.count;
        }
      });
      newInventory.categories = categories;

      setInventory(newInventory);
      logger.info(
        `Successfully saved ${inventoryItems.length} items to inventory`
      );
    } catch (error) {
      logger.error(`Failed to save inventory: ${error.message}`);
      Alert.alert("Error", "Failed to save items to inventory");
    }
  };

  const toggleCamera = () => {
    if (!cameraPermission) {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to scan items."
      );
      return;
    }
    if (apiStatus === "offline") {
      Alert.alert("API Offline", "Backend server is not available.");
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
            setInventory({
              items: {},
              total_items: 0,
              unique_items: 0,
              categories: {},
            });
            await FridgeAPI.clearInventory();
            await AsyncStorage.setItem("inventory", JSON.stringify([]));
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
      const newInventory = { ...inventory };
      if (newInventory.items[itemName]) {
        newInventory.items[itemName].count -= count;
        if (newInventory.items[itemName].count <= 0) {
          delete newInventory.items[itemName];
        }

        newInventory.total_items = Object.values(newInventory.items).reduce(
          (sum, item) => sum + item.count,
          0
        );
        newInventory.unique_items = Object.keys(newInventory.items).length;
        const categories = {};
        Object.values(newInventory.items).forEach((item) => {
          if (categories[item.category]) {
            categories[item.category] += item.count;
          } else {
            categories[item.category] = item.count;
          }
        });
        newInventory.categories = categories;

        setInventory(newInventory);
        await FridgeAPI.removeItem(itemName, count);

        const storedData = await AsyncStorage.getItem("inventory");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const updatedData = parsedData.filter(
            (item) => item.item !== itemName || item.quantity > count
          );
          await AsyncStorage.setItem("inventory", JSON.stringify(updatedData));
        }
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
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={checkPermissions}
          >
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
                <Text style={styles.scanningSubtext}>
                  This may take up to 45 seconds
                </Text>
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
                        {FOOD_ICONS[item.item.toLowerCase()] ||
                          FOOD_ICONS.default}{" "}
                        {item.item} (x{item.count},{" "}
                        {Math.round(item.confidence * 100)}%, {item.category})
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.scanningSubtext}>No items detected</Text>
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
                <Text style={styles.scanningSubtext}>
                  Choose an option to add items to your inventory
                </Text>
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
                    <Text style={styles.cameraButtonText}>
                      🖼️ Pick from Gallery
                    </Text>
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
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Fridge</Text>
              <View style={styles.summaryStats}>
                <Text style={styles.summaryStatText}>
                  {inventory.total_items} total items
                </Text>
              </View>
            </View>
            {photo && isUploaded && (
              <View style={styles.capturedImageContainer}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.capturedImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.clearImageButton}
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
                  <Text style={styles.clearImageButtonText}>Clear Image</Text>
                </TouchableOpacity>
              </View>
            )}
            {Object.keys(inventory.items).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🥡</Text>
                <Text style={styles.emptyText}>Your fridge is empty!</Text>
                <Text style={styles.emptySubtext}>
                  Scan items to add them to your inventory
                </Text>
              </View>
            ) : (
              <View style={styles.cardContainer}>
                {Object.entries(inventory.items).map(([itemName, itemData]) => (
                  <View key={itemName} style={styles.card}>
                    <View style={styles.cardImageContainer}>
                      <Text style={styles.cardImage}>
                        {FOOD_ICONS[itemName.toLowerCase()] ||
                          FOOD_ICONS.default}
                      </Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{itemName}</Text>
                      <Text style={styles.cardSubtitle}>
                        Quantity: {itemData.count}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Last Taken: {formatDate(itemData.last_detected)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeItemFromInventory(itemName, 1)}
                    >
                      <MaterialIcons
                        name="delete"
                        size={24}
                        color={Colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
      {!cameraActive && (
        <Animated.View
          style={[styles.fab, { transform: [{ scale: pulseAnim }] }]}
        >
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
  detectedItemText: {
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
    backgroundColor: Colors.danger,
  },
  cameraButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 48,
    marginBottom: 20,
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
    fontWeight: "bold",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
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
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  clearImageButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearImageButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: "bold",
  },
  cardContainer: {
    flexDirection: "column",
    gap: 10,
  },
  card: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10,
  },
  cardImageContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardImage: {
    fontSize: 40,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    textTransform: "uppercase",
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 10,
  },
});