import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Header from "../layouts/Header";
import Colors from "../utils/Colors";
import axios from "axios";



const BACKEND_URL = "http://192.168.0.215:8001";

export default function ScanScreen() {
  const navigation = useNavigation();
  const [photo, setPhoto] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (
        cameraStatus.status !== "granted" ||
        mediaLibraryStatus.status !== "granted"
      ) {
        Alert.alert(
          "Permission required",
          "Camera and Media Library permissions are needed to scan invoices."
        );
      }
    })();
  }, []);

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const image = result.assets[0];
      setPhoto(image);
      setIsUploaded(false);
      setInventory(null);
      uploadToBackend(image);
    }
  };

  const captureImageWithCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const image = result.assets[0];
      setPhoto(image);
      setIsUploaded(false);
      setInventory(null);
      uploadToBackend(image);
    }
  };

  // Function to upload the selected/captured image to the backend
  const uploadToBackend = async (image) => {
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
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 45000,
        }
      );
      setLoadingInventory(false);
      setIsUploaded(true);
      if (
        backendRes.data?.inventory &&
        Array.isArray(backendRes.data.inventory) &&
        backendRes.data.inventory.length > 0
      ) {
        setInventory(backendRes.data.inventory);
        // Automatically save to inventory
        await saveToInventory(backendRes.data.inventory);
      } else {
        setInventory([]);
        Alert.alert(
          "No items detected",
          "Could not detect any inventory items from the image or backend returned empty data."
        );
        setPhoto(null);
        setIsUploaded(false);
        setInventory(null);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      setLoadingInventory(false);
      let errorMessage =
        "Could not process the image. Please make sure the backend server is running and try again.";
      if (err.response) {
        errorMessage = `Backend Error: ${err.response.status} - ${
          err.response.data?.detail || err.response.data || err.message
        }`;
        logger.error(
          `Backend responded with status ${err.response.status}: ${
            err.response.data?.detail || err.response.data
          }`
        );
      } else if (err.request) {
        errorMessage =
          "Network Error: Could not connect to the backend server. Please ensure it's running and reachable.";
        logger.error("Network Error: No response from backend.");
      } else {
        errorMessage = `Request Error: ${err.message}`;
        logger.error(`Axios request setup error: ${err.message}`);
      }
      Alert.alert("Upload Failed", errorMessage);
      setInventory(null);
      setPhoto(null);
      setIsUploaded(false);
    }
  };

  // Function to save the extracted inventory items to AsyncStorage
  const saveToInventory = async (inventoryToSave) => {
    if (!inventoryToSave || inventoryToSave.length === 0) {
      Alert.alert("No items to save", "There are no extracted items to add to your inventory.");
      setPhoto(null);
      setIsUploaded(false);
      setInventory(null);
      return;
    }
    try {
      const existingData = await AsyncStorage.getItem("inventory");
      let inventoryData = existingData ? JSON.parse(existingData) : [];
      const itemsToSave = inventoryToSave.map((item) => ({
        item: item.item || "Unknown Item",
        quantity: item.quantity || 1,
        weight: item.weight || "",
        purchase_date: item.purchase_date || new Date().toISOString().split("T")[0],
        expiry_date: item.expiry_date || "",
      }));
      inventoryData = [...inventoryData, ...itemsToSave];
      await AsyncStorage.setItem("inventory", JSON.stringify(inventoryData));
      Alert.alert("Success", `${itemsToSave.length} item(s) added to inventory successfully`);
      setPhoto(null);
      setIsUploaded(false);
      setInventory(null);
      setTimeout(() => {
        navigation.navigate("Inventory");
      }, 1000);
    } catch (error) {
      console.error("Error saving to inventory:", error);
      Alert.alert("Error", "Failed to save items to inventory");
      setPhoto(null);
      setIsUploaded(false);
      setInventory(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingInventory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Processing inventory...</Text>
          </View>
        ) : (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionTitle}>How to Scan Your Invoice</Text>
            {[
              {
                icon: "camera-outline",
                title: "Snap a Clear Photo",
                desc: "Use your camera to take a sharp, well-lit photo of your invoice. This helps us automatically add items to your inventory.",
              },
              {
                icon: "image-outline",
                title: "Pick from Gallery",
                desc: "Choose a clear invoice image from your gallery. Make sure it’s a valid invoice to proceed.",
              },
              {
                icon: "checkmark-circle-outline",
                title: "Valid Invoice Check",
                desc: "We’ll verify if the image is a valid invoice. If not, items won’t be added to your inventory.",
              },
              {
                icon: "sync-outline",
                title: "Automatic Processing",
                desc: "Once uploaded, all items listed in the invoice will be seamlessly added to your inventory.",
              },
              {
                icon: "eye-outline",
                title: "Ensure Image Quality",
                desc: "Make sure the invoice is fully visible, well-lit, and not blurry for accurate item detection.",
              },
            ].map((item, index) => (
              <View key={index} style={styles.instructionItem}>
                <Ionicons name={item.icon} size={24} color={Colors.secondary} />
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.instructionPointTitle}>{item.title}</Text>
                  <Text style={styles.instructionPoint}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={captureImageWithCamera}>
          <Entypo name="camera" size={24} color={Colors.LightGray} />
        </TouchableOpacity>
        <Text style={styles.line}>|</Text>
        <TouchableOpacity style={styles.button} onPress={pickImageFromGallery}>
          <Entypo name="images" size={24} color={Colors.LightGray} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 15,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: [{ translateX: -90 }],
    width: 180,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#131417",
    paddingVertical: 12,
    borderRadius: 50,
    elevation: 10,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  button: {
    paddingHorizontal: 15,
  },
  line: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "200",
  },
  instructionsContainer: {
    padding: 20,
    marginVertical: 15,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 30,
    textAlign: "center",
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  instructionTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  instructionPointTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 5,
  },
  instructionPoint: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    textAlign: "center",
    marginVertical: 10,
    color: Colors.primary,
    fontWeight: "600",
  },
});

const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warning: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
};