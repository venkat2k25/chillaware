import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator } from "react-native";
import Colors from "../../utils/Colors";

const { width: screenWidth } = Dimensions.get("window");
const placeholderImage = "https://picsum.photos/200";

const ProductCard = ({ item, onMicPress, onDeletePress, recognitionState }) => {
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
            recognitionState === "recognizing" && styles.micRecording,
          ]}
          onPress={onMicPress}
          disabled={recognitionState === "processing"}
        >
          {recognitionState === "processing" ? (
            <ActivityIndicator size={12} color={Colors.background} />
          ) : (
            <Ionicons
              name={recognitionState === "recognizing" ? "stop" : "mic"}
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

const styles = StyleSheet.create({
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
});

export default ProductCard;