import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import MainTab from './navigations/MainTab'; 
import Colors from './utils/Colors';
import NotificationScreen from './screens/NotificationScreen';

const Stack = createNativeStackNavigator();

export default function App() {

  const [fontsLoaded] = useFonts({
    'Syne-Regular': require('./assets/fonts/Syne-Regular.ttf'),
    'Syne-Bold': require('./assets/fonts/Syne-Bold.ttf'),
    'Syne-ExtraBold': require('./assets/fonts/Syne-ExtraBold.ttf'),
    'Syne-SemiBold': require('./assets/fonts/Syne-SemiBold.ttf'),
  });


  return (
    <SafeAreaProvider>
      {/* Set status bar color to match app theme */}
      <StatusBar backgroundColor="#131417" style="light" />

      {/* Match SafeAreaView to status bar color */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#131417' },
              }}>
              <Stack.Screen name="MainTab" component={MainTab} />
              <Stack.Screen name="Notification" component={NotificationScreen} />

            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
