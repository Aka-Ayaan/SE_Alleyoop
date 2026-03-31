import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  bg: '#F5E9D8',
  orange: '#E76F2E',
  brown: '#3E2C23',
  blue: '#2FA4D7',
  cream: '#F5E9D8',
};

// All icons use MaterialCommunityIcons — names verified against the MCI icon set
const userTypes = [
  { id: 'player', label: 'Player', icon: 'basketball' },
  { id: 'owner', label: 'Arena Owner', icon: 'stadium-outline' },
  { id: 'seller', label: 'Seller', icon: 'shopping-outline' },
  { id: 'trainer', label: 'Trainer', icon: 'clipboard-text-outline' },
];

function Chip({ type, selected, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 5 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={type.icon}
          size={26}
          color={selected ? C.orange : C.brown + 'AA'}
          style={styles.chipIcon}
        />
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
          {type.label}
        </Text>
        {selected && <View style={styles.chipDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function UserTypeSelector({ value, onChange }) {
  return (
    <View style={styles.grid}>
      {userTypes.map((type) => (
        <Chip
          key={type.id}
          type={type}
          selected={value === type.id}
          onPress={() => onChange(type.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.brown + '22',
    backgroundColor: C.bg,
    minHeight: 95,
    position: 'relative',
  },
  chipSelected: {
    backgroundColor: C.brown,
    borderColor: C.orange,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  chipIcon: {
    marginBottom: 8,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: C.brown + 'AA',
    textAlign: 'center',
    marginTop: 2,
  },
  chipLabelSelected: {
    color: C.cream,
    fontWeight: '800',
  },
  chipDot: {
    position: 'absolute',
    bottom: 7,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.orange,
  },
});

export default UserTypeSelector;