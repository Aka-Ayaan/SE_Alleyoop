import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Button } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { SignupScreen } from './src/screens/Auth/SignupScreen';
import { HomeScreen } from './src/screens/Home/HomeScreen';
import { TestUploadScreen } from './src/screens/TestUploadScreen';
import { TestCardsScreen } from './src/screens/TestCardsScreen';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      {screen === 'login' && (
        <LoginScreen
          onSwitchToSignup={() => setScreen('signup')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {screen === 'signup' && (
        <SignupScreen onSwitchToLogin={() => setScreen('login')} />
      )}
      {screen === 'home' && <HomeScreen user={user} onLogout={handleLogout} />}
      {screen === 'testUpload' && (
        <TestUploadScreen onBack={() => setScreen('login')} />
      )}
      {screen === 'testCards' && (
        <TestCardsScreen onBack={() => setScreen('login')} />
      )}
      <StatusBar style="auto" />
      <View
        style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Button title="Main App" onPress={() => setScreen('login')} />
        <Button title="Test Upload" onPress={() => setScreen('testUpload')} />
        <Button title="Test Cards" onPress={() => setScreen('testCards')} />
      </View>
    </SafeAreaProvider>
  );
}
