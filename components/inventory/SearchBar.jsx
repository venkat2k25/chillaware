import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../utils/Colors";

const SearchBar = ({ searchQuery, setSearchQuery, iconColor }) => (
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
      color={iconColor}
    />
  </View>
);

const styles = StyleSheet.create({
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
});

export default SearchBar;