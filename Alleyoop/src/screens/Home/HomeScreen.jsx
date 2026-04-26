

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
  Switch,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL, endpoints } from '../../config/api';
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
  green: '#4CAF50',
  red: '#F44336',
};

const TABS = [
  { id: 'venue', label: 'Venues', icon: 'stadium-outline', activeIcon: 'stadium' },
  { id: 'shopping', label: 'Shop', icon: 'shopping-outline', activeIcon: 'shopping' },
  { id: 'training', label: 'Training', icon: 'clipboard-text-outline', activeIcon: 'clipboard-text' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-check-outline', activeIcon: 'calendar-check' },
  { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

const SKILL_LEVEL_LABELS = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Professional',
};

const normalizeImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (String(imagePath).startsWith('http')) return imagePath;
  return `${API_BASE_URL}${String(imagePath).startsWith('/') ? '' : '/'}${imagePath}`;
};

const toDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const toDisplayTime = (timeStr) => {
  if (!timeStr) return '';
  const [h = '00', m = '00'] = String(timeStr).split(':');
  const hour = Number(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = ((hour + 11) % 12) + 1;
  return `${normalizedHour}:${m} ${suffix}`;
};

const addHoursToDbTime = (startTime, hoursToAdd) => {
  const [h = '0', m = '0', s = '0'] = String(startTime).split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m), Number(s), 0);
  date.setHours(date.getHours() + Number(hoursToAdd || 1));
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

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
      sports: ['Basketball', 'Tennis'],
      isAvailable: true,
      pricePerHour: 2500,
      description: 'State-of-the-art multi-sport arena with 4 courts, floodlights, and modern amenities. Perfect for tournaments and casual games alike.',
      amenities: ['Changing Rooms', 'Parking', 'Cafe', 'Floodlights', 'First Aid'],
      courts: 4,
      phone: '+92 300 1234567',
    },
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
      isAvailable: false,
      pricePerHour: 1800,
      description: 'Dedicated basketball facility with professional-grade flooring and NBA-spec hoops. Home of Lahore\'s top streetball scene.',
      amenities: ['Parking', 'Spectator Seating', 'Scoreboard'],
      courts: 2,
      phone: '+92 321 9876543',
    },
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
      isAvailable: true,
      pricePerHour: 3200,
      description: 'Premium sports facility with clay and hard courts. Certified coaches available on request. Karachi\'s finest tennis destination.',
      amenities: ['Changing Rooms', 'Parking', 'Pro Shop', 'Coaching', 'Cafe'],
      courts: 6,
      phone: '+92 333 5551234',
    },
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
      sports: ['Balls', 'Shoes'],
      isAvailable: true,
      priceRange: 'Rs. 500 - 25,000',
      description: 'Pakistan\'s largest online sports equipment store. Authentic gear for every sport, delivered to your doorstep.',
      products: [
        { name: 'Wilson Basketball Pro', price: 8500, inStock: true },
        { name: 'Nike Air Zoom', price: 18000, inStock: true },
        { name: 'Spalding Indoor Ball', price: 6200, inStock: false },
      ],
      phone: '+92 311 2345678',
    },
  },
  {
    id: 's2',
    user: {
      name: 'HoopGear PK',
      image: require('../../../assets/tennis.png'),
      rating: '4.2',
      timings: '11:00 AM - 09:00 PM',
      location: 'Karachi, LuckyOne',
      sports: ['Apparel'],
      isAvailable: true,
      priceRange: 'Rs. 1,200 - 15,000',
      description: 'Streetwear meets sport. Exclusive basketball jerseys, training gear, and lifestyle apparel for ballers.',
      products: [
        { name: 'Custom Jersey Set', price: 3500, inStock: true },
        { name: 'Training Shorts', price: 1800, inStock: true },
        { name: 'Compression Sleeve', price: 1200, inStock: true },
      ],
      phone: '+92 322 8765432',
    },
  },
  {
    id: 's3',
    user: {
      name: 'CourtSwag',
      image: require('../../../assets/tennis.png'),
      rating: '4.6',
      timings: 'Closed Today',
      location: 'Lahore, Model Town',
      sports: ['Custom Kits'],
      isAvailable: false,
      priceRange: 'Rs. 5,000 - 50,000',
      description: 'Premium custom kit makers. Team uniforms, bespoke designs, and bulk orders for clubs and tournaments.',
      products: [
        { name: 'Team Kit (11-piece)', price: 35000, inStock: true },
        { name: 'Custom Cap', price: 2000, inStock: false },
      ],
      phone: '+92 344 6543210',
    },
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
      isAvailable: true,
      pricePerSession: 2000,
      description: 'Former national player with 12 years of coaching experience. Specializes in shooting form and defensive footwork. All skill levels welcome.',
      sessions: ['Morning Drills (6-8 AM)', 'Afternoon Clinic (4-6 PM)', 'Weekend Camp (Sat 9-12 PM)'],
      maxPlayers: 12,
      currentEnrolled: 8,
      phone: '+92 300 9988776',
    },
  },
  {
    id: 't2',
    user: {
      name: 'EliteHoops',
      image: require('../../../assets/tennis.png'),
      rating: '4.8',
      timings: 'Weekend Camps',
      location: 'Islamabad, F-10',
      sports: ['Vertical Jump'],
      isAvailable: true,
      pricePerSession: 3500,
      description: 'Science-based jump training program. Increase your vertical by 8-12 inches in 8 weeks. Certified strength & conditioning coaches.',
      sessions: ['Weekend Intensive (Sat & Sun, 8-11 AM)', 'Online Program Available'],
      maxPlayers: 15,
      currentEnrolled: 11,
      phone: '+92 51 1234567',
    },
  },
  {
    id: 't3',
    user: {
      name: 'SkillLab PK',
      image: require('../../../assets/tennis.png'),
      rating: '4.4',
      timings: 'Fully Booked',
      location: 'Lahore, Johar Town',
      sports: ['Handles'],
      isAvailable: false,
      pricePerSession: 1500,
      description: 'Elite ball-handling academy. Crossover moves, behind-the-back, and advanced dribbling techniques for competitive players.',
      sessions: ['Evening Session (6-8 PM)', 'Saturday Special (10 AM-1 PM)'],
      maxPlayers: 10,
      currentEnrolled: 10,
      phone: '+92 42 9876543',
    },
  },
];

// ─── Public Bookings (Matchmaking Data) ─────────────────────────────────────

const initialPublicBookings = [
  {
    id: 'pb1',
    venue: 'CourtKing Arena',
    sport: 'Basketball',
    date: 'Sat, May 3',
    time: '6:00 PM - 8:00 PM',
    location: 'Karachi, DHA',
    organizer: 'Ali Khan',
    spotsTotal: 10,
    spotsFilled: 6,
    level: 'Intermediate',
  },
  {
    id: 'pb2',
    venue: 'ProArena Clifton',
    sport: 'Tennis',
    date: 'Sun, May 4',
    time: '9:00 AM - 11:00 AM',
    location: 'Karachi, Clifton',
    organizer: 'Sara Ahmed',
    spotsTotal: 4,
    spotsFilled: 2,
    level: 'Beginner',
  },
  {
    id: 'pb3',
    venue: 'HoopZone',
    sport: '3x3 Basketball',
    date: 'Sat, May 3',
    time: '4:00 PM - 6:00 PM',
    location: 'Lahore, Gulberg',
    organizer: 'Usman Tariq',
    spotsTotal: 6,
    spotsFilled: 5,
    level: 'Advanced',
  },
  {
    id: 'pb4',
    venue: 'ProArena Clifton',
    sport: 'Padel',
    date: 'Fri, May 2',
    time: '7:00 PM - 9:00 PM',
    location: 'Karachi, Clifton',
    organizer: 'Zara Sheikh',
    spotsTotal: 4,
    spotsFilled: 1,
    level: 'Beginner',
  },
];

// ─── Reusable Components ─────────────────────────────────────────────────────

const FilterGroup = ({ options, current, setter, dark = true }) => (
  <View style={[styles.filterContainer, !dark && styles.filterContainerLight]}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          onPress={() => setter(opt)}
          style={[
            styles.filterChip,
            !dark && styles.filterChipLight,
            current === opt && styles.filterChipActive,
          ]}
        >
          <Text style={[styles.filterChipText, !dark && styles.filterChipTextLight, current === opt && styles.filterChipTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

function PostCard({ post, onPress }) {
  const { name, image, rating, timings, location, sports, isAvailable } = post.user;
  const imageSource = typeof image === 'string' ? { uri: image } : image;
  return (
    <TouchableOpacity style={styles.venueCard} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.cardImageContainer}>
        <Image source={imageSource} style={styles.venueImage} resizeMode="cover" />
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
            <View key={index} style={styles.sportTag}>
              <Text style={styles.sportTagText}>{sport}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.availabilityCard, { backgroundColor: isAvailable ? '#E8F5E9' : '#FFEBEE' }]}>
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? C.green : C.red }]} />
          <Text style={[styles.availabilityText, { color: isAvailable ? '#2E7D32' : '#C62828' }]}>
            {isAvailable ? 'Available Now' : 'Fully Booked'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Screens ───────────────────────────────────────────────────────────

function VenueDetailScreen({ data, onBack, onBookingCreated, user, courtTypeIdByName }) {
  const v = data.user;
  const [bookingDate, setBookingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeSlot, setTimeSlot] = useState('');
  const [duration, setDuration] = useState('1');
  const [isPublic, setIsPublic] = useState(false);
  const [sport, setSport] = useState(v.sports?.[0] || '');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [players, setPlayers] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = [
    { label: '7:00 AM', value: '07:00:00' },
    { label: '9:00 AM', value: '09:00:00' },
    { label: '11:00 AM', value: '11:00:00' },
    { label: '2:00 PM', value: '14:00:00' },
    { label: '4:00 PM', value: '16:00:00' },
    { label: '6:00 PM', value: '18:00:00' },
    { label: '8:00 PM', value: '20:00:00' },
  ];

  const availableCourtsForSport = useMemo(() => {
    if (!Array.isArray(v.courtsData) || !sport) return [];
    return v.courtsData.filter(
      (court) => court.status === 'available' && Array.isArray(court.sports) && court.sports.includes(sport),
    );
  }, [v.courtsData, sport]);

  useEffect(() => {
    if (availableCourtsForSport.length > 0) {
      setSelectedCourtId(String(availableCourtsForSport[0].id));
    } else {
      setSelectedCourtId('');
    }
  }, [availableCourtsForSport]);

  const selectedDateString = useMemo(() => {
    const y = bookingDate.getFullYear();
    const m = String(bookingDate.getMonth() + 1).padStart(2, '0');
    const d = String(bookingDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [bookingDate]);

  const selectedDateLabel = useMemo(() => {
    return bookingDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, [bookingDate]);

  const onDateChange = (_, selected) => {
    setShowDatePicker(false);
    if (selected) {
      setBookingDate(selected);
    }
  };

  const handleBook = async () => {
    if (!selectedDateString || !timeSlot) {
      Alert.alert('Incomplete', 'Please fill in the date and time slot.');
      return;
    }

    const [hh = '00', mm = '00', ss = '00'] = String(timeSlot).split(':');
    const bookingStart = new Date(bookingDate);
    bookingStart.setHours(Number(hh), Number(mm), Number(ss), 0);
    if (bookingStart.getTime() <= Date.now()) {
      Alert.alert('Invalid booking time', 'Please choose a future date and time.');
      return;
    }

    if (!user?.userId) {
      Alert.alert('Not logged in', 'Please log in again and try booking.');
      return;
    }

    if (!sport) {
      Alert.alert('Missing sport', 'Please select a sport.');
      return;
    }

    const courtTypeId = courtTypeIdByName[String(sport).toLowerCase()];
    if (!courtTypeId) {
      Alert.alert('Sport unavailable', 'Selected sport is not configured in backend court types.');
      return;
    }

    const selectedCourt = availableCourtsForSport.find((c) => String(c.id) === String(selectedCourtId));
    if (!selectedCourt) {
      Alert.alert('No court available', 'No available court matches the selected sport right now.');
      return;
    }

    const endTime = addHoursToDbTime(timeSlot, Number(duration || 1));

    setSubmitting(true);
    try {
      const response = await fetch(endpoints.createBooking, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          courtId: selectedCourt.id,
          courtTypeId,
          date: selectedDateString,
          startTime: timeSlot,
          endTime,
          is_private: !isPublic,
          status: 'confirmed',
          participantsCount: isPublic ? (parseInt(players, 10) || 10) : 1,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        Alert.alert('Booking failed', payload.error || 'Could not create booking.');
        return;
      }

      if (onBookingCreated) {
        onBookingCreated();
      }

      setSubmitted(true);
    } catch (err) {
      Alert.alert('Booking failed', 'Could not reach server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.detailRoot}>
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={64} color={C.green} />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>{v.name}</Text>
            <Text style={styles.successMeta}>{selectedDateString} · {toDisplayTime(timeSlot)} · {duration}h</Text>
            {isPublic && (
              <View style={styles.publicBadge}>
                <MaterialCommunityIcons name="earth" size={14} color={C.blue} />
                <Text style={styles.publicBadgeText}>Listed on Matchmaking</Text>
              </View>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.detailRoot}>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.detailHero}>
          <Image source={typeof v.image === 'string' ? { uri: v.image } : v.image} style={styles.detailHeroImage} resizeMode="cover" />
          <View style={styles.detailHeroOverlay} />
          <View style={styles.detailHeroContent}>
            <View style={styles.ratingBadgeLg}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingTextLg}>{v.rating}</Text>
            </View>
            <Text style={styles.detailHeroTitle}>{v.name}</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={C.cream} />
              <Text style={[styles.infoText, { color: C.cream }]}>{v.location}</Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.detailInfoRow}>
          <View style={styles.detailInfoCard}>
            <MaterialCommunityIcons name="clock-outline" size={22} color={C.orange} />
            <Text style={styles.detailInfoLabel}>Hours</Text>
            <Text style={styles.detailInfoValue}>{v.timings}</Text>
          </View>
          <View style={styles.detailInfoCard}>
            <MaterialCommunityIcons name="currency-inr" size={22} color={C.orange} />
            <Text style={styles.detailInfoLabel}>Per Hour</Text>
            <Text style={styles.detailInfoValue}>Rs. {v.pricePerHour?.toLocaleString()}</Text>
          </View>
          <View style={styles.detailInfoCard}>
            <MaterialCommunityIcons name="table-tennis" size={22} color={C.orange} />
            <Text style={styles.detailInfoLabel}>Courts</Text>
            <Text style={styles.detailInfoValue}>{v.courts}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descText}>{v.description}</Text>
        </View>

        {/* Sports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sports Available</Text>
          <View style={styles.tagsRow}>
            {(v.sports || []).map((s, i) => (
              <View key={i} style={styles.sportTagLg}>
                <Text style={styles.sportTagLgText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.tagsRow}>
            {v.amenities?.map((a, i) => (
              <View key={i} style={styles.amenityTag}>
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={C.green} />
                <Text style={styles.amenityText}>{a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Booking Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book This Venue</Text>

          <Text style={styles.inputLabel}>Select Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={styles.tagsRow}>
              {(v.sports || []).map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSport(s)}
                  style={[styles.selectChip, sport === s && styles.selectChipActive]}
                >
                  <Text style={[styles.selectChipText, sport === s && styles.selectChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {Array.isArray(v.courtsData) && v.courtsData.length > 0 && (
            <>
              <Text style={styles.inputLabel}>Select Court</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={styles.tagsRow}>
                  {availableCourtsForSport.map((court) => (
                    <TouchableOpacity
                      key={court.id}
                      onPress={() => setSelectedCourtId(String(court.id))}
                      style={[styles.selectChip, String(court.id) === selectedCourtId && styles.selectChipActive]}
                    >
                      <Text style={[styles.selectChipText, String(court.id) === selectedCourtId && styles.selectChipTextActive]}>
                        {court.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={styles.textInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.datePickerRow}>
              <MaterialCommunityIcons name="calendar-month-outline" size={18} color={C.orange} />
              <Text style={styles.datePickerText}>{selectedDateLabel}</Text>
            </View>
          </TouchableOpacity>
          {showDatePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          ) : null}

          <Text style={styles.inputLabel}>Time Slot</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {timeSlots.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTimeSlot(t.value)}
                  style={[styles.selectChip, timeSlot === t.value && styles.selectChipActive]}
                >
                  <Text style={[styles.selectChipText, timeSlot === t.value && styles.selectChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.inputLabel}>Duration (hours)</Text>
          <View style={styles.durationRow}>
            {['1', '2', '3', '4'].map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => setDuration(d)}
                style={[styles.durationChip, duration === d && styles.durationChipActive]}
              >
                <Text style={[styles.durationChipText, duration === d && styles.durationChipTextActive]}>{d}h</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cost Preview */}
          {v.pricePerHour && (
            <View style={styles.costPreview}>
              <Text style={styles.costLabel}>Estimated Cost</Text>
              <Text style={styles.costValue}>Rs. {(v.pricePerHour * parseInt(duration)).toLocaleString()}</Text>
            </View>
          )}

          {/* Public / Private Toggle */}
          <View style={styles.visibilityToggle}>
            <View style={styles.visibilityLeft}>
              <MaterialCommunityIcons name={isPublic ? 'earth' : 'lock-outline'} size={22} color={isPublic ? C.blue : C.mutedText} />
              <View>
                <Text style={styles.visibilityTitle}>{isPublic ? 'Public Booking' : 'Private Booking'}</Text>
                <Text style={styles.visibilitySubtitle}>
                  {isPublic ? 'Others can find & join via Matchmaking' : 'Only you can see this booking'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: C.border, true: C.blue + '55' }}
              thumbColor={isPublic ? C.blue : C.mutedText}
            />
          </View>

          {isPublic && (
            <>
              <Text style={styles.inputLabel}>Max Players Needed</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 10"
                placeholderTextColor={C.mutedText}
                keyboardType="number-pad"
                value={players}
                onChangeText={setPlayers}
              />
            </>
          )}

          <TouchableOpacity style={[styles.primaryBtn, (!v.isAvailable || submitting) && styles.primaryBtnDisabled]} onPress={handleBook} disabled={!v.isAvailable || submitting}>
            <MaterialCommunityIcons name="calendar-check" size={18} color={C.white} />
            <Text style={styles.primaryBtnText}>{submitting ? 'Booking...' : (v.isAvailable ? 'Confirm Booking' : 'Currently Unavailable')}</Text>
          </TouchableOpacity>

          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone-outline" size={16} color={C.orange} />
            <Text style={styles.contactText}>{v.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ProductDetailScreen({ data, onBack }) {
  const p = data.user;
  const [selectedProduct, setSelectedProduct] = useState(p.products?.[0] || null);
  const [qty, setQty] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const handleOrder = () => {
    if (!selectedProduct?.inStock) {
      Alert.alert('Out of Stock', 'This item is currently unavailable.');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={styles.detailRoot}>
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={64} color={C.green} />
            </View>
            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSubtitle}>{selectedProduct?.name}</Text>
            <Text style={styles.successMeta}>Qty: {qty} · Rs. {(selectedProduct?.price * qty).toLocaleString()}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
              <Text style={styles.primaryBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.detailRoot}>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHero}>
          <Image source={p.image} style={styles.detailHeroImage} resizeMode="cover" />
          <View style={styles.detailHeroOverlay} />
          <View style={styles.detailHeroContent}>
            <View style={styles.ratingBadgeLg}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingTextLg}>{p.rating}</Text>
            </View>
            <Text style={styles.detailHeroTitle}>{p.name}</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={C.cream} />
              <Text style={[styles.infoText, { color: C.cream }]}>{p.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descText}>{p.description}</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="tag-outline" size={16} color={C.orange} />
            <Text style={styles.infoText}>{p.priceRange}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={C.orange} />
            <Text style={styles.infoText}>{p.timings}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select a Product</Text>
          {p.products?.map((prod, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.productRow, selectedProduct?.name === prod.name && styles.productRowActive]}
              onPress={() => setSelectedProduct(prod)}
            >
              <View style={styles.productRowLeft}>
                <View style={[styles.radioCircle, selectedProduct?.name === prod.name && styles.radioCircleActive]}>
                  {selectedProduct?.name === prod.name && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={styles.productName}>{prod.name}</Text>
                  <Text style={[styles.stockText, { color: prod.inStock ? C.green : C.red }]}>
                    {prod.inStock ? 'In Stock' : 'Out of Stock'}
                  </Text>
                </View>
              </View>
              <Text style={styles.productPrice}>Rs. {prod.price.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
              <MaterialCommunityIcons name="minus" size={20} color={C.brown} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => q + 1)}>
              <MaterialCommunityIcons name="plus" size={20} color={C.brown} />
            </TouchableOpacity>
          </View>
          {selectedProduct && (
            <View style={styles.costPreview}>
              <Text style={styles.costLabel}>Total</Text>
              <Text style={styles.costValue}>Rs. {(selectedProduct.price * qty).toLocaleString()}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedProduct?.inStock && styles.primaryBtnDisabled]}
            onPress={handleOrder}
            disabled={!selectedProduct?.inStock}
          >
            <MaterialCommunityIcons name="cart-plus" size={18} color={C.white} />
            <Text style={styles.primaryBtnText}>
              {selectedProduct?.inStock ? 'Place Order' : 'Out of Stock'}
            </Text>
          </TouchableOpacity>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone-outline" size={16} color={C.orange} />
            <Text style={styles.contactText}>{p.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TrainingDetailScreen({ data, onBack }) {
  const t = data.user;
  const [selectedSession, setSelectedSession] = useState(t.sessions?.[0] || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const spotsLeft = t.maxPlayers - t.currentEnrolled;

  const handleRegister = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Incomplete', 'Please enter your name and phone number.');
      return;
    }

    // Name: no numbers
    if (/\d/.test(name.trim())) {
      Alert.alert('Invalid name', 'Name cannot contain numbers.');
      return;
    }

    // Phone: digits only, optional +, spaces, dashes
    if (!/^\+?[\d\s\-()]{7,15}$/.test(phone.trim())) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={styles.detailRoot}>
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={64} color={C.green} />
            </View>
            <Text style={styles.successTitle}>Registered!</Text>
            <Text style={styles.successSubtitle}>{t.name}</Text>
            <Text style={styles.successMeta}>{selectedSession}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.detailRoot}>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHero}>
          <Image source={t.image} style={styles.detailHeroImage} resizeMode="cover" />
          <View style={styles.detailHeroOverlay} />
          <View style={styles.detailHeroContent}>
            <View style={styles.ratingBadgeLg}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingTextLg}>{t.rating}</Text>
            </View>
            <Text style={styles.detailHeroTitle}>{t.name}</Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={C.cream} />
              <Text style={[styles.infoText, { color: C.cream }]}>{t.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailInfoRow}>
          <View style={styles.detailInfoCard}>
            <MaterialCommunityIcons name="currency-inr" size={22} color={C.orange} />
            <Text style={styles.detailInfoLabel}>Per Session</Text>
            <Text style={styles.detailInfoValue}>Rs. {t.pricePerSession?.toLocaleString()}</Text>
          </View>
          <View style={styles.detailInfoCard}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={C.orange} />
            <Text style={styles.detailInfoLabel}>Max Players</Text>
            <Text style={styles.detailInfoValue}>{t.maxPlayers}</Text>
          </View>
          <View style={styles.detailInfoCard}>
            <MaterialCommunityIcons name="seat-outline" size={22} color={spotsLeft > 0 ? C.green : C.red} />
            <Text style={styles.detailInfoLabel}>Spots Left</Text>
            <Text style={[styles.detailInfoValue, { color: spotsLeft > 0 ? C.green : C.red }]}>
              {spotsLeft > 0 ? spotsLeft : 'Full'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descText}>{t.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <View style={styles.tagsRow}>
            {t.sports.map((s, i) => (
              <View key={i} style={styles.sportTagLg}>
                <Text style={styles.sportTagLgText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Enrollment Progress */}
        <View style={styles.section}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Enrollment</Text>
            <Text style={styles.progressCount}>{t.currentEnrolled}/{t.maxPlayers}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(t.currentEnrolled / t.maxPlayers) * 100}%`, backgroundColor: spotsLeft > 2 ? C.green : spotsLeft > 0 ? C.orange : C.red }]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Register Now</Text>

          <Text style={styles.inputLabel}>Select Session</Text>
          {t.sessions?.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.productRow, selectedSession === s && styles.productRowActive]}
              onPress={() => setSelectedSession(s)}
            >
              <View style={styles.productRowLeft}>
                <View style={[styles.radioCircle, selectedSession === s && styles.radioCircleActive]}>
                  {selectedSession === s && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.productName}>{s}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Full name"
            placeholderTextColor={C.mutedText}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            placeholder="+92 3XX XXXXXXX"
            placeholderTextColor={C.mutedText}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, spotsLeft <= 0 && styles.primaryBtnDisabled]}
            onPress={handleRegister}
            disabled={spotsLeft <= 0}
          >
            <MaterialCommunityIcons name="clipboard-check" size={18} color={C.white} />
            <Text style={styles.primaryBtnText}>
              {spotsLeft > 0 ? 'Register for Training' : 'Session Full'}
            </Text>
          </TouchableOpacity>

          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone-outline" size={16} color={C.orange} />
            <Text style={styles.contactText}>{t.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileSubScreen({ id, onBack }) {
  return (
    <View style={styles.detailRoot}>
      <ScrollView contentContainerStyle={[styles.detailScroll, { alignItems: 'center', paddingTop: 60 }]}>
        <MaterialCommunityIcons name="cog-outline" size={80} color={C.orange + '55'} />
        <Text style={styles.detailHeroTitle}>{id}</Text>
        <Text style={styles.descText}>This section is coming soon.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 30 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Bookings Screen ─────────────────────────────────────────────────────────

function BookingsScreen({
  publicBookings,
  privateBookings,
  publicBookingsLoading,
  privateBookingsLoading,
  onJoinBooking,
  joiningBookingId,
  currentUserId,
}) {
  const [bookingView, setBookingView] = useState('public');
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [sportFilter, setSportFilter] = useState('All');
  const [venueFilter, setVenueFilter] = useState('All');

  const sports = useMemo(() => {
    const s = new Set(['All']);
    publicBookings.forEach(b => s.add(b.sport));
    return Array.from(s);
  }, [publicBookings]);

  const venues = useMemo(() => {
    const v = new Set(['All']);
    publicBookings.forEach(b => v.add(b.venue));
    return Array.from(v);
  }, [publicBookings]);

  const filtered = useMemo(() => {
    return publicBookings.filter(b => {
      const sportMatch = sportFilter === 'All' || b.sport === sportFilter;
      const venueMatch = venueFilter === 'All' || b.venue === venueFilter;
      return sportMatch && venueMatch;
    });
  }, [publicBookings, sportFilter, venueFilter]);

  const levelColor = { Beginner: '#2FA4D7', Intermediate: C.orange, Advanced: '#C62828', 'All Levels': C.green };

  const privateStatusColor = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'confirmed') return C.green;
    if (normalized === 'pending') return C.orange;
    if (normalized === 'cancelled') return C.red;
    return C.brown;
  };

  return (
    <View style={styles.rootbrown}>
      <View style={styles.arcContainer} pointerEvents="none">
        <View style={styles.arcOuter} />
        <View style={styles.arcInner} />
        <View style={styles.halfCircle} />
      </View>

      <View style={styles.bookingToggleRow}>
        <TouchableOpacity
          style={[styles.bookingToggleBtn, bookingView === 'public' && styles.bookingToggleBtnActive]}
          onPress={() => {
            setBookingView('public');
            setFiltersCollapsed(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.bookingToggleText, bookingView === 'public' && styles.bookingToggleTextActive]}>Public</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookingToggleBtn, bookingView === 'private' && styles.bookingToggleBtnActive]}
          onPress={() => setBookingView('private')}
          activeOpacity={0.85}
        >
          <Text style={[styles.bookingToggleText, bookingView === 'private' && styles.bookingToggleTextActive]}>Private</Text>
        </TouchableOpacity>
      </View>

      {bookingView === 'public' ? (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
          ListHeaderComponent={
            <View>
              <View style={styles.matchmakingHeader}>
                <Text style={styles.matchmakingHeading}>Bookings</Text>
                <Text style={styles.matchmakingSubheading}>Manage your own bookings or join public games</Text>
              </View>
              <View style={styles.filterSection}>
                <TouchableOpacity
                  style={styles.filterCollapseBtn}
                  onPress={() => setFiltersCollapsed((prev) => !prev)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.filterCollapseText}>Filters</Text>
                  <MaterialCommunityIcons
                    name={filtersCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={18}
                    color={C.cream + 'DD'}
                  />
                </TouchableOpacity>

                {!filtersCollapsed ? (
                  <>
                    <Text style={styles.filterLabel}>Sport</Text>
                    <FilterGroup options={sports} current={sportFilter} setter={setSportFilter} />
                    <Text style={[styles.filterLabel, { marginTop: 8 }]}>Venue</Text>
                    <FilterGroup options={venues} current={venueFilter} setter={setVenueFilter} />
                  </>
                ) : null}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const spots = item.spotsTotal - item.spotsFilled;
            const isOwnMatch = Number(item.hostPlayerId) === Number(currentUserId);
            const isAlreadyJoined = Boolean(item.isJoined);
            return (
              <View style={styles.matchCard}>
                <View style={styles.matchCardTop}>
                  <View style={styles.matchSportBadge}>
                    <Text style={styles.matchSportText}>{item.sport}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: (levelColor[item.level] || C.orange) + '22' }]}>
                    <Text style={[styles.levelText, { color: levelColor[item.level] || C.orange }]}>{item.level}</Text>
                  </View>
                </View>
                <Text style={styles.matchVenueName}>{item.venue}</Text>
                <View style={styles.matchInfoRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={15} color={C.orange} />
                  <Text style={styles.matchInfoText}>{item.date}</Text>
                  <MaterialCommunityIcons name="clock-outline" size={15} color={C.orange} style={{ marginLeft: 8 }} />
                  <Text style={styles.matchInfoText}>{item.time}</Text>
                </View>
                <View style={styles.matchInfoRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color={C.orange} />
                  <Text style={styles.matchInfoText}>{item.location}</Text>
                </View>
                <View style={styles.matchInfoRow}>
                  <MaterialCommunityIcons name="account-outline" size={15} color={C.orange} />
                  <Text style={styles.matchInfoText}>Organised by {item.organizer}</Text>
                </View>
                {(isOwnMatch || isAlreadyJoined) ? (
                  <View style={styles.matchStatusBadgeRow}>
                    {isOwnMatch ? (
                      <View style={[styles.matchStatusBadge, styles.matchStatusBadgeOwn]}>
                        <MaterialCommunityIcons name="account-check-outline" size={13} color={C.blue} />
                        <Text style={[styles.matchStatusBadgeText, styles.matchStatusBadgeTextOwn]}>Created by you</Text>
                      </View>
                    ) : null}
                    {isAlreadyJoined ? (
                      <View style={[styles.matchStatusBadge, styles.matchStatusBadgeJoined]}>
                        <MaterialCommunityIcons name="check-decagram-outline" size={13} color={C.green} />
                        <Text style={[styles.matchStatusBadgeText, styles.matchStatusBadgeTextJoined]}>Already joined</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.spotsRow}>
                  <Text style={styles.spotsText}>{item.spotsFilled}/{item.spotsTotal} joined</Text>
                  <Text style={[styles.spotsLeft, { color: spots > 0 ? C.green : C.red }]}>
                    {spots > 0 ? `${spots} spot${spots > 1 ? 's' : ''} left` : 'Full'}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${(item.spotsFilled / item.spotsTotal) * 100}%`,
                    backgroundColor: spots > 2 ? C.green : spots > 0 ? C.orange : C.red,
                  }]} />
                </View>

                <TouchableOpacity
                  style={[styles.joinBtn, (spots <= 0 || joiningBookingId === item.id || isOwnMatch || isAlreadyJoined) && styles.joinBtnDisabled]}
                  disabled={spots <= 0 || joiningBookingId === item.id || isOwnMatch || isAlreadyJoined}
                  onPress={() => onJoinBooking && onJoinBooking(item)}
                >
                  <MaterialCommunityIcons name={spots > 0 ? 'account-plus' : 'account-off'} size={16} color={C.white} />
                  <Text style={styles.joinBtnText}>
                    {isOwnMatch
                      ? 'Your Match'
                      : (isAlreadyJoined
                        ? 'Already Joined'
                        : (joiningBookingId === item.id ? 'Joining...' : (spots > 0 ? 'Join Match' : 'Game Full')))}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyMatchState}>
              {publicBookingsLoading ? (
                <>
                  <ActivityIndicator size="large" color={C.orange} />
                  <Text style={styles.emptyMatchSub}>Loading public games...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="account-group-outline" size={60} color={C.orange + '44'} />
                  <Text style={styles.emptyMatchTitle}>No public games found</Text>
                  <Text style={styles.emptyMatchSub}>Adjust filters or book a venue publicly</Text>
                </>
              )}
            </View>
          }
        />
      ) : (
        <FlatList
          data={privateBookings}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
          ListHeaderComponent={
            <View style={styles.matchmakingHeader}>
              <Text style={styles.matchmakingHeading}>Bookings</Text>
              <Text style={styles.matchmakingSubheading}>Manage your own bookings or join public games</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.matchCard}>
              <View style={styles.matchCardTop}>
                <View style={styles.matchSportBadge}>
                  <Text style={styles.matchSportText}>{item.sportName}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: privateStatusColor(item.status) + '22' }]}>
                  <Text style={[styles.levelText, { color: privateStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.matchVenueName}>{item.arenaName}</Text>
              <View style={styles.matchInfoRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={15} color={C.orange} />
                <Text style={styles.matchInfoText}>{item.courtName}</Text>
              </View>
              <View style={styles.matchInfoRow}>
                <MaterialCommunityIcons name="calendar-outline" size={15} color={C.orange} />
                <Text style={styles.matchInfoText}>{item.bookingDateDisplay}</Text>
                <MaterialCommunityIcons name="clock-outline" size={15} color={C.orange} style={{ marginLeft: 8 }} />
                <Text style={styles.matchInfoText}>{item.startTimeDisplay}</Text>
              </View>
              <View style={styles.matchInfoRow}>
                <MaterialCommunityIcons name="timer-outline" size={15} color={C.orange} />
                <Text style={styles.matchInfoText}>{item.durationHours} hour(s)</Text>
              </View>
              <View style={styles.matchStatusBadgeRow}>
                <View style={[styles.matchStatusBadge, styles.matchStatusBadgeOwn]}>
                  <MaterialCommunityIcons name="lock-outline" size={13} color={C.blue} />
                  <Text style={[styles.matchStatusBadgeText, styles.matchStatusBadgeTextOwn]}>Private booking</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyMatchState}>
              {privateBookingsLoading ? (
                <>
                  <ActivityIndicator size="large" color={C.orange} />
                  <Text style={styles.emptyMatchSub}>Loading your private bookings...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="calendar-outline" size={60} color={C.orange + '44'} />
                  <Text style={styles.emptyMatchTitle}>No private bookings yet</Text>
                  <Text style={styles.emptyMatchSub}>Book a venue privately to see it here</Text>
                </>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Tab Feed ─────────────────────────────────────────────────────────────────

function FeedScreen({ posts, type, onSelect, loading = false }) {
  const [filter, setFilter] = useState('All');
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
        <View style={styles.arcOuter} />
        <View style={styles.arcInner} />
        <View style={styles.halfCircle} />
      </View>
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={[styles.emptyStateText, { marginTop: 10 }]}>Loading...</Text>
        </View>
      ) : null}
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

// ─── Profile Screen ───────────────────────────────────────────────────────────

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
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const [venuePosts, setVenuePosts] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [publicBookings, setPublicBookings] = useState([]);
  const [publicBookingsLoading, setPublicBookingsLoading] = useState(false);
  const [privateBookings, setPrivateBookings] = useState([]);
  const [privateBookingsLoading, setPrivateBookingsLoading] = useState(false);
  const [joiningBookingId, setJoiningBookingId] = useState(null);
  const [courtTypeIdByName, setCourtTypeIdByName] = useState({});

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
        else if (g.dx > 50 && activeTab > 0) goToTab(activeTab - 1);
      },
    })
  ).current;

  const loadCourtTypes = useCallback(async () => {
    try {
      const response = await fetch(endpoints.courtTypes);
      const data = await response.json();
      if (!response.ok) return;

      const map = {};
      (data || []).forEach((row) => {
        if (row?.type_name) {
          map[String(row.type_name).toLowerCase()] = row.id;
        }
      });
      setCourtTypeIdByName(map);
    } catch (err) {
      console.error('Error fetching court types:', err);
    }
  }, []);

  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    try {
      const response = await fetch(endpoints.arenasList);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch arenas');
      }

      const mapped = (data || []).map((arena) => ({
        id: String(arena.id),
        user: {
          arenaId: arena.id,
          name: arena.name,
          image: normalizeImageUrl(arena.image_path) || require('../../../assets/tennis.png'),
          rating: arena.rating ? String(arena.rating) : '0.0',
          timings: 'See details',
          location: arena.location || 'Unknown',
          sports: ['Multi-sport'],
          isAvailable: arena.availability === 'available',
          pricePerHour: Number(arena.pricePerHour) || null,
          description: 'Tap to view full arena details.',
          amenities: [],
          courts: Number(arena.total_courts) || 0,
          phone: 'N/A',
          courtsData: [],
        },
      }));

      setVenuePosts(mapped);
    } catch (err) {
      console.error('Error fetching venues:', err);
      setVenuePosts([]);
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  const loadPublicBookings = useCallback(async () => {
    setPublicBookingsLoading(true);
    try {
      const query = user?.userId ? `?userId=${encodeURIComponent(user.userId)}` : '';
      const response = await fetch(`${endpoints.publicBookingsLobby}${query}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch public bookings');
      }

      const mapped = (data || []).map((booking) => ({
        id: String(booking.bookingId),
        bookingId: booking.bookingId,
        hostPlayerId: booking.hostPlayerId,
        isJoined: Number(booking.joined_by_user) > 0,
        venue: booking.arenaName,
        sport: booking.sportName,
        date: toDisplayDate(booking.date),
        time: `${toDisplayTime(booking.startTime)} - ${toDisplayTime(booking.endTime)}`,
        location: booking.city,
        organizer: booking.hostName,
        spotsTotal: Number(booking.max_participants) || 0,
        spotsFilled: Number(booking.current_players) || 0,
        level: SKILL_LEVEL_LABELS[Number(booking.hostSkillLevel)] || 'All Levels',
      }));

      setPublicBookings(mapped);
    } catch (err) {
      console.error('Error fetching public bookings:', err);
      setPublicBookings([]);
    } finally {
      setPublicBookingsLoading(false);
    }
  }, [user]);

  const loadPrivateBookings = useCallback(async () => {
    if (!user?.userId) {
      setPrivateBookings([]);
      return;
    }

    setPrivateBookingsLoading(true);
    try {
      const response = await fetch(endpoints.playerBookings(user.userId));
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || data?.error || 'Failed to fetch private bookings');
      }

      const mapped = (data.bookings || []).map((booking) => ({
        id: String(booking.bookingId),
        bookingId: booking.bookingId,
        arenaName: booking.arenaName,
        courtName: booking.courtName,
        sportName: booking.sportName,
        bookingDateDisplay: toDisplayDate(booking.bookingDate),
        startTimeDisplay: toDisplayTime(booking.startTime),
        durationHours: Math.max(1, Math.round(Number(booking.duration || 60) / 60)),
        status: booking.status || 'pending',
      }));

      setPrivateBookings(mapped);
    } catch (err) {
      console.error('Error fetching private bookings:', err);
      setPrivateBookings([]);
    } finally {
      setPrivateBookingsLoading(false);
    }
  }, [user]);

  const refreshBookingTabs = useCallback(() => {
    loadPublicBookings();
    loadPrivateBookings();
  }, [loadPublicBookings, loadPrivateBookings]);

  useEffect(() => {
    loadCourtTypes();
    loadVenues();
    refreshBookingTabs();
  }, [loadCourtTypes, loadVenues, refreshBookingTabs]);

  const openVenueDetails = useCallback(async (item) => {
    try {
      const response = await fetch(endpoints.arenaDetails(item.user.arenaId));
      const details = await response.json();

      if (!response.ok) {
        Alert.alert('Unable to open venue', details.error || 'Could not load arena details.');
        return;
      }

      const enriched = {
        ...item,
        user: {
          ...item.user,
          name: details.name,
          image: details.images?.length ? normalizeImageUrl(details.images[0]) : item.user.image,
          rating: details.rating ? String(details.rating) : item.user.rating,
          timings: details.timing || 'See details',
          location: `${details.city || ''}${details.city && details.address ? ', ' : ''}${details.address || ''}`,
          sports: Array.isArray(details.sports) ? details.sports : item.user.sports,
          isAvailable: details.availability === 'available',
          pricePerHour: Number(details.pricePerHour) || item.user.pricePerHour,
          description: details.description || item.user.description,
          amenities: Array.isArray(details.amenities) ? details.amenities : [],
          courts: Number(details.total_courts) || item.user.courts,
          phone: 'N/A',
          courtsData: Array.isArray(details.courts) ? details.courts : [],
        },
      };

      setActiveSubScreen({ type: 'venue', data: enriched, id: enriched.id });
    } catch (err) {
      Alert.alert('Unable to open venue', 'Could not reach server. Please try again.');
    }
  }, []);

  const joinPublicBooking = useCallback(async (booking) => {
    if (!user?.userId) {
      Alert.alert('Not logged in', 'Please log in again and try joining.');
      return;
    }

    setJoiningBookingId(booking.id);
    try {
      const response = await fetch(endpoints.joinPublicBooking(booking.bookingId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId }),
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Could not join', data.error || data.message || 'Join request failed.');
        return;
      }

      Alert.alert('Joined', data.message || 'Successfully joined the match.');
      loadPublicBookings();
    } catch (err) {
      Alert.alert('Could not join', 'Could not reach server. Please try again.');
    } finally {
      setJoiningBookingId(null);
    }
  }, [user, loadPublicBookings]);

  const renderSubScreen = () => {
    if (!activeSubScreen) return null;
    const { type, data, id } = activeSubScreen;
    const back = () => setActiveSubScreen(null);

    if (type === 'venue') {
      return (
        <VenueDetailScreen
          data={data}
          onBack={back}
          onBookingCreated={refreshBookingTabs}
          user={user}
          courtTypeIdByName={courtTypeIdByName}
        />
      );
    }
    if (type === 'shop') return <ProductDetailScreen data={data} onBack={back} />;
    if (type === 'training') return <TrainingDetailScreen data={data} onBack={back} />;
    if (type === 'profile') return <ProfileSubScreen id={id} onBack={back} />;
    return null;
  };

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
            <TouchableOpacity
              style={styles.topBarAction}
              onPress={activeTab === 4 ? onLogout : () => { }}
            >
              <MaterialCommunityIcons
                name={activeTab < 4 ? 'magnify' : 'logout'}
                size={26}
                color={activeTab < 4 ? C.brown : C.orange}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Main Content Area ── */}
      {activeSubScreen ? (
        renderSubScreen()
      ) : (
        <>
          <View style={styles.contentArea} {...panResponder.panHandlers}>
            <Animated.View style={[styles.tabsStrip, { transform: [{ translateX }] }]}>
              {/* Venues */}
              <View style={styles.tabPane}>
                <FeedScreen
                  posts={venuePosts}
                  type="venue"
                  loading={venuesLoading}
                  onSelect={openVenueDetails}
                />
              </View>
              {/* Shop */}
              <View style={styles.tabPane}>
                <FeedScreen
                  posts={SHOP_POSTS}
                  type="shop"
                  onSelect={(item) => setActiveSubScreen({ type: 'shop', data: item, id: item.id })}
                />
              </View>
              {/* Training */}
              <View style={styles.tabPane}>
                <FeedScreen
                  posts={TRAINING_POSTS}
                  type="training"
                  onSelect={(item) => setActiveSubScreen({ type: 'training', data: item, id: item.id })}
                />
              </View>
              {/* Matchmaking */}
              <View style={styles.tabPane}>
                <BookingsScreen
                  publicBookings={publicBookings}
                  privateBookings={privateBookings}
                  publicBookingsLoading={publicBookingsLoading}
                  privateBookingsLoading={privateBookingsLoading}
                  onJoinBooking={joinPublicBooking}
                  joiningBookingId={joiningBookingId}
                  currentUserId={user?.userId}
                />
              </View>
              {/* Profile */}
              <View style={styles.tabPane}>
                <ProfileScreen
                  user={user}
                  onLogout={onLogout}
                  onMenuSelect={(label) => setActiveSubScreen({ type: 'profile', id: label })}
                />
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
                    <MaterialCommunityIcons
                      name={isActive ? tab.activeIcon : tab.icon}
                      size={22}
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

  // Top Bar
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
    width: 80,
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

  // Content
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

  // Filters
  filterContainer: {
    backgroundColor: C.brown,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.white + '1A',
  },
  filterContainerLight: {
    backgroundColor: C.bg,
    borderBottomColor: C.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.white + '15',
    borderWidth: 1,
    borderColor: C.white + '1A',
  },
  filterChipLight: {
    backgroundColor: C.white,
    borderColor: C.border,
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
  filterChipTextLight: {
    color: C.brown,
  },
  filterChipTextActive: {
    color: C.white,
  },

  // Cards
  venueCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: '100%',
    height: 160,
  },
  venueImage: {
    width: '100%',
    height: '100%',
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
    gap: 4,
  },
  ratingText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 16,
  },
  venueName: {
    fontSize: 20,
    fontWeight: '900',
    color: C.brown,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: C.mutedText,
  },
  sportsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 12,
  },
  sportTag: {
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.brown,
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Detail screens
  detailRoot: {
    flex: 1,
    backgroundColor: C.white,
  },
  detailScroll: {
    paddingBottom: 40,
  },
  detailHero: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  detailHeroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  ratingBadgeLg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  ratingTextLg: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  detailHeroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: C.white,
    marginBottom: 4,
  },
  detailInfoRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailInfoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 4,
  },
  detailInfoLabel: {
    fontSize: 11,
    color: C.mutedText,
    fontWeight: '600',
  },
  detailInfoValue: {
    fontSize: 13,
    color: C.brown,
    fontWeight: '800',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.brown,
    marginBottom: 12,
  },
  descText: {
    fontSize: 14,
    color: C.mutedText,
    lineHeight: 22,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  sportTagLg: {
    backgroundColor: C.brown,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sportTagLgText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 13,
  },
  amenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },

  // Form inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.brown,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.brown,
    marginBottom: 14,
    backgroundColor: C.white,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    color: C.brown,
    fontSize: 14,
    fontWeight: '700',
  },
  selectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    marginRight: 8,
  },
  selectChipActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  selectChipText: {
    color: C.brown,
    fontWeight: '600',
    fontSize: 13,
  },
  selectChipTextActive: {
    color: C.white,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  durationChipActive: {
    backgroundColor: C.brown,
    borderColor: C.brown,
  },
  durationChipText: {
    fontWeight: '700',
    color: C.brown,
    fontSize: 14,
  },
  durationChipTextActive: {
    color: C.white,
  },
  costPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  costLabel: {
    fontSize: 14,
    color: C.mutedText,
    fontWeight: '600',
  },
  costValue: {
    fontSize: 18,
    fontWeight: '900',
    color: C.orange,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  visibilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.brown,
  },
  visibilitySubtitle: {
    fontSize: 11,
    color: C.mutedText,
    marginTop: 2,
    maxWidth: width * 0.5,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.brown,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 6,
    marginBottom: 12,
  },
  primaryBtnDisabled: {
    backgroundColor: C.mutedText,
    opacity: 0.6,
  },
  primaryBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 15,
    paddingLeft: 20,
    paddingRight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  contactText: {
    color: C.orange,
    fontWeight: '600',
    fontSize: 14,
  },

  // Success screen
  successContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.brown,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.orange,
    marginBottom: 4,
  },
  successMeta: {
    fontSize: 14,
    color: C.mutedText,
    marginBottom: 16,
    textAlign: 'center',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blue + '18',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 20,
  },
  publicBadgeText: {
    color: C.blue,
    fontWeight: '700',
    fontSize: 13,
  },

  // Product detail
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 10,
    backgroundColor: C.white,
  },
  productRowActive: {
    borderColor: C.orange,
    backgroundColor: '#FFF5EF',
  },
  productRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: C.orange,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.orange,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.brown,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: C.brown,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  qtyText: {
    fontSize: 22,
    fontWeight: '900',
    color: C.brown,
    minWidth: 30,
    textAlign: 'center',
  },

  // Training progress
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: C.mutedText,
  },
  progressBar: {
    height: 8,
    backgroundColor: C.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Matchmaking
  matchmakingHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  matchmakingHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: C.cream,
  },
  matchmakingSubheading: {
    fontSize: 13,
    color: C.cream + 'CC',
    marginTop: 2,
  },
  filterSection: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    marginBottom: 4,
  },
  bookingToggleRow: {
    marginHorizontal: 12,
    marginBottom: 4,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 3,
  },
  bookingToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 6,
  },
  bookingToggleBtnActive: {
    backgroundColor: C.orange,
  },
  bookingToggleText: {
    color: C.cream + 'CC',
    fontWeight: '700',
    fontSize: 12,
  },
  bookingToggleTextActive: {
    color: C.white,
  },
  filterCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterCollapseText: {
    color: C.cream + 'DD',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.cream + 'CC',
    paddingHorizontal: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  matchCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    marginVertical: 8,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: C.border,
  },
  matchCardTop: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  matchSportBadge: {
    backgroundColor: C.brown,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  matchSportText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  levelText: {
    fontWeight: '800',
    fontSize: 12,
  },
  matchVenueName: {
    fontSize: 18,
    fontWeight: '900',
    color: C.brown,
    marginBottom: 8,
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  matchInfoText: {
    fontSize: 13,
    color: C.mutedText,
  },
  matchStatusBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  matchStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  matchStatusBadgeOwn: {
    backgroundColor: '#E9F5FE',
    borderColor: '#B9E1F6',
  },
  matchStatusBadgeJoined: {
    backgroundColor: '#EAF7EE',
    borderColor: '#BFE6CD',
  },
  matchStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchStatusBadgeTextOwn: {
    color: C.blue,
  },
  matchStatusBadgeTextJoined: {
    color: C.green,
  },
  spotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  spotsText: {
    fontSize: 12,
    color: C.mutedText,
    fontWeight: '600',
  },
  spotsLeft: {
    fontSize: 12,
    fontWeight: '800',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.orange,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  joinBtnDisabled: {
    backgroundColor: C.mutedText,
    opacity: 0.5,
  },
  joinBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 14,
  },
  emptyMatchState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyMatchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.cream,
  },
  emptyMatchSub: {
    fontSize: 13,
    color: C.cream,
    textAlign: 'center',
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
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIconWrap: {
    width: 44,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconWrapActive: {
    backgroundColor: C.brown,
    borderRadius: 12,
    width: 46,
  },
  navLabel: {
    fontSize: 10,
    color: C.mutedText,
    marginTop: 4,
  },
  navLabelActive: {
    color: C.orange,
    fontWeight: 'bold',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateText: {
    color: C.white + '66',
  },
});

export default HomeScreen;