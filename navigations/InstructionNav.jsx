import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StockInstructionScreen from '../screens/Instructions/StockInstructionScreen';

const Stack = createNativeStackNavigator();

export default function InstructionNav({ route }) {
  const { screen } = route.params || { screen: 'ScanInstructionScreen' }; // Default to Scan if no param

  return (
    <Stack.Navigator
      initialRouteName={screen}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#131417' },
      }}
    >
      <Stack.Screen name="StockInstructionScreen" component={StockInstructionScreen} options={{ presentation: "modal" }}/>
    </Stack.Navigator>
  );
}