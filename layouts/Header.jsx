import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import Ionicons from "@expo/vector-icons/Ionicons";
import LogoImg from "../assets/icons/Logo.png";
import Colors from "../utils/Colors";
const Header = () => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={LogoImg} style={styles.logo} />
        {/* <Text style={styles.logoText}>ChillAware</Text> */}
      </View>
      <View>
        <TouchableOpacity style={styles.icon} >
          <Ionicons name="notifications" size={22} color={Colors.text} />
        </TouchableOpacity>
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
    shadowColor: Colors.secondary,
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
    objectFit: 'contain'
  },
  logoText: {
    color: Colors.primary,
    fontSize: 22,
    fontFamily: 'Syne-SemiBold'
  },
  icon: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },
});

export default Header;
