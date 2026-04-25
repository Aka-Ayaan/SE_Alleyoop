import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
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
    Alert,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

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
    { id: 'trainings', label: 'Trainings', icon: 'clipboard-text-outline', activeIcon: 'clipboard-text' },
    { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

const SESSION_TYPE_OPTIONS = [
    'Private Session',
    'Group Clinic',
    'Strength & Conditioning',
    'Basketball Skills',
    'Football Drills',
    'Speed & Agility',
    'Nutrition Coaching',
];

// ─── Placeholder data ─────────────────────────────────────────────────────────

const INITIAL_TRAININGS = [
    {
        id: 't1',
        title: 'Private Basketball Session',
        type: 'Private Session',
        coach: 'Coach Salman',
        pricePerSession: '3500',
        duration: '60',
        description: 'One-on-one basketball skills training covering dribbling, shooting, and court vision.',
        isAvailable: true,
        thumbnail: { uri: 'https://images.unsplash.com/photo-1546519638405-a9e517f3b2a8?w=400' },
        gallery: [],
    },
    {
        id: 't2',
        title: 'Group Fitness Clinic',
        type: 'Group Clinic',
        coach: 'Coach Maria',
        pricePerSession: '1500',
        duration: '90',
        description: 'High-intensity group clinic focused on conditioning and team drills.',
        isAvailable: true,
        thumbnail: { uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400' },
        gallery: [],
    },
    {
        id: 't3',
        title: 'Strength & Conditioning',
        type: 'Strength & Conditioning',
        coach: 'Coach Alex',
        pricePerSession: '2000',
        duration: '60',
        description: 'Sport-specific strength training to boost athletic performance.',
        isAvailable: false,
        thumbnail: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
        gallery: [],
    },
];

const SESSIONS_DATA = [
    {
        title: 'Today',
        data: [
            { id: 's1', trainee: 'Ahmed Khan', time: '04:00 PM - 05:00 PM', coach: 'Coach Salman', type: 'Private Session', status: 'Confirmed', price: 'Rs. 3,500' },
            { id: 's2', trainee: 'Sara Williams', time: '06:00 PM - 07:30 PM', coach: 'Coach Maria', type: 'Group Clinic', status: 'Confirmed', price: 'Rs. 1,500' },
        ],
    },
    {
        title: 'Upcoming',
        data: [
            { id: 's3', trainee: 'Zain Malik', time: 'Oct 24, 05:00 PM', coach: 'Coach Salman', type: 'Strength & Conditioning', status: 'Pending', price: 'Rs. 2,000' },
            { id: 's4', trainee: 'Hamza Ali', time: 'Oct 25, 08:00 PM', coach: 'Coach Alex', type: 'Basketball Skills', status: 'Confirmed', price: 'Rs. 3,000' },
            { id: 's5', trainee: 'Omar J.', time: 'Oct 26, 06:00 PM', coach: 'Coach Maria', type: 'Private Session', status: 'Confirmed', price: 'Rs. 3,500' },
        ],
    },
];

// ─── Shared Form Components ───────────────────────────────────────────────────

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

const SessionTypeDropdown = memo(({ selectedType, onSelectType, isReadOnly, label = 'Session Type' }) => {
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
                <Text style={selectedType ? styles.dropdownHeaderText : styles.placeholderText}>
                    {selectedType || 'Choose a session type...'}
                </Text>
                <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={C.brown}
                />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownList}>
                    {SESSION_TYPE_OPTIONS.map(type => {
                        const isSelected = selectedType === type;
                        return (
                            <TouchableOpacity
                                key={type}
                                style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                                onPress={() => {
                                    onSelectType(type);
                                    setIsOpen(false);
                                }}
                            >
                                <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                                    {type}
                                </Text>
                                {isSelected && <MaterialCommunityIcons name="check" size={16} color={C.white} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
});

const TrainingPicker = ({ trainings, onSelect, actionLabel, icon }) => (
    <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={[styles.sectionLabel, { marginBottom: 20 }]}>Select a Training to {actionLabel}</Text>
        {trainings.length === 0 ? (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="clipboard-text-off-outline" size={50} color={C.brown + '33'} />
                <Text style={{ color: C.brown, marginTop: 12 }}>No trainings added yet.</Text>
            </View>
        ) : (
            trainings.map(item => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => onSelect(item)}
                >
                    {item.thumbnail ? (
                        <Image
                            source={{ uri: item.thumbnail.uri }}
                            style={{ width: 50, height: 50, borderRadius: 10, marginRight: 15 }}
                        />
                    ) : (
                        <View style={[styles.iconWrapper, { backgroundColor: C.orange + '15', marginRight: 15 }]}>
                            <MaterialCommunityIcons name="whistle-outline" size={26} color={C.orange} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardText}>{item.title}</Text>
                        <Text style={styles.subLabel}>{item.type} • {item.coach}</Text>
                    </View>
                    <MaterialCommunityIcons name={icon} size={24} color={C.orange} />
                </TouchableOpacity>
            ))
        )}
    </ScrollView>
);

// ─── AddTrainingForm ──────────────────────────────────────────────────────────

function AddTrainingForm({ onBack, onSave, initialData = null, mode = 'add' }) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [type, setType] = useState(initialData?.type || '');
    const [coach, setCoach] = useState(initialData?.coach || '');
    const [pricePerSession, setPricePerSession] = useState(initialData?.pricePerSession || '');
    const [duration, setDuration] = useState(initialData?.duration || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [isAvailable, setIsAvailable] = useState(initialData?.isAvailable ?? true);
    const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || null);
    const [gallery, setGallery] = useState(initialData?.gallery || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const errorShake = useRef(new Animated.Value(0)).current;

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

    const pickGalleryImages = async () => {
        const remainingSlots = 5 - gallery.length;
        if (remainingSlots <= 0) {
            Alert.alert('Limit reached', 'You can only add up to 5 gallery images.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
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

    const shakeError = () => {
        Animated.sequence([
            Animated.timing(errorShake, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleSave = () => {
        if (mode === 'view') return;

        if (!title.trim() || !type.trim() || !coach.trim() || !pricePerSession.trim()) {
            setError('Please fill in all required fields: title, session type, coach name, and price.');
            shakeError();
            return;
        }

        setError('');
        setLoading(true);

        setTimeout(() => {
            const trainingObj = {
                id: initialData?.id || `t_${Date.now()}`,
                title: title.trim(),
                type: type.trim(),
                coach: coach.trim(),
                pricePerSession: pricePerSession.trim(),
                duration: duration.trim(),
                description: description.trim(),
                isAvailable,
                thumbnail,
                gallery,
            };
            setLoading(false);
            onSave(trainingObj);
        }, 300);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>

                {/* Thumbnail */}
                <Text style={styles.sectionLabel}>Training Thumbnail</Text>
                <TouchableOpacity
                    style={styles.imagePickerFrame}
                    onPress={isReadOnly ? null : pickImage}
                    disabled={isReadOnly}
                >
                    {thumbnail ? (
                        <Image source={{ uri: thumbnail.uri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons name="camera-plus" size={40} color={C.brown + '44'} />
                            <Text style={[styles.subLabel, { marginTop: 8 }]}>Tap to add image</Text>
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
                                    <TouchableOpacity
                                        style={styles.removeIcon}
                                        onPress={() => removeGalleryImage(index)}
                                    >
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

                <FormInput
                    label="Training Title"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Elite Basketball Skills"
                    editable={!isReadOnly}
                />

                <SessionTypeDropdown
                    selectedType={type}
                    onSelectType={setType}
                    isReadOnly={isReadOnly}
                />

                <FormInput
                    label="Coach / Trainer Name"
                    value={coach}
                    onChangeText={setCoach}
                    placeholder="e.g. Coach Salman"
                    editable={!isReadOnly}
                />

                <FormInput
                    label="Price per Session (Rs.)"
                    value={pricePerSession}
                    onChangeText={setPricePerSession}
                    placeholder="e.g. 3500"
                    keyboardType="numeric"
                    editable={!isReadOnly}
                />

                <FormInput
                    label="Duration (minutes)"
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="e.g. 60"
                    keyboardType="numeric"
                    editable={!isReadOnly}
                />

                <FormInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description of this training..."
                    multiline
                    numberOfLines={4}
                    editable={!isReadOnly}
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                />

                {/* Availability Toggle */}
                <View style={styles.rowBetweenCompact}>
                    <Text style={styles.label}>Available for Booking</Text>
                    <Switch
                        value={isAvailable}
                        onValueChange={setIsAvailable}
                        disabled={isReadOnly}
                        trackColor={{ false: '#ccc', true: C.orange + '88' }}
                        thumbColor={isAvailable ? C.orange : '#f4f3f4'}
                    />
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
                                {mode === 'add' ? 'Create Training' : 'Update Training'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── SubScreenContent ─────────────────────────────────────────────────────────

function SubScreenContent({ type, id, data, onBack, trainings, setTrainings }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const [selectedTraining, setSelectedTraining] = useState(null);

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSaveTraining = (updated) => {
        if (id === '1') {
            setTrainings(prev => [...prev, updated]);
        } else {
            setTrainings(prev => prev.map(t => t.id === updated.id ? updated : t));
        }
        onBack();
    };

    const handleRemoveTraining = (trainingId) => {
        setTrainings(prev => prev.filter(t => t.id !== trainingId));
        onBack();
    };

    const renderTrainingContent = () => {
        // Mode 1: Add Training
        if (id === '1') {
            return <AddTrainingForm mode="add" onSave={handleSaveTraining} onBack={onBack} />;
        }

        // Modes 2, 3, 4: Require selection first
        if (!selectedTraining) {
            const labels = { '2': 'Update', '3': 'View', '4': 'Remove' };
            const icons = { '2': 'pencil', '3': 'eye', '4': 'delete' };
            return (
                <TrainingPicker
                    trainings={trainings}
                    actionLabel={labels[id]}
                    icon={icons[id]}
                    onSelect={setSelectedTraining}
                />
            );
        }

        // Once a training is selected:
        if (id === '2') {
            return (
                <AddTrainingForm
                    mode="edit"
                    initialData={selectedTraining}
                    onSave={handleSaveTraining}
                    onBack={onBack}
                />
            );
        }
        if (id === '3') {
            return (
                <AddTrainingForm
                    mode="view"
                    initialData={selectedTraining}
                    onBack={onBack}
                />
            );
        }
        if (id === '4') {
            return (
                <View style={styles.formScroll}>
                    <Text style={styles.headerText}>Are you sure?</Text>
                    <Text style={[styles.placeholderText, { marginBottom: 30 }]}>
                        You are about to delete "{selectedTraining.title}". This action cannot be undone.
                    </Text>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: 'red' }]}
                        onPress={() => handleRemoveTraining(selectedTraining.id)}
                    >
                        <Text style={styles.saveButtonText}>Yes, Delete Training</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: C.bg }]}
                        onPress={() => setSelectedTraining(null)}
                    >
                        <Text style={[styles.submitBtnText, { color: C.brown }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    const renderSessionContent = () => {
        if (!data) return null;
        const { trainee, coach, type: sessionType, time, status, price } = data;
        return (
            <View style={styles.formScroll}>
                <Text style={styles.detailHeader}>Session Details</Text>
                <Text style={styles.label}>Trainee</Text>
                <Text style={styles.detailValue}>{trainee || 'N/A'}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Coach</Text>
                <Text style={styles.detailValue}>{coach}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Session Type</Text>
                <Text style={styles.detailValue}>{sessionType}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Time</Text>
                <Text style={styles.detailValue}>{time}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Status</Text>
                <Text style={styles.detailValue}>{status}</Text>
                {price && (
                    <>
                        <Text style={[styles.label, { marginTop: 16 }]}>Price</Text>
                        <Text style={styles.detailValue}>{price}</Text>
                    </>
                )}
            </View>
        );
    };

    const renderProfileContent = () => (
        <View style={styles.formScroll}>
            <Text style={styles.detailHeader}>{id}</Text>
            <Text style={styles.placeholderText}>Coming soon.</Text>
        </View>
    );

    const getTitle = () => {
        if (type === 'training') {
            return { '1': 'Add Training', '2': 'Update Training', '3': 'Training Details', '4': 'Remove Training' }[id];
        }
        if (type === 'session') return 'Session Details';
        return id;
    };

    return (
        <Animated.View
            style={[styles.subScreenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
            <View style={styles.subScreenHeader}>
                <Text style={styles.subScreenTitle}>{getTitle()}</Text>
            </View>
            {type === 'training' && renderTrainingContent()}
            {type === 'session' && renderSessionContent()}
            {type === 'profile' && renderProfileContent()}
        </Animated.View>
    );
}

// ─── Tab Screens ──────────────────────────────────────────────────────────────

function DashboardScreen({ onActionSelect }) {
    const menuItems = [
        { id: '1', title: 'Add Training', icon: 'plus-circle' },
        { id: '2', title: 'Update Training', icon: 'pencil-circle' },
        { id: '3', title: 'View Training', icon: 'eye-circle' },
        { id: '4', title: 'Remove Training', icon: 'delete-circle' },
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
                <Text style={styles.headerText}>Training Management</Text>

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

function TrainingsScreen({ onSessionSelect }) {
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All');

    const uniqueTypes = ['All', ...new Set(SESSIONS_DATA.flatMap(s => s.data.map(item => item.type)))];
    const statuses = ['All', 'Confirmed', 'Pending'];
    const timeOptions = ['All', 'Today', 'Upcoming'];

    const filteredSections = useMemo(() => {
        return SESSIONS_DATA.map(section => {
            if (timeFilter !== 'All' && section.title !== timeFilter) {
                return { ...section, data: [] };
            }
            const filteredData = section.data.filter(session => {
                const statusMatch = statusFilter === 'All' || session.status === statusFilter;
                const typeMatch = typeFilter === 'All' || session.type === typeFilter;
                return statusMatch && typeMatch;
            });
            return { ...section, data: filteredData };
        }).filter(section => section.data.length > 0);
    }, [statusFilter, typeFilter, timeFilter]);

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

    const renderSessionCard = ({ item }) => (
        <TouchableOpacity
            style={styles.sessionCard}
            activeOpacity={0.8}
            onPress={() => onSessionSelect(item)}
        >
            <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                    <Text style={styles.traineeName}>{item.trainee}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Confirmed' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'Confirmed' ? '#2E7D32' : '#EF6C00' }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.sessionDetailRow}>
                    <MaterialCommunityIcons name="whistle-outline" size={14} color={C.brown + '99'} />
                    <Text style={styles.sessionDetailText}>
                        {item.type} • <Text style={styles.coachText}>{item.coach}</Text>
                    </Text>
                </View>
                <View style={styles.sessionDetailRow}>
                    <MaterialCommunityIcons name="clock-check-outline" size={14} color={C.orange} />
                    <Text style={styles.sessionTimeText}>{item.time}</Text>
                </View>
            </View>
            <View style={styles.sessionPriceAction}>
                <Text style={styles.sessionPrice}>{item.price}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.brown + '44'} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.rootContainer}>
            <View style={styles.filterContainer}>
                <FilterGroup label="Status" options={statuses} current={statusFilter} setter={setStatusFilter} icon="filter-variant" />
                <FilterGroup label="Session Type" options={uniqueTypes} current={typeFilter} setter={setTypeFilter} icon="run-fast" />
                <FilterGroup label="Timeline" options={timeOptions} current={timeFilter} setter={setTimeFilter} icon="calendar-clock" />
            </View>

            <SectionList
                showsVerticalScrollIndicator={false}
                sections={filteredSections}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.sessionListContent}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionLine} />
                        <Text style={styles.sectionTitle}>{title}</Text>
                        <View style={styles.sectionLine} />
                    </View>
                )}
                renderItem={renderSessionCard}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="calendar-remove-outline" size={60} color={C.white + '33'} />
                        <Text style={styles.emptyStateText}>No sessions found</Text>
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
                        <MaterialCommunityIcons name="clipboard-text" size={12} color={C.orange} />
                        <Text style={styles.profileBadgeText}>{user?.userType || 'Trainer'}</Text>
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
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            onPress={() => onMenuSelect(item.label)}
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

// ─── Main TrainerHomeScreen ───────────────────────────────────────────────────

export function TrainerHomeScreen({ user, onLogout }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(0);
    const [activeSubScreen, setActiveSubScreen] = useState(null);
    const [trainings, setTrainings] = useState(INITIAL_TRAININGS);
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeStartX = useRef(0);

    const goToTab = useCallback((index) => {
        setActiveSubScreen(null);
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
            onActionSelect={(id) => setActiveSubScreen({ type: 'training', id })}
        />,
        <TrainingsScreen
            key="trainings"
            onSessionSelect={(session) => setActiveSubScreen({ type: 'session', id: session.id, data: session })}
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
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {/* ── Top bar ── */}
            <View style={styles.topBar}>
                {/* Left: back or tab label */}
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

                {/* Center: Logo */}
                <View style={styles.topBarCenter}>
                    <Image
                        source={require('../../../assets/top-minimal.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Right: Action */}
                <View style={styles.topBarSide}>
                    {!activeSubScreen && (
                        <TouchableOpacity
                            style={styles.topBarAction}
                            onPress={activeTab === 2 ? onLogout : () => { }}
                        >
                            <MaterialCommunityIcons
                                name={activeTab === 2 ? 'logout' : 'magnify'}
                                size={26}
                                color={activeTab === 2 ? C.orange : C.brown}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Body ── */}
            {activeSubScreen ? (
                <SubScreenContent
                    type={activeSubScreen.type}
                    id={activeSubScreen.id}
                    data={activeSubScreen.data}
                    trainings={trainings}
                    setTrainings={setTrainings}
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
    rootwhite: {
        flex: 1,
        backgroundColor: C.white,
    },
    rootbrown: {
        flex: 1,
        backgroundColor: C.brown,
    },

    // ── Arcs ──────────────────────────────────────────────────────────────────
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

    // ── Top bar ───────────────────────────────────────────────────────────────
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
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -10,
    },
    headerBackText: {
        fontSize: 16,
        fontWeight: '600',
        color: C.brown,
        marginLeft: -6,
    },

    // ── Content ───────────────────────────────────────────────────────────────
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

    // ── Dashboard ─────────────────────────────────────────────────────────────
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
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
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: C.orange,
    },
    subLabel: {
        fontSize: 12,
        color: C.mutedText,
    },

    // ── Trainings Screen ──────────────────────────────────────────────────────
    rootContainer: {
        flex: 1,
        backgroundColor: C.brown,
    },
    sessionListContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
        marginTop: 25,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 14,
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
    sessionCard: {
        backgroundColor: C.white,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    traineeName: {
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
    sessionDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    sessionDetailText: {
        fontSize: 14,
        color: C.brown + '99',
    },
    coachText: {
        fontWeight: '700',
        color: C.brown,
    },
    sessionTimeText: {
        fontSize: 14,
        fontWeight: '600',
        color: C.orange,
    },
    sessionPriceAction: {
        alignItems: 'flex-end',
        gap: 8,
        marginLeft: 10,
    },
    sessionPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: C.brown,
    },
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
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyStateText: {
        color: C.white + '88',
        fontSize: 16,
        marginTop: 15,
    },

    // ── Profile ───────────────────────────────────────────────────────────────
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

    // ── Bottom nav ────────────────────────────────────────────────────────────
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: C.white,
        borderTopWidth: 1,
        borderTopColor: C.border,
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

    // ── Subscreen ─────────────────────────────────────────────────────────────
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
    subScreenTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: C.orange,
    },

    // ── Forms ─────────────────────────────────────────────────────────────────
    formContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    formScroll: {
        padding: 20,
        paddingBottom: 10,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: C.brown,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    imagePickerFrame: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        backgroundColor: C.bg,
        borderWidth: 2,
        borderColor: C.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
        marginBottom: 25,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        backgroundColor: '#eee',
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
        backgroundColor: C.bg,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: C.brown,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: C.brown,
    },
    placeholderText: {
        color: C.brown + '66',
        fontWeight: '500',
    },
    rowBetweenCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 20,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        padding: 15,
    },
    dropdownHeaderText: {
        color: C.brown,
        fontWeight: '600',
    },
    dropdownList: {
        marginTop: 5,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    dropdownItemActive: {
        backgroundColor: C.orange,
    },
    dropdownItemText: {
        color: C.brown,
        fontWeight: '500',
    },
    dropdownItemTextActive: {
        color: C.white,
        fontWeight: '700',
    },
    saveButton: {
        backgroundColor: C.brown,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 4,
        marginTop: 10,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    submitBtn: {
        marginTop: 12,
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
    detailHeader: {
        fontSize: 20,
        fontWeight: '800',
        color: C.brown,
        marginBottom: 20,
    },
    detailValue: {
        fontSize: 16,
        color: C.brown,
        marginBottom: 4,
    },
});

export default TrainerHomeScreen;