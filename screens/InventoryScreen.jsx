import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        // Ensure data matches expected format
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

  //  delete an item from inventory
  const deleteItem = async (itemId, originalIndex) => {
    try {
      Alert.alert(
        "Delete","Are you sure you want to delete this item?",
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
    return (
      <View style={styles.card}>
        
        {/* Blob behind text */}
        <View style={styles.blobWrapper}>
          <BlobBackground />
        </View>
        
        <Text style={styles.cardTitle}>
          {item.productName} ({item.quantity})
        </Text>
        <Text style={styles.cardText}>
          <Ionicons name="calendar-outline" size={14} color={Colors.text} /> Purchase date: {formattedDate}
        </Text>
        {item.weight !== "N/A" && (
          <Text style={styles.cardText}>
            <Ionicons name="cube-outline" size={14} color={Colors.text} /> Weight: {item.weight}
          </Text>
        )}

        <View style={styles.iconsContainer}>
          <TouchableOpacity style={styles.micIconContainer}>
            <Ionicons name="mic" size={12} color={Colors.background} />
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
  searchIcon:{
    backgroundColor: Colors.bg,
    padding: 10,
    borderRadius: 50,
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ListContent:{
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
  ListContent: {},
});