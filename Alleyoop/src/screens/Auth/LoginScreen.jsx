import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { authStyles } from '../../styles/authStyles';
import { UserTypeSelector } from '../../components/Auth/UserTypeSelector';
import { endpoints } from '../../config/api';

export function LoginScreen({ onSwitchToSignup, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('player');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ email, password, userType });
      const res = await fetch(`${endpoints.login}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        setError(data.error || 'Login failed.');
      } else {
        const userPayload = {
          userId: data.userId,
          email: data.email,
          name: data.name,
          userType,
        };
        if (onLoginSuccess) {
          onLoginSuccess(userPayload);
        }
      }
    } catch (e) {
      console.error('Login error', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={authStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={authStyles.title}>Welcome back</Text>
      <Text style={authStyles.subtitle}>Log in to continue to Alleyoop.</Text>

      <View style={authStyles.form}>
        <Text style={authStyles.fieldLabel}>User type</Text>
        <UserTypeSelector value={userType} onChange={setUserType} />

        <Text style={authStyles.fieldLabel}>Email</Text>
        <TextInput
          style={authStyles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={authStyles.fieldLabel}>Password</Text>
        <TextInput
          style={authStyles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={authStyles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={authStyles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={authStyles.secondaryButton} onPress={onSwitchToSignup}>
          <Text style={authStyles.secondaryButtonText}>
            New here? Create an account
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;
