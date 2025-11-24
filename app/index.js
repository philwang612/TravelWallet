import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { getExpenses } from '../src/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
// 1. 引入安全区域 Hook
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_EMOJIS = {
  'Food': '🍔', 'Transport': '🚕', 'Shopping': '🛍️', 'Hotel': '🏨',
};

const FILTER_CATEGORIES = ['All', 'Food', 'Transport', 'Shopping', 'Hotel'];
const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'JPY', 'GBP', 'CNY', 'SEK'];

const getCurrencySymbol = (code) => {
  const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CNY': '¥', 'SEK': 'kr' };
  return symbols[code] || code;
};

export default function HomeScreen() {
  const router = useRouter();
  // 2. 获取安全距离 (insets.top 就是灵动岛的高度)
  const insets = useSafeAreaInsets();
  
  const [allExpenses, setAllExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [rates, setRates] = useState({}); 
  const [loadingRates, setLoadingRates] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState('EUR');

  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateMode, setActiveDateMode] = useState(null);

  const loadData = async () => {
    const data = await getExpenses();
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAllExpenses(data);
    applyFilters(data, filterCategory, filterStartDate, filterEndDate);
  };

  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      setRates(data.rates); 
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setLoadingRates(false);
    }
  };

  const applyFilters = (data, category, startDate, endDate) => {
    let result = data;

    if (category !== 'All') {
      result = result.filter(item => item.category === category);
    }

    if (startDate) {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      result = result.filter(item => new Date(item.date) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate); end.setHours(23,59,59,999);
      result = result.filter(item => new Date(item.date) <= end);
    }

    setFilteredExpenses(result);
  };

  useEffect(() => {
    applyFilters(allExpenses, filterCategory, filterStartDate, filterEndDate);
  }, [filterCategory, filterStartDate, filterEndDate, allExpenses]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    fetchRates();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), fetchRates()]);
    setRefreshing(false);
  };

  const calculateTotal = () => {
    if (Object.keys(rates).length === 0) return "---";
    let totalInBaseEur = 0;
    filteredExpenses.forEach(item => {
      const itemCurrency = item.currency || 'EUR';
      const itemAmount = item.amount;
      const rateToEur = rates[itemCurrency] || 1; 
      totalInBaseEur += itemAmount / rateToEur;
    });
    const targetRate = rates[displayCurrency] || 1;
    return (totalInBaseEur * targetRate).toFixed(2);
  };

  const toggleCurrency = () => {
    const currentIndex = SUPPORTED_CURRENCIES.indexOf(displayCurrency);
    const nextIndex = (currentIndex + 1) % SUPPORTED_CURRENCIES.length;
    setDisplayCurrency(SUPPORTED_CURRENCIES[nextIndex]);
  };

  const toggleDatePicker = (mode) => {
    if (showDatePicker && activeDateMode === mode) {
      setShowDatePicker(false);
      setActiveDateMode(null);
    } else {
      setActiveDateMode(mode);
      setShowDatePicker(true);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (selectedDate) {
      if (activeDateMode === 'start') {
        setFilterStartDate(selectedDate);
      } else if (activeDateMode === 'end') {
        setFilterEndDate(selectedDate);
      }
    }
  };

  const clearDateFilters = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setShowDatePicker(false);
    setActiveDateMode(null);
  };

  const handlePressCard = (item) => {
    router.push({
      pathname: '/add',
      params: {
        id: item.id,
        amount: item.amount.toString(),
        currency: item.currency || 'EUR',
        category: item.category,
        note: item.note || '',
        addressText: item.address || '',
        locationData: item.location ? JSON.stringify(item.location) : null,
        date: item.date 
      }
    });
  };

  const renderItem = ({ item }) => {
    const emoji = CATEGORY_EMOJIS[item.category] || '💰';
    const symbol = getCurrencySymbol(item.currency || 'EUR');
    const dateStr = item.date ? item.date.split('T')[0] : '';
    const hasLocation = item.address || item.location;
    const locationText = item.address || "GPS Tagged";

    return (
      <TouchableOpacity onPress={() => handlePressCard(item)} activeOpacity={0.7}>
        <Card style={styles.card} mode="elevated">
          <View style={styles.cardContent}>
            <View style={styles.rowTop}>
              <View style={styles.leftSection}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text variant="titleMedium" style={styles.categoryText}>{item.category}</Text>
                  <Text variant="bodySmall" style={styles.dateText}>{dateStr}</Text>
                </View>
              </View>
              <Text variant="titleLarge" style={styles.amountText}>
                -{symbol}{item.amount.toFixed(2)}
              </Text>
            </View>

            {item.note ? (
              <Text variant="bodyMedium" style={styles.noteText} numberOfLines={1}>
                📝 {item.note}
              </Text>
            ) : null}

            {hasLocation && (
              <View style={styles.locationPill}>
                <Text style={{ fontSize: 12 }}>📍</Text>
                <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                  {locationText}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 🚀 修复后的 Header：动态 Padding */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
        <View style={styles.headerContent}>
          <Text variant="titleMedium" style={{ color: 'white', opacity: 0.9 }}>
            Total Spending
          </Text>
          {loadingRates ? (
            <ActivityIndicator color="white" size="small" style={{ marginVertical: 10 }} />
          ) : (
            <Text variant="displayMedium" style={{ color: 'white', fontWeight: 'bold' }}>
              {getCurrencySymbol(displayCurrency)} {calculateTotal()}
            </Text>
          )}
          <TouchableOpacity onPress={toggleCurrency} activeOpacity={0.8}>
            <View style={styles.currencySwitchButton}>
              <Text style={styles.currencySwitchText}>
                Show in {displayCurrency} ↻
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          
          <Chip 
            icon="calendar-start" 
            mode="outlined"
            onPress={() => toggleDatePicker('start')}
            selected={false}
            style={[
              styles.filterChip, 
              (filterStartDate || activeDateMode === 'start') && styles.activeChip
            ]}
            textStyle={{ 
              color: (filterStartDate || activeDateMode === 'start') ? '#4F46E5' : '#6B7280',
              fontWeight: '600'
            }}
          >
            {filterStartDate ? filterStartDate.toLocaleDateString() : "From"}
          </Chip>

          <Chip 
            icon="calendar-end" 
            mode="outlined"
            onPress={() => toggleDatePicker('end')}
            selected={false}
            style={[
              styles.filterChip, 
              (filterEndDate || activeDateMode === 'end') && styles.activeChip
            ]}
            textStyle={{ 
              color: (filterEndDate || activeDateMode === 'end') ? '#4F46E5' : '#6B7280',
              fontWeight: '600'
            }}
          >
            {filterEndDate ? filterEndDate.toLocaleDateString() : "To"}
          </Chip>

          {(filterStartDate || filterEndDate) && (
            <TouchableOpacity onPress={clearDateFilters} style={styles.clearButton}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {FILTER_CATEGORIES.map(cat => (
            <Chip
              key={cat}
              mode="outlined"
              onPress={() => setFilterCategory(cat)}
              selected={false}
              style={[styles.filterChip, filterCategory === cat && styles.activeChip]}
              textStyle={{ 
                color: filterCategory === cat ? '#4F46E5' : '#6B7280',
                fontWeight: '600'
              }}
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {showDatePicker && (
        <View style={{ backgroundColor: 'white', paddingBottom: 10 }}>
          <DateTimePicker
            value={activeDateMode === 'start' ? (filterStartDate || new Date()) : (filterEndDate || new Date())}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            textColor="#000000" 
            themeVariant="light"
          />
          {Platform.OS === 'ios' && (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: -10 }}>
              Tap the button again to close
            </Text>
          )}
        </View>
      )}

      <View style={styles.listContainer}>
        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text variant="bodyLarge" style={{color: '#9CA3AF', marginTop: 10}}>No expenses found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExpenses}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push({ pathname: '/add', params: { id: '', _t: Date.now() } })}
        color="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4F46E5' },
  // 🚀 Header 移除了固定高度，改用动态 padding
  header: { alignItems: 'center' },
  headerContent: { alignItems: 'center', gap: 5 },
  
  currencySwitchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginTop: 5, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  currencySwitchText: { color: 'white', fontWeight: '600', fontSize: 14 },
  
  filterContainer: {
    height: 60, 
    backgroundColor: '#F9FAFB', 
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
    height: 36,
  },
  activeChip: {
    backgroundColor: '#E0E7FF', 
    borderColor: '#4F46E5'
  },
  divider: { width: 1, height: 20, backgroundColor: '#D1D5DB', marginHorizontal: 5 },
  clearButton: {
    backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginLeft: -4
  },

  listContainer: { 
    flex: 1, backgroundColor: '#F3F4F6', overflow: 'hidden' 
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 20, backgroundColor: '#4F46E5', borderRadius: 30 },
  card: { marginBottom: 12, backgroundColor: 'white', borderRadius: 16, elevation: 2 },
  cardContent: { padding: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  emojiContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  emojiText: { fontSize: 24 },
  categoryText: { fontWeight: 'bold', color: '#1F2937', fontSize: 16 },
  dateText: { color: '#9CA3AF', marginTop: 2 },
  amountText: { fontWeight: 'bold', color: '#EF4444' },
  noteText: { color: '#6B7280', fontStyle: 'italic', marginBottom: 8, marginLeft: 60 },
  locationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginLeft: 60, marginTop: 4, gap: 4 },
  locationText: { color: '#059669', fontSize: 12, fontWeight: '600', maxWidth: 200 }
});