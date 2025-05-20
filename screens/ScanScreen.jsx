import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert, // Keep Alert for user feedback
  FlatList,
  ActivityIndicator,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Header from "../layouts/Header"; // Assuming Header component path
import Colors from "../utils/Colors"; // Assuming Colors utility path
import axios from "axios";

// IMPORTANT: Replace 'YOUR_LOCAL_IP_ADDRESS' with the actual local IP address of your computer
// running the FastAPI backend (e.g., '192.168.1.100').
// Do NOT use 'localhost', '127.0.0.1', or '0.0.0.0' when connecting from an emulator or physical device.
// Use your computer's IP address on your local network
const BACKEND_URL = "http://192.168.1.2:8001";

export default function ScanScreen() {
  const navigation = useNavigation();
  const [photo, setPhoto] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [savedToInventory, setSavedToInventory] = useState(false);

  useEffect(() => {
    // Request necessary permissions on component mount
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
  }, []); // Empty dependency array means this effect runs only once on mount

  // Function to pick an image from the device's gallery
  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only allow images
      quality: 0.7, // Compress image slightly for faster upload
    });

    // Check if the user didn't cancel and an asset URI is available
    if (!result.canceled && result.assets?.[0]?.uri) {
      const image = result.assets[0];
      setPhoto(image); // Set the selected photo state
      setIsUploaded(false); // Reset upload status
      setInventory(null); // Clear previous inventory data
      uploadToBackend(image); // Proceed to upload the image
    }
  };

  // Function to capture an image using the device's camera
  const captureImageWithCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only allow images
      quality: 0.7, // Compress image slightly
    });

    // Check if the user didn't cancel and an asset URI is available
    if (!result.canceled && result.assets?.[0]?.uri) {
      const image = result.assets[0];
      setPhoto(image); // Set the captured photo state
      setIsUploaded(false); // Reset upload status
      setInventory(null); // Clear previous inventory data
      uploadToBackend(image); // Proceed to upload the image
    }
  };

  // Function to upload the selected/captured image to the backend
  const uploadToBackend = async (image) => {
    const data = new FormData();
    data.append("file", {
      uri: image.uri,
      type: "image/jpeg", // Assuming JPEG, adjust if ImagePicker provides type
      name: `photo_${Date.now()}.jpg`, // Generate a unique file name
    });

    try {
      setLoadingInventory(true); // Indicate that processing has started
      setSavedToInventory(false); // Reset saved status

      logger.info(`Attempting to upload image to: ${BACKEND_URL}/process_image`);

      // Use the process_image endpoint
      const backendRes = await axios.post(
        `${BACKEND_URL}/process_image`, // Use the defined backend URL
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data", // Required for FormData
          },
          timeout: 45000, // Increased timeout for backend processing (OCR + AI)
        }
      );

      setLoadingInventory(false); // Processing finished
      setIsUploaded(true); // Mark as uploaded (backend processed)

      logger.info("Backend response received.");

      // Check if inventory data was returned and is not empty
      if (backendRes.data?.inventory && Array.isArray(backendRes.data.inventory) && backendRes.data.inventory.length > 0) {
        setInventory(backendRes.data.inventory); // Set the extracted inventory data
        Alert.alert("Success", "Inventory items extracted successfully");
      } else {
        // Handle cases where no inventory items were detected or returned
        setInventory([]); // Set inventory to empty array if none detected
        Alert.alert("No items detected", "Could not detect any inventory items from the image or backend returned empty data.");
      }
    } catch (err) {
      console.error("Error uploading image:", err); // Log the full error
      setLoadingInventory(false); // Stop loading indicator

      // Provide a more informative error message to the user
      let errorMessage = "Could not process the image. Please make sure the backend server is running and try again.";
      if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = `Backend Error: ${err.response.status} - ${err.response.data?.detail || err.response.data || err.message}`;
          logger.error(`Backend responded with status ${err.response.status}: ${err.response.data?.detail || err.response.data}`);
      } else if (err.request) {
          // The request was made but no response was received
          errorMessage = "Network Error: Could not connect to the backend server. Please ensure it's running and reachable.";
          logger.error("Network Error: No response from backend.");
      } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = `Request Error: ${err.message}`;
          logger.error(`Axios request setup error: ${err.message}`);
      }

      Alert.alert(
        "Upload Failed",
        errorMessage
      );
      setInventory(null); // Clear inventory on error
    }
  };

  // Function to save the extracted inventory items to AsyncStorage
  const saveToInventory = async () => {
    if (!inventory || inventory.length === 0) {
        Alert.alert("No items to save", "There are no extracted items to add to your inventory.");
        return;
    }

    try {
      // Get existing inventory data from AsyncStorage
      const existingData = await AsyncStorage.getItem("inventory");
      let inventoryData = existingData ? JSON.parse(existingData) : [];

      // Add new items to the existing inventory array
      // Ensure items have necessary fields before saving
      const itemsToSave = inventory.map(item => ({
          item: item.item || 'Unknown Item', // Provide default if missing
          quantity: item.quantity || 1, // Provide default if missing
          weight: item.weight || '',
          purchase_date: item.purchase_date || datetime.now().strftime('%Y-%m-%d'), // Use today's date if missing
          expiry_date: item.expiry_date || '',
          // Add any other fields your inventory structure requires
      }));


      inventoryData = [...inventoryData, ...itemsToSave];

      // Save the updated inventory back to AsyncStorage
      await AsyncStorage.setItem("inventory", JSON.stringify(inventoryData));

      setSavedToInventory(true); // Mark as saved
      Alert.alert("Success", `${itemsToSave.length} item(s) added to inventory successfully`);

      // Navigate to inventory screen after a short delay
      setTimeout(() => {
        navigation.navigate("Inventory"); // Assuming 'Inventory' is the route name
      }, 1000); // 1 second delay

    } catch (error) {
      console.error("Error saving to inventory:", error);
      Alert.alert("Error", "Failed to save items to inventory");
    }
  };

  // Render function for each item in the extracted inventory list
  const renderInventoryItem = ({ item }) => (
    <View style={styles.inventoryItem}>
      {/* Ensure keys match the backend response structure */}
      <Text style={styles.inventoryText}>Item: {item.item || 'N/A'}</Text>
      <Text style={styles.inventoryText}>Quantity: {item.quantity || 'N/A'}</Text>
      {/* Only display weight if it exists */}
      {item.weight && <Text style={styles.inventoryText}>Weight: {item.weight}</Text>}
      {/* Ensure key matches backend response structure */}
      <Text style={styles.inventoryText}>Purchase Date: {item.purchase_date || 'N/A'}</Text>
      {/* Only display expiry date if it exists */}
      {item.expiry_date && <Text style={styles.inventoryText}>Expiry Date: {item.expiry_date}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Component */}
      <Header />

      {/* Scrollable Content Area */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }} // Add padding at the bottom for button container
        showsVerticalScrollIndicator={false}
      >
        {isUploaded ? (
          // Display uploaded image and extracted inventory if uploaded
          <>
            {photo?.uri && (
              <Image
                source={{ uri: photo.uri }}
                style={{ width: "100%", height: 300, marginVertical: 20, borderRadius: 8 }} // Added border radius
                resizeMode="contain" // Ensure the whole image is visible
              />
            )}

            {loadingInventory ? (
              // Show loading indicator while processing
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.secondary} />
                <Text style={styles.loadingText}>Processing inventory...</Text>
              </View>
            ) : inventory ? (
              // Display extracted inventory list if available
              <>
                <Text style={styles.inventoryTitle}>Extracted Inventory</Text>
                {inventory.length > 0 ? (
                    <FlatList
                      data={inventory}
                      renderItem={renderInventoryItem}
                      keyExtractor={(item, index) => `inventory-${index}`} // Unique key for each item
                      style={{ marginBottom: 20 }}
                      scrollEnabled={false} // Disable inner FlatList scrolling if parent is ScrollView
                    />
                ) : (
                    <Text style={styles.noInventoryText}>No inventory items were extracted.</Text>
                )}


                {/* Save to Inventory Button - show only if items are extracted and not yet saved */}
                {inventory.length > 0 && !savedToInventory && (
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveToInventory}
                    disabled={loadingInventory} // Disable button while loading
                  >
                    <Text style={styles.saveButtonText}>Add to Inventory</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </>
        ) : (
          // Display instructions if no image is uploaded yet
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

      {/* Fixed Button Container at the bottom */}
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
    flexGrow: 1, // Allow content to grow
    paddingTop: 80,
    paddingHorizontal: 15,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: [{ translateX: -90 }], // Half of the button container width (180 / 2)
    width: 180,
    flexDirection: "row",
    justifyContent: "space-around", // Distribute space evenly
    alignItems: "center",
    backgroundColor: "#131417",
    paddingVertical: 12,
    borderRadius: 50,
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  button: {
    paddingHorizontal: 15, // Adjusted padding
  },
  line: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "200",
    // paddingHorizontal: 10, // Removed padding here
  },
  instructionsContainer: {
    padding: 20,
    marginVertical: 15,
    backgroundColor: Colors.cardBackground, // Added background color
    borderRadius: 8, // Added border radius
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
    alignItems: "flex-start", // Align items to the top
    marginBottom: 15,
  },
  instructionTextContainer: {
    flex: 1, // Allow text container to take available space
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
  inventoryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.secondary,
    marginVertical: 15,
    textAlign: "center",
  },
  inventoryItem: {
    backgroundColor: Colors.cardBackground, // Adjusted background color
    padding: 15, // Increased padding
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1, // Added border
    borderColor: Colors.borderColor, // Added border color
  },
  inventoryText: {
    color: Colors.text, // Adjusted text color
    fontSize: 14,
    marginBottom: 4, // Add spacing between text lines
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    textAlign: "center",
    marginVertical: 10,
    color: Colors.primary,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14, // Increased padding
    paddingHorizontal: 25, // Increased padding
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20, // Increased margin
    alignSelf: 'center', // Center the button
    shadowColor: '#000', // Added shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 18, // Increased font size
    fontWeight: 'bold',
  },
  noInventoryText: {
      textAlign: 'center',
      color: Colors.text,
      fontSize: 16,
      marginTop: 20,
  }
});

// logger utility (simple console logging for demonstration)
const logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    warning: (message) => console.warn(`[WARN] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`),
};

