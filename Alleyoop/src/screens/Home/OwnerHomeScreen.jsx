import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    Animated,
    PanResponder,
    StatusBar,
    Platform,
    SectionList,
    KeyboardAvoidingView,
    Switch,
    TextInput,
    Touchable,
    Modal,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../../config/api';

const { width, height } = Dimensions.get('window');

const C = {
    bg: '#F5E9D8',
    orange: '#E76F2E',
    brown: '#3E2C23',
    blue: '#2FA4D7',
    cream: '#F5E9D8',
    white: '#FFFFFF',
    cardBg: '#FFFFFF',
    mutedText: '#3E2C2399',
    border: '#3E2C2318',
};

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar-text-outline', activeIcon: 'calendar-text' },
    { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

const SPORT_OPTIONS = ['Basketball', 'Tennis', 'Futsal', 'Padel', 'Cricket', 'Badminton', 'Football 5-a-side'];

// Note: venues are fully loaded from the backend; no static VENUE_POSTS.

// ─── Form Inputs ─────────────────────────────────────────────────────────────

const FormInput = memo(({ label, value, onChangeText, placeholder, ...props }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={C.mutedText}
            {...props}
        />
    </View>
));

const SportDropdown = memo(({ selectedSports, onToggleSport, isReadOnly, label = 'Select Sports' }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.8}
                disabled={isReadOnly}
            >
                <Text style={selectedSports.length ? styles.dropdownHeaderText : styles.placeholderText}>
                    {selectedSports.length ? selectedSports.join(', ') : 'Choose sports...'}
                </Text>
                <MaterialCommunityIcons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={C.brown} paddingTop={20} />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownList}>
                    {SPORT_OPTIONS.map(sport => {
                        const isSelected = selectedSports.includes(sport);
                        return (
                            <TouchableOpacity
                                key={sport}
                                style={[styles.sportItem, isSelected && styles.sportItemActive]}
                                onPress={() => onToggleSport(sport)}
                            >
                                <Text style={[styles.sportItemText, isSelected && styles.sportItemTextActive]}>{sport}</Text>
                                {isSelected && <MaterialCommunityIcons name="check" size={16} color={C.white} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
});

const VenuePicker = ({ venues, onSelect, actionLabel, icon }) => (
    <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={[styles.sectionLabel, { marginBottom: 20 }]}>Select a Venue to {actionLabel}</Text>
        {venues.length === 0 ? (
            <View style={styles.emptyState}>
                <Text style={{ color: C.brown }}>No venues added yet.</Text>
            </View>
        ) : (
            venues.map(item => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => onSelect(item)}
                >
                    <Image source={item.user.image} style={{ width: 50, height: 50, borderRadius: 10, marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardText}>{item.user.name}</Text>
                        <Text style={styles.subLabel}>{item.user.location}</Text>
                    </View>
                    <MaterialCommunityIcons name={icon} size={24} color={C.orange} />
                </TouchableOpacity>
            ))
        )}
    </ScrollView>
);

// ─── Tab screens ─────────────────────────────────────────────────────────────

function AddVenueForm({ onBack, onSave, initialData = null, mode = 'add', ownerId }) {
    // Initialize states with initialData if it exists
    const [name, setName] = useState(initialData?.user?.name || '');
    const [location, setLocation] = useState(initialData?.user?.location || '');
    // Thumbnail and gallery keep both uri and optional backend path
    const [thumbnail, setThumbnail] = useState(initialData?.user?.image || null);
    const [gallery, setGallery] = useState(initialData?.user?.gallery || []);
    const [courts, setCourts] = useState(
        initialData?.user?.courts?.length
            ? initialData.user.courts.map((court, index) => ({
                id: court.id ?? null,
                name: court.name || `Court ${index + 1}`,
                pricePerHour: String(court.pricePerHour ?? initialData?.user?.pricePerHour ?? 0),
                isIndoor: !!court.isIndoor,
                sports: Array.isArray(court.sports) ? court.sports : [],
            }))
            : [{ name: 'Court 1', pricePerHour: '0', isIndoor: false, sports: [] }]
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const errorShake = useRef(new Animated.Value(0)).current;

    // Time Picker States
    const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0)));
    const [endTime, setEndTime] = useState(new Date(new Date().setHours(23, 0, 0)));
    const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

    const addCourt = useCallback(() => {
        setCourts((prev) => [...prev, { name: `Court ${prev.length + 1}`, pricePerHour: '0', isIndoor: false, sports: [] }]);
    }, []);

    const removeCourt = useCallback((index) => {
        setCourts((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateCourtField = useCallback((index, field, value) => {
        setCourts((prev) => prev.map((court, i) => (i === index ? { ...court, [field]: value } : court)));
    }, []);

    const toggleCourtSport = useCallback((index, sport) => {
        setCourts((prev) => prev.map((court, i) => {
            if (i !== index) return court;
            return {
                ...court,
                sports: court.sports.includes(sport)
                    ? court.sports.filter((s) => s !== sport)
                    : [...court.sports, sport],
            };
        }));
    }, []);

    const getAllSports = useCallback(
        () => [...new Set(courts.flatMap((court) => court.sports))],
        [courts],
    );

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const shakeError = () => {
        Animated.sequence([
            Animated.timing(errorShake, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const isReadOnly = mode === 'view';

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });
        if (!result.canceled) {
            setThumbnail({ uri: result.assets[0].uri, isLocal: true });
        }
    };

    // Pick Gallery Images (Up to 5)
    const pickGalleryImages = async () => {
        const remainingSlots = 5 - gallery.length;
        if (remainingSlots <= 0) {
            alert("You can only add up to 5 gallery images.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true, // Allow multiple
            selectionLimit: remainingSlots,
            quality: 0.6,
        });

        if (!result.canceled) {
            const newItems = result.assets.map(asset => ({ uri: asset.uri, isLocal: true }));
            setGallery(prev => [...prev, ...newItems].slice(0, 5));
        }
    };

    const removeGalleryImage = (index) => {
        setGallery(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (mode === 'view') return;

        // Basic validation: all visible fields must have a value
        const hasInvalidCourt = courts.some((court) => !court.name.trim() || court.sports.length === 0);
        if (!name.trim() || !location.trim() || hasInvalidCourt || courts.length === 0 || !thumbnail || gallery.length === 0) {
            setError('Please fill all fields. Each court needs a name and at least one sport.');
            shakeError();
            return;
        }

        setError('');

        let payloadCourts = courts.map((court) => ({
            id: court.id ?? undefined,
            name: court.name.trim(),
            pricePerHour: Number(court.pricePerHour || 0),
            isIndoor: !!court.isIndoor,
            sports: court.sports,
        }));

        const timings = `${formatTime(startTime)} - ${formatTime(endTime)}`;

        const arenaId = initialData?.id;

        // Edit mode: update existing arena + sync images
        if (mode === 'edit' && arenaId) {
            try {
                setLoading(true);

                const hasAtLeastOneCourtId = payloadCourts.some((court) => Number.isFinite(Number(court.id)));
                if (!hasAtLeastOneCourtId) {
                    const detailsResponse = await fetch(`${API_BASE_URL}/arena/get/${arenaId}`);
                    const detailsData = await detailsResponse.json();

                    if (!detailsResponse.ok) {
                        throw new Error(detailsData.error || 'Failed to load latest arena details for update');
                    }

                    const existingCourts = Array.isArray(detailsData.courts) ? detailsData.courts : [];
                    const usedIds = new Set();

                    payloadCourts = payloadCourts.map((incomingCourt, index) => {
                        const nameMatch = existingCourts.find((existing) => {
                            const existingId = Number(existing.id);
                            if (!Number.isFinite(existingId) || usedIds.has(existingId)) return false;
                            return String(existing.name || '').trim().toLowerCase() === incomingCourt.name.toLowerCase();
                        });

                        if (nameMatch) {
                            const matchedId = Number(nameMatch.id);
                            usedIds.add(matchedId);
                            return { ...incomingCourt, id: matchedId };
                        }

                        const indexMatch = existingCourts[index];
                        const indexId = Number(indexMatch?.id);
                        if (Number.isFinite(indexId) && !usedIds.has(indexId)) {
                            usedIds.add(indexId);
                            return { ...incomingCourt, id: indexId };
                        }

                        return incomingCourt;
                    });
                }

                const originalThumbPath = initialData?.user?.image?.path || null;
                const originalGallery = initialData?.user?.gallery || [];
                const originalPaths = [
                    originalThumbPath,
                    ...originalGallery.map(g => g.path),
                ].filter(Boolean);

                const keptPaths = [];
                if (thumbnail && !thumbnail.isLocal && thumbnail.path) {
                    keptPaths.push(thumbnail.path);
                }
                gallery.forEach(g => {
                    if (!g.isLocal && g.path) {
                        keptPaths.push(g.path);
                    }
                });

                const pathsToDelete = originalPaths.filter(p => !keptPaths.includes(p));

                const newThumbUri = thumbnail && thumbnail.isLocal ? thumbnail.uri : null;
                const newGalleryUris = gallery.filter(g => g.isLocal).map(g => g.uri);

                // 1) Update arena core fields
                const updateResponse = await fetch(`${API_BASE_URL}/arena/owner/${arenaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        city: location,
                        address: location,
                        pricePerHour: initialData?.user?.pricePerHour || 0,
                        timing: timings,
                        courts: payloadCourts,
                        amenities: [],
                        description: '',
                        rules: [],
                        availability: initialData?.user?.availability || 'available',
                    }),
                });

                const updateData = await updateResponse.json();
                if (!updateResponse.ok) {
                    throw new Error(updateData.error || 'Failed to update venue');
                }

                // 2) Delete removed images (if any)
                if (pathsToDelete.length > 0) {
                    const deleteResponse = await fetch(`${API_BASE_URL}/arena/${arenaId}/images`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ paths: pathsToDelete }),
                    });

                    const deleteData = await deleteResponse.json();
                    if (!deleteResponse.ok) {
                        throw new Error(deleteData.error || 'Failed to delete images');
                    }
                }

                // 3) Upload any new images
                if (newThumbUri || newGalleryUris.length > 0) {
                    const formData = new FormData();

                    if (newThumbUri) {
                        formData.append('thumbnail', {
                            uri: newThumbUri,
                            name: 'thumbnail.jpg',
                            type: 'image/jpeg',
                        });
                    }

                    newGalleryUris.forEach((uri, index) => {
                        formData.append('gallery', {
                            uri,
                            name: `gallery-${index + 1}.jpg`,
                            type: 'image/jpeg',
                        });
                    });

                    const uploadResponse = await fetch(`${API_BASE_URL}/arena/${arenaId}/images`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                        body: formData,
                    });

                    const uploadData = await uploadResponse.json();
                    if (!uploadResponse.ok) {
                        throw new Error(uploadData.error || 'Failed to upload images');
                    }
                }

                const venueObj = {
                    id: arenaId,
                    user: {
                        name,
                        location,
                        image: thumbnail,
                        gallery,
                        sports: getAllSports(),
                        courts,
                        timings,
                        rating: initialData?.user?.rating || '5.0',
                        isAvailable: true,
                    },
                };

                onSave(venueObj);
            } catch (err) {
                setError(err.message || 'Something went wrong while updating the venue.');
                shakeError();
            } finally {
                setLoading(false);
            }
            return;
        }

        // Add-mode: create arena in backend, then upload images
        if (!ownerId) {
            setError('Owner ID is missing. Please log in again.');
            shakeError();
            return;
        }

        try {
            setLoading(true);
            // 1) Create arena
            const createResponse = await fetch(`${API_BASE_URL}/arena/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    owner_id: ownerId,
                    name,
                    city: location,
                    address: location,
                    pricePerHour: Number(courts[0]?.pricePerHour || 0),
                    timing: timings,
                    courts: payloadCourts,
                    amenities: [],
                    description: '',
                    rules: [],
                }),
            });

            const createData = await createResponse.json();
            if (!createResponse.ok) {
                throw new Error(createData.error || 'Failed to create venue');
            }

            const newArenaId = createData.id;

            // 2) Upload images (thumbnail + gallery)
            const formData = new FormData();

            if (thumbnail) {
                formData.append('thumbnail', {
                    uri: thumbnail.uri,
                    name: 'thumbnail.jpg',
                    type: 'image/jpeg',
                });
            }

            gallery.forEach((g, index) => {
                formData.append('gallery', {
                    uri: g.uri,
                    name: `gallery-${index + 1}.jpg`,
                    type: 'image/jpeg',
                });
            });

            const uploadResponse = await fetch(`${API_BASE_URL}/arena/${newArenaId}/images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) {
                throw new Error(uploadData.error || 'Failed to upload images');
            }

            const venueObj = {
                id: newArenaId,
                user: {
                    name,
                    location,
                    image: thumbnail,
                    gallery,
                    sports: getAllSports(),
                    courts,
                    timings,
                    rating: '5.0',
                    isAvailable: true,
                },
            };

            onSave(venueObj);
        } catch (err) {
            setError(err.message || 'Something went wrong while creating the venue.');
            shakeError();
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>

                {/* Thumbnail */}
                <Text style={styles.sectionLabel}>Venue Thumbnail</Text>
                <TouchableOpacity
                    style={styles.imagePickerFrame}
                    onPress={isReadOnly ? null : pickImage}
                    disabled={isReadOnly}
                >
                    {thumbnail ? <Image source={{ uri: thumbnail.uri }} style={styles.previewImage} /> : (
                        <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons name="camera-plus" size={40} color={C.brown + '44'} />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Gallery */}
                <Text style={styles.sectionLabel}>Gallery ({gallery.length}/5)</Text>
                <View style={styles.galleryContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {gallery.map((item, index) => (
                            <View key={index} style={styles.galleryWrapper}>
                                <Image source={{ uri: item.uri }} style={styles.galleryImage} />
                                {!isReadOnly && (
                                    <TouchableOpacity style={styles.removeIcon} onPress={() => removeGalleryImage(index)}>
                                        <MaterialCommunityIcons name="close-circle" size={20} color="red" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {!isReadOnly && gallery.length < 5 && (
                            <TouchableOpacity style={styles.addGalleryButton} onPress={pickGalleryImages}>
                                <MaterialCommunityIcons name="plus" size={30} color="#888" />
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                <FormInput label="Venue Name" value={name} onChangeText={setName} editable={!isReadOnly} />
                <FormInput label="Location" value={location} onChangeText={setLocation} editable={!isReadOnly} />

                {/* Operating Hours */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Operating Hours</Text>
                    <View style={styles.timeRow}>
                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => !isReadOnly && setShowPicker('start')}
                        >
                            <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
                        </TouchableOpacity>
                        <View style={styles.timeDivider} />
                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => !isReadOnly && setShowPicker('end')}
                        >
                            <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.courtsHeaderRow}>
                        <Text style={styles.label}>Courts</Text>
                        {!isReadOnly && (
                            <TouchableOpacity onPress={addCourt}>
                                <Text style={styles.addCourtText}>+ Add Court</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {courts.map((court, index) => (
                        <View key={`court-${index}`} style={styles.courtCard}>
                            <View style={styles.courtCardHeader}>
                                <Text style={styles.courtCardTitle}>Court {index + 1}</Text>
                                {!isReadOnly && courts.length > 1 && (
                                    <TouchableOpacity onPress={() => removeCourt(index)}>
                                        <Text style={styles.removeCourtText}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <FormInput
                                label="Court Name"
                                value={court.name}
                                onChangeText={(value) => updateCourtField(index, 'name', value)}
                                editable={!isReadOnly}
                            />

                            <FormInput
                                label="Court Price Per Hour"
                                value={court.pricePerHour}
                                onChangeText={(value) => updateCourtField(index, 'pricePerHour', value)}
                                editable={!isReadOnly}
                                keyboardType="numeric"
                            />

                            <View style={styles.rowBetweenCompact}>
                                <Text style={styles.label}>Indoor Court</Text>
                                <Switch
                                    value={court.isIndoor}
                                    onValueChange={(value) => updateCourtField(index, 'isIndoor', value)}
                                    disabled={isReadOnly}
                                    trackColor={{ false: '#ccc', true: C.orange + '88' }}
                                    thumbColor={court.isIndoor ? C.orange : '#f4f3f4'}
                                />
                            </View>

                            <SportDropdown
                                label="Sports on this court"
                                selectedSports={court.sports}
                                onToggleSport={(sport) => toggleCourtSport(index, sport)}
                                isReadOnly={isReadOnly}
                            />
                        </View>
                    ))}
                </View>

                {error ? (
                    <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
                        <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                ) : null}

                {mode !== 'view' && (
                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={C.white} />
                        ) : (
                            <Text style={styles.saveButtonText}>
                                {mode === 'add' ? 'Create Venue' : 'Update Venue'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {showPicker && (
                    <DateTimePicker
                        value={showPicker === 'start' ? startTime : endTime}
                        mode="time"
                        onChange={(event, date) => {
                            setShowPicker(null);
                            if (date) showPicker === 'start' ? setStartTime(date) : setEndTime(date);
                        }}
                    />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}


function SubScreenContent({ type, id, data, onBack, venues, setVenues, ownerId, setOwnerBookings }) {
    const insets = useSafeAreaInsets(); // This gets the status bar height
    const [selectedVenue, setSelectedVenue] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
    }, []);

    // Helper: Update local venue list
    const handleSaveVenue = (updatedVenue) => {
        if (id === '1') { // Add
            setVenues(prev => [...prev, updatedVenue]);
        } else { // Update
            setVenues(prev => prev.map(v => v.id === updatedVenue.id ? updatedVenue : v));
        }
        onBack();
    };

    const handleRemoveVenue = async (venueId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/arena/${venueId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete venue');
            }

            setVenues(prev => prev.filter(v => v.id !== venueId));
            if (setOwnerBookings) {
                setOwnerBookings(prev => (prev || []).filter(b => String(b.arenaId) !== String(venueId)));
            }
            onBack();
        } catch (err) {
            Alert.alert('Error', err.message || 'Something went wrong while deleting the venue.');
        }
    };

    const handleSelectVenue = async (venue) => {
        // For update/view, fetch full details including images
        if (type === 'venue' && (id === '2' || id === '3')) {
            try {
                const response = await fetch(`${API_BASE_URL}/arena/get/${venue.id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load venue details');
                }

                const images = data.images || [];
                const thumbPath = images[0] || null;
                const galleryPaths = images.slice(1);

                const mapped = {
                    id: data.id,
                    user: {
                        name: data.name,
                        location: data.city,
                        image: thumbPath
                            ? { uri: `${API_BASE_URL}${thumbPath}`, path: thumbPath, isLocal: false }
                            : null,
                        gallery: galleryPaths.map(p => ({
                            uri: `${API_BASE_URL}${p}`,
                            path: p,
                            isLocal: false,
                        })),
                        sports: data.sports || [],
                        courts: data.courts || [],
                        timings: data.timing || '',
                        rating: data.rating != null ? String(data.rating) : '0.0',
                        isAvailable: data.availability === 'available',
                        pricePerHour: data.pricePerHour || 0,
                        availability: data.availability || 'available',
                    },
                };

                setSelectedVenue(mapped);
            } catch (err) {
                Alert.alert('Error', err.message || 'Could not load venue details. Please try again.');
            }
        } else {
            setSelectedVenue(venue);
        }
    };

    const renderVenueContent = () => {
        // Mode 1: Add Venue
        if (id === '1') {
            return <AddVenueForm mode="add" onSave={handleSaveVenue} onBack={onBack} ownerId={ownerId} />;
        }

        // Mode 2, 3, 4: Requires selection first
        if (!selectedVenue) {
            const labels = { '2': 'Update', '3': 'View', '4': 'Remove' };
            const icons = { '2': 'pencil', '3': 'eye', '4': 'delete' };
            return (
                <VenuePicker
                    venues={venues}
                    actionLabel={labels[id]}
                    icon={icons[id]}
                    onSelect={handleSelectVenue}
                />
            );
        }

        // Once a venue is selected:
        if (id === '2') return <AddVenueForm mode="edit" initialData={selectedVenue} onSave={handleSaveVenue} onBack={onBack} ownerId={ownerId} />;
        if (id === '3') return <AddVenueForm mode="view" initialData={selectedVenue} onBack={onBack} ownerId={ownerId} />;
        if (id === '4') {
            return (
                <View style={styles.formScroll}>
                    <Text style={styles.headerText}>Are you sure?</Text>
                    <Text style={[styles.placeholderText, { marginBottom: 30 }]}>
                        You are about to delete "{selectedVenue.user.name}". This action cannot be undone.
                    </Text>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: 'red' }]}
                        onPress={() => handleRemoveVenue(selectedVenue.id)}
                    >
                        <Text style={styles.saveButtonText}>Yes, Delete Venue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.submitBtn, { backgroundColor: C.bg }]} onPress={() => setSelectedVenue(null)}>
                        <Text style={[styles.submitBtnText, { color: C.brown }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    const renderBookingContent = () => {
        if (!data) return null;
        const { customer, venue, time, status, price, sportName, bookingDate } = data;
        return (
            <View style={styles.formScroll}>
                <Text style={styles.headerText}>Booking Details</Text>
                <Text style={styles.label}>Player</Text>
                <Text style={styles.bookingDetailText}>{customer || 'N/A'}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Venue</Text>
                <Text style={styles.bookingDetailText}>{venue}</Text>
                {sportName && (
                    <>
                        <Text style={[styles.label, { marginTop: 16 }]}>Sport</Text>
                        <Text style={styles.bookingDetailText}>{sportName}</Text>
                    </>
                )}
                {bookingDate && (
                    <>
                        <Text style={[styles.label, { marginTop: 16 }]}>Date</Text>
                        <Text style={styles.bookingDetailText}>{bookingDate}</Text>
                    </>
                )}
                <Text style={[styles.label, { marginTop: 16 }]}>Time</Text>
                <Text style={styles.bookingDetailText}>{time}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Status</Text>
                <Text style={styles.bookingDetailText}>{status}</Text>
                {price && (
                    <>
                        <Text style={[styles.label, { marginTop: 16 }]}>Price</Text>
                        <Text style={styles.bookingDetailText}>{price}</Text>
                    </>
                )}
            </View>
        );
    };

    const renderProfileContent = () => {
        return (
            <View style={styles.formScroll}>
                <Text style={styles.headerText}>{id}</Text>
                <Text style={styles.placeholderText}>Coming soon.</Text>
            </View>
        );
    };

    return (
        <Animated.View
            style={[styles.subScreenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
            <View style={styles.subScreenHeader}>
                <Text style={styles.subScreenTitle}>
                    {type === 'venue'
                        ? (id === '1' ? 'Add Venue' : id === '2' ? 'Update Venue' : id === '3' ? 'Venue Details' : 'Remove Venue')
                        : type === 'booking'
                            ? 'Booking Details'
                            : id}
                </Text>
            </View>
            {type === 'venue' && renderVenueContent()}
            {type === 'booking' && renderBookingContent()}
            {type === 'profile' && renderProfileContent()}
        </Animated.View>
    );
}

function DashboardScreen({ onActionSelect }) {
    const menuItems = [
        { id: '1', title: 'Add Venue', icon: 'plus-circle' },
        { id: '2', title: 'Update Venue', icon: 'pencil-circle' },
        { id: '3', title: 'View Venue', icon: 'eye-circle' },
        { id: '4', title: 'Remove Venue', icon: 'delete-circle' },
    ];

    return (
        <View style={styles.rootbrown}>
            {/* Background arcs */}
            <View style={styles.arcContainer} pointerEvents="none">
                <View style={styles.arcOuter} />
                <View style={styles.arcInner} />
                <View style={styles.halfCircle} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.headerText}>Venue Management</Text>

                {menuItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => onActionSelect(item.id)}
                    >
                        <View style={[styles.iconWrapper, { backgroundColor: C.brown + '15' }]}>
                            <MaterialCommunityIcons name={item.icon} size={32} color={C.brown} />
                        </View>

                        <Text style={styles.cardText}>{item.title}</Text>

                        <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

function BookingsScreen({ bookings, onBookingSelect }) {
    // 1. States for filtering
    const [statusFilter, setStatusFilter] = useState('All');
    const [venueFilter, setVenueFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All'); // All, Today, Upcoming

    // Group raw bookings into Today / Upcoming sections
    const sections = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const todayItems = [];
        const upcomingItems = [];

        (bookings || []).forEach((b) => {
            // Expect shape from backend: bookingId, arenaName, playerName, bookingDate, startTime, endTime, status, revenue, sportName
            const id = String(b.bookingId);
            const customer = b.playerName || 'Player';
            const venue = b.arenaName;
            const status = b.status === 'confirmed' || b.status === 'Confirmed' ? 'Confirmed' : 'Pending';
            const price = b.revenue != null ? `Rs. ${Number(b.revenue).toLocaleString('en-PK')}` : 'Rs. 0';
            const time = `${b.startTime?.slice(0, 5)} - ${b.endTime?.slice(0, 5)}`;
            const item = { id, customer, venue, status, price, time, sportName: b.sportName, bookingDate: b.bookingDate };

            if (b.bookingDate === today) todayItems.push(item);
            else upcomingItems.push(item);
        });

        const result = [];
        if (todayItems.length) result.push({ title: 'Today', data: todayItems });
        if (upcomingItems.length) result.push({ title: 'Upcoming', data: upcomingItems });
        return result;
    }, [bookings]);

    // 2. Extract unique venues for the filter list
    const uniqueVenues = ['All', ...new Set(sections.flatMap(s => s.data.map(b => b.venue)))];
    const statuses = ['All', 'Confirmed', 'Pending'];
    const timeOptions = ['All', 'Today', 'Upcoming'];

    // 3. Filter Logic
    const filteredSections = useMemo(() => {
        return sections.map(section => {
            // Check if this section matches the Time Filter
            if (timeFilter !== 'All' && section.title !== timeFilter) {
                return { ...section, data: [] };
            }

            const filteredData = section.data.filter(booking => {
                const statusMatch = statusFilter === 'All' || booking.status === statusFilter;
                const venueMatch = venueFilter === 'All' || booking.venue === venueFilter;
                return statusMatch && venueMatch;
            });

            return { ...section, data: filteredData };
        }).filter(section => section.data.length > 0); // Hide empty sections
    }, [statusFilter, venueFilter, timeFilter]);

    // UI Component for Filter Chips
    const FilterGroup = ({ label, options, current, setter, icon }) => (
        <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
                <MaterialCommunityIcons name={icon} size={14} color={C.white} />
                <Text style={styles.filterGroupLabel}>{label}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {options.map(opt => (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => setter(opt)}
                        style={[styles.filterChip, current === opt && styles.filterChipActive]}
                    >
                        <Text style={[styles.filterChipText, current === opt && styles.filterChipTextActive]}>
                            {opt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderBookingCard = ({ item }) => (
        <TouchableOpacity
            style={styles.bookingCard}
            activeOpacity={0.8}
            onPress={() => onBookingSelect(item)} // Trigger selection
        >
            <View style={styles.bookingInfo}>
                <View style={styles.bookingHeader}>
                    <Text style={styles.bookingCustomer}>{item.customer}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Confirmed' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'Confirmed' ? '#2E7D32' : '#EF6C00' }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.bookingDetailRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.brown + '99'} />
                    <Text style={styles.bookingDetailText}>{item.venue}</Text>
                </View>
                <View style={styles.bookingDetailRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={C.orange} />
                    <Text style={styles.bookingTimeText}>{item.time}</Text>
                </View>
            </View>
            <View style={styles.bookingPriceAction}>
                <Text style={styles.bookingPrice}>{item.price}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.brown + '44'} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.rootbrown}>
            <View style={styles.arcContainer} pointerEvents="none">
                <View style={styles.arcOuter} />
                <View style={styles.arcInner} />
            </View>

            {/* --- Filter Bar Area --- */}
            <View style={styles.filterContainer}>
                <FilterGroup label="Status" options={statuses} current={statusFilter} setter={setStatusFilter} icon="filter-variant" />
                <FilterGroup label="Venues" options={uniqueVenues} current={venueFilter} setter={setVenueFilter} icon="stadium" />
                <FilterGroup label="Time" options={timeOptions} current={timeFilter} setter={setTimeFilter} icon="calendar-clock" />
            </View>

            <SectionList
                showsVerticalScrollIndicator={false}
                sections={filteredSections}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.bookingListContent}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionLine} />
                        <Text style={styles.sectionTitle}>{title}</Text>
                        <View style={styles.sectionLine} />
                    </View>
                )}
                renderItem={renderBookingCard}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="calendar-search" size={60} color={C.white + '33'} />
                        <Text style={styles.emptyStateText}>No bookings match these filters</Text>
                    </View>
                }
            />
        </View>
    );
}

function ProfileScreen({ onLogout, user, onMenuSelect }) {
    const stats = [
        { label: 'Following', value: '138' },
        { label: 'Followers', value: '91' },
    ];

    const menuItems = [
        { icon: 'account-edit-outline', label: 'Edit Profile' },
        { icon: 'bell-outline', label: 'Notifications' },
        { icon: 'help-circle-outline', label: 'Help & Support' },
    ];

    return (
        <View style={styles.rootwhite}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Profile hero */}
                <View style={styles.profileHero}>
                    <View style={styles.profileAvatarWrap}>
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarText}>
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.profileAvatarEdit}>
                            <MaterialCommunityIcons name="camera" size={14} color={C.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{user?.name || 'Alleyoop User'}</Text>
                    <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
                    <View style={styles.profileBadge}>
                        <MaterialCommunityIcons name="stadium" size={12} color={C.orange} />
                        <Text style={styles.profileBadgeText}>{user?.userType || 'Owner'}</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    {stats.map((s, i) => (
                        <React.Fragment key={s.label}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                            {i < stats.length - 1 && <View style={styles.statDivider} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Menu items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, i) => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            onPress={() => onMenuSelect(item.label)} // Trigger selection
                        >
                            <View style={styles.menuIconWrap}>
                                <MaterialCommunityIcons name={item.icon} size={20} color={C.orange} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={C.brown + '55'} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="logout" size={18} color={C.orange} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────

export function OwnerHomeScreen({ user, onLogout }) {
    const insets = useSafeAreaInsets(); // This gets the status bar height
    const [activeTab, setActiveTab] = useState(0);
    // Tracks { type: 'venue'|'booking'|'profile', id: string, data: any }
    const [activeSubScreen, setActiveSubScreen] = useState(null);
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeStartX = useRef(0);
    // Shared state for all venues (loaded from backend)
    const [venues, setVenues] = useState([]);
    // Bookings for this owner (loaded from backend)
    const [ownerBookings, setOwnerBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);

    // Initial load: fetch arenas owned by this owner from backend with minimal fields
    useEffect(() => {
        const fetchVenues = async () => {
            if (!user?.userId) return;

            try {
                const response = await fetch(`${API_BASE_URL}/arena/owner?ownerId=${user.userId}`);
                const data = await response.json();

                if (!response.ok) {
                    console.error('Failed to load arenas for owner:', data.error || 'Unknown error');
                    return;
                }

                const mapped = (data || []).map((item) => ({
                    id: item.id,
                    user: {
                        name: item.name,
                        location: item.city,
                        image: item.image_path
                            ? { uri: `${API_BASE_URL}${item.image_path}` }
                            : null,
                        rating: item.rating != null ? String(item.rating) : '0.0',
                        isAvailable: item.availability === 'available',
                        sports: item.sports || [],
                        courts: item.courts || [],
                        timings: item.timing || '',
                        pricePerHour: item.pricePerHour || 0,
                        availability: item.availability || 'available',
                    },
                }));

                setVenues(mapped);
            } catch (err) {
                console.error('Error fetching arenas for owner:', err);
            }
        };

        fetchVenues();
    }, [user?.userId]);

    // Load bookings for all arenas owned by this owner
    useEffect(() => {
        const fetchBookings = async () => {
            if (!user?.userId) return;
            try {
                setBookingsLoading(true);
                const response = await fetch(`${API_BASE_URL}/bookings/owner?ownerId=${user.userId}`);
                const data = await response.json();
                if (!response.ok) {
                    console.error('Failed to load owner bookings:', data.error || 'Unknown error');
                    return;
                }
                setOwnerBookings(data || []);
            } catch (err) {
                console.error('Error fetching owner bookings:', err);
            } finally {
                setBookingsLoading(false);
            }
        };

        fetchBookings();
    }, [user?.userId]);

    const goToTab = useCallback((index) => {
        setActiveSubScreen(null); // Reset when switching tabs
        setActiveTab(index);
        Animated.spring(translateX, {
            toValue: -index * width,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderGrant: (_, g) => {
                swipeStartX.current = g.x0;
            },
            onPanResponderRelease: (_, g) => {
                if (g.dx < -50) {
                    setActiveTab(prev => {
                        const next = Math.min(prev + 1, TABS.length - 1);
                        Animated.spring(translateX, { toValue: -next * width, useNativeDriver: true, tension: 80, friction: 12 }).start();
                        return next;
                    });
                } else if (g.dx > 50) {
                    setActiveTab(prev => {
                        const next = Math.max(prev - 1, 0);
                        Animated.spring(translateX, { toValue: -next * width, useNativeDriver: true, tension: 80, friction: 12 }).start();
                        return next;
                    });
                }
            },
        })
    ).current;

    const currentTab = TABS[activeTab];

    const tabContent = [
        <DashboardScreen
            key="dashboard"
            onActionSelect={(id) => setActiveSubScreen({ type: 'venue', id })}
        />,
        <BookingsScreen
            key="bookings"
            bookings={ownerBookings}
            onBookingSelect={(booking) => setActiveSubScreen({ type: 'booking', id: booking.id, data: booking })}
        />,
        <ProfileScreen
            key="profile"
            user={user}
            onLogout={onLogout}
            onMenuSelect={(label) => setActiveSubScreen({ type: 'profile', id: label })}
        />,
    ];

    return (
        <View style={[styles.rootwhite, { paddingTop: insets.top }]}>
            {/* Set translucent to true so the background color can sit behind the status bar icons */}
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {/* ── Top bar ── */}
            <View style={styles.topBar}>

                {/* LEFT SIDE: Conditional Tab Label or Back Button */}
                <View style={styles.topBarSide}>
                    {activeSubScreen ? (
                        <TouchableOpacity
                            style={styles.headerBackButton}
                            onPress={() => setActiveSubScreen(null)}
                        >
                            <MaterialCommunityIcons name="chevron-left" size={28} color={C.brown} />
                            <Text style={styles.headerBackText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text
                            style={styles.topBarTitle}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {currentTab.label}
                        </Text>
                    )}
                </View>

                {/* Center Side: Logo */}
                <View style={styles.topBarCenter}>
                    <Image
                        source={require('../../../assets/top-minimal.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Right Side: Action Button */}
                <View style={styles.topBarSide}>
                    {/* Hide search if a subscreen is open */}
                    {!activeSubScreen && (
                        <TouchableOpacity
                            style={styles.topBarAction}
                            onPress={activeTab === 2 ? onLogout : () => { }}
                        >
                            <MaterialCommunityIcons
                                name={activeTab < 2 ? "magnify" : "logout"}
                                size={26}
                                color={activeTab < 2 ? C.brown : C.orange}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Conditional Main Body */}
            {activeSubScreen ? (
                <SubScreenContent
                    type={activeSubScreen.type}
                    id={activeSubScreen.id}
                    venues={venues}
                    setVenues={setVenues}
                    ownerId={user?.userId}
                    setOwnerBookings={setOwnerBookings}
                    onBack={() => setActiveSubScreen(null)}
                />
            ) : (
                <>
                    <View style={styles.contentArea} {...panResponder.panHandlers}>
                        <Animated.View style={[styles.tabsStrip, { transform: [{ translateX }] }]}>
                            {tabContent.map((screen, i) => (
                                <View key={i} style={styles.tabPane}>{screen}</View>
                            ))}
                        </Animated.View>
                    </View>

                    {/* Bottom Nav */}
                    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                        {TABS.map((tab, i) => {
                            const isActive = activeTab === i;
                            return (
                                <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => goToTab(i)}>
                                    <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                                        <MaterialCommunityIcons
                                            name={isActive ? tab.activeIcon : tab.icon}
                                            size={24}
                                            color={isActive ? C.white : C.brown + '66'}
                                        />
                                    </View>
                                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </>
            )}

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.brown,
    },
    rootbrown: {
        flex: 1,
        backgroundColor: C.brown,
    },
    rootwhite: {
        flex: 1,
        backgroundColor: C.white,
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

    // ── Top bar ────────────────────────────────────────────────────────────────
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        height: 60,
        paddingBottom: 5,
    },
    topBarSide: {
        width: 92,
        justifyContent: 'center',
    },
    topBarCenter: {
        flex: 1,
        alignItems: 'center',
    },
    topBarTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: C.brown,
        flexShrink: 1,
    },
    logoImage: {
        width: 120,
        height: 40,
    },
    topBarAction: {
        alignItems: 'flex-end',
    },
    headerBackButton: {
        flexDirection: 'row', // Horizontal layout
        alignItems: 'center', // Vertical centering
        marginLeft: -10,      // Nudge left so the icon arrow sits near the edge
    },
    headerBackText: {
        fontSize: 16,
        fontWeight: '600',
        color: C.brown,
        marginLeft: -6,       // Pull text closer to the icon for a tighter look
    },

    // ── Content ────────────────────────────────────────────────────────────────
    contentArea: {
        flex: 1,
        overflow: 'hidden',
    },
    tabsStrip: {
        flexDirection: 'row',
        width: width * TABS.length,
        flex: 1,
    },
    tabPane: {
        width,
        flex: 1,
    },

    // ── Dashboard Card Styles ──────────────────────────────────────────────────────
    scrollContent: {
        paddingTop: 80,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row', // Aligns icon and text horizontally inside the card
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 4,
    },
    iconWrapper: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardText: {
        flex: 1, // Takes up remaining space
        fontSize: 18,
        fontWeight: '600',
        color: C.orange,
    },

    // ── Profile ────────────────────────────────────────────────────────────────
    profileHero: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 24,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    profileAvatarWrap: {
        position: 'relative',
        marginBottom: 14,
    },
    profileAvatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: C.brown,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: C.orange,
    },
    profileAvatarText: {
        fontSize: 36,
        fontWeight: '900',
        color: C.cream,
    },
    profileAvatarEdit: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: C.orange,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: C.white,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '900',
        color: C.brown,
        letterSpacing: -0.5,
    },
    profileEmail: {
        fontSize: 13,
        color: C.mutedText,
        marginTop: 3,
    },
    profileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        backgroundColor: C.bg,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    profileBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: C.brown,
        textTransform: 'capitalize',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: C.white,
        paddingVertical: 20,
        marginTop: 2,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: C.brown,
    },
    statLabel: {
        fontSize: 12,
        color: C.mutedText,
        marginTop: 2,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        backgroundColor: C.border,
        marginVertical: 4,
    },
    menuSection: {
        marginTop: 12,
        backgroundColor: C.white,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: C.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        gap: 14,
    },
    menuIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: C.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        color: C.brown,
        fontWeight: '500',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 24,
        marginTop: 24,
        paddingVertical: 15,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: C.orange + '55',
        backgroundColor: '#FFF5EF',
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '800',
        color: C.orange,
        letterSpacing: 0.5,
    },

    // ── Bottom nav ─────────────────────────────────────────────────────────────
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: C.white,
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        paddingHorizontal: 8,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    navIconWrap: {
        width: 44,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconWrapActive: {
        backgroundColor: C.brown,
        width: 52,
        borderRadius: 16,
    },
    navLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: C.brown + '66',
        letterSpacing: 0.3,
    },
    navLabelActive: {
        color: C.orange,
        fontWeight: '800',
    },

    // ── Bookings Section Styles ────────────────────────────────────────────────
    bookingListContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
        marginTop: 25,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 16,
        fontWeight: '800',
        marginHorizontal: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.white + '33',
    },
    bookingCard: {
        backgroundColor: C.white,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        // Elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookingInfo: {
        flex: 1,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    bookingCustomer: {
        fontSize: 18,
        fontWeight: 'bold',
        color: C.brown,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    bookingDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    bookingDetailText: {
        fontSize: 14,
        color: C.brown + '99',
    },
    bookingTimeText: {
        fontSize: 14,
        fontWeight: '600',
        color: C.brown,
    },
    bookingPriceAction: {
        alignItems: 'flex-end',
        gap: 8,
        marginLeft: 10,
    },
    bookingPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: C.orange,
    },

    // ── Filter Styles ────────────────────────────────────────────────────────
    filterContainer: {
        backgroundColor: C.brown,
        paddingBottom: 15,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.white + '1A',
    },
    filterGroup: {
        marginBottom: 8,
    },
    filterLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 5,
        marginBottom: 8,
    },
    filterGroupLabel: {
        color: C.white,
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.6,
        textTransform: 'uppercase',
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: C.white + '1A',
        borderWidth: 1,
        borderColor: C.white + '1A',
    },
    filterChipActive: {
        backgroundColor: C.orange,
        borderColor: C.orange,
    },
    filterChipText: {
        color: C.white,
        fontSize: 13,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: C.white,
    },

    // ── Empty State ──────────────────────────────────────────────────────────
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyStateText: {
        color: C.white + '88',
        fontSize: 16,
        marginTop: 15,
    },

    // ── Subscreen ──────────────────────────────────────────────────────────

    subScreenContainer: {
        flex: 1,
        backgroundColor: C.white,
    },
    subScreenHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        backgroundColor: C.brown,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 5,
    },
    backText: {
        color: C.brown,
        fontWeight: '600',
    },
    subScreenTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: C.orange,
    },
    formContainer: { flex: 1, backgroundColor: 'transparent' },
    formScroll: { padding: 20, paddingBottom: 10 },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: C.brown, marginBottom: 10, textTransform: 'uppercase' },
    imagePickerFrame: { width: '100%', height: 180, borderRadius: 16, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 25 },
    previewImage: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 15, fontWeight: '700', color: C.brown, marginBottom: 8 },
    subLabel: { fontSize: 12, color: C.mutedText },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: C.brown },
    placeholderText: { color: C.brown + '66', fontWeight: '500' },

    // Dropdown
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 15, paddingTop: -20 },
    dropdownHeaderText: { color: C.brown, fontWeight: '600' },
    dropdownList: { marginTop: 5, backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    sportItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: C.border },
    sportItemActive: { backgroundColor: C.orange },
    sportItemText: { color: C.brown, fontWeight: '500' },
    sportItemTextActive: { color: C.white, fontWeight: '700' },

    // Time
    timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: C.border },
    timeButton: { flex: 1, padding: 12, alignItems: 'center' },
    timeLabel: { fontSize: 10, color: C.mutedText, textTransform: 'uppercase', marginBottom: 2 },
    timeValue: { fontSize: 16, fontWeight: '700', color: C.brown },
    timeDivider: { width: 1, height: 30, backgroundColor: C.border },

    courtsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    addCourtText: { color: C.orange, fontWeight: '800' },
    courtCard: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 12 },
    courtCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    courtCardTitle: { color: C.brown, fontWeight: '800', fontSize: 15 },
    removeCourtText: { color: '#C23B22', fontWeight: '700' },
    rowBetweenCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: 30 },
    saveButton: { backgroundColor: C.brown, borderRadius: 14, paddingVertical: 16, alignItems: 'center', elevation: 4 },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

    // Gallery
    galleryContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    galleryWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    galleryImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#eee'
    },
    removeIcon: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'white',
        borderRadius: 12,
        marginTop: 4,
        marginRight: 4,
    },
    addGalleryButton: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: C.bg
    },
    // imagePickerFrame: {
    //     width: '100%',
    //     height: 180,
    //     borderRadius: 15,
    //     overflow: 'hidden',
    //     backgroundColor: '#f0f0f0',
    // },
    previewImage: {
        width: '100%',
        height: '100%',
    },

    placeholderForm: {
        paddingTop: 10,
        justifyContent: 'center',
    },
    placeholderText: {
        marginTop: 20,
        fontSize: 16,
        color: C.mutedText,
        textAlign: 'center',
    },
    submitBtn: {
        marginTop: 40,
        backgroundColor: C.brown,
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    submitBtnText: {
        color: C.white,
        fontWeight: 'bold',
        fontSize: 16,
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
    errorBox: {
        marginTop: 8,
        marginBottom: 10,
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
});

export default OwnerHomeScreen;

// import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     ScrollView,
//     Image,
//     Dimensions,
//     Animated,
//     PanResponder,
//     StatusBar,
//     Platform,
//     SectionList,
//     KeyboardAvoidingView,
//     Switch,
//     TextInput,
//     Touchable,
//     Modal,
//     FlatList,
//     Alert,
//     ActivityIndicator,
// } from 'react-native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as ImagePicker from 'expo-image-picker';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { API_BASE_URL } from '../../config/api';

// const { width, height } = Dimensions.get('window');

// const C = {
//     bg: '#F5E9D8',
//     orange: '#E76F2E',
//     brown: '#3E2C23',
//     blue: '#2FA4D7',
//     cream: '#F5E9D8',
//     white: '#FFFFFF',
//     cardBg: '#FFFFFF',
//     mutedText: '#3E2C2399',
//     border: '#3E2C2318',
// };

// const TABS = [
//     { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
//     { id: 'bookings', label: 'Bookings', icon: 'calendar-text-outline', activeIcon: 'calendar-text' },
//     { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
// ];

// const SPORT_OPTIONS = ['Basketball', 'Tennis', 'Futsal', 'Padel', 'Cricket', 'Badminton', 'Football 5-a-side'];

// // ─── Placeholder data ─────────────────────────────────────────────────────────

// const today = new Date().toISOString().slice(0, 10);
// const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
// const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

// const INITIAL_VENUES = [
//     {
//         id: 'v1',
//         user: {
//             name: 'Downtown Sports Arena',
//             location: 'Karachi',
//             image: { uri: 'https://images.unsplash.com/photo-1546519638405-a9e517f3b2a8?w=400' },
//             gallery: [],
//             sports: ['Basketball', 'Futsal'],
//             courts: [
//                 { name: 'Court A', pricePerHour: 2000, isIndoor: true, sports: ['Basketball'] },
//                 { name: 'Court B', pricePerHour: 1500, isIndoor: false, sports: ['Futsal'] },
//             ],
//             timings: '08:00 AM - 11:00 PM',
//             rating: '4.8',
//             isAvailable: true,
//             pricePerHour: 2000,
//             availability: 'available',
//         },
//     },
//     {
//         id: 'v2',
//         user: {
//             name: 'Elite Padel Club',
//             location: 'Lahore',
//             image: { uri: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400' },
//             gallery: [],
//             sports: ['Padel', 'Tennis'],
//             courts: [
//                 { name: 'Padel Court 1', pricePerHour: 3000, isIndoor: true, sports: ['Padel'] },
//                 { name: 'Tennis Court', pricePerHour: 2500, isIndoor: false, sports: ['Tennis'] },
//             ],
//             timings: '06:00 AM - 10:00 PM',
//             rating: '4.6',
//             isAvailable: true,
//             pricePerHour: 3000,
//             availability: 'available',
//         },
//     },
//     {
//         id: 'v3',
//         user: {
//             name: 'Cricket Ground Islamabad',
//             location: 'Islamabad',
//             image: { uri: 'https://images.unsplash.com/photo-1540747913346-19212a4b423f?w=400' },
//             gallery: [],
//             sports: ['Cricket'],
//             courts: [
//                 { name: 'Main Pitch', pricePerHour: 5000, isIndoor: false, sports: ['Cricket'] },
//             ],
//             timings: '07:00 AM - 09:00 PM',
//             rating: '4.9',
//             isAvailable: false,
//             pricePerHour: 5000,
//             availability: 'unavailable',
//         },
//     },
// ];

// const INITIAL_BOOKINGS = [
//     {
//         bookingId: 'b1',
//         playerName: 'Ahmed Khan',
//         arenaName: 'Downtown Sports Arena',
//         arenaId: 'v1',
//         bookingDate: today,
//         startTime: '16:00:00',
//         endTime: '17:00:00',
//         status: 'confirmed',
//         revenue: 2000,
//         sportName: 'Basketball',
//     },
//     {
//         bookingId: 'b2',
//         playerName: 'Sara Williams',
//         arenaName: 'Downtown Sports Arena',
//         arenaId: 'v1',
//         bookingDate: today,
//         startTime: '18:00:00',
//         endTime: '19:30:00',
//         status: 'confirmed',
//         revenue: 3000,
//         sportName: 'Futsal',
//     },
//     {
//         bookingId: 'b3',
//         playerName: 'Zain Malik',
//         arenaName: 'Elite Padel Club',
//         arenaId: 'v2',
//         bookingDate: tomorrow,
//         startTime: '10:00:00',
//         endTime: '11:00:00',
//         status: 'pending',
//         revenue: 3000,
//         sportName: 'Padel',
//     },
//     {
//         bookingId: 'b4',
//         playerName: 'Hamza Ali',
//         arenaName: 'Elite Padel Club',
//         arenaId: 'v2',
//         bookingDate: tomorrow,
//         startTime: '14:00:00',
//         endTime: '15:30:00',
//         status: 'confirmed',
//         revenue: 4500,
//         sportName: 'Tennis',
//     },
//     {
//         bookingId: 'b5',
//         playerName: 'Omar Javed',
//         arenaName: 'Cricket Ground Islamabad',
//         arenaId: 'v3',
//         bookingDate: dayAfter,
//         startTime: '09:00:00',
//         endTime: '13:00:00',
//         status: 'confirmed',
//         revenue: 20000,
//         sportName: 'Cricket',
//     },
// ];

// // ─── Form Inputs ─────────────────────────────────────────────────────────────

// const FormInput = memo(({ label, value, onChangeText, placeholder, ...props }) => (
//     <View style={styles.inputGroup}>
//         <Text style={styles.label}>{label}</Text>
//         <TextInput
//             style={styles.input}
//             placeholder={placeholder}
//             value={value}
//             onChangeText={onChangeText}
//             placeholderTextColor={C.mutedText}
//             {...props}
//         />
//     </View>
// ));

// const SportDropdown = memo(({ selectedSports, onToggleSport, isReadOnly, label = 'Select Sports' }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     return (
//         <View style={styles.inputGroup}>
//             <Text style={styles.label}>{label}</Text>
//             <TouchableOpacity
//                 style={styles.dropdownHeader}
//                 onPress={() => setIsOpen(!isOpen)}
//                 activeOpacity={0.8}
//                 disabled={isReadOnly}
//             >
//                 <Text style={selectedSports.length ? styles.dropdownHeaderText : styles.placeholderText}>
//                     {selectedSports.length ? selectedSports.join(', ') : 'Choose sports...'}
//                 </Text>
//                 <MaterialCommunityIcons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={C.brown} paddingTop={20} />
//             </TouchableOpacity>

//             {isOpen && (
//                 <View style={styles.dropdownList}>
//                     {SPORT_OPTIONS.map(sport => {
//                         const isSelected = selectedSports.includes(sport);
//                         return (
//                             <TouchableOpacity
//                                 key={sport}
//                                 style={[styles.sportItem, isSelected && styles.sportItemActive]}
//                                 onPress={() => onToggleSport(sport)}
//                             >
//                                 <Text style={[styles.sportItemText, isSelected && styles.sportItemTextActive]}>{sport}</Text>
//                                 {isSelected && <MaterialCommunityIcons name="check" size={16} color={C.white} />}
//                             </TouchableOpacity>
//                         );
//                     })}
//                 </View>
//             )}
//         </View>
//     );
// });

// const VenuePicker = ({ venues, onSelect, actionLabel, icon }) => (
//     <ScrollView contentContainerStyle={styles.formScroll}>
//         <Text style={[styles.sectionLabel, { marginBottom: 20 }]}>Select a Venue to {actionLabel}</Text>
//         {venues.length === 0 ? (
//             <View style={styles.emptyState}>
//                 <Text style={{ color: C.brown }}>No venues added yet.</Text>
//             </View>
//         ) : (
//             venues.map(item => (
//                 <TouchableOpacity
//                     key={item.id}
//                     style={styles.card}
//                     onPress={() => onSelect(item)}
//                 >
//                     <Image source={item.user.image} style={{ width: 50, height: 50, borderRadius: 10, marginRight: 15 }} />
//                     <View style={{ flex: 1 }}>
//                         <Text style={styles.cardText}>{item.user.name}</Text>
//                         <Text style={styles.subLabel}>{item.user.location}</Text>
//                     </View>
//                     <MaterialCommunityIcons name={icon} size={24} color={C.orange} />
//                 </TouchableOpacity>
//             ))
//         )}
//     </ScrollView>
// );

// // ─── Tab screens ─────────────────────────────────────────────────────────────

// function AddVenueForm({ onBack, onSave, initialData = null, mode = 'add', ownerId }) {
//     // Initialize states with initialData if it exists
//     const [name, setName] = useState(initialData?.user?.name || '');
//     const [location, setLocation] = useState(initialData?.user?.location || '');
//     // Thumbnail and gallery keep both uri and optional backend path
//     const [thumbnail, setThumbnail] = useState(initialData?.user?.image || null);
//     const [gallery, setGallery] = useState(initialData?.user?.gallery || []);
//     const [courts, setCourts] = useState(
//         initialData?.user?.courts?.length
//             ? initialData.user.courts.map((court, index) => ({
//                 name: court.name || `Court ${index + 1}`,
//                 pricePerHour: String(court.pricePerHour ?? initialData?.user?.pricePerHour ?? 0),
//                 isIndoor: !!court.isIndoor,
//                 sports: Array.isArray(court.sports) ? court.sports : [],
//             }))
//             : [{ name: 'Court 1', pricePerHour: '0', isIndoor: false, sports: [] }]
//     );
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');
//     const errorShake = useRef(new Animated.Value(0)).current;

//     // Time Picker States
//     const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0)));
//     const [endTime, setEndTime] = useState(new Date(new Date().setHours(23, 0, 0)));
//     const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

//     const addCourt = useCallback(() => {
//         setCourts((prev) => [...prev, { name: `Court ${prev.length + 1}`, pricePerHour: '0', isIndoor: false, sports: [] }]);
//     }, []);

//     const removeCourt = useCallback((index) => {
//         setCourts((prev) => prev.filter((_, i) => i !== index));
//     }, []);

//     const updateCourtField = useCallback((index, field, value) => {
//         setCourts((prev) => prev.map((court, i) => (i === index ? { ...court, [field]: value } : court)));
//     }, []);

//     const toggleCourtSport = useCallback((index, sport) => {
//         setCourts((prev) => prev.map((court, i) => {
//             if (i !== index) return court;
//             return {
//                 ...court,
//                 sports: court.sports.includes(sport)
//                     ? court.sports.filter((s) => s !== sport)
//                     : [...court.sports, sport],
//             };
//         }));
//     }, []);

//     const getAllSports = useCallback(
//         () => [...new Set(courts.flatMap((court) => court.sports))],
//         [courts],
//     );

//     const formatTime = (date) => {
//         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
//     };

//     const shakeError = () => {
//         Animated.sequence([
//             Animated.timing(errorShake, { toValue: 10, duration: 60, useNativeDriver: true }),
//             Animated.timing(errorShake, { toValue: -10, duration: 60, useNativeDriver: true }),
//             Animated.timing(errorShake, { toValue: 6, duration: 60, useNativeDriver: true }),
//             Animated.timing(errorShake, { toValue: -6, duration: 60, useNativeDriver: true }),
//             Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
//         ]).start();
//     };

//     const isReadOnly = mode === 'view';

//     const pickImage = async () => {
//         let result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: 'images',
//             allowsEditing: true,
//             aspect: [16, 9],
//             quality: 0.7,
//         });
//         if (!result.canceled) {
//             setThumbnail({ uri: result.assets[0].uri, isLocal: true });
//         }
//     };

//     // Pick Gallery Images (Up to 5)
//     const pickGalleryImages = async () => {
//         const remainingSlots = 5 - gallery.length;
//         if (remainingSlots <= 0) {
//             alert("You can only add up to 5 gallery images.");
//             return;
//         }

//         let result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Images,
//             allowsMultipleSelection: true, // Allow multiple
//             selectionLimit: remainingSlots,
//             quality: 0.6,
//         });

//         if (!result.canceled) {
//             const newItems = result.assets.map(asset => ({ uri: asset.uri, isLocal: true }));
//             setGallery(prev => [...prev, ...newItems].slice(0, 5));
//         }
//     };

//     const removeGalleryImage = (index) => {
//         setGallery(prev => prev.filter((_, i) => i !== index));
//     };

//     const handleSave = async () => {
//         if (mode === 'view') return;

//         // Basic validation: all visible fields must have a value
//         const hasInvalidCourt = courts.some((court) => !court.name.trim() || court.sports.length === 0);
//         if (!name.trim() || !location.trim() || hasInvalidCourt || courts.length === 0 || !thumbnail || gallery.length === 0) {
//             setError('Please fill all fields. Each court needs a name and at least one sport.');
//             shakeError();
//             return;
//         }

//         setError('');

//         const payloadCourts = courts.map((court) => ({
//             name: court.name.trim(),
//             pricePerHour: Number(court.pricePerHour || 0),
//             isIndoor: !!court.isIndoor,
//             sports: court.sports,
//         }));

//         const timings = `${formatTime(startTime)} - ${formatTime(endTime)}`;

//         const arenaId = initialData?.id;

//         // Edit mode: update existing arena + sync images
//         if (mode === 'edit' && arenaId) {
//             try {
//                 setLoading(true);
//                 const originalThumbPath = initialData?.user?.image?.path || null;
//                 const originalGallery = initialData?.user?.gallery || [];
//                 const originalPaths = [
//                     originalThumbPath,
//                     ...originalGallery.map(g => g.path),
//                 ].filter(Boolean);

//                 const keptPaths = [];
//                 if (thumbnail && !thumbnail.isLocal && thumbnail.path) {
//                     keptPaths.push(thumbnail.path);
//                 }
//                 gallery.forEach(g => {
//                     if (!g.isLocal && g.path) {
//                         keptPaths.push(g.path);
//                     }
//                 });

//                 const pathsToDelete = originalPaths.filter(p => !keptPaths.includes(p));

//                 const newThumbUri = thumbnail && thumbnail.isLocal ? thumbnail.uri : null;
//                 const newGalleryUris = gallery.filter(g => g.isLocal).map(g => g.uri);

//                 // 1) Update arena core fields
//                 const updateResponse = await fetch(`${API_BASE_URL}/arena/owner/${arenaId}`, {
//                     method: 'PUT',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify({
//                         name,
//                         city: location,
//                         address: location,
//                         pricePerHour: initialData?.user?.pricePerHour || 0,
//                         timing: timings,
//                         courts: payloadCourts,
//                         amenities: [],
//                         description: '',
//                         rules: [],
//                         availability: initialData?.user?.availability || 'available',
//                     }),
//                 });

//                 const updateData = await updateResponse.json();
//                 if (!updateResponse.ok) {
//                     throw new Error(updateData.error || 'Failed to update venue');
//                 }

//                 // 2) Delete removed images (if any)
//                 if (pathsToDelete.length > 0) {
//                     const deleteResponse = await fetch(`${API_BASE_URL}/arena/${arenaId}/images`, {
//                         method: 'DELETE',
//                         headers: {
//                             'Content-Type': 'application/json',
//                         },
//                         body: JSON.stringify({ paths: pathsToDelete }),
//                     });

//                     const deleteData = await deleteResponse.json();
//                     if (!deleteResponse.ok) {
//                         throw new Error(deleteData.error || 'Failed to delete images');
//                     }
//                 }

//                 // 3) Upload any new images
//                 if (newThumbUri || newGalleryUris.length > 0) {
//                     const formData = new FormData();

//                     if (newThumbUri) {
//                         formData.append('thumbnail', {
//                             uri: newThumbUri,
//                             name: 'thumbnail.jpg',
//                             type: 'image/jpeg',
//                         });
//                     }

//                     newGalleryUris.forEach((uri, index) => {
//                         formData.append('gallery', {
//                             uri,
//                             name: `gallery-${index + 1}.jpg`,
//                             type: 'image/jpeg',
//                         });
//                     });

//                     const uploadResponse = await fetch(`${API_BASE_URL}/arena/${arenaId}/images`, {
//                         method: 'POST',
//                         headers: {
//                             'Content-Type': 'multipart/form-data',
//                         },
//                         body: formData,
//                     });

//                     const uploadData = await uploadResponse.json();
//                     if (!uploadResponse.ok) {
//                         throw new Error(uploadData.error || 'Failed to upload images');
//                     }
//                 }

//                 const venueObj = {
//                     id: arenaId,
//                     user: {
//                         name,
//                         location,
//                         image: thumbnail,
//                         gallery,
//                         sports: getAllSports(),
//                         courts,
//                         timings,
//                         rating: initialData?.user?.rating || '5.0',
//                         isAvailable: true,
//                     },
//                 };

//                 onSave(venueObj);
//             } catch (err) {
//                 setError(err.message || 'Something went wrong while updating the venue.');
//                 shakeError();
//             } finally {
//                 setLoading(false);
//             }
//             return;
//         }

//         // Add-mode: create arena in backend, then upload images
//         if (!ownerId) {
//             setError('Owner ID is missing. Please log in again.');
//             shakeError();
//             return;
//         }

//         try {
//             setLoading(true);
//             // 1) Create arena
//             const createResponse = await fetch(`${API_BASE_URL}/arena/create`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     owner_id: ownerId,
//                     name,
//                     city: location,
//                     address: location,
//                     pricePerHour: Number(courts[0]?.pricePerHour || 0),
//                     timing: timings,
//                     courts: payloadCourts,
//                     amenities: [],
//                     description: '',
//                     rules: [],
//                 }),
//             });

//             const createData = await createResponse.json();
//             if (!createResponse.ok) {
//                 throw new Error(createData.error || 'Failed to create venue');
//             }

//             const newArenaId = createData.id;

//             // 2) Upload images (thumbnail + gallery)
//             const formData = new FormData();

//             if (thumbnail) {
//                 formData.append('thumbnail', {
//                     uri: thumbnail.uri,
//                     name: 'thumbnail.jpg',
//                     type: 'image/jpeg',
//                 });
//             }

//             gallery.forEach((g, index) => {
//                 formData.append('gallery', {
//                     uri: g.uri,
//                     name: `gallery-${index + 1}.jpg`,
//                     type: 'image/jpeg',
//                 });
//             });

//             const uploadResponse = await fetch(`${API_BASE_URL}/arena/${newArenaId}/images`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'multipart/form-data',
//                 },
//                 body: formData,
//             });

//             const uploadData = await uploadResponse.json();
//             if (!uploadResponse.ok) {
//                 throw new Error(uploadData.error || 'Failed to upload images');
//             }

//             const venueObj = {
//                 id: newArenaId,
//                 user: {
//                     name,
//                     location,
//                     image: thumbnail,
//                     gallery,
//                     sports: getAllSports(),
//                     courts,
//                     timings,
//                     rating: '5.0',
//                     isAvailable: true,
//                 },
//             };

//             onSave(venueObj);
//         } catch (err) {
//             setError(err.message || 'Something went wrong while creating the venue.');
//             shakeError();
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
//             <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>

//                 {/* Thumbnail */}
//                 <Text style={styles.sectionLabel}>Venue Thumbnail</Text>
//                 <TouchableOpacity
//                     style={styles.imagePickerFrame}
//                     onPress={isReadOnly ? null : pickImage}
//                     disabled={isReadOnly}
//                 >
//                     {thumbnail ? <Image source={{ uri: thumbnail.uri }} style={styles.previewImage} /> : (
//                         <View style={styles.imagePlaceholder}>
//                             <MaterialCommunityIcons name="camera-plus" size={40} color={C.brown + '44'} />
//                         </View>
//                     )}
//                 </TouchableOpacity>

//                 {/* Gallery */}
//                 <Text style={styles.sectionLabel}>Gallery ({gallery.length}/5)</Text>
//                 <View style={styles.galleryContainer}>
//                     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                         {gallery.map((item, index) => (
//                             <View key={index} style={styles.galleryWrapper}>
//                                 <Image source={{ uri: item.uri }} style={styles.galleryImage} />
//                                 {!isReadOnly && (
//                                     <TouchableOpacity style={styles.removeIcon} onPress={() => removeGalleryImage(index)}>
//                                         <MaterialCommunityIcons name="close-circle" size={20} color="red" />
//                                     </TouchableOpacity>
//                                 )}
//                             </View>
//                         ))}
//                         {!isReadOnly && gallery.length < 5 && (
//                             <TouchableOpacity style={styles.addGalleryButton} onPress={pickGalleryImages}>
//                                 <MaterialCommunityIcons name="plus" size={30} color="#888" />
//                             </TouchableOpacity>
//                         )}
//                     </ScrollView>
//                 </View>

//                 <FormInput label="Venue Name" value={name} onChangeText={setName} editable={!isReadOnly} />
//                 <FormInput label="Location" value={location} onChangeText={setLocation} editable={!isReadOnly} />

//                 {/* Operating Hours */}
//                 <View style={styles.inputGroup}>
//                     <Text style={styles.label}>Operating Hours</Text>
//                     <View style={styles.timeRow}>
//                         <TouchableOpacity
//                             style={styles.timeButton}
//                             onPress={() => !isReadOnly && setShowPicker('start')}
//                         >
//                             <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
//                         </TouchableOpacity>
//                         <View style={styles.timeDivider} />
//                         <TouchableOpacity
//                             style={styles.timeButton}
//                             onPress={() => !isReadOnly && setShowPicker('end')}
//                         >
//                             <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
//                         </TouchableOpacity>
//                     </View>
//                 </View>

//                 <View style={styles.inputGroup}>
//                     <View style={styles.courtsHeaderRow}>
//                         <Text style={styles.label}>Courts</Text>
//                         {!isReadOnly && (
//                             <TouchableOpacity onPress={addCourt}>
//                                 <Text style={styles.addCourtText}>+ Add Court</Text>
//                             </TouchableOpacity>
//                         )}
//                     </View>

//                     {courts.map((court, index) => (
//                         <View key={`court-${index}`} style={styles.courtCard}>
//                             <View style={styles.courtCardHeader}>
//                                 <Text style={styles.courtCardTitle}>Court {index + 1}</Text>
//                                 {!isReadOnly && courts.length > 1 && (
//                                     <TouchableOpacity onPress={() => removeCourt(index)}>
//                                         <Text style={styles.removeCourtText}>Remove</Text>
//                                     </TouchableOpacity>
//                                 )}
//                             </View>

//                             <FormInput
//                                 label="Court Name"
//                                 value={court.name}
//                                 onChangeText={(value) => updateCourtField(index, 'name', value)}
//                                 editable={!isReadOnly}
//                             />

//                             <FormInput
//                                 label="Court Price Per Hour"
//                                 value={court.pricePerHour}
//                                 onChangeText={(value) => updateCourtField(index, 'pricePerHour', value)}
//                                 editable={!isReadOnly}
//                                 keyboardType="numeric"
//                             />

//                             <View style={styles.rowBetweenCompact}>
//                                 <Text style={styles.label}>Indoor Court</Text>
//                                 <Switch
//                                     value={court.isIndoor}
//                                     onValueChange={(value) => updateCourtField(index, 'isIndoor', value)}
//                                     disabled={isReadOnly}
//                                     trackColor={{ false: '#ccc', true: C.orange + '88' }}
//                                     thumbColor={court.isIndoor ? C.orange : '#f4f3f4'}
//                                 />
//                             </View>

//                             <SportDropdown
//                                 label="Sports on this court"
//                                 selectedSports={court.sports}
//                                 onToggleSport={(sport) => toggleCourtSport(index, sport)}
//                                 isReadOnly={isReadOnly}
//                             />
//                         </View>
//                     ))}
//                 </View>

//                 {error ? (
//                     <Animated.View style={[styles.errorBox, { transform: [{ translateX: errorShake }] }]}>
//                         <Text style={styles.errorText}>{error}</Text>
//                     </Animated.View>
//                 ) : null}

//                 {mode !== 'view' && (
//                     <TouchableOpacity
//                         style={[styles.saveButton, loading && styles.saveButtonDisabled]}
//                         onPress={handleSave}
//                         disabled={loading}
//                     >
//                         {loading ? (
//                             <ActivityIndicator color={C.white} />
//                         ) : (
//                             <Text style={styles.saveButtonText}>
//                                 {mode === 'add' ? 'Create Venue' : 'Update Venue'}
//                             </Text>
//                         )}
//                     </TouchableOpacity>
//                 )}

//                 {showPicker && (
//                     <DateTimePicker
//                         value={showPicker === 'start' ? startTime : endTime}
//                         mode="time"
//                         onChange={(event, date) => {
//                             setShowPicker(null);
//                             if (date) showPicker === 'start' ? setStartTime(date) : setEndTime(date);
//                         }}
//                     />
//                 )}
//             </ScrollView>
//         </KeyboardAvoidingView>
//     );
// }


// function SubScreenContent({ type, id, data, onBack, venues, setVenues, ownerId, setOwnerBookings }) {
//     const insets = useSafeAreaInsets(); // This gets the status bar height
//     const [selectedVenue, setSelectedVenue] = useState(null);
//     const fadeAnim = useRef(new Animated.Value(0)).current;
//     const slideAnim = useRef(new Animated.Value(20)).current;

//     useEffect(() => {
//         Animated.parallel([
//             Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
//             Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
//         ]).start();
//     }, []);

//     // Helper: Update local venue list
//     const handleSaveVenue = (updatedVenue) => {
//         if (id === '1') { // Add
//             setVenues(prev => [...prev, updatedVenue]);
//         } else { // Update
//             setVenues(prev => prev.map(v => v.id === updatedVenue.id ? updatedVenue : v));
//         }
//         onBack();
//     };

//     const handleRemoveVenue = async (venueId) => {
//         try {
//             const response = await fetch(`${API_BASE_URL}/arena/${venueId}`, {
//                 method: 'DELETE',
//             });

//             const data = await response.json();
//             if (!response.ok) {
//                 throw new Error(data.error || 'Failed to delete venue');
//             }

//             setVenues(prev => prev.filter(v => v.id !== venueId));
//             if (setOwnerBookings) {
//                 setOwnerBookings(prev => (prev || []).filter(b => String(b.arenaId) !== String(venueId)));
//             }
//             onBack();
//         } catch (err) {
//             Alert.alert('Error', err.message || 'Something went wrong while deleting the venue.');
//         }
//     };

//     const handleSelectVenue = async (venue) => {
//         // For update/view, fetch full details including images
//         if (type === 'venue' && (id === '2' || id === '3')) {
//             try {
//                 const response = await fetch(`${API_BASE_URL}/arena/get/${venue.id}`);
//                 const data = await response.json();

//                 if (!response.ok) {
//                     throw new Error(data.error || 'Failed to load venue details');
//                 }

//                 const images = data.images || [];
//                 const thumbPath = images[0] || null;
//                 const galleryPaths = images.slice(1);

//                 const mapped = {
//                     id: data.id,
//                     user: {
//                         name: data.name,
//                         location: data.city,
//                         image: thumbPath
//                             ? { uri: `${API_BASE_URL}${thumbPath}`, path: thumbPath, isLocal: false }
//                             : null,
//                         gallery: galleryPaths.map(p => ({
//                             uri: `${API_BASE_URL}${p}`,
//                             path: p,
//                             isLocal: false,
//                         })),
//                         sports: data.sports || [],
//                         courts: data.courts || [],
//                         timings: data.timing || '',
//                         rating: data.rating != null ? String(data.rating) : '0.0',
//                         isAvailable: data.availability === 'available',
//                         pricePerHour: data.pricePerHour || 0,
//                         availability: data.availability || 'available',
//                     },
//                 };

//                 setSelectedVenue(mapped);
//             } catch (err) {
//                 Alert.alert('Error', err.message || 'Could not load venue details. Please try again.');
//             }
//         } else {
//             setSelectedVenue(venue);
//         }
//     };

//     const renderVenueContent = () => {
//         // Mode 1: Add Venue
//         if (id === '1') {
//             return <AddVenueForm mode="add" onSave={handleSaveVenue} onBack={onBack} ownerId={ownerId} />;
//         }

//         // Mode 2, 3, 4: Requires selection first
//         if (!selectedVenue) {
//             const labels = { '2': 'Update', '3': 'View', '4': 'Remove' };
//             const icons = { '2': 'pencil', '3': 'eye', '4': 'delete' };
//             return (
//                 <VenuePicker
//                     venues={venues}
//                     actionLabel={labels[id]}
//                     icon={icons[id]}
//                     onSelect={handleSelectVenue}
//                 />
//             );
//         }

//         // Once a venue is selected:
//         if (id === '2') return <AddVenueForm mode="edit" initialData={selectedVenue} onSave={handleSaveVenue} onBack={onBack} ownerId={ownerId} />;
//         if (id === '3') return <AddVenueForm mode="view" initialData={selectedVenue} onBack={onBack} ownerId={ownerId} />;
//         if (id === '4') {
//             return (
//                 <View style={styles.formScroll}>
//                     <Text style={styles.headerText}>Are you sure?</Text>
//                     <Text style={[styles.placeholderText, { marginBottom: 30 }]}>
//                         You are about to delete "{selectedVenue.user.name}". This action cannot be undone.
//                     </Text>
//                     <TouchableOpacity
//                         style={[styles.saveButton, { backgroundColor: 'red' }]}
//                         onPress={() => handleRemoveVenue(selectedVenue.id)}
//                     >
//                         <Text style={styles.saveButtonText}>Yes, Delete Venue</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity style={[styles.submitBtn, { backgroundColor: C.bg }]} onPress={() => setSelectedVenue(null)}>
//                         <Text style={[styles.submitBtnText, { color: C.brown }]}>Cancel</Text>
//                     </TouchableOpacity>
//                 </View>
//             );
//         }
//     };

//     const renderBookingContent = () => {
//         if (!data) return null;
//         const { customer, venue, time, status, price, sportName, bookingDate } = data;
//         const isConfirmed = status === 'Confirmed';

//         return (
//             <ScrollView contentContainerStyle={[styles.formScroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>

//                 {/* Status banner */}
//                 <View style={[styles.bookingDetailBanner, { backgroundColor: isConfirmed ? '#E8F5E9' : '#FFF3E0' }]}>
//                     <MaterialCommunityIcons
//                         name={isConfirmed ? 'calendar-check' : 'calendar-clock'}
//                         size={32}
//                         color={isConfirmed ? '#2E7D32' : '#EF6C00'}
//                     />
//                     <View style={{ marginLeft: 14 }}>
//                         <Text style={[styles.bookingDetailBannerStatus, { color: isConfirmed ? '#2E7D32' : '#EF6C00' }]}>
//                             {status}
//                         </Text>
//                         <Text style={styles.bookingDetailBannerSub}>Booking Status</Text>
//                     </View>
//                 </View>

//                 {/* Price highlight */}
//                 <View style={styles.bookingDetailPriceRow}>
//                     <Text style={styles.bookingDetailPriceLabel}>Total Revenue</Text>
//                     <Text style={styles.bookingDetailPrice}>{price}</Text>
//                 </View>

//                 {/* Detail rows */}
//                 <View style={styles.bookingDetailSection}>

//                     <View style={styles.bookingDetailItem}>
//                         <View style={styles.bookingDetailIconWrap}>
//                             <MaterialCommunityIcons name="account-outline" size={18} color={C.orange} />
//                         </View>
//                         <View style={styles.bookingDetailItemText}>
//                             <Text style={styles.bookingDetailItemLabel}>Player</Text>
//                             <Text style={styles.bookingDetailItemValue}>{customer || 'N/A'}</Text>
//                         </View>
//                     </View>

//                     <View style={styles.bookingDetailItem}>
//                         <View style={styles.bookingDetailIconWrap}>
//                             <MaterialCommunityIcons name="map-marker-outline" size={18} color={C.orange} />
//                         </View>
//                         <View style={styles.bookingDetailItemText}>
//                             <Text style={styles.bookingDetailItemLabel}>Venue</Text>
//                             <Text style={styles.bookingDetailItemValue}>{venue}</Text>
//                         </View>
//                     </View>

//                     {sportName && (
//                         <View style={styles.bookingDetailItem}>
//                             <View style={styles.bookingDetailIconWrap}>
//                                 <MaterialCommunityIcons name="basketball-outline" size={18} color={C.orange} />
//                             </View>
//                             <View style={styles.bookingDetailItemText}>
//                                 <Text style={styles.bookingDetailItemLabel}>Sport</Text>
//                                 <Text style={styles.bookingDetailItemValue}>{sportName}</Text>
//                             </View>
//                         </View>
//                     )}

//                     {bookingDate && (
//                         <View style={styles.bookingDetailItem}>
//                             <View style={styles.bookingDetailIconWrap}>
//                                 <MaterialCommunityIcons name="calendar-outline" size={18} color={C.orange} />
//                             </View>
//                             <View style={styles.bookingDetailItemText}>
//                                 <Text style={styles.bookingDetailItemLabel}>Date</Text>
//                                 <Text style={styles.bookingDetailItemValue}>{bookingDate}</Text>
//                             </View>
//                         </View>
//                     )}

//                     <View style={[styles.bookingDetailItem, { borderBottomWidth: 0 }]}>
//                         <View style={styles.bookingDetailIconWrap}>
//                             <MaterialCommunityIcons name="clock-outline" size={18} color={C.orange} />
//                         </View>
//                         <View style={styles.bookingDetailItemText}>
//                             <Text style={styles.bookingDetailItemLabel}>Time Slot</Text>
//                             <Text style={styles.bookingDetailItemValue}>{time}</Text>
//                         </View>
//                     </View>

//                 </View>
//             </ScrollView>
//         );
//     };

//     const renderProfileContent = () => {
//         return (
//             <View style={styles.formScroll}>
//                 <Text style={styles.headerText}>{id}</Text>
//                 <Text style={styles.placeholderText}>Coming soon.</Text>
//             </View>
//         );
//     };

//     return (
//         <Animated.View
//             style={[styles.subScreenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
//         >
//             <View style={styles.subScreenHeader}>
//                 <Text style={styles.subScreenTitle}>
//                     {type === 'venue'
//                         ? (id === '1' ? 'Add Venue' : id === '2' ? 'Update Venue' : id === '3' ? 'Venue Details' : 'Remove Venue')
//                         : type === 'booking'
//                             ? 'Booking Details'
//                             : id}
//                 </Text>
//             </View>
//             {type === 'venue' && renderVenueContent()}
//             {type === 'booking' && renderBookingContent()}
//             {type === 'profile' && renderProfileContent()}
//         </Animated.View>
//     );
// }

// function DashboardScreen({ onActionSelect }) {
//     const menuItems = [
//         { id: '1', title: 'Add Venue', icon: 'plus-circle' },
//         { id: '2', title: 'Update Venue', icon: 'pencil-circle' },
//         { id: '3', title: 'View Venue', icon: 'eye-circle' },
//         { id: '4', title: 'Remove Venue', icon: 'delete-circle' },
//     ];

//     return (
//         <View style={styles.rootbrown}>
//             {/* Background arcs */}
//             <View style={styles.arcContainer} pointerEvents="none">
//                 <View style={styles.arcOuter} />
//                 <View style={styles.arcInner} />
//                 <View style={styles.halfCircle} />
//             </View>

//             <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
//                 <Text style={styles.headerText}>Venue Management</Text>

//                 {menuItems.map((item) => (
//                     <TouchableOpacity
//                         key={item.id}
//                         style={styles.card}
//                         activeOpacity={0.7}
//                         onPress={() => onActionSelect(item.id)}
//                     >
//                         <View style={[styles.iconWrapper, { backgroundColor: C.brown + '15' }]}>
//                             <MaterialCommunityIcons name={item.icon} size={32} color={C.brown} />
//                         </View>

//                         <Text style={styles.cardText}>{item.title}</Text>

//                         <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
//                     </TouchableOpacity>
//                 ))}
//             </ScrollView>
//         </View>
//     );
// }

// function BookingsScreen({ bookings, onBookingSelect }) {
//     // 1. States for filtering
//     const [statusFilter, setStatusFilter] = useState('All');
//     const [venueFilter, setVenueFilter] = useState('All');
//     const [timeFilter, setTimeFilter] = useState('All'); // All, Today, Upcoming

//     // Group raw bookings into Today / Upcoming sections
//     const sections = useMemo(() => {
//         const today = new Date().toISOString().slice(0, 10);
//         const todayItems = [];
//         const upcomingItems = [];

//         (bookings || []).forEach((b) => {
//             // Expect shape from backend: bookingId, arenaName, playerName, bookingDate, startTime, endTime, status, revenue, sportName
//             const id = String(b.bookingId);
//             const customer = b.playerName || 'Player';
//             const venue = b.arenaName;
//             const status = b.status === 'confirmed' || b.status === 'Confirmed' ? 'Confirmed' : 'Pending';
//             const price = b.revenue != null ? `Rs. ${Number(b.revenue).toLocaleString('en-PK')}` : 'Rs. 0';
//             const time = `${b.startTime?.slice(0, 5)} - ${b.endTime?.slice(0, 5)}`;
//             const item = { id, customer, venue, status, price, time, sportName: b.sportName, bookingDate: b.bookingDate };

//             if (b.bookingDate === today) todayItems.push(item);
//             else upcomingItems.push(item);
//         });

//         const result = [];
//         if (todayItems.length) result.push({ title: 'Today', data: todayItems });
//         if (upcomingItems.length) result.push({ title: 'Upcoming', data: upcomingItems });
//         return result;
//     }, [bookings]);

//     // 2. Extract unique venues for the filter list
//     const uniqueVenues = ['All', ...new Set(sections.flatMap(s => s.data.map(b => b.venue)))];
//     const statuses = ['All', 'Confirmed', 'Pending'];
//     const timeOptions = ['All', 'Today', 'Upcoming'];

//     // 3. Filter Logic
//     const filteredSections = useMemo(() => {
//         return sections.map(section => {
//             // Check if this section matches the Time Filter
//             if (timeFilter !== 'All' && section.title !== timeFilter) {
//                 return { ...section, data: [] };
//             }

//             const filteredData = section.data.filter(booking => {
//                 const statusMatch = statusFilter === 'All' || booking.status === statusFilter;
//                 const venueMatch = venueFilter === 'All' || booking.venue === venueFilter;
//                 return statusMatch && venueMatch;
//             });

//             return { ...section, data: filteredData };
//         }).filter(section => section.data.length > 0); // Hide empty sections
//     }, [statusFilter, venueFilter, timeFilter]);

//     // UI Component for Filter Chips
//     const FilterGroup = ({ label, options, current, setter, icon }) => (
//         <View style={styles.filterGroup}>
//             <View style={styles.filterLabelRow}>
//                 <MaterialCommunityIcons name={icon} size={14} color={C.white} />
//                 <Text style={styles.filterGroupLabel}>{label}</Text>
//             </View>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
//                 {options.map(opt => (
//                     <TouchableOpacity
//                         key={opt}
//                         onPress={() => setter(opt)}
//                         style={[styles.filterChip, current === opt && styles.filterChipActive]}
//                     >
//                         <Text style={[styles.filterChipText, current === opt && styles.filterChipTextActive]}>
//                             {opt}
//                         </Text>
//                     </TouchableOpacity>
//                 ))}
//             </ScrollView>
//         </View>
//     );

//     const renderBookingCard = ({ item }) => (
//         <TouchableOpacity
//             style={styles.bookingCard}
//             activeOpacity={0.8}
//             onPress={() => onBookingSelect(item)} // Trigger selection
//         >
//             <View style={styles.bookingInfo}>
//                 <View style={styles.bookingHeader}>
//                     <Text style={styles.bookingCustomer}>{item.customer}</Text>
//                     <View style={[styles.statusBadge, { backgroundColor: item.status === 'Confirmed' ? '#E8F5E9' : '#FFF3E0' }]}>
//                         <Text style={[styles.statusText, { color: item.status === 'Confirmed' ? '#2E7D32' : '#EF6C00' }]}>
//                             {item.status}
//                         </Text>
//                     </View>
//                 </View>
//                 <View style={styles.bookingDetailRow}>
//                     <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.brown + '99'} />
//                     <Text style={styles.bookingDetailText}>{item.venue}</Text>
//                 </View>
//                 <View style={styles.bookingDetailRow}>
//                     <MaterialCommunityIcons name="clock-outline" size={14} color={C.orange} />
//                     <Text style={styles.bookingTimeText}>{item.time}</Text>
//                 </View>
//             </View>
//             <View style={styles.bookingPriceAction}>
//                 <Text style={styles.bookingPrice}>{item.price}</Text>
//                 <MaterialCommunityIcons name="chevron-right" size={20} color={C.brown + '44'} />
//             </View>
//         </TouchableOpacity>
//     );

//     return (
//         <View style={styles.rootbrown}>
//             <View style={styles.arcContainer} pointerEvents="none">
//                 <View style={styles.arcOuter} />
//                 <View style={styles.arcInner} />
//             </View>

//             {/* --- Filter Bar Area --- */}
//             <View style={styles.filterContainer}>
//                 <FilterGroup label="Status" options={statuses} current={statusFilter} setter={setStatusFilter} icon="filter-variant" />
//                 <FilterGroup label="Venues" options={uniqueVenues} current={venueFilter} setter={setVenueFilter} icon="stadium" />
//                 <FilterGroup label="Time" options={timeOptions} current={timeFilter} setter={setTimeFilter} icon="calendar-clock" />
//             </View>

//             <SectionList
//                 showsVerticalScrollIndicator={false}
//                 sections={filteredSections}
//                 keyExtractor={(item) => item.id}
//                 contentContainerStyle={styles.bookingListContent}
//                 renderSectionHeader={({ section: { title } }) => (
//                     <View style={styles.sectionHeaderContainer}>
//                         <View style={styles.sectionLine} />
//                         <Text style={styles.sectionTitle}>{title}</Text>
//                         <View style={styles.sectionLine} />
//                     </View>
//                 )}
//                 renderItem={renderBookingCard}
//                 ListEmptyComponent={
//                     <View style={styles.emptyState}>
//                         <MaterialCommunityIcons name="calendar-search" size={60} color={C.white + '33'} />
//                         <Text style={styles.emptyStateText}>No bookings match these filters</Text>
//                     </View>
//                 }
//             />
//         </View>
//     );
// }

// function ProfileScreen({ onLogout, user, onMenuSelect }) {
//     const stats = [
//         { label: 'Following', value: '138' },
//         { label: 'Followers', value: '91' },
//     ];

//     const menuItems = [
//         { icon: 'account-edit-outline', label: 'Edit Profile' },
//         { icon: 'bell-outline', label: 'Notifications' },
//         { icon: 'help-circle-outline', label: 'Help & Support' },
//     ];

//     return (
//         <View style={styles.rootwhite}>
//             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
//                 {/* Profile hero */}
//                 <View style={styles.profileHero}>
//                     <View style={styles.profileAvatarWrap}>
//                         <View style={styles.profileAvatar}>
//                             <Text style={styles.profileAvatarText}>
//                                 {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
//                             </Text>
//                         </View>
//                         <TouchableOpacity style={styles.profileAvatarEdit}>
//                             <MaterialCommunityIcons name="camera" size={14} color={C.white} />
//                         </TouchableOpacity>
//                     </View>
//                     <Text style={styles.profileName}>{user?.name || 'Alleyoop User'}</Text>
//                     <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
//                     <View style={styles.profileBadge}>
//                         <MaterialCommunityIcons name="stadium" size={12} color={C.orange} />
//                         <Text style={styles.profileBadgeText}>{user?.userType || 'Owner'}</Text>
//                     </View>
//                 </View>

//                 {/* Stats row */}
//                 <View style={styles.statsRow}>
//                     {stats.map((s, i) => (
//                         <React.Fragment key={s.label}>
//                             <View style={styles.statItem}>
//                                 <Text style={styles.statValue}>{s.value}</Text>
//                                 <Text style={styles.statLabel}>{s.label}</Text>
//                             </View>
//                             {i < stats.length - 1 && <View style={styles.statDivider} />}
//                         </React.Fragment>
//                     ))}
//                 </View>

//                 {/* Menu items */}
//                 <View style={styles.menuSection}>
//                     {menuItems.map((item, i) => (
//                         <TouchableOpacity
//                             key={item.label}
//                             style={styles.menuItem}
//                             activeOpacity={0.7}
//                             onPress={() => onMenuSelect(item.label)} // Trigger selection
//                         >
//                             <View style={styles.menuIconWrap}>
//                                 <MaterialCommunityIcons name={item.icon} size={20} color={C.orange} />
//                             </View>
//                             <Text style={styles.menuLabel}>{item.label}</Text>
//                             <MaterialCommunityIcons name="chevron-right" size={20} color={C.brown + '55'} />
//                         </TouchableOpacity>
//                     ))}
//                 </View>

//                 {/* Logout */}
//                 <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
//                     <MaterialCommunityIcons name="logout" size={18} color={C.orange} />
//                     <Text style={styles.logoutText}>Log Out</Text>
//                 </TouchableOpacity>
//             </ScrollView>
//         </View>
//     );
// }

// // ─── Main HomeScreen ──────────────────────────────────────────────────────────

// export function OwnerHomeScreen({ user, onLogout }) {
//     const insets = useSafeAreaInsets(); // This gets the status bar height
//     const [activeTab, setActiveTab] = useState(0);
//     // Tracks { type: 'venue'|'booking'|'profile', id: string, data: any }
//     const [activeSubScreen, setActiveSubScreen] = useState(null);
//     const translateX = useRef(new Animated.Value(0)).current;
//     const swipeStartX = useRef(0);
//     // Shared state for all venues (placeholder data — swap for backend fetch when ready)
//     const [venues, setVenues] = useState(INITIAL_VENUES);
//     // Bookings for this owner (placeholder data — swap for backend fetch when ready)
//     const [ownerBookings, setOwnerBookings] = useState(INITIAL_BOOKINGS);

//     const goToTab = useCallback((index) => {
//         setActiveSubScreen(null); // Reset when switching tabs
//         setActiveTab(index);
//         Animated.spring(translateX, {
//             toValue: -index * width,
//             useNativeDriver: true,
//             tension: 80,
//             friction: 12,
//         }).start();
//     }, []);

//     const panResponder = useRef(
//         PanResponder.create({
//             onMoveShouldSetPanResponder: (_, g) =>
//                 Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
//             onPanResponderGrant: (_, g) => {
//                 swipeStartX.current = g.x0;
//             },
//             onPanResponderRelease: (_, g) => {
//                 if (g.dx < -50) {
//                     setActiveTab(prev => {
//                         const next = Math.min(prev + 1, TABS.length - 1);
//                         Animated.spring(translateX, { toValue: -next * width, useNativeDriver: true, tension: 80, friction: 12 }).start();
//                         return next;
//                     });
//                 } else if (g.dx > 50) {
//                     setActiveTab(prev => {
//                         const next = Math.max(prev - 1, 0);
//                         Animated.spring(translateX, { toValue: -next * width, useNativeDriver: true, tension: 80, friction: 12 }).start();
//                         return next;
//                     });
//                 }
//             },
//         })
//     ).current;

//     const currentTab = TABS[activeTab];

//     const tabContent = [
//         <DashboardScreen
//             key="dashboard"
//             onActionSelect={(id) => setActiveSubScreen({ type: 'venue', id })}
//         />,
//         <BookingsScreen
//             key="bookings"
//             bookings={ownerBookings}
//             onBookingSelect={(booking) => setActiveSubScreen({ type: 'booking', id: booking.id, data: booking })}
//         />,
//         <ProfileScreen
//             key="profile"
//             user={user}
//             onLogout={onLogout}
//             onMenuSelect={(label) => setActiveSubScreen({ type: 'profile', id: label })}
//         />,
//     ];

//     return (
//         <View style={[styles.rootwhite, { paddingTop: insets.top }]}>
//             {/* Set translucent to true so the background color can sit behind the status bar icons */}
//             <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

//             {/* ── Top bar ── */}
//             <View style={styles.topBar}>

//                 {/* LEFT SIDE: Conditional Tab Label or Back Button */}
//                 <View style={styles.topBarSide}>
//                     {activeSubScreen ? (
//                         <TouchableOpacity
//                             style={styles.headerBackButton}
//                             onPress={() => setActiveSubScreen(null)}
//                         >
//                             <MaterialCommunityIcons name="chevron-left" size={28} color={C.brown} />
//                             <Text style={styles.headerBackText}>Back</Text>
//                         </TouchableOpacity>
//                     ) : (
//                         <Text
//                             style={styles.topBarTitle}
//                             numberOfLines={1}
//                             adjustsFontSizeToFit
//                             minimumFontScale={0.8}
//                         >
//                             {currentTab.label}
//                         </Text>
//                     )}
//                 </View>

//                 {/* Center Side: Logo */}
//                 <View style={styles.topBarCenter}>
//                     <Image
//                         source={require('../../../assets/top-minimal.png')}
//                         style={styles.logoImage}
//                         resizeMode="contain"
//                     />
//                 </View>

//                 {/* Right Side: Action Button */}
//                 <View style={styles.topBarSide}>
//                     {/* Hide search if a subscreen is open */}
//                     {!activeSubScreen && (
//                         <TouchableOpacity
//                             style={styles.topBarAction}
//                             onPress={activeTab === 2 ? onLogout : () => { }}
//                         >
//                             <MaterialCommunityIcons
//                                 name={activeTab < 2 ? "magnify" : "logout"}
//                                 size={26}
//                                 color={activeTab < 2 ? C.brown : C.orange}
//                             />
//                         </TouchableOpacity>
//                     )}
//                 </View>
//             </View>

//             {/* Conditional Main Body */}
//             {activeSubScreen ? (
//                 <SubScreenContent
//                     type={activeSubScreen.type}
//                     id={activeSubScreen.id}
//                     data={activeSubScreen.data}
//                     venues={venues}
//                     setVenues={setVenues}
//                     ownerId={user?.userId}
//                     setOwnerBookings={setOwnerBookings}
//                     onBack={() => setActiveSubScreen(null)}
//                 />
//             ) : (
//                 <>
//                     <View style={styles.contentArea} {...panResponder.panHandlers}>
//                         <Animated.View style={[styles.tabsStrip, { transform: [{ translateX }] }]}>
//                             {tabContent.map((screen, i) => (
//                                 <View key={i} style={styles.tabPane}>{screen}</View>
//                             ))}
//                         </Animated.View>
//                     </View>

//                     {/* Bottom Nav */}
//                     <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
//                         {TABS.map((tab, i) => {
//                             const isActive = activeTab === i;
//                             return (
//                                 <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => goToTab(i)}>
//                                     <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
//                                         <MaterialCommunityIcons
//                                             name={isActive ? tab.activeIcon : tab.icon}
//                                             size={24}
//                                             color={isActive ? C.white : C.brown + '66'}
//                                         />
//                                     </View>
//                                     <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
//                                 </TouchableOpacity>
//                             );
//                         })}
//                     </View>
//                 </>
//             )}

//         </View>
//     );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────

// const styles = StyleSheet.create({
//     root: {
//         flex: 1,
//         backgroundColor: C.brown,
//     },
//     rootbrown: {
//         flex: 1,
//         backgroundColor: C.brown,
//     },
//     rootwhite: {
//         flex: 1,
//         backgroundColor: C.white,
//     },

//     arcContainer: {
//         ...StyleSheet.absoluteFillObject,
//         overflow: 'hidden',
//     },
//     arcOuter: {
//         position: 'absolute',
//         top: -width * 0.35,
//         right: -width * 0.35,
//         width: width * 0.9,
//         height: width * 0.9,
//         borderRadius: width * 0.45,
//         borderWidth: 40,
//         borderColor: C.orange + '1A',
//     },
//     arcInner: {
//         position: 'absolute',
//         top: -width * 0.1,
//         right: -width * 0.15,
//         width: width * 0.55,
//         height: width * 0.55,
//         borderRadius: width * 0.275,
//         borderWidth: 20,
//         borderColor: C.brown + '12',
//     },
//     halfCircle: {
//         position: 'absolute',
//         bottom: -width * 0.5,
//         left: -width * 0.1,
//         width: width * 0.8,
//         height: width * 0.8,
//         borderRadius: width * 0.4,
//         borderWidth: 32,
//         borderColor: C.orange + '10',
//     },

//     // ── Top bar ────────────────────────────────────────────────────────────────
//     topBar: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 16,
//         backgroundColor: C.white,
//         borderBottomWidth: 1,
//         borderBottomColor: C.border,
//         height: 60,
//         paddingBottom: 5,
//     },
//     topBarSide: {
//         width: 92,
//         justifyContent: 'center',
//     },
//     topBarCenter: {
//         flex: 1,
//         alignItems: 'center',
//     },
//     topBarTitle: {
//         fontSize: 16,
//         fontWeight: '800',
//         color: C.brown,
//         flexShrink: 1,
//     },
//     logoImage: {
//         width: 120,
//         height: 40,
//     },
//     topBarAction: {
//         alignItems: 'flex-end',
//     },
//     headerBackButton: {
//         flexDirection: 'row', // Horizontal layout
//         alignItems: 'center', // Vertical centering
//         marginLeft: -10,      // Nudge left so the icon arrow sits near the edge
//     },
//     headerBackText: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: C.brown,
//         marginLeft: -6,       // Pull text closer to the icon for a tighter look
//     },

//     // ── Content ────────────────────────────────────────────────────────────────
//     contentArea: {
//         flex: 1,
//         overflow: 'hidden',
//     },
//     tabsStrip: {
//         flexDirection: 'row',
//         width: width * TABS.length,
//         flex: 1,
//     },
//     tabPane: {
//         width,
//         flex: 1,
//     },

//     // ── Dashboard Card Styles ──────────────────────────────────────────────────────
//     scrollContent: {
//         paddingTop: 80,
//         paddingHorizontal: 20,
//         paddingBottom: 40,
//     },
//     headerText: {
//         color: '#FFF',
//         fontSize: 24,
//         fontWeight: 'bold',
//         marginBottom: 30,
//         textAlign: 'center',
//     },
//     card: {
//         backgroundColor: '#FFFFFF',
//         flexDirection: 'row', // Aligns icon and text horizontally inside the card
//         alignItems: 'center',
//         padding: 20,
//         borderRadius: 20,
//         marginBottom: 15,
//         // Shadow for iOS
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.1,
//         shadowRadius: 8,
//         // Elevation for Android
//         elevation: 4,
//     },
//     iconWrapper: {
//         width: 50,
//         height: 50,
//         borderRadius: 15,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 15,
//     },
//     cardText: {
//         flex: 1, // Takes up remaining space
//         fontSize: 18,
//         fontWeight: '600',
//         color: C.orange,
//     },

//     // ── Profile ────────────────────────────────────────────────────────────────
//     profileHero: {
//         alignItems: 'center',
//         paddingTop: 32,
//         paddingBottom: 24,
//         backgroundColor: C.white,
//         borderBottomWidth: 1,
//         borderBottomColor: C.border,
//     },
//     profileAvatarWrap: {
//         position: 'relative',
//         marginBottom: 14,
//     },
//     profileAvatar: {
//         width: 88,
//         height: 88,
//         borderRadius: 44,
//         backgroundColor: C.brown,
//         alignItems: 'center',
//         justifyContent: 'center',
//         borderWidth: 3,
//         borderColor: C.orange,
//     },
//     profileAvatarText: {
//         fontSize: 36,
//         fontWeight: '900',
//         color: C.cream,
//     },
//     profileAvatarEdit: {
//         position: 'absolute',
//         bottom: 0,
//         right: 0,
//         width: 28,
//         height: 28,
//         borderRadius: 14,
//         backgroundColor: C.orange,
//         alignItems: 'center',
//         justifyContent: 'center',
//         borderWidth: 2,
//         borderColor: C.white,
//     },
//     profileName: {
//         fontSize: 20,
//         fontWeight: '900',
//         color: C.brown,
//         letterSpacing: -0.5,
//     },
//     profileEmail: {
//         fontSize: 13,
//         color: C.mutedText,
//         marginTop: 3,
//     },
//     profileBadge: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 5,
//         marginTop: 10,
//         backgroundColor: C.bg,
//         paddingHorizontal: 12,
//         paddingVertical: 5,
//         borderRadius: 20,
//     },
//     profileBadgeText: {
//         fontSize: 12,
//         fontWeight: '700',
//         color: C.brown,
//         textTransform: 'capitalize',
//     },
//     statsRow: {
//         flexDirection: 'row',
//         backgroundColor: C.white,
//         paddingVertical: 20,
//         marginTop: 2,
//         borderBottomWidth: 1,
//         borderBottomColor: C.border,
//     },
//     statItem: {
//         flex: 1,
//         alignItems: 'center',
//     },
//     statValue: {
//         fontSize: 20,
//         fontWeight: '900',
//         color: C.brown,
//     },
//     statLabel: {
//         fontSize: 12,
//         color: C.mutedText,
//         marginTop: 2,
//         fontWeight: '500',
//     },
//     statDivider: {
//         width: 1,
//         backgroundColor: C.border,
//         marginVertical: 4,
//     },
//     menuSection: {
//         marginTop: 12,
//         backgroundColor: C.white,
//         borderTopWidth: 1,
//         borderBottomWidth: 1,
//         borderColor: C.border,
//     },
//     menuItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 20,
//         paddingVertical: 15,
//         borderBottomWidth: 1,
//         borderBottomColor: C.border,
//         gap: 14,
//     },
//     menuIconWrap: {
//         width: 36,
//         height: 36,
//         borderRadius: 10,
//         backgroundColor: C.bg,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     menuLabel: {
//         flex: 1,
//         fontSize: 15,
//         color: C.brown,
//         fontWeight: '500',
//     },
//     logoutBtn: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         gap: 10,
//         marginHorizontal: 24,
//         marginTop: 24,
//         paddingVertical: 15,
//         borderRadius: 14,
//         borderWidth: 2,
//         borderColor: C.orange + '55',
//         backgroundColor: '#FFF5EF',
//     },
//     logoutText: {
//         fontSize: 15,
//         fontWeight: '800',
//         color: C.orange,
//         letterSpacing: 0.5,
//     },

//     // ── Bottom nav ─────────────────────────────────────────────────────────────
//     bottomNav: {
//         flexDirection: 'row',
//         backgroundColor: C.white,
//         borderTopWidth: 1,
//         borderTopColor: C.border,
//         paddingBottom: Platform.OS === 'ios' ? 20 : 8,
//         paddingTop: 8,
//         paddingHorizontal: 8,
//     },
//     navItem: {
//         flex: 1,
//         alignItems: 'center',
//         gap: 4,
//     },
//     navIconWrap: {
//         width: 44,
//         height: 30,
//         borderRadius: 15,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     navIconWrapActive: {
//         backgroundColor: C.brown,
//         width: 52,
//         borderRadius: 16,
//     },
//     navLabel: {
//         fontSize: 10,
//         fontWeight: '600',
//         color: C.brown + '66',
//         letterSpacing: 0.3,
//     },
//     navLabelActive: {
//         color: C.orange,
//         fontWeight: '800',
//     },

//     // ── Bookings Section Styles ────────────────────────────────────────────────
//     bookingListContent: {
//         paddingHorizontal: 20,
//         paddingBottom: 120,
//     },
//     sectionHeaderContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginVertical: 15,
//         marginTop: 25,
//     },
//     sectionTitle: {
//         color: C.white,
//         fontSize: 16,
//         fontWeight: '800',
//         marginHorizontal: 15,
//         textTransform: 'uppercase',
//         letterSpacing: 1,
//     },
//     sectionLine: {
//         flex: 1,
//         height: 1,
//         backgroundColor: C.white + '33',
//     },
//     bookingCard: {
//         backgroundColor: C.white,
//         borderRadius: 18,
//         padding: 16,
//         marginBottom: 12,
//         flexDirection: 'row',
//         alignItems: 'center',
//         // Elevation
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     bookingInfo: {
//         flex: 1,
//     },
//     bookingHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 8,
//     },
//     bookingCustomer: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: C.brown,
//     },
//     statusBadge: {
//         paddingHorizontal: 8,
//         paddingVertical: 4,
//         borderRadius: 8,
//     },
//     statusText: {
//         fontSize: 10,
//         fontWeight: '800',
//         textTransform: 'uppercase',
//     },
//     bookingDetailRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 4,
//         gap: 6,
//     },
//     bookingDetailText: {
//         fontSize: 14,
//         color: C.brown + '99',
//     },
//     bookingTimeText: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: C.brown,
//     },
//     bookingPriceAction: {
//         alignItems: 'flex-end',
//         gap: 8,
//         marginLeft: 10,
//     },
//     bookingPrice: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: C.orange,
//     },

//     // ── Filter Styles ────────────────────────────────────────────────────────
//     filterContainer: {
//         backgroundColor: C.brown,
//         paddingBottom: 15,
//         paddingTop: 10,
//         borderBottomWidth: 1,
//         borderBottomColor: C.white + '1A',
//     },
//     filterGroup: {
//         marginBottom: 8,
//     },
//     filterLabelRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 20,
//         gap: 5,
//         marginBottom: 8,
//     },
//     filterGroupLabel: {
//         color: C.white,
//         fontSize: 12,
//         fontWeight: '700',
//         opacity: 0.6,
//         textTransform: 'uppercase',
//     },
//     filterScroll: {
//         paddingHorizontal: 20,
//         gap: 8,
//     },
//     filterChip: {
//         paddingHorizontal: 16,
//         paddingVertical: 6,
//         borderRadius: 20,
//         backgroundColor: C.white + '1A',
//         borderWidth: 1,
//         borderColor: C.white + '1A',
//     },
//     filterChipActive: {
//         backgroundColor: C.orange,
//         borderColor: C.orange,
//     },
//     filterChipText: {
//         color: C.white,
//         fontSize: 13,
//         fontWeight: '600',
//     },
//     filterChipTextActive: {
//         color: C.white,
//     },

//     // ── Empty State ──────────────────────────────────────────────────────────
//     emptyState: {
//         alignItems: 'center',
//         marginTop: 60,
//     },
//     emptyStateText: {
//         color: C.white + '88',
//         fontSize: 16,
//         marginTop: 15,
//     },

//     // ── Subscreen ──────────────────────────────────────────────────────────

//     subScreenContainer: {
//         flex: 1,
//         backgroundColor: C.white,
//     },
//     subScreenHeader: {
//         padding: 20,
//         borderBottomWidth: 1,
//         borderBottomColor: C.border,
//         backgroundColor: C.brown,
//     },
//     backButton: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 10,
//         gap: 5,
//     },
//     backText: {
//         color: C.brown,
//         fontWeight: '600',
//     },
//     subScreenTitle: {
//         fontSize: 22,
//         fontWeight: '800',
//         color: C.orange,
//     },
//     formContainer: { flex: 1, backgroundColor: 'transparent' },
//     formScroll: { padding: 20, paddingBottom: 10 },
//     sectionLabel: { fontSize: 13, fontWeight: '800', color: C.brown, marginBottom: 10, textTransform: 'uppercase' },
//     imagePickerFrame: { width: '100%', height: 180, borderRadius: 16, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 25 },
//     previewImage: { width: '100%', height: '100%' },
//     imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//     inputGroup: { marginBottom: 20 },
//     label: { fontSize: 15, fontWeight: '700', color: C.brown, marginBottom: 8 },
//     subLabel: { fontSize: 12, color: C.mutedText },
//     input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: C.brown },
//     placeholderText: { color: C.brown + '66', fontWeight: '500' },

//     // Dropdown
//     dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 15, paddingTop: -20 },
//     dropdownHeaderText: { color: C.brown, fontWeight: '600' },
//     dropdownList: { marginTop: 5, backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
//     sportItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: C.border },
//     sportItemActive: { backgroundColor: C.orange },
//     sportItemText: { color: C.brown, fontWeight: '500' },
//     sportItemTextActive: { color: C.white, fontWeight: '700' },

//     // Time
//     timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: C.border },
//     timeButton: { flex: 1, padding: 12, alignItems: 'center' },
//     timeLabel: { fontSize: 10, color: C.mutedText, textTransform: 'uppercase', marginBottom: 2 },
//     timeValue: { fontSize: 16, fontWeight: '700', color: C.brown },
//     timeDivider: { width: 1, height: 30, backgroundColor: C.border },

//     courtsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
//     addCourtText: { color: C.orange, fontWeight: '800' },
//     courtCard: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 12 },
//     courtCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
//     courtCardTitle: { color: C.brown, fontWeight: '800', fontSize: 15 },
//     removeCourtText: { color: '#C23B22', fontWeight: '700' },
//     rowBetweenCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },

//     rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: 30 },
//     saveButton: { backgroundColor: C.brown, borderRadius: 14, paddingVertical: 16, alignItems: 'center', elevation: 4 },
//     saveButtonDisabled: { opacity: 0.7 },
//     saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

//     // Gallery
//     galleryContainer: {
//         flexDirection: 'row',
//         marginBottom: 20,
//     },
//     galleryWrapper: {
//         position: 'relative',
//         marginRight: 12,
//     },
//     galleryImage: {
//         width: 100,
//         height: 100,
//         borderRadius: 12,
//         backgroundColor: '#eee'
//     },
//     removeIcon: {
//         position: 'absolute',
//         top: -5,
//         right: -5,
//         backgroundColor: 'white',
//         borderRadius: 12,
//         marginTop: 4,
//         marginRight: 4,
//     },
//     addGalleryButton: {
//         width: 100,
//         height: 100,
//         borderRadius: 12,
//         borderWidth: 1,
//         borderStyle: 'dashed',
//         borderColor: '#ccc',
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: C.bg
//     },
//     // imagePickerFrame: {
//     //     width: '100%',
//     //     height: 180,
//     //     borderRadius: 15,
//     //     overflow: 'hidden',
//     //     backgroundColor: '#f0f0f0',
//     // },
//     previewImage: {
//         width: '100%',
//         height: '100%',
//     },

//     placeholderForm: {
//         paddingTop: 10,
//         justifyContent: 'center',
//     },
//     placeholderText: {
//         marginTop: 20,
//         fontSize: 16,
//         color: C.mutedText,
//         textAlign: 'center',
//     },
//     submitBtn: {
//         marginTop: 40,
//         backgroundColor: C.brown,
//         paddingHorizontal: 40,
//         paddingVertical: 15,
//         borderRadius: 12,
//         width: '100%',
//         alignItems: 'center',
//     },
//     submitBtnText: {
//         color: C.white,
//         fontWeight: 'bold',
//         fontSize: 16,
//     },

//     divider: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 20,
//         marginBottom: 4,
//     },
//     dividerLine: {
//         flex: 1,
//         height: 1,
//         backgroundColor: C.brown + '22',
//     },
//     dividerText: {
//         color: C.brown + '66',
//         fontSize: 12,
//         fontWeight: '600',
//         marginHorizontal: 12,
//         letterSpacing: 1,
//     },
//     errorBox: {
//         marginTop: 8,
//         marginBottom: 10,
//         backgroundColor: '#FFF0EB',
//         borderLeftWidth: 4,
//         borderLeftColor: C.orange,
//         borderRadius: 10,
//         paddingVertical: 10,
//         paddingHorizontal: 14,
//     },
//     errorText: {
//         color: C.orange,
//         fontSize: 13,
//         fontWeight: '600',
//     },

//     // ── Booking Detail Subscreen ───────────────────────────────────────────────
//     bookingDetailBanner: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         borderRadius: 16,
//         padding: 20,
//         marginBottom: 20,
//     },
//     bookingDetailBannerStatus: {
//         fontSize: 18,
//         fontWeight: '900',
//         textTransform: 'uppercase',
//         letterSpacing: 0.5,
//     },
//     bookingDetailBannerSub: {
//         fontSize: 12,
//         color: C.mutedText,
//         marginTop: 2,
//         fontWeight: '500',
//     },
//     bookingDetailPriceRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         backgroundColor: C.bg,
//         borderRadius: 14,
//         paddingHorizontal: 20,
//         paddingVertical: 16,
//         marginBottom: 20,
//     },
//     bookingDetailPriceLabel: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: C.mutedText,
//     },
//     bookingDetailPrice: {
//         fontSize: 22,
//         fontWeight: '900',
//         color: C.orange,
//     },
//     bookingDetailSection: {
//         backgroundColor: C.white,
//         borderRadius: 16,
//         borderWidth: 1,
//         borderColor: C.border,
//         overflow: 'hidden',
//     },
//     bookingDetailItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 18,
//         paddingVertical: 16,
//         borderBottomWidth: 1,
//         borderBottomColor: C.border,
//         gap: 14,
//     },
//     bookingDetailIconWrap: {
//         width: 36,
//         height: 36,
//         borderRadius: 10,
//         backgroundColor: C.bg,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     bookingDetailItemText: {
//         flex: 1,
//     },
//     bookingDetailItemLabel: {
//         fontSize: 12,
//         fontWeight: '600',
//         color: C.mutedText,
//         textTransform: 'uppercase',
//         letterSpacing: 0.4,
//         marginBottom: 3,
//     },
//     bookingDetailItemValue: {
//         fontSize: 15,
//         fontWeight: '700',
//         color: C.brown,
//     },
// });

// export default OwnerHomeScreen;