import { View, Text, StyleSheet } from "react-native";
import CustomHeader from "../../layouts/CustomHeader";
import Colors from "../../utils/Colors";

export default function StockInstructionScreen() {
  return (
    <View style={styles.container}>
      <CustomHeader title="Stock" />
      <View style={styles.content}>
        <Text style={styles.text}>Stock Instruction Screen</Text>
        <Text style={styles.subText}>
          Instructions for managing stock resources will be displayed here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: "center",
  },
});