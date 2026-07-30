import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecordingScreen } from './src/screens/RecordingScreen';
import { CallDetailScreen } from './src/screens/CallDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { RootStackParamList } from './src/types';
import { storageService } from './src/services/storageService';
import { useSettings } from './src/hooks/useSettings';
import { useAutoCallRecording } from './src/hooks/useAutoCallRecording';
import { COLORS } from './src/constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AutoCallRecordingManager() {
  const { settings, isLoading } = useSettings();
  useAutoCallRecording(!isLoading && settings.autoRecord);
  return null;
}

export default function App() {
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    storageService
      .getSettings()
      .then(settings => {
        setInitialRoute(settings.onboardingComplete ? 'Home' : 'Onboarding');
      })
      .catch(() => {
        setInitialRoute('Onboarding');
      });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AutoCallRecordingManager />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Recording" component={RecordingScreen} />
          <Stack.Screen name="CallDetail" component={CallDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen
            name="AdminLogin"
            component={AdminLoginScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
