import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Image,
    Dimensions,
    Animated,
    PanResponder,
    StatusBar,
    Platform,
    SectionList,
    Touchable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// ─── Placeholder data ────────────────────────────────────────────────────────

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

// ─── Tab screens ─────────────────────────────────────────────────────────────

function SubScreenContent({ type, id, data, onBack }) {
    // Labels for the sub-screens
    const getTitle = () => {
        if (type === 'training') {
            return { '1': 'Add Training', '2': 'Update Training', '3': 'View Training', '4': 'Remove Training' }[id];
        }
        if (type === 'session') return 'Session Details';
        if (type === 'profile') return id; // e.g., "Edit Profile"
        return 'Details';
    };

    return (
        <View style={styles.formContainer}>

            <View style={styles.arcContainer} pointerEvents="none">
                <View style={styles.arcInner} />
                <View style={styles.halfCircle} />
            </View>

            <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{getTitle()}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
                <View style={styles.placeholderForm}>
                    <MaterialCommunityIcons
                        name={type === 'session' ? "clipboard-text" : type === 'profile' ? "account-cog" : "form-select"}
                        size={80}
                        color={C.orange + '22'}
                    />
                    <Text style={styles.placeholderText}>
                        {type === 'session' ? `Viewing Session Details` : `Interface for ${getTitle()}`}
                    </Text>

                    {/* Example Action Button */}
                    <TouchableOpacity style={styles.submitBtn} onPress={onBack}>
                        <Text style={styles.submitBtnText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

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
    // 1. States for filtering
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All'); // All, Today, Upcoming

    // 2. Extract unique types for the filter list
    const uniqueTypes = ['All', ...new Set(SESSIONS_DATA.flatMap(s => s.data.map(item => item.type)))];
    const statuses = ['All', 'Confirmed', 'Pending'];
    const timeOptions = ['All', 'Today', 'Upcoming'];

    // 3. Filter Logic
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
            onPress={() => onSessionSelect(item)} // Trigger selection
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

                {/* Session Type & Coach Info */}
                <View style={styles.sessionDetailRow}>
                    <MaterialCommunityIcons name="whistle-outline" size={14} color={C.brown + '99'} />
                    <Text style={styles.sessionDetailText}>{item.type} • <Text style={styles.coachText}>{item.coach}</Text></Text>
                </View>

                {/* Time Info */}
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

export function TrainerHomeScreen({ user, onLogout }) {
    const insets = useSafeAreaInsets(); // This gets the status bar height
    const [activeTab, setActiveTab] = useState(0);
    const [activeSubScreen, setActiveSubScreen] = useState(null);
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeStartX = useRef(0);

    const goToTab = useCallback((index) => {
        setActiveTab(index);
        setActiveSubScreen(null);
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
                    {...activeSubScreen}
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
    }, headerBackButton: {
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

    // ── Trainings Screen ─────────────────────────────────────────────────────────────

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

    // ── Subscreen ──────────────────────────────────────────────────────────

    formContainer: {
        flex: 1,
        backgroundColor: C.white,
    },
    formHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        backgroundColor: C.bg + '33',
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
    formTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: C.orange,
    },
    formScroll: {
        padding: 20,
    },
    placeholderForm: {
        justifyContent: 'center',
        paddingTop: 10,
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
});

export default TrainerHomeScreen;