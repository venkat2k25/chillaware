import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import Colors from '../utils/Colors';

const CustomHeader = ({ title}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.HeaderContainer}>
      <View style={styles.leftContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={30} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.HeaderText}>{title}</Text>
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 60,
    backgroundColor: Colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
    elevation: 10,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  HeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  HeaderText: {
    color: Colors.secondary,
    fontSize: 22,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default CustomHeader;
