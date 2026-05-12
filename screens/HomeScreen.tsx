import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Keyboard,
  ScrollView,
  Image,
  InteractionManager,
} from 'react-native';
import GlobalMasonryList from '../components/GlobalMasonryList';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDocs,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useThemeContext } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProductCard, { ProductCardItem, getStableHeight } from '../components/ProductCard';

const { width: screenWidth } = Dimensions.get('window');
const SIDE_PADDING = 12;
const COLUMN_GAP = 10;
const columnWidth = Math.floor((screenWidth - SIDE_PADDING * 2 - COLUMN_GAP) / 2);
const imageWidth  = columnWidth - 20; // imageContainer padding: 10 her yanda
const PAGE_SIZE   = 20;
const INITIAL_RENDER = 8; // İlk batch: hızlı ilk görünüm

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ─── HomeScreen ────────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const [allProducts, setAllProducts]   = useState<ProductCardItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);

  const lastVisibleRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const hasMoreRef     = useRef(true);
  const allUsersRef    = useRef<any[]>([]);

  // Search
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchScope,    setSearchScope]    = useState<'All' | 'Artwork' | 'Artist' | 'Price' | 'Size'>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductCardItem[]>([]);
  const [filteredUsers,    setFilteredUsers]    = useState<any[]>([]);

  const searchInputRef   = useRef<TextInput>(null);
  const scrollRef        = useRef<ScrollView>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();
  const { colors, isDarkTheme } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();
  const { t } = useLanguage();

  const tabBarHeight = 60 + insets.bottom;

  // ─── Tab bar restore ───────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'flex', position: 'absolute',
          backgroundColor: colors.background,
          borderTopWidth: 1, borderTopColor: isDarkTheme ? '#333' : '#F0F0F0',
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
      });
    }, [navigation, insets.bottom, tabBarHeight, colors, isDarkTheme])
  );

  // ─── Route refresh trigger ─────────────────────────────────────────────────
  useEffect(() => {
    if (route.params?.refreshTimeStamp) {
      setIsSearchActive(false); setSearchQuery(''); setSearchScope('All');
      setFilteredProducts([]); setFilteredUsers([]);
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      fetchData(false);
      navigation.setParams({ refreshTimeStamp: undefined });
    }
  }, [route.params?.refreshTimeStamp]);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && (!hasMoreRef.current || loadingMore)) return;

    try {
      if (isLoadMore) { setLoadingMore(true); }
      else            { setLoading(true); hasMoreRef.current = true; lastVisibleRef.current = null; }

      const productsRef = collection(db, 'products');
      let q;

      if (isLoadMore && lastVisibleRef.current) {
        q = query(productsRef, where('isSold', '==', false), orderBy('createdAt', 'desc'),
          startAfter(lastVisibleRef.current), limit(PAGE_SIZE));
      } else {
        q = query(productsRef, where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        if (allUsersRef.current.length === 0) {
          const usersSnap = await getDocs(query(collection(db, 'users'), limit(200)));
          allUsersRef.current = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }
      }

      const snap = await getDocs(q);

      if (snap.docs.length > 0) {
        lastVisibleRef.current = snap.docs[snap.docs.length - 1];
        const newProducts: ProductCardItem[] = snap.docs.map((d: any) => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(),
        }));
        hasMoreRef.current = snap.docs.length >= PAGE_SIZE;

        if (isLoadMore) {
          setAllProducts(prev => [...prev, ...newProducts]);
        } else {
          setAllProducts(shuffleArray(newProducts));
        }
      } else {
        // Loop logic: if no more products in Firestore, start showing existing ones again
        if (isLoadMore && allProducts.length > 0) {
          const loopItems = allProducts.slice(0, PAGE_SIZE).map(p => ({
            ...p,
            id: `${p.id}_loop_${Date.now()}_${Math.random()}`
          }));
          setAllProducts(prev => [...prev, ...loopItems]);
          hasMoreRef.current = false;
        } else {
          hasMoreRef.current = false;
        }
      }
    } catch (e) {
      console.error('[HomeScreen] fetch error:', e);
    } finally {
      setLoading(false); setLoadingMore(false); setRefreshing(false);
    }
  }, [loadingMore, allProducts.length, allProducts]);

  useEffect(() => { fetchData(false); }, []);

  // Satılan ürünleri kaldır
  useEffect(() => {
    const q = query(collection(db, 'products'), where('isSold', '==', true));
    return onSnapshot(q, (snap) => {
      if (snap.docs.length > 0) {
        const soldIds = new Set(snap.docs.map((d: any) => d.id));
        setAllProducts(prev => prev.filter(p => !soldIds.has(p.id)));
      }
    });
  }, []);

  // Son aramalar
  useFocusEffect(useCallback(() => {
    const load = async () => {
      const user = auth.currentUser;
      const key  = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
      const saved = await AsyncStorage.getItem(key).catch(() => null);
      if (saved) setRecentSearches(JSON.parse(saved));
    };
    load();
  }, []));

  const saveRecentSearches = useCallback(async (searches: string[]) => {
    const user = auth.currentUser;
    const key  = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
    AsyncStorage.setItem(key, JSON.stringify(searches)).catch(() => null);
  }, []);

  // ─── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSearchActive) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const queryLower = searchQuery.trim().toLowerCase();
    if (!queryLower) { setFilteredProducts([]); setFilteredUsers([]); return; }

    searchDebounceRef.current = setTimeout(() => {
      let prodResults: ProductCardItem[] = [];
      let userResults: any[] = [];

      if (searchScope === 'All' || searchScope === 'Artwork') {
        prodResults = allProducts.filter(p =>
          p.title?.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.category?.toLowerCase().includes(queryLower) ||
          p.username?.toLowerCase().includes(queryLower) ||
          String(p.price ?? '').includes(queryLower) ||
          String(p.year ?? '').includes(queryLower)
        );
      }
      if (searchScope === 'All' || searchScope === 'Artist') {
        userResults = allUsersRef.current.filter(u =>
          u.username?.toLowerCase().includes(queryLower) ||
          u.fullName?.toLowerCase().includes(queryLower)
        );
      }
      if (searchScope === 'Price')  prodResults = allProducts.filter(p => String(p.price ?? '').includes(queryLower));
      if (searchScope === 'Size')   prodResults = allProducts.filter(p =>
        (p as any).dimensions?.width?.toString().includes(queryLower) ||
        (p as any).dimensions?.height?.toString().includes(queryLower)
      );

      setFilteredProducts(prodResults);
      setFilteredUsers(userResults);
    }, 250);

    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, searchScope, isSearchActive, allProducts]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchSubmit = useCallback(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 6);
    setRecentSearches(updated);
    saveRecentSearches(updated);
    navigation.navigate('SearchTab' as any, { screen: 'Search', params: { initialQuery: q, initialScope: searchScope } });
    setIsSearchActive(false); setSearchQuery(''); setSearchScope('All'); Keyboard.dismiss();
  }, [searchQuery, recentSearches, searchScope, navigation, saveRecentSearches]);

  const handleExitSearch = useCallback(() => {
    setIsSearchActive(false); setSearchQuery(''); setSearchScope('All');
    setFilteredProducts([]); setFilteredUsers([]); Keyboard.dismiss();
  }, []);

  const handleDeleteRecentSearch = useCallback((term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated); saveRecentSearches(updated);
  }, [recentSearches, saveRecentSearches]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(false); }, [fetchData]);

  // ─── Favorites ─────────────────────────────────────────────────────────────
  const favoriteSet = useMemo(() => new Set(favoriteItems.map(f => f.id)), [favoriteItems]);

  const handleFavoriteToggle = useCallback((item: ProductCardItem) => {
    if (favoriteSet.has(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite({
        id: item.id, title: item.title || t('noTitle'),
        username: item.username || t('unknown'),
        imageUrl: Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrl || undefined,
        price: item.price || 0, year: item.year || '', createdAt: item.createdAt,
      });
    }
  }, [favoriteSet, removeFavorite, addFavorite, t]);

  const handleProductPress = useCallback((item: ProductCardItem) => {
    navigation.navigate('ProductDetail', {
      product: {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(),
      } as any,
    });
  }, [navigation]);



  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    
    // Firestore'da daha veri varsa çek, yoksa loop'a gir
    if (hasMoreRef.current) {
      fetchData(true);
    } else if (allProducts.length > 0) {
      // Endless Loop: Veri seti bittiyse baştan eklemeye başla
      setLoadingMore(true);
      setTimeout(() => {
        const loopItems = allProducts.slice(0, PAGE_SIZE).map(p => ({
          ...p,
          id: `${p.id}_loop_${Date.now()}_${Math.random()}`
        }));
        setAllProducts(prev => [...prev, ...loopItems]);
        setLoadingMore(false);
      }, 500);
    }
  }, [loadingMore, fetchData, allProducts.length, allProducts]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>

      {/* ── Search bar ── */}
      <View style={{ backgroundColor: colors.background, paddingBottom: 8 }}>
        <View style={styles.searchWrapper}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.searchInputContainer, { flex: 1, backgroundColor: colors.card }]}>
              {isSearchActive ? (
                <TouchableOpacity onPress={handleExitSearch}>
                  <Ionicons name="arrow-back" size={20} color={colors.secondaryText} style={styles.searchIcon} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
              )}
              {isSearchActive ? (
                <TextInput
                  ref={searchInputRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder={searchScope === 'Artist' ? t('artist') : searchScope === 'Price' ? t('price') : t('searchPlaceholder')}
                  placeholderTextColor={colors.secondaryText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  autoFocus
                />
              ) : (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsSearchActive(true)} activeOpacity={1}>
                  <Text style={[styles.searchPlaceholder, { color: colors.secondaryText }]}>{t('searchPlaceholder')}</Text>
                </TouchableOpacity>
              )}
              {isSearchActive && searchQuery.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
            {!isSearchActive && (
              <TouchableOpacity
                style={[styles.geminiButton, { backgroundColor: colors.card, borderColor: isDarkTheme ? '#333' : '#F0F0F0' }]}
                onPress={() => navigation.navigate('GeminiChat' as any)}
              >
                <Ionicons name="sparkles" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isSearchActive && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
            keyboardShouldPersistTaps="handled">
            {(['All', 'Artwork', 'Artist', 'Price', 'Size'] as const).map(scope => (
              <TouchableOpacity key={scope}
                style={[styles.scopeChip, { borderColor: colors.border || '#e0e0e0', backgroundColor: searchScope === scope ? colors.text : 'transparent' }]}
                onPress={() => setSearchScope(scope)}>
                <Text style={[styles.scopeChipText, { color: searchScope === scope ? colors.background : colors.text }]}>
                  {scope === 'Artwork' ? t('artwork') : scope === 'Artist' ? t('artist') : scope === 'Price' ? t('price') : scope === 'Size' ? t('sizeScope') : t('all')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Content ── */}
      {isSearchActive ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }} keyboardShouldPersistTaps="handled">
          {searchQuery.length > 0 ? (
            <View style={{ padding: 16 }}>
              {filteredUsers.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 }}>{t('users')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {filteredUsers.map(user => (
                      <TouchableOpacity key={user.id} style={{ marginRight: 16, alignItems: 'center' }}
                        onPress={() => navigation.navigate('OtherProfile', { userId: user.id })}>
                        <Image source={user.photoURL ? { uri: user.photoURL } : require('../assets/default-profile.png')}
                          style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 4 }} />
                        <Text style={{ color: colors.text, fontSize: 12 }}>{user.username}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {filteredProducts.length > 0 ? (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 }}>{t('artworksSection')}</Text>
                  {filteredProducts.map(item => (
                    <TouchableOpacity key={item.id} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}
                      onPress={() => handleProductPress(item)}>
                      <Image source={{ uri: Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrl || '' }}
                        style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' }} />
                      <View>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item.title}</Text>
                        <Text style={{ color: colors.secondaryText, fontSize: 12 }}>₺{Number(item.price).toLocaleString('tr-TR')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : filteredUsers.length === 0 && (
                <Text style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>{t('noResults')}</Text>
              )}
            </View>
          ) : (
            recentSearches.length > 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: colors.secondaryText, marginBottom: 10, fontSize: 14 }}>{t('recentSearches')}</Text>
                {recentSearches.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border || '#e0e0e0' }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => { navigation.navigate('SearchTab' as any, { screen: 'Search', params: { initialQuery: item } }); setIsSearchActive(false); setSearchQuery(''); }}>
                      <Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginRight: 10 }} />
                      <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecentSearch(item)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={18} color={colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>

      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>

      ) : (
        /* ── Masonry Grid ── */
        <GlobalMasonryList
          data={allProducts}
          loading={loading}
          onEndReached={handleLoadMore}
          loadingMore={loadingMore}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{
            paddingBottom: tabBarHeight + 20,
          }}
        />
      )}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  masonryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 4,
    paddingBottom: 100, // Tab bar height approx
  },
  loadMoreRow: { width: '100%', paddingVertical: 20, alignItems: 'center' },
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  searchPlaceholder: { fontSize: 16 },
  clearButton: { padding: 4, marginLeft: 8 },
  geminiButton: { marginLeft: 10, width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  scopeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginRight: 8 },
  scopeChipText: { fontSize: 14, fontWeight: '500' },
});