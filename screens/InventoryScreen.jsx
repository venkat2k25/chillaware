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
} from "react-native";
import Svg, { Path, Line } from 'react-native-svg';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Header from "../layouts/Header";
import Colors from "../utils/Colors";
import Ionicons from "@expo/vector-icons/Ionicons";

const BlobBackground = () => (
  <Svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
  >
    <Path
      fill="#030B3880"
      d="M47.6,-62.9C60.3,-55.2,67.6,-38.3,69.6,-22.6C71.5,-6.9,68,7.6,61.3,20.3C54.6,33,44.7,43.9,32.9,52.3C21.1,60.6,7.5,66.4,-7.7,70.1C-22.9,73.7,-39.6,75.1,-52.8,66.6C-66,58.1,-75.7,39.7,-78.5,21.2C-81.3,2.6,-77.2,-15.9,-68.2,-31.1C-59.2,-46.4,-45.4,-58.4,-30.1,-65.9C-14.8,-73.5,2,-76.5,18.2,-74.4C34.5,-72.3,49.3,-65.7,47.6,-62.9Z"
      transform="translate(100 100)"
    />
  </Svg>
);

const { width: screenWidth } = Dimensions.get('window');

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
          const targetHeight = Math.min(0.9, baseHeight + (audioLevels[index] || Math.random() * 0.6));
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
      // Reset to base height when not recording
      const resetAnimations = animatedValues.map(value =>
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
              backgroundColor: isRecording ? '#00ff88' : '#4CAF50',
              opacity: isRecording ? 1 : 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Recording Card Overlay Component
const RecordingCard = ({ visible, onClose, onStopRecording, isRecording, audioLevels, itemName, recordingState }) => {
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
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }]
        }
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
          {recordingState === 'processing' ? (
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
            recordingState === 'processing' && styles.disabledButton
          ]}
          onPress={isRecording ? onStopRecording : null}
          disabled={recordingState === 'processing'}
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
const GEMINI_API_KEY = 'AIzaSyD57P0SmXEGmRorqT9qh2ngZ8Cgnbt-wAk'; // Replace with your actual API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const DEEPGRAM_API_KEY = '22b51946896734c28b59d086c3f758aa4e0db542';
const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';

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
      console.error('Error setting up audio:', error);
    }
  };

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
          originalIndex: index,
        }));
        setInventoryData(formattedData);
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    }
  };

  // Start voice recording for expiry date
  const startRecording = async (itemId) => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }

      console.log('Starting recording for item:', itemId);
      const item = inventoryData.find(item => item.id === itemId);
      setCurrentRecordingItem(item);
      setShowRecordingModal(true);
      setRecordingStates(prev => ({ ...prev, [itemId]: 'recording' }));
      setIsRecording(true);
      
      // Use WAV format for better compatibility with Deepgram
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000, // Standard sample rate for speech recognition
          numberOfChannels: 1, // Mono audio
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000, // Standard sample rate for speech recognition
          numberOfChannels: 1, // Mono audio
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      
      // Start monitoring audio levels
      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          updateAudioLevels(normalizedLevel);
        }
      });

      await newRecording.startAsync();
      setRecording(newRecording);
      
      // Start simulated audio level updates (fallback if metering doesn't work)
      startAudioLevelSimulation();
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingStates(prev => ({ ...prev, [itemId]: null }));
      setIsRecording(false);
      setShowRecordingModal(false);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  // Update audio levels for visualization
  const updateAudioLevels = (newLevel) => {
    setAudioLevels(prev => {
      const newLevels = [...prev.slice(1), newLevel];
      return newLevels;
    });
  };

  // Simulate audio levels if real metering isn't available
  const startAudioLevelSimulation = () => {
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
    }
    
    audioLevelInterval.current = setInterval(() => {
      const randomLevel = Math.random() * 0.8 + 0.2; // Random between 0.2 and 1.0
      updateAudioLevels(randomLevel);
    }, 100);
  };

  const stopAudioLevelSimulation = () => {
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = null;
    }
  };

  // Stop recording and process with Gemini API
  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (!recording || !currentRecordingItem) {
        console.log('❌ No recording or item found');
        return;
      }

      const itemId = currentRecordingItem.id;
      console.log('📦 Processing item:', itemId, currentRecordingItem.productName);
      
      setRecordingStates(prev => ({ ...prev, [itemId]: 'processing' }));
      setIsRecording(false);
      stopAudioLevelSimulation();

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('🎵 Audio saved to:', uri);
      
      // Convert audio to text and parse expiry date
      console.log('🔄 Starting audio processing pipeline...');
      const expiryDate = await processAudioWithGemini(uri);
      
      if (expiryDate) {
        console.log('✅ SUCCESS! Updating item with expiry date:', expiryDate);
        await updateItemExpiryDate(itemId, expiryDate);
        console.log('💾 Item updated in storage');
        Alert.alert('Success! 🎉', `Expiry date updated to: ${expiryDate}`);
      } else {
        console.log('❌ FAILED: Could not extract expiry date');
        Alert.alert(
          'Could not understand 🤔', 
          'Please try again. Say something like "expires May 15th 2025" or "best before June 2026"'
        );
      }

      // Cleanup
      setRecording(null);
      setRecordingStates(prev => ({ ...prev, [itemId]: null }));
      setShowRecordingModal(false);
      setCurrentRecordingItem(null);
      
    } catch (error) {
      console.error('❌ Failed to stop recording:', error.message);
      console.error('🔧 Full error:', error);
      
      if (currentRecordingItem) {
        setRecordingStates(prev => ({ ...prev, [currentRecordingItem.id]: null }));
      }
      setIsRecording(false);
      setShowRecordingModal(false);
      stopAudioLevelSimulation();
      Alert.alert('Error 😞', 'Failed to process recording. Please try again.');
    }
  };

  // Cancel recording
  const cancelRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      if (currentRecordingItem) {
        setRecordingStates(prev => ({ ...prev, [currentRecordingItem.id]: null }));
      }
      
      setIsRecording(false);
      setShowRecordingModal(false);
      setCurrentRecordingItem(null);
      stopAudioLevelSimulation();
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  // Process audio with Gemini API
  const processAudioWithGemini = async (audioUri) => {
    try {
      console.log('🤖 Starting Gemini processing...');
      
      // Transcribe audio to text using Deepgram
      const transcribedText = await transcribeAudio(audioUri);
      console.log('🗣️ USER SAID:', `"${transcribedText}"`);
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        console.log('❌ Empty transcript, cannot process');
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
        
        Today's date is ${new Date().toISOString().split('T')[0]} for reference.
        
        Return ONLY the expiry date in YYYY-MM-DD format. If no clear expiry date is found, return "null".
        
        Examples:
        - Input: "expires May fifteenth twenty twenty six" → Output: 15-05-2026
        - Input: "best before June 2025" → Output: 30-06-2025
        - Input: "expires in six months" → Output: ${new Date(Date.now() + 6*30*24*60*60*1000).toISOString().split('T')[0]}
      `;

      console.log('📤 Sending to Gemini API...');
      
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          }
        }),
      });

      console.log('🤖 Gemini response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Full Gemini response:', JSON.stringify(data, null, 2));
      
      const extractedDate = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log('📅 GEMINI EXTRACTED DATE:', `"${extractedDate}"`);
      
      // Validate the date format
      if (extractedDate && extractedDate !== 'null' && /^\d{4}-\d{2}-\d{2}$/.test(extractedDate)) {
        console.log('✅ Valid date format confirmed:', extractedDate);
        return extractedDate;
      } else {
        console.log('❌ Invalid date format or null result');
        return null;
      }
    } catch (error) {
      console.error('❌ Error processing with Gemini:', error.message);
      console.error('🔧 Full error details:', error);
      return null;
    }
  };

  // Convert audio to text using Deepgram API
  const transcribeAudio = async (audioUri) => {
    try {
      console.log('🎙️ Starting transcription for:', audioUri);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('📁 File info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav', // Changed to WAV
        name: 'recording.wav',
      });

      console.log('📤 Sending request to Deepgram...');
      
      // Use more specific Deepgram parameters for better accuracy
      const response = await fetch(`${DEEPGRAM_URL}?punctuate=true&language=en-US&model=nova-2&smart_format=true&diarize=false`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log('📡 Deepgram response status:', response.status);
      console.log('📡 Deepgram response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Deepgram API error response:', errorText);
        
        // Try alternative approach if the first one fails
        console.log('🔄 Trying alternative audio format...');
        return await transcribeAudioAlternative(audioUri);
      }

      const result = await response.json();
      console.log('📝 Full Deepgram result:', JSON.stringify(result, null, 2));
      
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      
      if (transcript && transcript.trim()) {
        console.log('✅ TRANSCRIPT EXTRACTED:', transcript);
        return transcript.trim();
      } else {
        console.log('⚠️ No transcript found in response');
        console.log('🔍 Available channels:', result.results?.channels?.length || 0);
        throw new Error('No transcript found in Deepgram response');
      }
    } catch (error) {
      console.error('❌ Deepgram transcription error:', error.message);
      console.error('🔧 Full error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  };

  // Alternative transcription method using base64 encoding
  const transcribeAudioAlternative = async (audioUri) => {
    try {
      console.log('🔄 Trying base64 approach...');
      
      // Read file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('📊 Audio data size:', audioBase64.length, 'characters');
      
      // Convert base64 to Uint8Array
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const response = await fetch(`${DEEPGRAM_URL}?punctuate=true&language=en-US&model=nova-2`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav',
        },
        body: bytes,
      });

      console.log('📡 Alternative response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Alternative method also failed:', errorText);
        throw new Error(`Alternative transcription failed: ${response.status}`);
      }

      const result = await response.json();
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      
      if (transcript && transcript.trim()) {
        console.log('✅ ALTERNATIVE METHOD SUCCESS:', transcript);
        return transcript.trim();
      }
      
      throw new Error('No transcript from alternative method');
    } catch (error) {
      console.error('❌ Alternative transcription failed:', error);
      throw error;
    }
  };

  // Update item expiry date in storage
  const updateItemExpiryDate = async (itemId, expiryDate) => {
    try {
      console.log('💾 Updating storage for item:', itemId, 'with date:', expiryDate);
      
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('📋 Current inventory data:', parsedData.length, 'items');
        
        const itemIndex = inventoryData.find(item => item.id === itemId)?.originalIndex;
        console.log('🔍 Found item at index:', itemIndex);
        
        if (itemIndex !== undefined && parsedData[itemIndex]) {
          console.log('📝 Before update:', parsedData[itemIndex]);
          parsedData[itemIndex].expiry_date = expiryDate;
          console.log('📝 After update:', parsedData[itemIndex]);
          
          await AsyncStorage.setItem("inventory", JSON.stringify(parsedData));
          console.log('💾 Saved to AsyncStorage');
          
          // Update local state
          setInventoryData(prev => {
            const updated = prev.map(item => 
              item.id === itemId ? { ...item, expiryDate } : item
            );
            console.log('🔄 Updated local state');
            return updated;
          });
          
          console.log('✅ Item update completed successfully');
        } else {
          console.error('❌ Item not found in storage at index:', itemIndex);
        }
      } else {
        console.error('❌ No inventory data found in storage');
      }
    } catch (error) {
      console.error('❌ Failed to update expiry date:', error.message);
      console.error('🔧 Full error:', error);
    }
  };

  // Handle microphone button press
  const handleMicPress = async (itemId) => {
    const currentState = recordingStates[itemId];
    
    if (!currentState) {
      await startRecording(itemId);
    }
    // Note: Stop recording is now handled by the modal button
  };

  // Delete an item from inventory
  const deleteItem = async (itemId, originalIndex) => {
    try {
      Alert.alert(
        "Delete",
        "Are you sure you want to delete this item?",
        [
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
                setInventoryData(inventoryData.filter(item => item.id !== itemId));
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  // Filter inventory based on search query
  const filteredData = inventoryData.filter((item) =>
    item.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render each inventory item as a card
  const renderItem = ({ item }) => {
    const formattedDate = item.purchaseDate.split('-').reverse().join('-');
    const recordingState = recordingStates[item.id];
    
    return (
      <View style={styles.card}>
        <View style={styles.blobWrapper}>
          <BlobBackground />
        </View>
        
        <Text style={styles.cardTitle}>
          {item.productName} ({item.quantity})
        </Text>
        <Text style={styles.cardText}>
          <Ionicons name="calendar-outline" size={14} color={Colors.text} /> 
          Purchase date: {formattedDate}
        </Text>
        {item.weight !== "N/A" && (
          <Text style={styles.cardText}>
            <Ionicons name="cube-outline" size={14} color={Colors.text} /> 
            Weight: {item.weight}
          </Text>
        )}
        {item.expiryDate !== "N/A" && (
          <Text style={styles.cardText}>
            <Ionicons name="time-outline" size={14} color={Colors.text} /> 
            Expiry: {item.expiryDate}
          </Text>
        )}

        <View style={styles.iconsContainer}>
          <TouchableOpacity 
            style={[
              styles.micIconContainer,
              recordingState === 'recording' && styles.micRecording
            ]}
            onPress={() => handleMicPress(item.id)}
            disabled={recordingState === 'processing'}
          >
            {recordingState === 'processing' ? (
              <ActivityIndicator size={12} color={Colors.background} />
            ) : (
              <Ionicons 
                name={recordingState === 'recording' ? "stop" : "mic"} 
                size={12} 
                color={Colors.background} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteIconContainer}
            onPress={() => deleteItem(item.id, item.originalIndex)}
          >
            <Ionicons name="trash-outline" size={12} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        {inventoryData.length === 0 ? (
          <Text style={styles.noDataText}>No inventory items found.</Text>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.ListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>

      <RecordingCard
        visible={showRecordingModal}
        onClose={cancelRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        audioLevels={audioLevels}
        itemName={currentRecordingItem?.productName || ''}
        recordingState={currentRecordingItem ? recordingStates[currentRecordingItem.id] : null}
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
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center'
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
  ListContent: {
    paddingBottom: 100,
  },
  card: {
    position: "relative",
    backgroundColor: Colors.card,
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
    zIndex: 1,
  },
  cardText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: '500',
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  iconsContainer: {
    position: "absolute",
    bottom: 15,
    right: 15,
    flexDirection: "row",
    gap: 10,
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
    backgroundColor: '#ff4444', // Red when recording
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
  blobWrapper: {
    position: 'absolute',
    top: -80,
    left: -30,
    zIndex: 0,
    opacity: 0.15,
  },
  noDataText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginTop: 20,
  },
});