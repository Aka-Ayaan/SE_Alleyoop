import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, Button, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';

export function TestCardsScreen({ onBack }) {
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchArenas = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/arena/get`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load arenas');
      }

      setArenas(data || []);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArenas();
  }, []);

  const renderItem = ({ item }) => {
    const imageUri = item.image_path ? `${API_BASE_URL}${item.image_path}` : null;

    return (
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 8 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 180,
              borderRadius: 8,
              backgroundColor: '#eee',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Text>No image</Text>
          </View>
        )}

        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
        <Text style={{ color: '#666' }}>{item.location}</Text>
        <Text style={{ marginTop: 4 }}>Rs {item.pricePerHour} / hour</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Test Arena Cards</Text>
        <TouchableOpacity onPress={fetchArenas}>
          <Text style={{ color: '#007AFF' }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 16 }} />}
      {error && (
        <Text style={{ color: 'red', marginBottom: 8 }}>
          {error}
        </Text>
      )}

      <FlatList
        data={arenas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {onBack && <Button title="Back to main app" onPress={onBack} />}
    </SafeAreaView>
  );
}
