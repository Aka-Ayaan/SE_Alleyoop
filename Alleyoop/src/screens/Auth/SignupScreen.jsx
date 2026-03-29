import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { authStyles } from '../../styles/authStyles';
import { UserTypeSelector } from '../../components/Auth/UserTypeSelector';
import { endpoints } from '../../config/api';

export function SignupScreen({ onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('player');
  const [shopName, setShopName] = useState('');
  const [primarySportId, setPrimarySportId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async () => {
    setError('');
    setSuccess('');

    if (!name || !email || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const payload = {
      name,
      email,
      phone,
      password,
      userType,
      shopName: userType === 'seller' ? shopName : undefined,
      primarySportId: userType === 'trainer' && primarySportId ? Number(primarySportId) : undefined,
    };

    setLoading(true);
    try {
      const res = await fetch(endpoints.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed.');
      } else {
        setSuccess(data.message || 'Account created!');
        console.log('Signup response:', data);
      }
    } catch (e) {
      console.error('Signup error', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showShopName = userType === 'seller';
  const showPrimarySport = userType === 'trainer';

  return (
    <KeyboardAvoidingView
      style={authStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={authStyles.title}>Create account</Text>
        <Text style={authStyles.subtitle}>Sign up to start booking and managing courts.</Text>

        <View style={authStyles.form}>
          <Text style={authStyles.fieldLabel}>Account type</Text>
          <UserTypeSelector value={userType} onChange={setUserType} />

          <Text style={authStyles.fieldLabel}>Full name</Text>
          <TextInput
            style={authStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />

          <Text style={authStyles.fieldLabel}>Email</Text>
          <TextInput
            style={authStyles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={authStyles.fieldLabel}>Phone (optional)</Text>
          <TextInput
            style={authStyles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />

          {showShopName && (
            <>
              <Text style={authStyles.fieldLabel}>Shop name</Text>
              <TextInput
                style={authStyles.input}
                value={shopName}
                onChangeText={setShopName}
                placeholder="Your shop name"
              />
            </>
          )}

          {showPrimarySport && (
            <>
              <Text style={authStyles.fieldLabel}>Primary sport ID</Text>
              <TextInput
                style={authStyles.input}
                value={primarySportId}
                onChangeText={setPrimarySportId}
                placeholder="e.g. 1 for Basketball"
                keyboardType="numeric"
              />
            </>
          )}

          <Text style={authStyles.fieldLabel}>Password</Text>
          <TextInput
            style={authStyles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Text style={authStyles.fieldLabel}>Confirm password</Text>
          <TextInput
            style={authStyles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {error ? <Text style={authStyles.errorText}>{error}</Text> : null}
          {success ? <Text style={{ ...authStyles.errorText, color: 'green' }}>{success}</Text> : null}

          <TouchableOpacity style={authStyles.button} onPress={handleSignup} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={authStyles.secondaryButton} onPress={onSwitchToLogin}>
            <Text style={authStyles.secondaryButtonText}>
              Already have an account? Log in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default SignupScreen;
