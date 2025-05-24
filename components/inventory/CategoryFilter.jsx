import React from "react";
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../utils/Colors";

const CategoryFilter = ({
  categories,
  expandedCategories,
  toggleCategory,
  selectedSubCategory,
  selectSubCategory,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.categoryScroll}
  >
    {Object.keys(categories).map((parentCategory) => (
      <View key={parentCategory} style={styles.categoryContainer}>
        <TouchableOpacity
          style={styles.parentCategoryButton}
          onPress={() => toggleCategory(parentCategory)}
        >
          <Text style={styles.parentCategoryText}>{parentCategory}</Text>
          <Ionicons
            name={expandedCategories[parentCategory] ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.text}
          />
        </TouchableOpacity>
        {expandedCategories[parentCategory] && (
          <View style={styles.subCategoryContainer}>
            {categories[parentCategory].map((subCategory) => (
              <TouchableOpacity
                key={subCategory}
                style={[
                  styles.subCategoryButton,
                  selectedSubCategory === subCategory && styles.subCategoryButtonSelected,
                ]}
                onPress={() => selectSubCategory(subCategory)}
              >
                <Text
                  style={[
                    styles.subCategoryText,
                    selectedSubCategory === subCategory && styles.subCategoryTextSelected,
                  ]}
                >
                  {subCategory}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  categoryScroll: {
    marginBottom: 20,
  },
  categoryContainer: {
    marginRight: 15,
  },
  parentCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  parentCategoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.blue,
    marginRight: 5,
  },
  subCategoryContainer: {
    marginTop: 10,
    paddingLeft: 10,
  },
  subCategoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: Colors.card,
    marginBottom: 5,
  },
  subCategoryButtonSelected: {
    backgroundColor: Colors.text,
  },
  subCategoryText: {
    fontSize: 12,
    color: Colors.text,
  },
  subCategoryTextSelected: {
    color: Colors.background,
    fontWeight: "600",
  },
});

export default CategoryFilter;