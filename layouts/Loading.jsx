import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import Colors from '../utils/Colors';

const { width } = Dimensions.get('window');

const Loading = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/animations/Loading.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.loadingText}>Cooking...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  animation: {
    width: width * 0.5,
    height: width * 0.5,
  },
  loadingText: {
    marginTop: 0,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default Loading;
