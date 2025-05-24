import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

// Colors utility
const Colors = {
  background: '#f8f9fa',
  primary: '#4a90e2',
  secondary: '#50c878',
  accent: '#ff6b6b',
  text: '#2c3e50',
  lightGray: '#ecf0f1',
  white: '#ffffff',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  overlay: 'rgba(0,0,0,0.3)',
};

// Food item icons mapping
const FOOD_ICONS = {
  apple: '🍎',
  banana: '🍌',
  orange: '🍊',
  carrot: '🥕',
  broccoli: '🥦',
  potato: '🥔',
  bottle: '🍼',
  cup: '☕',
  sandwich: '🥪',
  pizza: '🍕',
  cake: '🍰',
  donut: '🍩',
  bowl: '🍜',
  'wine glass': '🍷',
  'hot dog': '🌭',
  spoon: '🥄',
  knife: '🔪',
  fork: '🍴',
  default: '🥘',
};

// API Configuration
const BACKEND_URL = Platform.OS === 'ios' 
  ? 'https://fridge-backend-e2qc.onrender.com' 
  : 'https://fridge-backend-e2qc.onrender.com'; 

// Logger utility
const logger = {
  error: (message) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  },
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  }
};

class FridgeAPI {
  static async processFrame(imageData) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: 'camera_image.jpg',
      });

      const response = await fetch(`${BACKEND_URL}/scan`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Frame processing API error:', error);
      throw error;
    }
  }

  static async processImage(imageData) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      });

      const response = await axios.post(
        `${BACKEND_URL}/process_image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 45000,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Image processing API error:', error);
      throw error;
    }
  }

  static async getInventory() {
    try {
      const response = await fetch(`${BACKEND_URL}/inventory`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Get inventory API error:', error);
      throw error;
    }
  }

  static async saveToInventory(inventoryItems) {
    try {
      const response = await axios.post(`${BACKEND_URL}/inventory/save`, {
        items: inventoryItems
      });
      return response.data;
    } catch (error) {
      logger.error('Save inventory API error:', error);
      throw error;
    }
  }

  static async clearInventory() {
    try {
      const response = await fetch(`${BACKEND_URL}/inventory`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Clear inventory API error:', error);
      throw error;
    }
  }

  static async removeItem(itemName, count = 1) {
    try {
      const response = await fetch(`${BACKEND_URL}/inventory/${itemName}?count=${count}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Remove item API error:', error);
      throw error;
    }
  }

  static async getHealth() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return await response.json();
    } catch (error) {
      logger.error('Health check failed:', error);
      return { status: 'offline' };
    }
  }
}

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
  const [apiStatus, setApiStatus] = useState('checking');
  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [detectedInventory, setDetectedInventory] = useState([]); // Initialize as empty array

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkPermissions();
    checkApiHealth();
    loadInventory();
  }, []);

  useEffect(() => {
    logger.info('detectedInventory updated:', detectedInventory);
  }, [detectedInventory]);

  const checkPermissions = async () => {
    try {
      // Check camera permission
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(cameraResult.status === 'granted');

      // Check media library permission
      const libraryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setLibraryPermission(libraryResult.status === 'granted');

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to scan food items',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      }
    } catch (error) {
      logger.error('Permission check failed:', error);
      setCameraPermission(false);
      setLibraryPermission(false);
    }
  };

  const checkApiHealth = async () => {
    try {
      const health = await FridgeAPI.getHealth();
      setApiStatus(health.status === 'healthy' ? 'online' : 'offline');
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const loadInventory = async () => {
    try {
      const inventoryData = await FridgeAPI.getInventory();
      setInventory(inventoryData);
    } catch (error) {
      logger.error('Failed to load inventory:', error);
    }
  };

  const captureImageWithCamera = async () => {
    if (!cameraPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }
    if (apiStatus === 'offline') {
      Alert.alert('API Offline', 'Backend server is not available.');
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
        if (!image.mimeType?.includes('image/jpeg')) {
          Alert.alert('Invalid Format', 'Please capture a JPEG image.');
          setIsProcessing(false);
          return;
        }
        setPhoto(image);
        setIsUploaded(false);
        setDetectedInventory([]);
        logger.info('Captured image from camera:', image.uri);
        await uploadToBackend(image);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      logger.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setIsProcessing(false);
    }
  };

  const pickImageFromLibrary = async () => {
    if (!libraryPermission) {
      Alert.alert('Permission Required', 'Media library permission is required to select photos.');
      return;
    }
    if (apiStatus === 'offline') {
      Alert.alert('API Offline', 'Backend server is not available.');
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
        if (!image.mimeType?.includes('image/jpeg')) {
          Alert.alert('Invalid Format', 'Please select a JPEG image.');
          setIsProcessing(false);
          return;
        }
        setPhoto(image);
        setIsUploaded(false);
        setDetectedInventory([]);
        logger.info('Selected image from library:', image.uri);
        await uploadToBackend(image);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      logger.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setIsProcessing(false);
    }
  };

  const uploadToBackend = async (image) => {
    const data = new FormData();
    data.append("file", {
      uri: image.uri,
      type: "image/jpeg",
      name: `photo_${Date.now()}.jpg`,
    });

    try {
      setLoadingInventory(true);
      logger.info(`Uploading image to ${BACKEND_URL}/process_image`);
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

      logger.info('Backend response:', JSON.stringify(backendRes.data, null, 2));
      setLoadingInventory(false);
      setIsUploaded(true);

      const detections = backendRes.data?.detections || [];
      if (Array.isArray(detections)) {
        setDetectedInventory(detections);
        logger.info(`Received ${detections.length} item(s):`, detections.map(d => d.item));

        if (detections.length > 0) {
          await saveToInventory(detections);

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
            'Items Detected',
            `Successfully detected ${detections.length} item(s): ${detections.map(d => d.item).join(', ')}`,
            [{ text: 'OK' }]
          );
        } else {
          logger.warn('No items detected in backend response');
          Alert.alert(
            'No Items Detected',
            'No items were detected in the image. Try a clearer image with better lighting or different food items.'
          );
          setPhoto(null);
          setIsUploaded(false);
        }
      } else {
        logger.error('Invalid detections format:', backendRes.data);
        setDetectedInventory([]);
        Alert.alert(
          'Error',
          'Received invalid detection data from backend. Please try again.'
        );
        setPhoto(null);
        setIsUploaded(false);
      }
    } catch (err) {
      logger.error('Error uploading image:', err);
      setLoadingInventory(false);
      setIsUploaded(false);

      let errorMessage = 'Could not process the image. Please ensure the backend server is running and try again.';
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
        errorMessage = `Network Error: Could not connect to ${BACKEND_URL}. Please ensure the server is running and reachable.`;
        logger.error(`Network Error: No response from ${BACKEND_URL}`);
      } else {
        errorMessage = `Request Error: ${err.message}`;
        logger.error(`Axios request setup error: ${err.message}`);
      }

      Alert.alert('Upload Failed', errorMessage);
      setDetectedInventory([]);
      setPhoto(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToInventory = async (detections) => {
    try {
      const inventoryItems = detections.map((detection) => ({
        name: detection.item,
        count: detection.count || 1,
        category: detection.category || 'Other',
      }));

      await FridgeAPI.saveToInventory(inventoryItems);

      const newInventory = { ...inventory };
      inventoryItems.forEach((item) => {
        const itemName = item.name;
        const itemCategory = item.category;
        const itemCount = item.count;

        if (newInventory.items[itemName]) {
          newInventory.items[itemName].count += itemCount;
        } else {
          newInventory.items[itemName] = {
            name: itemName,
            count: itemCount,
            category: itemCategory,
            last_detected: new Date().toISOString(),
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
      logger.info(`Successfully saved ${inventoryItems.length} items to inventory`);
    } catch (error) {
      logger.error(`Failed to save inventory: ${error.message}`);
      Alert.alert('Error', 'Failed to save items to inventory');
    }
  };

  const toggleCamera = () => {
    if (!cameraPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to scan items.');
      return;
    }
    if (apiStatus === 'offline') {
      Alert.alert('API Offline', 'Backend server is not available.');
      return;
    }
    setCameraActive(!cameraActive);
    setPhoto(null);
    setIsUploaded(false);
    setDetectedInventory([]);
  };

  const clearFridge = () => {
    Alert.alert(
      'Clear Fridge',
      'Are you sure you want to remove all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setInventory({
                items: {},
                total_items: 0,
                unique_items: 0,
                categories: {},
              });
              await FridgeAPI.clearInventory();
              Alert.alert('Success', 'Fridge cleared successfully!');
            } catch (error) {
              logger.error('Failed to clear inventory:', error);
              Alert.alert('Error', 'Failed to clear fridge');
            }
          },
        },
      ]
    );
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
      }
    } catch (error) {
      logger.error('Failed to remove item:', error);
      Alert.alert('Error', 'Failed to remove item');
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online':
        return Colors.success;
      case 'offline':
        return Colors.danger;
      default:
        return Colors.warning;
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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Smart Fridge Scanner</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>API: {apiStatus.toUpperCase()}</Text>
        </View>
      </View>

      {cameraActive ? (
        /* Image Picker View */
        <View style={styles.cameraContainer}>
          <View style={styles.cameraOverlay}>
            {loadingInventory ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.scanningText}>Processing Image...</Text>
                <Text style={styles.scanningSubtext}>This may take up to 45 seconds</Text>
              </View>
            ) : isProcessing ? (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.scanningText}>Preparing Image...</Text>
              </View>
            ) : detectedInventory.length > 0 || isUploaded ? (
              <View style={styles.detectionResults}>
                <Text style={styles.scanningText}>Detected Items</Text>
                {detectedInventory.length > 0 ? (
                  detectedInventory.map((item, index) => (
                    <View key={index} style={styles.detectedItem}>
                      <Text style={styles.detectedItemText}>
                        {FOOD_ICONS[item.item] || FOOD_ICONS.default} {item.item} (x{item.count}, {Math.round(item.confidence * 100)}%, {item.category})
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.scanningSubtext}>No items detected</Text>
                )}
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={() => {
                      setPhoto(null);
                      setIsUploaded(false);
                      setDetectedInventory([]);
                    }}
                  >
                    <Text style={styles.cameraButtonText}>🔄 Scan Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cameraButton, styles.cancelButton]}
                    onPress={() => {
                      setCameraActive(false);
                      setDetectedInventory([]);
                      setPhoto(null);
                      setIsUploaded(false);
                    }}
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
        /* Inventory View */
        <View style={styles.content}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Inventory</Text>
              <View style={styles.summaryStats}>
                <Text style={styles.summaryStatText}>
                  {inventory.total_items} total items • {inventory.unique_items} unique
                </Text>
              </View>
            </View>
            
            {Object.keys(inventory.items).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🥡</Text>
                <Text style={styles.emptyText}>Your fridge is empty!</Text>
                <Text style={styles.emptySubtext}>Scan items to add them to your inventory</Text>
              </View>
            ) : (
              <FlatList
                data={Object.entries(inventory.items)}
                keyExtractor={([itemName]) => itemName}
                renderItem={({item: [itemName, item]}) => (
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <Text style={styles.summaryIcon}>{FOOD_ICONS[itemName] || FOOD_ICONS.default}</Text>
                      <View style={styles.summaryItemInfo}>
                        <Text style={styles.summaryItemName}>{itemName}</Text>
                        <Text style={styles.summaryItemCategory}>{item.category}</Text>
                        {item.last_detected && (
                          <Text style={styles.summaryItemDate}>
                            Last detected: {new Date(item.last_detected).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.summaryItemRight}>
                      <Text style={styles.summaryItemCount}>{item.count}</Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeItemFromInventory(itemName)}
                      >
                        <Text style={styles.removeButtonText}>-</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
          
          {Object.keys(inventory.items).length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFridge}>
              <Text style={styles.clearButtonText}>Clear Fridge</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Floating Action Button */}
      {!cameraActive && (
        <TouchableOpacity style={styles.fab} onPress={toggleCamera}>
          <Text style={styles.fabText}>📷</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    width: '100%',
  },
  scanningIndicator: {
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  scanningSubtext: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: 20,
  },
  detectionResults: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  detectedItem: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 10,
    width: '80%',
  },
  detectedItemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  cameraControls: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  cameraButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  cancelButton: {
    backgroundColor: Colors.danger,
  },
  cameraButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 48,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  permissionSubtitle: {
    fontSize: 16,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 10,
  },
  summaryContainer: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  summaryItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  summaryItemInfo: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryItemCategory: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 2,
  },
  summaryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItemCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 15,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: Colors.danger,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 20,
  },
  clearButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
  },
});