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
  { id: 'venue', label: 'Venues', icon: 'stadium-outline', activeIcon: 'stadium' },
  { id: 'shopping', label: 'Shop', icon: 'shopping-outline', activeIcon: 'shopping' },
  { id: 'training', label: 'Training', icon: 'clipboard-text-outline', activeIcon: 'clipboard-text' },
  { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

// ─── Placeholder data ────────────────────────────────────────────────────────

const VENUE_POSTS = [
  { id: 'v1', user: { name: 'CourtKing Arena', image: require('../../../assets/tennis.png'), rating: '4.8', timings: '8:00 AM - 11:00 PM', location: 'Karachi, DHA', sports: ['Basketball', 'Tennis'], isAvailable: true } },
  { id: 'v2', user: { name: 'HoopZone', image: require('../../../assets/tennis.png'), rating: '4.5', timings: '9:00 AM - 12:00 AM', location: 'Lahore, Gulberg', sports: ['Basketball', '3x3'], isAvailable: false } },
  { id: 'v3', user: { name: 'ProArena Clifton', image: require('../../../assets/tennis.png'), rating: '4.9', timings: '7:00 AM - 11:00 PM', location: 'Karachi, Clifton', sports: ['Tennis', 'Padel'], isAvailable: true } },
];

const SHOP_POSTS = [
  { id: 's1', user: { name: 'BallUp Store', image: require('../../../assets/tennis.png'), rating: '4.7', timings: '24/7 Delivery', location: 'Online Store', sports: ['Balls', 'Shoes'], isAvailable: true } },
  { id: 's2', user: { name: 'HoopGear PK', image: require('../../../assets/tennis.png'), rating: '4.2', timings: '11:00 AM - 09:00 PM', location: 'Karachi, LuckyOne', sports: ['Apparel'], isAvailable: true } },
  { id: 's3', user: { name: 'CourtSwag', image: require('../../../assets/tennis.png'), rating: '4.6', timings: 'Closed Today', location: 'Lahore, Model Town', sports: ['Custom Kits'], isAvailable: false } },
];

const TRAINING_POSTS = [
  { id: 't1', user: { name: 'Coach Raza', image: require('../../../assets/tennis.png'), rating: '5.0', timings: 'Morning Drills', location: 'Karachi, KDA', sports: ['Shooting', 'Defense'], isAvailable: true } },
  { id: 't2', user: { name: 'EliteHoops', image: require('../../../assets/tennis.png'), rating: '4.8', timings: 'Weekend Camps', location: 'Islamabad, F-10', sports: ['Vertical Jump'], isAvailable: true } },
  { id: 't3', user: { name: 'SkillLab PK', image: require('../../../assets/tennis.png'), rating: '4.4', timings: 'Fully Booked', location: 'Lahore, Johar Town', sports: ['Handles'], isAvailable: false } },
];

// ─── Reusable Components ─────────────────────────────────────────────────────

const FilterGroup = ({ options, current, setter }) => (
  <View style={styles.filterContainer}>
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

function PostCard({ post, onPress }) {
  const { name, image, rating, timings, location, sports, isAvailable } = post.user;

  return (
    <TouchableOpacity style={styles.venueCard} activeOpacity={0.95} onPress={onPress}>
      <View style={styles.cardImageContainer}>
        <Image source={image} style={styles.venueImage} resizeMode="cover" />
        <View style={styles.ratingBadge}>
          <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.venueName}>{name}</Text>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={C.orange} />
          <Text style={styles.infoText}>{timings}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color={C.orange} />
          <Text style={styles.infoText} numberOfLines={1}>{location}</Text>
        </View>
        <View style={styles.sportsContainer}>
          {sports.map((sport, index) => (
            <View key={index} style={styles.sportTag}><Text style={styles.sportTagText}>{sport}</Text></View>
          ))}
        </View>
        <View style={[styles.availabilityCard, { backgroundColor: isAvailable ? '#E8F5E9' : '#FFEBEE' }]}>
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#4CAF50' : '#F44336' }]} />
          <Text style={[styles.availabilityText, { color: isAvailable ? '#2E7D32' : '#C62828' }]}>
            {isAvailable ? 'Available Now' : 'Fully Booked'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SubScreenContent({ type, data, id, onBack }) {
  return (
    <View style={styles.subScreenRoot}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <View style={styles.placeholderForm}>
          <MaterialCommunityIcons
            name={type === 'profile' ? "cog" : "information-outline"}
            size={80}
            color={C.orange + '33'}
          />
          <Text style={styles.subScreenTitle}>
            {type === 'profile' ? id : data?.user?.name || 'Detail View'}
          </Text>
          <Text style={styles.placeholderText}>
            This is the detailed view for the {type} section. Data for ID: {id || 'N/A'}
          </Text>
          <TouchableOpacity style={styles.submitBtn} onPress={onBack}>
            <Text style={styles.submitBtnText}>Close Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Tab screens ─────────────────────────────────────────────────────────────

function FeedScreen({ posts, type, onSelect }) {
  const [filter, setFilter] = useState('All');

  // Extract unique sports/categories for filter chips
  const filterOptions = useMemo(() => {
    const categories = new Set(['All']);
    posts.forEach(p => p.user.sports.forEach(s => categories.add(s)));
    return Array.from(categories);
  }, [posts]);

  const filteredData = useMemo(() => {
    if (filter === 'All') return posts;
    return posts.filter(p => p.user.sports.includes(filter));
  }, [filter, posts]);

  return (
    <View style={styles.rootbrown}>
      <View style={styles.arcContainer} pointerEvents="none">
        <View style={styles.arcOuter} /><View style={styles.arcInner} /><View style={styles.halfCircle} />
      </View>

      <FilterGroup options={filterOptions} current={filter} setter={setFilter} />

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => onSelect(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No items match this filter</Text>
          </View>
        }
      />
    </View>
  );
}

function ProfileScreen({ onLogout, user, onMenuSelect }) {
  const stats = [
    { label: 'Bookings', value: '24' },
    { label: 'Following', value: '138' },
    { label: 'Followers', value: '91' },
  ];

  const menuItems = [
    { icon: 'account-edit-outline', label: 'Edit Profile' },
    { icon: 'calendar-search-outline', label: 'Booking History' },
    { icon: 'heart-outline', label: 'Saved' },
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
            <MaterialCommunityIcons name="basketball" size={12} color={C.orange} />
            <Text style={styles.profileBadgeText}>{user?.userType || 'Player'}</Text>
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

export function HomeScreen({ user, onLogout }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubScreen, setActiveSubScreen] = useState(null); // { type, data, id }

  const translateX = useRef(new Animated.Value(0)).current;

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
      onMoveShouldSetPanResponder: (_, g) => !activeSubScreen && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50 && activeTab < TABS.length - 1) goToTab(activeTab + 1);
        else if (g.dx > 50 && activeTab > 0) goToTab(activeTab - 0);
      },
    })
  ).current;

  const currentTab = TABS[activeTab];

  return (
    <View style={[styles.rootwhite, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarSide}>
          {activeSubScreen ? (
            <TouchableOpacity style={styles.headerBackButton} onPress={() => setActiveSubScreen(null)}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={C.brown} />
              <Text style={styles.headerBackText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.topBarTitle}>{currentTab.label}</Text>
          )}
        </View>

        <View style={styles.topBarCenter}>
          <Image source={require('../../../assets/top-minimal.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.topBarSide}>
          {!activeSubScreen && (
            <TouchableOpacity style={styles.topBarAction} onPress={activeTab === 3 ? onLogout : () => { }}>
              <MaterialCommunityIcons
                name={activeTab < 3 ? "magnify" : "logout"}
                size={26}
                color={activeTab < 3 ? C.brown : C.orange}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Main Content Area ── */}
      {activeSubScreen ? (
        <SubScreenContent {...activeSubScreen} onBack={() => setActiveSubScreen(null)} />
      ) : (
        <>
          <View style={styles.contentArea} {...panResponder.panHandlers}>
            <Animated.View style={[styles.tabsStrip, { transform: [{ translateX }] }]}>
              <View style={styles.tabPane}>
                <FeedScreen posts={VENUE_POSTS} type="venue" onSelect={(item) => setActiveSubScreen({ type: 'venue', data: item, id: item.id })} />
              </View>
              <View style={styles.tabPane}>
                <FeedScreen posts={SHOP_POSTS} type="shop" onSelect={(item) => setActiveSubScreen({ type: 'shop', data: item, id: item.id })} />
              </View>
              <View style={styles.tabPane}>
                <FeedScreen posts={TRAINING_POSTS} type="training" onSelect={(item) => setActiveSubScreen({ type: 'training', data: item, id: item.id })} />
              </View>
              <View style={styles.tabPane}>
                <ProfileScreen user={user} onLogout={onLogout} onMenuSelect={(label) => setActiveSubScreen({ type: 'profile', id: label })} />
              </View>
            </Animated.View>
          </View>

          {/* ── Bottom Nav ── */}
          <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {TABS.map((tab, i) => {
              const isActive = activeTab === i;
              return (
                <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => goToTab(i)}>
                  <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                    <MaterialCommunityIcons name={isActive ? tab.activeIcon : tab.icon} size={24} color={isActive ? C.white : C.brown + '66'} />
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

const styles = StyleSheet.create({
  rootwhite: {
    flex: 1,
    backgroundColor: C.white
  },
  rootbrown: {
    flex: 1,
    backgroundColor: C.brown
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    height: 60, paddingBottom: 5,
  },
  topBarSide: {
    width: 80,
    justifyContent: 'center'
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center'
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.brown
  },
  logoImage: {
    width: 120,
    height: 40
  },
  topBarAction: {
    alignItems: 'flex-end'
  },

  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -10
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.brown, marginLeft: -6
  },

  // Content
  contentArea: {
    flex: 1,
    overflow: 'hidden'
  },
  tabsStrip: {
    flexDirection: 'row',
    width: width * 4, flex: 1
  },
  tabPane: {
    width,
    flex: 1
  },

  // Filters
  filterContainer: {
    backgroundColor: C.brown,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.white + '1A'
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.white + '15',
    borderWidth: 1,
    borderColor: C.white + '1A'
  },
  filterChipActive: {
    backgroundColor: C.orange,
    borderColor: C.orange
  },
  filterChipText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: C.white
  },

  // Cards
  venueCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    elevation: 4,
    overflow: 'hidden'
  },
  cardImageContainer: {
    width: '100%',
    height: 160
  },
  venueImage: {
    width: '100%',
    height: '100%'
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700'
  },
  cardContent: {
    padding: 16
  },
  venueName: {
    fontSize: 20,
    fontWeight: '900',
    color: C.brown,
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  infoText: {
    fontSize: 13,
    color: C.mutedText
  },
  sportsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 12
  },
  sportTag: {
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  sportTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.brown
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '800'
  },

  // SubScreen
  subScreenRoot: {
    flex: 1,
    backgroundColor: C.white
  },
  formScroll: {
    padding: 20
  },
  placeholderForm: {
    alignItems: 'center',
    marginTop: 40
  },
  subScreenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.brown,
    marginTop: 20
  },
  placeholderText: {
    textAlign: 'center',
    color: C.mutedText,
    marginTop: 10,
    fontSize: 16
  },
  submitBtn: {
    marginTop: 30,
    backgroundColor: C.brown,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  submitBtnText: {
    color: C.white,
    fontWeight: 'bold'
  },

  // Profile
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

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10
  },
  navItem: {
    flex: 1,
    alignItems: 'center'
  },
  navIconWrap: {
    width: 44,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navIconWrapActive: {
    backgroundColor: C.brown,
    borderRadius: 12,
    width: 50
  },
  navLabel: {
    fontSize: 10,
    color: C.mutedText,
    marginTop: 4
  },
  navLabelActive: {
    color: C.orange,
    fontWeight: 'bold'
  },

  // Misc
  arcContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden'
  },
  arcOuter: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 40,
    borderColor: C.orange + '10'
  },
  arcInner: {
    position: 'absolute',
    top: -20,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 20,
    borderColor: C.white + '08'
  },
  halfCircle: {
    position: 'absolute',
    bottom: -100, left: -50,
    width: 250, height: 250,
    borderRadius: 125,
    borderWidth: 30,
    borderColor: C.orange + '05'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40
  },
  emptyStateText: {
    color: C.white + '66'
  },
});

export default HomeScreen;