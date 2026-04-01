import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar
} from 'react-native';
import { UserTypeSelector } from '../../components/Auth/UserTypeSelector';
import { endpoints } from '../../config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const C = {
  bg: '#F5E9D8',
  orange: '#E76F2E',
  brown: '#3E2C23',
  blue: '#2FA4D7',
  cream: '#F5E9D8',
  orangeLight: '#F2894A',
  brownLight: '#5C4033',
};

// memo prevents parent re-renders (caused by typing) from remounting this,
// which was causing the keyboard to dismiss on every keystroke
const InputField = memo(function InputField({ icon, ...props }) {
  return (
    <View style={[styles.inputWrapper]}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={C.brown}
        style={styles.chipIcon}
      />
      <TextInput
        style={styles.input}
        placeholderTextColor={C.brownLight + '88'}
        {...props}
      />
    </View>
  );
});

export function LoginScreen({ onSwitchToSignup, onLoginSuccess }) {
  const insets = useSafeAreaInsets(); // This gets the status bar height
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('player');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const ballAnim = useRef(new Animated.Value(-80)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(ballAnim, { toValue: 0, tension: 50, friction: 8, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      shakeError();
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ email, password, userType });
      const res = await fetch(`${endpoints.login}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setError(data.error || 'Login failed.');
        shakeError();
      } else {
        if (onLoginSuccess) {
          onLoginSuccess({ userId: data.userId, email: data.email, name: data.name, userType });
        }
      }
    } catch (e) {
      console.error('Login error', e);
      setError('Something went wrong. Please try again.');
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        enabled={true}
        style={styles.root}
        behavior={'padding'}
      >
        {/* Set translucent to true so the background color can sit behind the status bar icons */}
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        {/* Background arcs */}
        <View style={styles.arcContainer} pointerEvents="none">
          <View style={styles.arcOuter} />
          <View style={styles.arcInner} />
          <View style={styles.halfCircle} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Main card */}
          <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Animated.Image
                // Each '../' moves you up one folder level
                source={require('../../../assets/top-nobg.png')}
                style={[styles.logo, { opacity: fadeAnim }]}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome Back.</Text>
              <Text style={styles.subtitle}>Log in to hit the court.</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>I AM A</Text>
              <UserTypeSelector value={userType} onChange={setUserType} />

              <Text style={styles.fieldLabel}>EMAIL</Text>
              <InputField
                icon='email'
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <InputField
                icon='lock'
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={true}
                autoCapitalize="none"
              />

              {error ? (
                <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
                  <Text style={styles.errorText}>⚠  {error}</Text>
                </Animated.View>
              ) : null}

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.loginBtnInner}>
                  {loading ? (
                    <ActivityIndicator color={C.cream} />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>LOG IN</Text>
                      <View style={styles.loginBtnArrow}>
                        <Text style={styles.loginBtnArrowText}>›</Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.signupBtn}
                onPress={onSwitchToSignup}
                activeOpacity={0.75}
              >
                <Text style={styles.signupBtnText}>
                  New here?{' '}
                  <Text style={styles.signupBtnHighlight}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Optional: Add bottom inset padding for iPhones with no home button */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* ... nav items ... */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  logo: {
    width: 200,  // Adjust based on your image aspect ratio
    height: 100,  // Adjust accordingly
    marginBottom: -10,
    // marginLeft: -20,
    alignSelf: 'center',
  },
  arcContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  arcOuter: {
    position: 'absolute',
    top: -width * 0.35,
    right: -width * 0.35,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    borderWidth: 40,
    borderColor: C.orange + '1A',
  },
  arcInner: {
    position: 'absolute',
    top: -width * 0.1,
    right: -width * 0.15,
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    borderWidth: 20,
    borderColor: C.brown + '12',
  },
  halfCircle: {
    position: 'absolute',
    bottom: -width * 0.5,
    left: -width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    borderWidth: 32,
    borderColor: C.orange + '10',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: C.brown,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  header: {
    backgroundColor: C.brown,
    paddingTop: 0,
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  brandTag: {
    color: C.orange,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 12,
  },
  title: {
    color: C.cream,
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: 8,
    alignSelf: 'center',
  },
  subtitle: {
    color: C.cream + 'AA',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
    alignSelf: 'center',
  },
  form: {
    padding: 28,
    paddingTop: 24,
    backgroundColor: '#FDFAF6',
  },
  fieldLabel: {
    color: C.brown + 'AA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    height: 52,
  },
  inputFocused: {
    borderColor: C.orange,
    backgroundColor: '#fff',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chipIcon: {
    marginLeft: -5,
    marginRight: 5,
    opacity: 0.5,
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
    paddingHorizontal: 14,
  },
  errorText: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.orange,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 24,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
    flex: 1,
    textAlign: 'center',
  },
  loginBtnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnArrowText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.brown + '22',
  },
  dividerText: {
    color: C.brown + '66',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  signupBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.brown + '22',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  signupBtnText: {
    color: C.brown + 'AA',
    fontSize: 14,
    fontWeight: '600',
  },
  signupBtnHighlight: {
    color: C.brown,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  scroll: {
    paddingHorizontal: 0,
    paddingTop: 56,
    paddingBottom: 40,
  },
});

export default LoginScreen;