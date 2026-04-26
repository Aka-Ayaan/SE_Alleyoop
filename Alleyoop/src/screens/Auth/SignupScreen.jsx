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
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
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

export function SignupScreen({ onSwitchToLogin }) {
  const insets = useSafeAreaInsets(); // This gets the status bar height
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const ballAnim = useRef(new Animated.Value(-80)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

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

  const popSuccess = () => {
    Animated.spring(successScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }).start();
  };

  const handleSignup = async () => {
  setError('');
  setSuccess('');

  if (!name || !email || !password) {
    setError('Name, email, and password are required.');
    shakeError();
    return;
  }

  // Name: no numbers allowed
  if (/\d/.test(name)) {
    setError('Name cannot contain numbers.');
    shakeError();
    return;
  }

  // Email: regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError('Please enter a valid email address.');
    shakeError();
    return;
  }

  // Phone: if provided, must be digits only (with optional +, spaces, dashes)
  if (phone && !/^\+?[\d\s\-()]{7,15}$/.test(phone)) {
    setError('Please enter a valid phone number.');
    shakeError();
    return;
  }

  if (password !== confirmPassword) {
    setError('Passwords do not match.');
    shakeError();
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
        shakeError();
      } else {
        setSuccess(data.message || 'Account created! Welcome to the court. 🏀');
        popSuccess();
      }
    } catch (e) {
      console.error('Signup error', e);
      setError('Something went wrong. Please try again.');
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const showShopName = userType === 'seller';
  const showPrimarySport = userType === 'trainer';

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
              <Text style={styles.title}>Join the Squad.</Text>
              <Text style={styles.subtitle}>Create your account and hit the court.</Text>
            </View>

            {/* Step indicator */}
            <View style={styles.stepBar}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
            </View>

            {/* Form */}
            <View style={styles.form}>

              <Text style={styles.sectionHeading}>ACCOUNT TYPE</Text>
              <UserTypeSelector value={userType} onChange={setUserType} />

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>YOUR DETAILS</Text>

              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <InputField icon="account" value={name} onChangeText={setName} placeholder="Your name" />

              <Text style={styles.fieldLabel}>EMAIL</Text>
              <InputField
                icon="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.fieldLabel}>PHONE (OPTIONAL)</Text>
              <InputField
                icon="phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />

              {/* {showShopName && (
                <>
                  <Text style={styles.fieldLabel}>SHOP NAME</Text>
                  <InputField icon="shopping" value={shopName} onChangeText={setShopName} placeholder="Your shop name" />
                </>
              )} */}

              {/* {showPrimarySport && (
                <>
                  <Text style={styles.fieldLabel}>PRIMARY SPORT ID</Text>
                  <InputField
                    icon="basketball"
                    value={primarySportId}
                    onChangeText={setPrimarySportId}
                    placeholder="e.g. 1 for Basketball"
                    keyboardType="numeric"
                  />
                </>
              )} */}

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>SECURITY</Text>

              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <InputField
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={true}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
              <InputField
                icon="lock"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry={true}
                autoCapitalize="none"
              />

              {error ? (
                <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
                  <Text style={styles.errorText}>⚠  {error}</Text>
                </Animated.View>
              ) : null}

              {success ? (
                <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }] }]}>
                  <Text style={styles.successText}>{success}</Text>
                </Animated.View>
              ) : null}

              <TouchableOpacity
                style={[styles.signupBtn, loading && styles.btnDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.btnInner}>
                  {loading ? (
                    <ActivityIndicator color={C.cream} />
                  ) : (
                    <>
                      <Text style={styles.btnText}>CREATE ACCOUNT</Text>
                      <View style={styles.btnArrow}>
                        <Text style={styles.btnArrowText}>›</Text>
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
                style={styles.loginBtn}
                onPress={onSwitchToLogin}
                activeOpacity={0.75}
              >
                <Text style={styles.loginBtnText}>
                  Already have an account?{' '}
                  <Text style={styles.loginBtnHighlight}>Log in</Text>
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
    </View >
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  logo: {
    width: 200,  // Adjust based on your image aspect ratio
    height: 100,  // Adjust accordingly
    marginBottom: -10,
    // marginLeft: -20,
    alignSelf: 'center',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
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
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.brown + '0D',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.brown + '33',
  },
  stepDotActive: {
    backgroundColor: C.orange,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: C.brown + '22',
    marginHorizontal: 6,
  },
  form: {
    padding: 28,
    paddingTop: 20,
    backgroundColor: '#FDFAF6',
  },
  sectionHeading: {
    color: C.brown + 'AA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: C.brown + '18',
    marginVertical: 20,
  },
  fieldLabel: {
    color: C.brown + 'AA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 8,
    marginTop: 14,
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
  successBox: {
    marginTop: 14,
    backgroundColor: '#EAF7EE',
    borderLeftWidth: 4,
    borderLeftColor: '#3AAA5F',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  successText: {
    color: '#2A7A48',
    fontSize: 13,
    fontWeight: '600',
  },
  signupBtn: {
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
  btnDisabled: {
    opacity: 0.7,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 24,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
    flex: 1,
    textAlign: 'center',
  },
  btnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnArrowText: {
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
  loginBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.brown + '22',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loginBtnText: {
    color: C.brown + 'AA',
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtnHighlight: {
    color: C.brown,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;