import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { authStyles } from '../../styles/authStyles';

export function HomeScreen({ user, onLogout }) {
  return (
    <View style={[authStyles.container, { justifyContent: 'flex-start' }]}>
      <Text style={authStyles.title}>Hi, {user?.name || 'User'} 👋</Text>
      <Text style={authStyles.subtitle}>
        You are logged in as a {user?.userType || 'account'}.
      </Text>

      <View style={{ marginTop: 32 }}>
        <Text style={authStyles.fieldLabel}>Email</Text>
        <Text>{user?.email}</Text>
      </View>

      <TouchableOpacity style={[authStyles.button, { marginTop: 32 }]} onPress={onLogout}>
        <Text style={authStyles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default HomeScreen;
