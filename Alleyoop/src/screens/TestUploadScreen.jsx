import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../config/api';

export function TestUploadScreen({ onBack }) {
  const [arenaId, setArenaId] = useState('1');
  const [thumbnail, setThumbnail] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need media library permissions to pick images.');
      }
    })();
  }, []);

  const pickSingleImage = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    setter(result.assets[0]);
  };

  const addGalleryImage = async () => {
    if (gallery.length >= 5) {
      Alert.alert('Limit reached', 'You can only add up to 5 gallery images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    setGallery((prev) => [...prev, result.assets[0]]);
  };

  const uploadImages = async () => {
    if (!arenaId) {
      Alert.alert('Missing arena ID', 'Enter an arena ID to upload images for.');
      return;
    }

    if (!thumbnail && gallery.length === 0) {
      Alert.alert('No images', 'Pick at least one image to upload.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      if (thumbnail) {
        formData.append('thumbnail', {
          uri: thumbnail.uri,
          name: thumbnail.fileName || 'thumbnail.jpg',
          type: thumbnail.mimeType || 'image/jpeg',
        });
      }

      gallery.forEach((img, index) => {
        formData.append('gallery', {
          uri: img.uri,
          name: img.fileName || `gallery-${index + 1}.jpg`,
          type: img.mimeType || 'image/jpeg',
        });
      });

      const response = await fetch(`${API_BASE_URL}/arena/${arenaId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      Alert.alert('Success', 'Images uploaded successfully.');
    } catch (err) {
      Alert.alert('Upload error', err.message || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ScrollView>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
          Test Upload Arena Images
        </Text>

        <Text style={{ marginBottom: 4 }}>Arena ID</Text>
        <TextInput
          value={arenaId}
          onChangeText={setArenaId}
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 16,
          }}
        />

        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Thumbnail</Text>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail.uri }}
            style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 8 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ marginBottom: 8 }}>No thumbnail selected</Text>
        )}
        <Button title="Pick Thumbnail" onPress={() => pickSingleImage(setThumbnail)} />

        <View style={{ height: 24 }} />

        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Gallery Images (max 5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {gallery.map((img, idx) => (
            <Image
              key={idx}
              source={{ uri: img.uri }}
              style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        <Button title="Add Gallery Image" onPress={addGalleryImage} />

        <View style={{ height: 24 }} />

        <Button title={uploading ? 'Uploading...' : 'Upload Images'} onPress={uploadImages} disabled={uploading} />

        <View style={{ height: 16 }} />
        {onBack && <Button title="Back to main app" onPress={onBack} />}
      </ScrollView>
    </SafeAreaView>
  );
}
