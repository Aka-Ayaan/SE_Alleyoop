import React, { useState, useRef, useCallback } from 'react';
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
    { id: 'bookings', label: 'Bookings', icon: 'calendar-text-outline', activeIcon: 'calendar-text' },
    { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

// ─── Placeholder data ────────────────────────────────────────────────────────

const VENUE_POSTS = [
    {
        id: 'v1',
        user: {
            name: 'CourtKing Arena',
            image: require('../../../assets/tennis.png'),
            rating: '4.8',
            timings: '8:00 AM - 11:00 PM',
            location: 'Karachi, DHA',
            sports: ['Basketball', 'Tennis', 'Futsal'],
            isAvailable: true
        }
    },
    {
        id: 'v2',
        user: {
            name: 'HoopZone',
            image: require('../../../assets/tennis.png'),
            rating: '4.5',
            timings: '9:00 AM - 12:00 AM',
            location: 'Lahore, Gulberg',
            sports: ['Basketball', '3x3'],
            isAvailable: false
        }
    },
    {
        id: 'v3',
        user: {
            name: 'ProArena Clifton',
            image: require('../../../assets/tennis.png'),
            rating: '4.9',
            timings: '7:00 AM - 11:00 PM',
            location: 'Karachi, Clifton',
            sports: ['Tennis', 'Padel'],
            isAvailable: true
        }
    },
];

const SHOP_POSTS = [
    {
        id: 's1',
        user: {
            name: 'BallUp Store',
            image: require('../../../assets/tennis.png'),
            rating: '4.7',
            timings: '24/7 Delivery',
            location: 'Online Store',
            sports: ['Balls', 'Shoes', 'Jerseys'],
            isAvailable: true
        }
    },
    {
        id: 's2',
        user: {
            name: 'HoopGear PK',
            image: require('../../../assets/tennis.png'),
            rating: '4.2',
            timings: '11:00 AM - 09:00 PM',
            location: 'Karachi, LuckyOne',
            sports: ['Apparel', 'Accessories'],
            isAvailable: true
        }
    },
    {
        id: 's3',
        user: {
            name: 'CourtSwag',
            image: require('../../../assets/tennis.png'),
            rating: '4.6',
            timings: 'Closed Today',
            location: 'Lahore, Model Town',
            sports: ['Custom Kits', 'Socks'],
            isAvailable: false
        }
    },
];

const TRAINING_POSTS = [
    {
        id: 't1',
        user: {
            name: 'Coach Raza',
            image: require('../../../assets/tennis.png'),
            rating: '5.0',
            timings: 'Morning Drills',
            location: 'Karachi, KDA',
            sports: ['Shooting', 'Defense'],
            isAvailable: true
        }
    },
    {
        id: 't2',
        user: {
            name: 'EliteHoops',
            image: require('../../../assets/tennis.png'),
            rating: '4.8',
            timings: 'Weekend Camps',
            location: 'Islamabad, F-10',
            sports: ['Vertical Jump', 'IQ'],
            isAvailable: true
        }
    },
    {
        id: 't3',
        user: {
            name: 'SkillLab PK',
            image: require('../../../assets/tennis.png'),
            rating: '4.4',
            timings: 'Fully Booked',
            location: 'Lahore, Johar Town',
            sports: ['Handles', 'Footwork'],
            isAvailable: false
        }
    },
];

// ─── Tab screens ─────────────────────────────────────────────────────────────

function DashboardScreen() {
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

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.headerText}>Venue Management</Text>

                {menuItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => console.log(`${item.title} pressed`)}
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

function BookingsScreen({ posts }) {
    return (
        <View style={styles.rootbrown}>
            {/* Background arcs */}
            <View style={styles.arcContainer} pointerEvents="none">
                <View style={styles.arcOuter} />
                <View style={styles.arcInner} />
                <View style={styles.halfCircle} />
            </View>
            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 90 }}
            />
        </View>
    );
}

function ProfileScreen({ onLogout, user }) {
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
                        <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
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

export function OwnerDashboard({ user, onLogout }) {
    const insets = useSafeAreaInsets(); // This gets the status bar height
    const [activeTab, setActiveTab] = useState(0);
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeStartX = useRef(0);

    const goToTab = useCallback((index) => {
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
        <DashboardScreen key="dashboard" posts={VENUE_POSTS} />,
        <BookingsScreen key="bookings" posts={SHOP_POSTS} />,
        <ProfileScreen key="profile" onLogout={onLogout} user={user} />,
    ];

    return (
        <View style={[styles.rootwhite, { paddingTop: insets.top }]}>
            {/* Set translucent to true so the background color can sit behind the status bar icons */}
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {/* ── Top bar ── */}
            <View style={[styles.topBar, { paddingTop: insets.top }]}>

                {/* Left Side: Section Title */}
                <View style={styles.topBarSide}>
                    <Text style={styles.topBarTitle}>{currentTab.label}</Text>
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
                    <TouchableOpacity
                        style={styles.topBarAction}
                        onPress={activeTab === 3 ? onLogout : () => { }}
                    >
                        <MaterialCommunityIcons
                            name={activeTab < 3 ? "magnify" : "logout"}
                            size={26}
                            color={activeTab < 3 ? C.brown : C.orange}
                        />
                    </TouchableOpacity>
                </View>
            </View>


            {/* ── Swipeable content ── */}
            <View style={styles.contentArea} {...panResponder.panHandlers}>
                <Animated.View
                    style={[
                        styles.tabsStrip,
                        { transform: [{ translateX }] },
                    ]}
                >
                    {tabContent.map((screen, i) => (
                        <View key={i} style={styles.tabPane}>
                            {screen}
                        </View>
                    ))}
                </Animated.View>
            </View>

            {/* ── Bottom nav ── */}
            <View style={styles.bottomNav}>
                {TABS.map((tab, i) => {
                    const isActive = activeTab === i;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.navItem}
                            onPress={() => goToTab(i)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                                <MaterialCommunityIcons
                                    name={isActive ? tab.activeIcon : tab.icon}
                                    size={24}
                                    color={isActive ? C.white : C.brown + '66'}
                                />
                            </View>
                            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {/* Optional: Add bottom inset padding for iPhones with no home button */}
            <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                {/* ... nav items ... */}
            </View>
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
        width: 70, // Gives enough room for "Venues" and the Icon
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
});

export default OwnerDashboard;