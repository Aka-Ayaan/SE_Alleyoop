import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { endpoints } from '../../config/api';

const { width } = Dimensions.get('window');

const C = {
  bg: '#F5E9D8',
  orange: '#E76F2E',
  brown: '#3E2C23',
  cream: '#F5E9D8',
  brownLight: '#5C4033',
  success: '#1F8A4C',
};

export function ForgotPasswordScreen({ onBackToLogin }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleRequestReset = async () => {
    setError('');
    setSuccess('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your account email.');
      shakeError();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(endpoints.requestPasswordReset, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to process password reset request.');
        shakeError();
      } else {
        setSuccess(data.message || 'If an account exists for this email, a password reset link has been sent.');
      }
    } catch (e) {
      console.error('Forgot password error', e);
      setError('Something went wrong. Please try again.');
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <KeyboardAvoidingView enabled style={styles.root} behavior="padding">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <View style={styles.arcContainer} pointerEvents="none">
          <View style={styles.arcOuter} />
          <View style={styles.arcInner} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>Enter your email and we will send you a secure password reset link.</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.fieldLabel}>ACCOUNT EMAIL</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email" size={20} color={C.brown} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={C.brownLight + '88'}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {error ? (
                <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {success ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleRequestReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SEND RESET LINK</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={onBackToLogin} activeOpacity={0.75}>
                <Text style={styles.secondaryBtnText}>Back to login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  arcContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  arcOuter: {
    position: 'absolute',
    top: -width * 0.28,
    right: -width * 0.3,
    width: width * 0.82,
    height: width * 0.82,
    borderRadius: width * 0.41,
    borderWidth: 36,
    borderColor: C.orange + '1B',
  },
  arcInner: {
    position: 'absolute',
    bottom: -width * 0.42,
    left: -width * 0.2,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    borderWidth: 28,
    borderColor: C.brown + '12',
  },
  scroll: {
    paddingHorizontal: 10,
    paddingTop: 78,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: C.brown,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 14,
  },
  header: {
    backgroundColor: C.brown,
    paddingHorizontal: 24,
    paddingVertical: 26,
  },
  title: {
    color: C.cream,
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.7,
  },
  subtitle: {
    color: C.cream + 'CC',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FDFAF6',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  fieldLabel: {
    color: C.brown + 'AA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 8,
    opacity: 0.55,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.brown,
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 14,
    backgroundColor: '#FFF0EB',
    borderLeftWidth: 4,
    borderLeftColor: C.orange,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '600',
  },
  successBox: {
    marginTop: 14,
    backgroundColor: '#EDF8F1',
    borderLeftWidth: 4,
    borderLeftColor: C.success,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  successText: {
    color: C.success,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.orange,
    paddingVertical: 16,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.brown + '22',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    color: C.brown,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
