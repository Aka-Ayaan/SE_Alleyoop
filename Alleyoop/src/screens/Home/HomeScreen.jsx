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
  // SafeAreaView,
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

const STORIES = [
  { id: '1', name: 'Your Story', isOwn: true },
  { id: '2', name: 'CourtKing' },
  { id: '3', name: 'HoopZone' },
  { id: '4', name: 'ProArena' },
  { id: '5', name: 'DunkPit' },
  { id: '6', name: 'NetCity' },
];

const VENUE_POSTS = [
  { id: 'v1', user: 'CourtKing Arena', location: 'Karachi, DHA', likes: 248, comments: 31, time: '2h', verified: true, caption: 'Full court available for booking this weekend 🏀 Air-conditioned, premium flooring.' },
  { id: 'v2', user: 'HoopZone', location: 'Lahore, Gulberg', likes: 183, comments: 14, time: '5h', verified: false, caption: 'New 3x3 court just opened! First 10 bookings get 20% off. Come hoop with us 🔥' },
  { id: 'v3', user: 'ProArena Clifton', location: 'Karachi, Clifton', likes: 412, comments: 57, time: '8h', verified: true, caption: 'Saturday league sign-ups are OPEN. Limited spots remaining — book your team now.' },
];

const SHOP_POSTS = [
  { id: 's1', user: 'BallUp Store', location: 'Online', likes: 521, comments: 44, time: '1h', verified: true, caption: 'New Spalding NBA game ball just dropped 🏀 Free shipping on orders over Rs. 3000.' },
  { id: 's2', user: 'HoopGear PK', location: 'Karachi', likes: 310, comments: 28, time: '3h', verified: false, caption: 'Custom jerseys now available! Choose your number, name, and team colors. DM to order.' },
  { id: 's3', user: 'CourtSwag', location: 'Lahore', likes: 198, comments: 19, time: '6h', verified: false, caption: 'Nike Kyrie 9 restock — sizes 7 to 12 available. Grab yours before they sell out again 👟' },
];

const TRAINING_POSTS = [
  { id: 't1', user: 'Coach Raza', location: 'Karachi', likes: 374, comments: 62, time: '30m', verified: true, caption: 'Morning drills with the U18 squad 💪 These kids are putting in the work every day.' },
  { id: 't2', user: 'EliteHoops', location: 'Islamabad', likes: 289, comments: 35, time: '2h', verified: true, caption: 'Handles & footwork session — 2 spots open for next week. Link in bio to register.' },
  { id: 't3', user: 'SkillLab PK', location: 'Lahore', likes: 156, comments: 21, time: '4h', verified: false, caption: 'Shooting form breakdown thread 🧵 Swipe to see the 5 most common mistakes and how to fix them.' },
];

// ─── Subcomponents ───────────────────────────────────────────────────────────

function StoryBubble({ story }) {
  return (
    <TouchableOpacity style={styles.storyItem} activeOpacity={0.8}>
      <View style={[styles.storyRing, story.isOwn && styles.storyRingOwn]}>
        <View style={styles.storyAvatar}>
          {story.isOwn ? (
            <View style={styles.storyAddBtn}>
              <MaterialCommunityIcons name="plus" size={20} color={C.white} />
            </View>
          ) : (
            <Text style={styles.storyAvatarText}>
              {story.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.storyName} numberOfLines={1}>
        {story.isOwn ? 'Your Story' : story.name}
      </Text>
    </TouchableOpacity>
  );
}

function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    setLiked(prev => !prev);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, tension: 120 }),
    ]).start();
  };

  // Generate a deterministic placeholder color from post id
  const avatarColors = ['#E76F2E', '#2FA4D7', '#3E2C23', '#8B4513', '#D2691E'];
  const colorIdx = post.id.charCodeAt(1) % avatarColors.length;

  return (
    <View style={styles.postCard}>
      {/* Post header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <View style={[styles.postAvatar, { backgroundColor: avatarColors[colorIdx] }]}>
            <Text style={styles.postAvatarText}>{post.user.charAt(0)}</Text>
          </View>
          <View>
            <View style={styles.postUserRow}>
              <Text style={styles.postUsername}>{post.user}</Text>
              {post.verified && (
                <MaterialCommunityIcons name="check-decagram" size={14} color={C.blue} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.postLocation}>{post.location}</Text>
          </View>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={C.brown} />
        </TouchableOpacity>
      </View>

      {/* Post image placeholder */}
      <View style={styles.postImage}>
        <View style={styles.postImageInner}>
          <MaterialCommunityIcons name="basketball" size={48} color={C.orange + '44'} />
        </View>
      </View>

      {/* Action bar */}
      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <MaterialCommunityIcons
                name={liked ? 'heart' : 'heart-outline'}
                size={26}
                color={liked ? '#E53935' : C.brown}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialCommunityIcons name="comment-outline" size={26} color={C.brown} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialCommunityIcons name="send-outline" size={24} color={C.brown} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setSaved(p => !p)}>
          <MaterialCommunityIcons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? C.orange : C.brown}
          />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      <View style={styles.postMeta}>
        <Text style={styles.postLikes}>{(post.likes + (liked ? 1 : 0)).toLocaleString()} likes</Text>
        <Text style={styles.postCaption}>
          <Text style={styles.postCaptionUser}>{post.user} </Text>
          {post.caption}
        </Text>
        <Text style={styles.postComments}>View all {post.comments} comments</Text>
        <Text style={styles.postTime}>{post.time} ago</Text>
      </View>
    </View>
  );
}

// ─── Tab screens ─────────────────────────────────────────────────────────────

function FeedScreen({ posts }) {
  return (
    <View style={styles.rootbrown}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      // ListHeaderComponent={
      //   <ScrollView
      //     horizontal
      //     showsHorizontalScrollIndicator={false}
      //     contentContainerStyle={styles.storiesRow}
      //     style={styles.storiesContainer}
      //   >
      //     {STORIES.map(s => <StoryBubble key={s.id} story={s} />)}
      //   </ScrollView>
      // }
      // ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
      // renderItem={({ item }) => <PostCard post={item} />}
      />
    </View>
  );
}

function ProfileScreen({ onLogout, user }) {
  const stats = [
    { label: 'Bookings', value: '24' },
    { label: 'Following', value: '138' },
    { label: 'Followers', value: '91' },
  ];

  const menuItems = [
    { icon: 'account-edit-outline', label: 'Edit Profile' },
    { icon: 'calendar-check-outline', label: 'My Bookings' },
    { icon: 'heart-outline', label: 'Saved Venues' },
    { icon: 'bell-outline', label: 'Notifications' },
    { icon: 'shield-lock-outline', label: 'Privacy & Security' },
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

export function HomeScreen({ user, onLogout }) {
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
    <FeedScreen key="venue" posts={VENUE_POSTS} />,
    <FeedScreen key="shopping" posts={SHOP_POSTS} />,
    <FeedScreen key="training" posts={TRAINING_POSTS} />,
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
    fontSize: 15, // Slightly larger
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

  // ── Stories ────────────────────────────────────────────────────────────────
  storiesContainer: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  storiesRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 66,
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: C.orange,
    padding: 2,
    marginBottom: 5,
  },
  storyRingOwn: {
    borderColor: C.brown + '44',
    borderStyle: 'dashed',
  },
  storyAvatar: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: C.brown,
  },
  storyAddBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: {
    fontSize: 11,
    color: C.brown,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Post card ──────────────────────────────────────────────────────────────
  postCard: {
    backgroundColor: C.white,
  },
  postSeparator: {
    height: 8,
    backgroundColor: C.bg,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },
  postUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: C.brown,
  },
  postLocation: {
    fontSize: 11,
    color: C.mutedText,
    marginTop: 1,
  },
  postImage: {
    width,
    height: width,
    backgroundColor: C.bg,
  },
  postImageInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 4,
    marginRight: 6,
  },
  postMeta: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 3,
  },
  postLikes: {
    fontSize: 13,
    fontWeight: '700',
    color: C.brown,
  },
  postCaption: {
    fontSize: 13,
    color: C.brown,
    lineHeight: 18,
  },
  postCaptionUser: {
    fontWeight: '700',
  },
  postComments: {
    fontSize: 13,
    color: C.mutedText,
    marginTop: 2,
  },
  postTime: {
    fontSize: 11,
    color: C.mutedText,
    marginTop: 2,
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

export default HomeScreen;