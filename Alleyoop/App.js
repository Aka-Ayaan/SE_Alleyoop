import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
// import { SafeAreaView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
      <StatusBar style="auto" />

      {/* {screen === 'yourNewRouteName' && <YourNewScreenName />} for dubugging purposes  */}
      {/* {screen === 'yourNewRouteName' && <YourNewScreenName />} */}
    </SafeAreaProvider>
  );
}
