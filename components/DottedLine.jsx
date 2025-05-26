import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Colors from '../utils/Colors';

const DottedLine = () => {
  return (
    <View style={styles.container}>
      <Svg height="5" width="100%">
        <Path
          d="M0 2.5 H1000"
          stroke={Colors.bg} // Green color
          strokeWidth="4" // Thickness of the line
          strokeDasharray="10,10" // Dash pattern (10px dash, 10px gap)
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});

export default DottedLine;