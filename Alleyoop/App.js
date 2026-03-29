import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { SignupScreen } from './src/screens/Auth/SignupScreen';
import { HomeScreen } from './src/screens/Home/HomeScreen';

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
    <SafeAreaView style={{ flex: 1 }}>
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
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
