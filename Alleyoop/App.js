import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Button } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { SignupScreen } from './src/screens/Auth/SignupScreen';
import { HomeScreen } from './src/screens/Home/HomeScreen';
import { TestUploadScreen } from './src/screens/TestUploadScreen';
import { TestCardsScreen } from './src/screens/TestCardsScreen';
import { OwnerDashboard } from './src/screens/Home/OwnerDashboard';
import { SellerDashboard } from './src/screens/Home/SellerDashboard';
import { TrainerDashboard } from './src/screens/Home/TrainerDashboard';

export default function App() {
  const [screen, setScreen] = useState('trainer-dashboard');
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    switch (userData.userType) {
      case 'player':
        setScreen('home');
        break;
      case 'owner':
        setScreen('owner-dashboard');
        break;
      case 'seller':
        setScreen('seller-dashboard');
        break;
      case 'trainer':
        setScreen('trainer-dashboard');
        break;
      default:
        setScreen('home');
        break;
    }

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
      <StatusBar style="auto" />
      {screen === 'signup' && (<SignupScreen onSwitchToLogin={() => setScreen('login')} />)}
      <StatusBar style="auto" />
      {screen === 'home' && <HomeScreen user={user} onLogout={handleLogout} />}
      <StatusBar style="auto" />
      {screen === 'testUpload' && (
        <TestUploadScreen onBack={() => setScreen('login')} />
      )}
      <StatusBar style="auto" />
      {screen === 'testCards' && (
        <TestCardsScreen onBack={() => setScreen('login')} />
      )}
      <StatusBar style="auto" />
      {screen === 'owner-dashboard' && <OwnerDashboard user={user} onLogout={handleLogout} />}
      <StatusBar style="auto" />
      {screen === 'seller-dashboard' && <SellerDashboard user={user} onLogout={handleLogout} />}
      <StatusBar style="auto" />
      {screen === 'trainer-dashboard' && <TrainerDashboard user={user} onLogout={handleLogout} />}
      <StatusBar style="auto" />

      {/* <View
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
      </View> */}
    </SafeAreaProvider>
  );
}
