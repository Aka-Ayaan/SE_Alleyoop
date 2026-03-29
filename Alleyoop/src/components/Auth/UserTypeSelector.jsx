import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { authStyles } from '../../styles/authStyles';

const userTypes = [
  { id: 'player', label: 'Player' },
  { id: 'owner', label: 'Arena Owner' },
  { id: 'seller', label: 'Seller' },
  { id: 'trainer', label: 'Trainer' },
];

export function UserTypeSelector({ value, onChange }) {
  return (
    <View style={authStyles.userTypeRow}>
      {userTypes.map((type) => {
        const selected = value === type.id;
        return (
          <TouchableOpacity
            key={type.id}
            style={[
              authStyles.userTypeChip,
              selected && authStyles.userTypeChipSelected,
            ]}
            onPress={() => onChange(type.id)}
          >
            <Text
              style={[
                authStyles.userTypeChipText,
                selected && authStyles.userTypeChipTextSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default UserTypeSelector;
