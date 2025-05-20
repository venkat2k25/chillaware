import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import { Text, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import Colors from "../utils/Colors";
import InventoryScreen from "../screens/InventoryScreen";
import HomeScreen from "../screens/HomeScreen";
import ScanScreen from "../screens/ScanScreen";
import CookScreen from "../screens/CookScreen";
import FridgeScreen from "../screens/FridgeScreen";

const Tab = createBottomTabNavigator();

export default function MainTab() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: "#131417",
          height: 80,
        },
        tabBarIcon: ({ focused }) => {
          let iconName;
          let label;

          switch (route.name) {
            case "Home":
              iconName = "home-outline";
              label = "Home";
              break;
            case "Inventory":
              iconName = "storefront-outline";
              label = "Inventory";
              break;
            case "Scan":
              iconName = "scan-outline";
              label = "Scan";
              break;
            case "Cook":
              iconName = "fast-food-outline";
              label = "Cook";
              break;
            case "Fridge":
              iconName = "bag-handle-outline";
              label = "Fridge";
              break;
          }

          // const gradientColors = ["#E6F3FF", "#4DA8DA", "#0A558C"];
          const gradientColors = ["#FFFFFF", "#FFFFFF", "#FFFFFF"];


          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "flex-start",
                width: 70,
                paddingTop: focused ? 10 : 14,
              }}
            >
              {/* Top Gradient Border */}
              {focused && (
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 3,
                    width: "100%",
                    borderRadius: 2,
                    marginBottom: 6,
                  }}
                />
              )}

              {/* Gradient Icon */}
              {focused ? (
                <MaskedView
                  maskElement={
                    <Icon
                      name={iconName}
                      size={26}
                      color="black"
                      style={{ backgroundColor: "transparent" }}
                    />
                  }
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 26, width: 26 }}
                  />
                </MaskedView>
              ) : (
                <Icon name={iconName} size={26} color={Colors.text} />
              )}

              {/* Gradient Text */}
              {focused ? (
                <MaskedView
                  maskElement={
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        marginTop: 2,
                        textAlign: "center",
                        width: "100%",
                        color: "black",
                        backgroundColor: "transparent",
                      }}
                    >
                      {label}
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 14, width: 70 }}
                  />
                </MaskedView>
              ) : (
                <Text
                  numberOfLines={1}
                  style={{
                    color: Colors.text,
                    fontSize: 11,
                    marginTop: 2,
                    textAlign: "center",
                    width: "100%",
                  }}
                >
                  {label}
                </Text>
              )}
            </View>
          );
        },
        tabBarShowLabel: false,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Cook" component={CookScreen} />
      <Tab.Screen name="Fridge" component={FridgeScreen} />
    </Tab.Navigator>
  );
}
