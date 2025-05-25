import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LogoImg from "../assets/icons/Logo.png";
import Colors from "../utils/Colors";
import { useEffect, useState } from "react";
const Header = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const storedData = await AsyncStorage.getItem("messages");
        const parsedData = storedData ? JSON.parse(storedData) : [];
        setNotifications(parsedData);
      } catch (e) {
        console.log("Failed to load notifications", e);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* <Image source={LogoImg} style={styles.logo} /> */}
        <Text style={styles.logoText}>ChillAware</Text>
      </View>
      <View>
        <TouchableOpacity
          style={styles.icon}
          onPress={() => navigation.navigate("Notification")}
        >
          <Ionicons name="notifications" size={22} color={Colors.background} />
        </TouchableOpacity>
         {notifications.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notifications.length > 99 ? "99+" : notifications.length}
              </Text>
            </View>
          )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 60,
    backgroundColor: Colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
    elevation: 4,
    shadowColor: Colors.text,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 10,
  },
  logoContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: "contain",
  },
  logoText: {
    color: Colors.text,
    fontSize: 22,
    fontFamily: "Syne-SemiBold",
  },
  icon: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: Colors.text,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 5,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  badgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: "700",
  },
});

export default Header;
