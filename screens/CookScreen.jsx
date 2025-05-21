import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../layouts/Header";
import Colors from "../utils/Colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";

const { width } = Dimensions.get("window");

// Blob background for cards
const BlobBackground = ({ color }) => (
  <Svg width="200" height="250" viewBox="0 0 200 200">
    <Path
      fill={color || "#030B3880"}
      d="M47.6,-62.9C60.3,-55.2,67.6,-38.3,69.6,-22.6C71.5,-6.9,68,7.6,61.3,20.3C54.6,33,44.7,43.9,32.9,52.3C21.1,60.6,7.5,66.4,-7.7,70.1C-22.9,73.7,-39.6,75.1,-52.8,66.6C-66,58.1,-75.7,39.7,-78.5,21.2C-81.3,2.6,-77.2,-15.9,-68.2,-31.1C-59.2,-46.4,-45.4,-58.4,-30.1,-65.9C-14.8,-73.5,2,-76.5,18.2,-74.4C34.5,-72.3,49.3,-65.7,47.6,-62.9Z"
      transform="translate(100 100)"
    />
  </Svg>
);

export default function CookScreen() {
  // State variables
  const [currentStep, setCurrentStep] = useState("foodType");
  const [selectedFoodType, setSelectedFoodType] = useState(null);
  const [servings, setServings] = useState(2);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [error, setError] = useState(null);

  // Food type options
  const foodTypes = [
    {
      id: "protein",
      name: "Protein-Rich Foods",
      color: "#FF6B6B",
      icon: "nutrition-outline",
    },
    {
      id: "mineral",
      name: "Mineral-Rich Foods",
      color: "#4ECDC4",
      icon: "leaf-outline",
    },
    {
      id: "vitamin",
      name: "Vitamin-Rich Foods",
      color: "#FFD166",
      icon: "sunny-outline",
    },
    {
      id: "fat",
      name: "Healthy Fat-Rich Foods",
      color: "#6B5CA5",
      icon: "water-outline",
    },
    {
      id: "carbs",
      name: "Carbohydrate-Rich Foods",
      color: "#F9844A",
      icon: "fast-food-outline",
    },
    {
      id: "fiber",
      name: "Fiber-Rich Foods",
      color: "#4D908E",
      icon: "flower-outline",
    },
    {
      id: "hydrating",
      name: "Hydrating/Water-Rich Foods",
      color: "#277DA1",
      icon: "water-outline",
    },
  ];

  // Load inventory items from AsyncStorage
  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const data = await AsyncStorage.getItem("inventory");
      if (data) {
        const parsedData = JSON.parse(data);
        setInventoryItems(parsedData);
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
      setError("Failed to load inventory items");
    }
  };

  // Handle food type selection
  const handleFoodTypeSelect = (foodType) => {
    setSelectedFoodType(foodType);
    setCurrentStep("servings");
  };

  // Handle servings change
  const handleServingsChange = (value) => {
    setServings(Math.max(1, Math.min(10, value)));
  };

  // Handle generate recipes
  const handleGenerateRecipes = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://192.168.0.215:8001/api/generate_recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodType: selectedFoodType.id,
          servings,
          inventory: inventoryItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate recipes");
      }

      setRecipes(data.recipes);
      setCurrentStep("recipes");
    } catch (err) {
      console.error("Error generating recipes:", err);
      setError(err.message || "An error occurred while generating recipes");
    } finally {
      setLoading(false);
    }
  };

  // Handle recipe selection
  const handleRecipeSelect = (recipe) => {
    setSelectedRecipe(recipe);
    setCurrentStep("details");
  };

  // Handle back button
  const handleBack = () => {
    if (currentStep === "servings") {
      setCurrentStep("foodType");
    } else if (currentStep === "recipes") {
      setCurrentStep("servings");
    } else if (currentStep === "details") {
      setCurrentStep("recipes");
    }
  };

  // Render food type selection screen
  const renderFoodTypeSelection = () => (
    <View style={styles.stepContainer}>
      <FlatList
        data={foodTypes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.foodTypeCard,
              { backgroundColor: item.color + "20" },
            ]}
            onPress={() => handleFoodTypeSelect(item)}
          >
            <View
              style={[
                styles.foodTypeIconContainer,
                { backgroundColor: item.color },
              ]}
            >
              <Ionicons name={item.icon} size={24} color={Colors.background} />
            </View>
            <Text style={styles.foodTypeName}>{item.name}</Text>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={item.color}
              style={styles.foodTypeArrow}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.foodTypeList}
      />
    </View>
  );

  // Render servings selection screen
  const renderServingsSelection = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={Colors.background} />
      </TouchableOpacity>

      <View style={styles.servingsContainer}>
        <View style={styles.servingsCard}>
          <View style={styles.blobWrapper}>
            <BlobBackground />
          </View>

          <Text style={styles.servingsTitle}>Number of Servings</Text>

          <View style={styles.servingsInputContainer}>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => handleServingsChange(servings - 1)}
            >
              <Ionicons name="remove" size={20} color={Colors.background} />
            </TouchableOpacity>

            <Text style={styles.servingsValue}>{servings}</Text>

            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => handleServingsChange(servings + 1)}
            >
              <Ionicons name="add" size={20} color={Colors.background} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateRecipes}
          >
            <Text style={styles.generateButtonText}>Generate Recipes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render recipe list screen
  const renderRecipeList = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
      </TouchableOpacity>

      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.recipeCard}>
            <View style={styles.recipeImageContainer}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.recipeImage}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.recipeDifficultyBadge,
                  item.difficulty === "Easy"
                    ? styles.easyBadge
                    : item.difficulty === "Medium"
                    ? styles.mediumBadge
                    : styles.hardBadge,
                ]}
              >
                <Text style={styles.recipeDifficultyText}>
                  {item.difficulty}
                </Text>
              </View>
            </View>

            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName}>{item.name}</Text>

              <View style={styles.recipeMetaContainer}>
                <View style={styles.recipeMeta}>
                  <Ionicons name="time-outline" size={16} color={Colors.text} />
                  <Text style={styles.recipeMetaText}>
                    {item.prepTime} mins
                  </Text>
                </View>

                <View style={styles.recipeMeta}>
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={Colors.text}
                  />
                  <Text style={styles.recipeMetaText}>{servings} servings</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.selectRecipeButton}
                onPress={() => handleRecipeSelect(item)}
              >
                <Text style={styles.selectRecipeButtonText}>
                  Select This Recipe
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.recipeList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  // Render recipe details screen
  const renderRecipeDetails = () => {
    if (!selectedRecipe) return null;

    return (
      <View style={styles.stepContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.recipeDetailHeader}>
          <Image
            source={{ uri: selectedRecipe.imageUrl }}
            style={styles.recipeDetailImage}
            resizeMode="cover"
          />

          <View style={styles.recipeDetailOverlay}>
            <Text style={styles.recipeDetailName}>{selectedRecipe.name}</Text>

            <View style={styles.recipeDetailMeta}>
              <View style={styles.minServe}>
                <View style={styles.recipeDetailMetaItem}>
                  <Ionicons name="time-outline" size={18} color="white" />
                  <Text style={styles.recipeDetailMetaText}>
                    {selectedRecipe.prepTime} mins
                  </Text>
                </View>
                <View style={styles.recipeDetailMetaItem}>
                  <Ionicons name="people-outline" size={18} color="white" />
                  <Text style={styles.recipeDetailMetaText}>
                    {servings} servings
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.recipeDetailBadge,
                  selectedRecipe.difficulty === "Easy"
                    ? styles.easyBadge
                    : selectedRecipe.difficulty === "Medium"
                    ? styles.mediumBadge
                    : styles.hardBadge,
                ]}
              >
                <Text style={styles.recipeDifficultyText}>
                  {selectedRecipe.difficulty}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.recipeDetailContent}>
          <View style={styles.recipeDetailSection}>
            <Text style={styles.recipeDetailSectionTitle}>
              <Ionicons name="list-outline" size={20} color={Colors.bg} />{" "}
              Ingredients
            </Text>
            {selectedRecipe.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View
                  style={[styles.ingredientDot, { backgroundColor: Colors.bg }]}
                />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>

          <View style={styles.recipeDetailSection}>
            <Text style={styles.recipeDetailSectionTitle}>
              <Ionicons name="restaurant-outline" size={20} color={Colors.bg} />{" "}
              Preparation Steps
            </Text>
            {selectedRecipe.steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.recipeDetailSection}>
            <Text style={styles.recipeDetailSectionTitle}>
              <Ionicons name="bulb-outline" size={20} color={Colors.bg} />{" "}
              Cooking Tips
            </Text>
            <Text style={styles.tipText}>
              • Prepare all ingredients before starting to cook for a smoother
              process.
            </Text>
            <Text style={styles.tipText}>
              • Adjust seasoning according to your taste preferences.
            </Text>
            <Text style={styles.tipText}>
              • Store leftovers in an airtight container in the refrigerator.
            </Text>
          </View>
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Generating delicious recipes...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => setCurrentStep("foodType")}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {currentStep === "foodType" && renderFoodTypeSelection()}
            {currentStep === "servings" && renderServingsSelection()}
            {currentStep === "recipes" && renderRecipeList()}
            {currentStep === "details" && renderRecipeDetails()}
          </>
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
  stepContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 24,
  },
  foodTypeList: {
    paddingBottom: 20,
  },
  foodTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  foodTypeName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  foodTypeArrow: {
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: Colors.text,
    padding: 10,
    borderRadius: 50,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  servingsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  servingsCard: {
    width: "90%",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
    position: "relative",
  },
  blobWrapper: {
    position: "absolute",
    top: -80,
    left: -30,
    zIndex: 0,
    opacity: 0.15,
  },
  servingsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 24,
    zIndex: 1,
  },
  servingsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    zIndex: 1,
  },
  servingsButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: Colors.text + "50",
    justifyContent: "center",
    alignItems: "center",
  },
  servingsValue: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.bg,
    marginHorizontal: 24,
  },
  generateButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.text + "90",
    width: "100%",
    zIndex: 1,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.bg,
    marginTop: 16,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 18,
    color: "#FF6B6B",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.bg,
  },
  recipeList: {
    paddingTop: 10,
  },
  recipeCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  recipeImageContainer: {
    position: "relative",
    height: 180,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  recipeDifficultyBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontFamily: '500',
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  recipeDetailBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontFamily: '500',
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  easyBadge: {
    backgroundColor: Colors.success,
  },
  mediumBadge: {
    backgroundColor: Colors.orange,
  },
  hardBadge: {
    backgroundColor: Colors.red,
  },
  recipeDifficultyText: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 12,
  },
  recipeInfo: {
    padding: 16,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.bg,
    marginBottom: 10,
  },
  recipeMetaContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  recipeMetaText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    marginLeft: 4,
  },
  selectRecipeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.bg + "70",
    alignItems: "center",
    justifyContent: "center",
  },
  selectRecipeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  recipeDetailHeader: {
    height: 220,
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  recipeDetailImage: {
    width: "100%",
    height: "100%",
  },
  recipeDetailOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 15,
  },
  recipeDetailName: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 5,
  },
  minServe: {
    flexDirection: 'row',
    gap: 15,
  },
  recipeDetailMeta: {
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: "center",
  },
  recipeDetailMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  recipeDetailMetaText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  recipeDetailContent: {
    backgroundColor: Colors.primary,
    padding: 15,
  },
  recipeDetailSection: {
    marginBottom: 24,
  },
  recipeDetailSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.bg,
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  ingredientText: {
    fontSize: 16,
    color: Colors.text,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 25,
    height: 25,
    borderRadius: 14,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  tipText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
});