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
    Modal,
    FlatList,
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
    { id: 'orders', label: 'Orders', icon: 'cart-outline', activeIcon: 'cart' },
    { id: 'profile', label: 'Profile', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

const CATEGORY_OPTIONS = ['Footwear', 'Apparel', 'Equipment', 'Accessories', 'Nutrition'];

// ─── Placeholder data ─────────────────────────────────────────────────────────

const INITIAL_PRODUCTS = [
    {
        id: 'p1',
        user: {
            name: 'Nike Air Max 270',
            category: 'Footwear',
            image: { uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
            gallery: [],
            price: '12500',
            description: 'Comfortable lifestyle sneakers with Air unit cushioning.',
            isAvailable: true,
        },
    },
    {
        id: 'p2',
        user: {
            name: 'Wilson Evolution Basketball',
            category: 'Equipment',
            image: { uri: 'https://images.unsplash.com/photo-1519861531473-920036214751?w=400' },
            gallery: [],
            price: '8000',
            description: 'Official size and weight indoor/outdoor basketball.',
            isAvailable: true,
        },
    },
    {
        id: 'p3',
        user: {
            name: 'Dri-FIT Training Shirt',
            category: 'Apparel',
            image: { uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
            gallery: [],
            price: '3200',
            description: 'Moisture-wicking performance training shirt.',
            isAvailable: false,
        },
    },
];

const ORDERS_DATA = [
    {
        title: 'Today',
        data: [
            { id: 'o1', customer: 'Ahmed Khan', item: 'Nike Air Max 270', category: 'Footwear', status: 'Processing', price: 'Rs. 12,500' },
            { id: 'o2', customer: 'Sara Williams', item: 'Wilson Evolution Basketball', category: 'Equipment', status: 'Shipped', price: 'Rs. 8,000' },
        ],
    },
    {
        title: 'Recent',
        data: [
            { id: 'o3', customer: 'Zain Malik', item: 'Dri-FIT Training Shirt', category: 'Apparel', status: 'Delivered', price: 'Rs. 3,200' },
            { id: 'o4', customer: 'Hamza Ali', item: 'Jordan Jumpman Shorts', category: 'Apparel', status: 'Processing', price: 'Rs. 4,500' },
            { id: 'o5', customer: 'Omar J.', item: 'Spalding Precision', category: 'Equipment', status: 'Delivered', price: 'Rs. 6,800' },
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

const CategoryDropdown = memo(({ selectedCategory, onSelectCategory, isReadOnly, label = 'Category' }) => {
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
                <Text style={selectedCategory ? styles.dropdownHeaderText : styles.placeholderText}>
                    {selectedCategory || 'Choose a category...'}
                </Text>
                <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={C.brown}
                />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownList}>
                    {CATEGORY_OPTIONS.map(cat => {
                        const isSelected = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.sportItem, isSelected && styles.sportItemActive]}
                                onPress={() => {
                                    onSelectCategory(cat);
                                    setIsOpen(false);
                                }}
                            >
                                <Text style={[styles.sportItemText, isSelected && styles.sportItemTextActive]}>{cat}</Text>
                                {isSelected && <MaterialCommunityIcons name="check" size={16} color={C.white} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
});

const ProductPicker = ({ products, onSelect, actionLabel, icon }) => (
    <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={[styles.sectionLabel, { marginBottom: 20 }]}>Select a Product to {actionLabel}</Text>
        {products.length === 0 ? (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="package-variant-closed" size={50} color={C.brown + '33'} />
                <Text style={{ color: C.brown, marginTop: 12 }}>No products added yet.</Text>
            </View>
        ) : (
            products.map(item => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => onSelect(item)}
                >
                    {item.user.image ? (
                        <Image
                            source={{ uri: item.user.image.uri }}
                            style={{ width: 50, height: 50, borderRadius: 10, marginRight: 15 }}
                        />
                    ) : (
                        <View style={[styles.iconWrapper, { marginRight: 15 }]}>
                            <MaterialCommunityIcons name="package-variant-closed" size={24} color={C.brown} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardText}>{item.user.name}</Text>
                        <Text style={styles.subLabel}>{item.user.category}</Text>
                    </View>
                    <MaterialCommunityIcons name={icon} size={24} color={C.orange} />
                </TouchableOpacity>
            ))
        )}
    </ScrollView>
);

// ─── AddProductForm ───────────────────────────────────────────────────────────

function AddProductForm({ onBack, onSave, initialData = null, mode = 'add' }) {
    const [name, setName] = useState(initialData?.user?.name || '');
    const [category, setCategory] = useState(initialData?.user?.category || '');
    const [price, setPrice] = useState(initialData?.user?.price || '');
    const [description, setDescription] = useState(initialData?.user?.description || '');
    const [isAvailable, setIsAvailable] = useState(initialData?.user?.isAvailable ?? true);
    const [thumbnail, setThumbnail] = useState(initialData?.user?.image || null);
    const [gallery, setGallery] = useState(initialData?.user?.gallery || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const errorShake = useRef(new Animated.Value(0)).current;

    const isReadOnly = mode === 'view';

    const shakeError = () => {
        Animated.sequence([
            Animated.timing(errorShake, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
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

    const handleSave = () => {
        if (mode === 'view') return;

        if (!name.trim() || !category.trim() || !price.trim()) {
            setError('Please fill in all required fields: name, category, and price.');
            shakeError();
            return;
        }

        setError('');
        setLoading(true);

        // Simulate a short save delay for UX consistency with OwnerHomeScreen
        setTimeout(() => {
            const productObj = {
                id: initialData?.id || `p_${Date.now()}`,
                user: {
                    name: name.trim(),
                    category: category.trim(),
                    price: price.trim(),
                    description: description.trim(),
                    image: thumbnail,
                    gallery,
                    isAvailable,
                },
            };
            setLoading(false);
            onSave(productObj);
        }, 300);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>

                {/* Thumbnail */}
                <Text style={styles.sectionLabel}>Product Image</Text>
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
                    label="Product Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Nike Air Max 270"
                    editable={!isReadOnly}
                />

                <CategoryDropdown
                    selectedCategory={category}
                    onSelectCategory={setCategory}
                    isReadOnly={isReadOnly}
                />

                <FormInput
                    label="Price (Rs.)"
                    value={price}
                    onChangeText={setPrice}
                    placeholder="e.g. 12500"
                    keyboardType="numeric"
                    editable={!isReadOnly}
                />

                <FormInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief product description..."
                    multiline
                    numberOfLines={4}
                    editable={!isReadOnly}
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                />

                {/* Availability Toggle */}
                <View style={styles.rowBetweenCompact}>
                    <Text style={styles.label}>Available for Sale</Text>
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
                                {mode === 'add' ? 'Create Product' : 'Update Product'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── SubScreenContent ─────────────────────────────────────────────────────────

function SubScreenContent({ type, id, data, onBack, products, setProducts }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const [selectedProduct, setSelectedProduct] = useState(null);

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSaveProduct = (updatedProduct) => {
        if (id === '1') {
            setProducts(prev => [...prev, updatedProduct]);
        } else {
            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        }
        onBack();
    };

    const handleRemoveProduct = (productId) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        onBack();
    };

    const renderProductContent = () => {
        // Mode 1: Add Product
        if (id === '1') {
            return <AddProductForm mode="add" onSave={handleSaveProduct} onBack={onBack} />;
        }

        // Modes 2, 3, 4: Require selection first
        if (!selectedProduct) {
            const labels = { '2': 'Update', '3': 'View', '4': 'Remove' };
            const icons = { '2': 'pencil', '3': 'eye', '4': 'delete' };
            return (
                <ProductPicker
                    products={products}
                    actionLabel={labels[id]}
                    icon={icons[id]}
                    onSelect={setSelectedProduct}
                />
            );
        }

        // Once a product is selected:
        if (id === '2') {
            return (
                <AddProductForm
                    mode="edit"
                    initialData={selectedProduct}
                    onSave={handleSaveProduct}
                    onBack={onBack}
                />
            );
        }
        if (id === '3') {
            return (
                <AddProductForm
                    mode="view"
                    initialData={selectedProduct}
                    onBack={onBack}
                />
            );
        }
        if (id === '4') {
            return (
                <View style={styles.formScroll}>
                    <Text style={styles.headerText}>Are you sure?</Text>
                    <Text style={[styles.placeholderText, { marginBottom: 30 }]}>
                        You are about to delete "{selectedProduct.user.name}". This action cannot be undone.
                    </Text>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: 'red' }]}
                        onPress={() => handleRemoveProduct(selectedProduct.id)}
                    >
                        <Text style={styles.saveButtonText}>Yes, Delete Product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: C.bg }]}
                        onPress={() => setSelectedProduct(null)}
                    >
                        <Text style={[styles.submitBtnText, { color: C.brown }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    const renderOrderContent = () => {
        if (!data) return null;
        const { customer, item, category, status, price } = data;
        return (
            <View style={styles.formScroll}>
                <Text style={styles.headerText}>Order Details</Text>
                <Text style={styles.label}>Customer</Text>
                <Text style={styles.bookingDetailText}>{customer || 'N/A'}</Text>
                <Text style={[styles.label, { marginTop: 16 }]}>Product</Text>
                <Text style={styles.bookingDetailText}>{item}</Text>
                {category && (
                    <>
                        <Text style={[styles.label, { marginTop: 16 }]}>Category</Text>
                        <Text style={styles.bookingDetailText}>{category}</Text>
                    </>
                )}
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

    const renderProfileContent = () => (
        <View style={styles.formScroll}>
            <Text style={styles.headerText}>{id}</Text>
            <Text style={styles.placeholderText}>Coming soon.</Text>
        </View>
    );

    const getTitle = () => {
        if (type === 'product') {
            return { '1': 'Add Product', '2': 'Update Product', '3': 'Product Details', '4': 'Remove Product' }[id];
        }
        if (type === 'order') return 'Order Details';
        return id;
    };

    return (
        <Animated.View
            style={[styles.subScreenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
            <View style={styles.subScreenHeader}>
                <Text style={styles.subScreenTitle}>{getTitle()}</Text>
            </View>
            {type === 'product' && renderProductContent()}
            {type === 'order' && renderOrderContent()}
            {type === 'profile' && renderProfileContent()}
        </Animated.View>
    );
}

// ─── Tab Screens ──────────────────────────────────────────────────────────────

function DashboardScreen({ onActionSelect }) {
    const menuItems = [
        { id: '1', title: 'Add Product', icon: 'plus-circle' },
        { id: '2', title: 'Update Product', icon: 'pencil-circle' },
        { id: '3', title: 'View Product', icon: 'eye-circle' },
        { id: '4', title: 'Remove Product', icon: 'delete-circle' },
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
                <Text style={styles.headerText}>Product Management</Text>

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

function OrdersScreen({ onOrderSelect }) {
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All');

    const uniqueCategories = ['All', ...new Set(ORDERS_DATA.flatMap(s => s.data.map(o => o.category)))];
    const statuses = ['All', 'Processing', 'Shipped', 'Delivered'];
    const timeOptions = ['All', 'Today', 'Recent'];

    const filteredSections = useMemo(() => {
        return ORDERS_DATA.map(section => {
            if (timeFilter !== 'All' && section.title !== timeFilter) {
                return { ...section, data: [] };
            }
            const filteredData = section.data.filter(order => {
                const statusMatch = statusFilter === 'All' || order.status === statusFilter;
                const categoryMatch = categoryFilter === 'All' || order.category === categoryFilter;
                return statusMatch && categoryMatch;
            });
            return { ...section, data: filteredData };
        }).filter(section => section.data.length > 0);
    }, [statusFilter, categoryFilter, timeFilter]);

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

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Delivered': return { bg: '#E8F5E9', text: '#2E7D32' };
            case 'Shipped': return { bg: '#E3F2FD', text: '#1565C0' };
            case 'Processing': return { bg: '#FFF3E0', text: '#EF6C00' };
            default: return { bg: '#F5F5F5', text: '#616161' };
        }
    };

    const renderOrderCard = ({ item }) => {
        const statusStyle = getStatusStyles(item.status);
        return (
            <TouchableOpacity
                style={styles.bookingCard}
                activeOpacity={0.8}
                onPress={() => onOrderSelect(item)}
            >
                <View style={styles.bookingInfo}>
                    <View style={styles.bookingHeader}>
                        <Text style={styles.bookingCustomer}>{item.customer}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                        </View>
                    </View>
                    <View style={styles.bookingDetailRow}>
                        <MaterialCommunityIcons name="package-variant-closed" size={14} color={C.brown + '99'} />
                        <Text style={styles.bookingDetailText}>{item.item}</Text>
                    </View>
                    <View style={styles.bookingDetailRow}>
                        <MaterialCommunityIcons name="tag-outline" size={14} color={C.orange} />
                        <Text style={styles.bookingTimeText}>{item.category}</Text>
                    </View>
                </View>
                <View style={styles.bookingPriceAction}>
                    <Text style={styles.bookingPrice}>{item.price}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={C.brown + '44'} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.rootbrown}>
            <View style={styles.arcContainer} pointerEvents="none">
                <View style={styles.arcOuter} />
                <View style={styles.arcInner} />
            </View>

            <View style={styles.filterContainer}>
                <FilterGroup label="Status" options={statuses} current={statusFilter} setter={setStatusFilter} icon="filter-variant" />
                <FilterGroup label="Categories" options={uniqueCategories} current={categoryFilter} setter={setCategoryFilter} icon="shape-outline" />
                <FilterGroup label="Timeframe" options={timeOptions} current={timeFilter} setter={setTimeFilter} icon="calendar-clock" />
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
                renderItem={renderOrderCard}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="package-variant-remove" size={60} color={C.white + '33'} />
                        <Text style={styles.emptyStateText}>No orders match these filters</Text>
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
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.profileAvatarEdit}>
                            <MaterialCommunityIcons name="camera" size={14} color={C.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>{user?.name || 'Alleyoop Seller'}</Text>
                    <Text style={styles.profileEmail}>{user?.email || 'seller@example.com'}</Text>
                    <View style={styles.profileBadge}>
                        <MaterialCommunityIcons name="shopping" size={12} color={C.orange} />
                        <Text style={styles.profileBadgeText}>{user?.userType || 'Seller'}</Text>
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

// ─── Main SellerHomeScreen ────────────────────────────────────────────────────

export function SellerHomeScreen({ user, onLogout }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(0);
    const [activeSubScreen, setActiveSubScreen] = useState(null);
    const [products, setProducts] = useState(INITIAL_PRODUCTS);
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
            onActionSelect={(id) => setActiveSubScreen({ type: 'product', id })}
        />,
        <OrdersScreen
            key="orders"
            onOrderSelect={(order) => setActiveSubScreen({ type: 'order', id: order.id, data: order })}
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
                                name={activeTab < 2 ? 'magnify' : 'logout'}
                                size={26}
                                color={activeTab < 2 ? C.brown : C.orange}
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
                    products={products}
                    setProducts={setProducts}
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

    // ── Orders / Bookings ─────────────────────────────────────────────────────
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
    bookingCard: {
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
        fontSize: 16,
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
        fontWeight: '500',
    },
    bookingTimeText: {
        fontSize: 13,
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
    sportItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    sportItemActive: {
        backgroundColor: C.orange,
    },
    sportItemText: {
        color: C.brown,
        fontWeight: '500',
    },
    sportItemTextActive: {
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
    bookingDetailText: {
        fontSize: 16,
        color: C.brown,
        marginBottom: 4,
    },
});

export default SellerHomeScreen;