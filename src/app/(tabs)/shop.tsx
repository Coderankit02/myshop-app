/**
 * Shop — search, category chips, sort/filter, 2-column product grid, pagination.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useCategories, useProducts, useSearch } from '@/hooks/useData';
import { AppText } from '@/components/AppText';
import { ProductCard } from '@/components/ProductCard';
import { SkelCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import type { Product } from '@/lib/types';

const SORT_OPTIONS = [
  { v: 'default', l: 'Recommended' },
  { v: 'price-low', l: 'Price: Low to High' },
  { v: 'price-high', l: 'Price: High to Low' },
];

export default function ShopScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; cat?: string }>();

  const { cats } = useCategories();
  const [activeCat, setActiveCat] = useState<string>(params.cat || 'all');
  const [search, setSearch] = useState(params.q || '');
  const [sortBy, setSortBy] = useState('default');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 24;

  // Keep in sync with deep-linked params
  useEffect(() => {
    if (params.q != null) setSearch(params.q);
    if (params.cat) {
      setActiveCat(params.cat);
      setPage(1);
    }
  }, [params.q, params.cat]);

  const isSearchActive = search.trim().length > 1;
  const { results: searchResults, loading: searchLoading } = useSearch(search, isSearchActive);
  const { products, loading, total, totalPages, refetch } = useProducts({
    categoryId: isSearchActive ? null : activeCat,
    search: isSearchActive ? search : '',
    page,
    pageSize,
  });

  const rawProds = isSearchActive ? searchResults : products;
  const shopLoading = isSearchActive ? searchLoading : loading;

  const sorted = useMemo(() => {
    let out = inStockOnly ? rawProds.filter((p) => (p.stock_quantity ?? 1) > 0) : rawProds;
    if (sortBy === 'price-low') out = [...out].sort((a, b) => a.selling_price - b.selling_price);
    else if (sortBy === 'price-high') out = [...out].sort((a, b) => b.selling_price - a.selling_price);
    return out;
  }, [rawProds, sortBy, inStockOnly]);

  const activeCatName = cats.find((c) => c.id === activeCat)?.name || 'All Products';
  const countLabel = shopLoading ? 'Loading…' : `${sorted.length} Products`;

  const onEndReached = () => {
    if (!isSearchActive && !shopLoading && page < totalPages) setPage((p) => p + 1);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={{ flex: 1, maxWidth: '50%' }}>
      <View style={{ paddingHorizontal: 5, marginBottom: 12 }}>
        <ProductCard p={item} onPress={(p) => router.push({ pathname: '/product/[id]', params: { id: p.id } })} />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      {/* Search + sort header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <View style={styles.topRow}>
          <AppText variant="title" style={{ flex: 1 }}>
            Shop 🛍️
          </AppText>
          <Pressable
            onPress={() => router.push('/wishlist')}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: theme.primaryLight }]}>
            <AppText style={{ fontSize: 17 }}>❤️</AppText>
          </Pressable>
        </View>
        <View style={[styles.searchBox, { backgroundColor: theme.light, borderColor: theme.border }]}>
          <AppText style={{ fontSize: 15 }}>🔍</AppText>
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            returnKeyType="search"
            placeholder="Products search karein…"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.dark }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <AppText variant="caption" color={theme.gray}>
                ✕
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
          <Chip label="All" active={activeCat === 'all'} onPress={() => { setActiveCat('all'); setPage(1); }} theme={theme} />
          {cats.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={activeCat === c.id}
              onPress={() => { setActiveCat(c.id); setPage(1); }}
              theme={theme}
            />
          ))}
        </ScrollView>

        {/* Sort + in-stock */}
        <View style={styles.filterRow}>
          <View style={[styles.countBox, { backgroundColor: theme.light }]}>
            <AppText variant="captionBold" color={theme.dark}>
              {countLabel}
            </AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.v}
                onPress={() => setSortBy(o.v)}
                style={[styles.filterChip, { backgroundColor: sortBy === o.v ? theme.primary : theme.cardBg, borderColor: sortBy === o.v ? theme.primary : theme.border }]}>
                <AppText variant="captionBold" color={sortBy === o.v ? '#fff' : theme.dark}>
                  {o.l}
                </AppText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setInStockOnly((v) => !v)}
              style={[styles.filterChip, { backgroundColor: inStockOnly ? theme.primary : theme.cardBg, borderColor: inStockOnly ? theme.primary : theme.border }]}>
              <AppText variant="captionBold" color={inStockOnly ? '#fff' : theme.dark}>
                {inStockOnly ? '✓' : ''} In stock only
              </AppText>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* Grid */}
      {shopLoading && page === 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: '50%', paddingHorizontal: 5, marginBottom: 12 }}>
              <SkelCard />
            </View>
          ))}
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={`"${search || activeCatName}" mein koi product nahi mila`}
          sub="Kisi aur category ya keyword se try karein"
          cta="Clear Filters"
          onCta={() => {
            setSearch('');
            setActiveCat('all');
            setSortBy('default');
            setInStockOnly(false);
            refetch();
          }}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            !isSearchActive && page < totalPages && shopLoading ? (
              <AppText variant="caption" color={theme.gray} center style={{ padding: 16 }}>
                Load ho raha hai…
              </AppText>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.catChip,
        {
          backgroundColor: active ? theme.primary : theme.cardBg,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}>
      <AppText variant="captionBold" color={active ? '#fff' : theme.dark}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginTop: 10,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', padding: 0 },
  catChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  countBox: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  filterChip: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
