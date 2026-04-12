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
    Touchable,
    Modal,
    FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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

// ─── Placeholder data ────────────────────────────────────────────────────────

const BOOKINGS_DATA = [
    {
        title: 'Today',
        data: [
            { id: 'b1', customer: 'Ahmed Khan', time: '04:00 PM - 05:00 PM', venue: 'CourtKing Arena', status: 'Confirmed', price: 'Rs. 2,500' },
            { id: 'b2', customer: 'Sara Williams', time: '07:30 PM - 09:00 PM', venue: 'ProArena Clifton', status: 'Confirmed', price: 'Rs. 4,000' },
        ],
    },
    {
        title: 'Upcoming',
        data: [
            { id: 'b3', customer: 'Zain Malik', time: 'Oct 24, 05:00 PM', venue: 'HoopZone', status: 'Pending', price: 'Rs. 2,000' },
            { id: 'b4', customer: 'Hamza Ali', time: 'Oct 25, 08:00 PM', venue: 'CourtKing Arena', status: 'Confirmed', price: 'Rs. 2,500' },
            { id: 'b5', customer: 'Omar J.', time: 'Oct 26, 06:00 PM', venue: 'SkillLab PK', status: 'Confirmed', price: 'Rs. 3,200' },
        ],
    },
];

const VENUE_POSTS = [
    { id: 'v1', user: { name: 'CourtKing Arena', image: require('../../../assets/tennis.png'), rating: '4.8', timings: '8:00 AM - 11:00 PM', location: 'Karachi, DHA', sports: ['Basketball', 'Tennis'], isAvailable: true } },
    { id: 'v2', user: { name: 'HoopZone', image: require('../../../assets/tennis.png'), rating: '4.5', timings: '9:00 AM - 12:00 AM', location: 'Lahore, Gulberg', sports: ['Basketball', '3x3'], isAvailable: false } },
    { id: 'v3', user: { name: 'ProArena Clifton', image: require('../../../assets/tennis.png'), rating: '4.9', timings: '7:00 AM - 11:00 PM', location: 'Karachi, Clifton', sports: ['Tennis', 'Padel'], isAvailable: true } },
];

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

const SportDropdown = memo(({ selectedSports, onToggleSport, isReadOnly }) => {
    const [isOpen, setIsOpen] = useState(false);
    const allSports = ['Basketball', 'Tennis', 'Futsal', 'Padel', 'Cricket', 'Badminton', '3x3'];

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Sports</Text>
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
                    {allSports.map(sport => {
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

function AddVenueForm({ onBack, onSave, initialData = null, mode = 'add' }) {
    // Initialize states with initialData if it exists
    const [name, setName] = useState(initialData?.user?.name || '');
    const [location, setLocation] = useState(initialData?.user?.location || '');
    const [image, setImage] = useState(initialData?.user?.image?.uri || null);
    const [gallery, setGallery] = useState(initialData?.user?.gallery?.map(g => g.uri) || []);
    const [selectedSports, setSelectedSports] = useState(initialData?.user?.sports || []);

    // Time Picker States
    const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0)));
    const [endTime, setEndTime] = useState(new Date(new Date().setHours(23, 0, 0)));
    const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

    const onToggleSport = useCallback((sport) => {
        setSelectedSports(prev =>
            prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
        );
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const isReadOnly = mode === 'view';

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
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
            const newUris = result.assets.map(asset => asset.uri);
            setGallery(prev => [...prev, ...newUris].slice(0, 5));
        }
    };

    const removeGalleryImage = (index) => {
        setGallery(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const venueObj = {
            id: initialData?.id || Date.now().toString(), // Keep old ID if updating
            user: {
                name,
                location,
                image: typeof image === 'string' ? { uri: image } : image,
                sports: selectedSports,
                timings: `${formatTime(startTime)} - ${formatTime(endTime)}`,
                rating: initialData?.user?.rating || '5.0',
                isAvailable: true
            }
        };
        onSave(venueObj);
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
                    {image ? <Image source={{ uri: image }} style={styles.previewImage} /> : (
                        <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons name="camera-plus" size={40} color={C.brown + '44'} />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Gallery */}
                <Text style={styles.sectionLabel}>Gallery ({gallery.length}/5)</Text>
                <View style={styles.galleryContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {gallery.map((uri, index) => (
                            <View key={index} style={styles.galleryWrapper}>
                                <Image source={{ uri }} style={styles.galleryImage} />
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

                <SportDropdown selectedSports={selectedSports} onToggleSport={onToggleSport} isReadOnly={isReadOnly} />

                {mode !== 'view' && (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>
                            {mode === 'add' ? 'Create Venue' : 'Update Venue'}
                        </Text>
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

function SubScreenContent({ type, id, onBack, venues, setVenues }) {
    const insets = useSafeAreaInsets(); // This gets the status bar height
    const [selectedVenue, setSelectedVenue] = useState(null);

    // Labels for the sub-screens
    const getTitle = () => {
        if (type === 'venue') {
            return { '1': 'Add Venue', '2': 'Update Venue', '3': 'View Venue', '4': 'Remove Venue' }[id];
        }
        if (type === 'booking') return 'Booking Details';
        if (type === 'profile') return id; // e.g., "Edit Profile"
        return 'Details';
    };

    // Helper: Update local venue list
    const handleSaveVenue = (updatedVenue) => {
        if (id === '1') { // Add
            setVenues(prev => [...prev, updatedVenue]);
        } else { // Update
            setVenues(prev => prev.map(v => v.id === updatedVenue.id ? updatedVenue : v));
        }
        onBack();
    };

    const handleRemoveVenue = (venueId) => {
        setVenues(prev => prev.filter(v => v.id !== venueId));
        onBack();
    };

    const renderContent = () => {
        // Mode 1: Add Venue
        if (id === '1') {
            return <AddVenueForm mode="add" onSave={handleSaveVenue} onBack={onBack} />;
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
                    onSelect={setSelectedVenue}
                />
            );
        }

        // Once a venue is selected:
        if (id === '2') return <AddVenueForm mode="edit" initialData={selectedVenue} onSave={handleSaveVenue} onBack={onBack} />;
        if (id === '3') return <AddVenueForm mode="view" initialData={selectedVenue} onBack={onBack} />;
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

    return (
        <View style={styles.subScreenContainer}>
            <View style={styles.subScreenHeader}>
                {/* <TouchableOpacity onPress={selectedVenue ? () => setSelectedVenue(null) : onBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={C.white} />
                    <Text style={{ color: 'white' }}>{selectedVenue ? 'Back to Selection' : 'Exit'}</Text>
                </TouchableOpacity> */}
                <Text style={styles.subScreenTitle}>
                    {id === '1' ? 'Add Venue' : id === '2' ? 'Update Venue' : id === '3' ? 'Venue Details' : 'Remove Venue'}
                </Text>
            </View>
            {renderContent()}
        </View>
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

function BookingsScreen({ onBookingSelect }) {
    // 1. States for filtering
    const [statusFilter, setStatusFilter] = useState('All');
    const [venueFilter, setVenueFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All'); // All, Today, Upcoming

    // 2. Extract unique venues for the filter list
    const uniqueVenues = ['All', ...new Set(BOOKINGS_DATA.flatMap(s => s.data.map(b => b.venue)))];
    const statuses = ['All', 'Confirmed', 'Pending'];
    const timeOptions = ['All', 'Today', 'Upcoming'];

    // 3. Filter Logic
    const filteredSections = useMemo(() => {
        return BOOKINGS_DATA.map(section => {
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
    // Shared state for all venues
    const [venues, setVenues] = useState(VENUE_POSTS);

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
            <View style={[styles.topBar, { paddingTop: insets.top }]}>

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
                        <Text style={styles.topBarTitle}>{currentTab.label}</Text>
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
                        <TouchableOpacity style={styles.topBarAction}>
                            <MaterialCommunityIcons
                                name={activeTab === 2 ? "logout" : "magnify"}
                                size={26}
                                color={C.brown}
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
        paddingBottom: 10,
        // Add an explicit height to ensure content has room
        height: 70,
    },
    topBarSide: {
        width: 75, // Gives enough room for "Venues" and the Icon
    },
    topBarCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarTitle: {
        fontSize: 14, // Slightly larger
        fontWeight: '800',
        color: C.brown,
    },
    logoImage: {
        width: 150, // Adjust this based on your file's actual shape
        height: 50,
    },
    topBarAction: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: '100%', // Makes it easier to tap
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

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: 30 },
    saveButton: { backgroundColor: C.brown, borderRadius: 14, paddingVertical: 16, alignItems: 'center', elevation: 4 },
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
});

export default OwnerHomeScreen;