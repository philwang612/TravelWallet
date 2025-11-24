import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, Animated, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, Chip, Snackbar, Portal, IconButton } from 'react-native-paper';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { saveExpense, updateExpense, deleteExpense } from '../src/storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORIES = [
  { name: 'Food', emoji: '🍔' },
  { name: 'Transport', emoji: '🚕' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Hotel', emoji: '🏨' },
];

const CURRENCIES = [
  { code: 'EUR', icon: 'currency-eur' }, { code: 'USD', icon: 'currency-usd' },
  { code: 'GBP', icon: 'currency-gbp' }, { code: 'JPY', icon: 'currency-jpy' },
  { code: 'CNY', icon: 'currency-cny' }, { code: 'SEK', icon: 'cash' },
];

export default function AddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Food');
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false); // 控制日期选择器显示

  const [editId, setEditId] = useState(null);
  const [originalDate, setOriginalDate] = useState(null);

  const [location, setLocation] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const fadeAnim = new React.useRef(new Animated.Value(0)).current;

  // 状态初始化与清理
  useFocusEffect(
    useCallback(() => {
      if (params.id) {
        setEditId(params.id);
        setAmount(params.amount);
        setCurrency(params.currency || 'EUR');
        setCategory(params.category);
        setNote(params.note || '');
        setAddressText(params.addressText || '');
        
        if (params.date) {
          setDate(new Date(params.date));
        }
        
        if (params.locationData) {
          try {
            const loc = JSON.parse(params.locationData);
            setLocation(loc);
            if(loc) Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
          } catch (e) { setLocation(null); }
        }
      } else {
        resetForm();
      }

      return () => {
        // 离开页面时清除参数，确保下次进入是新建状态
        router.setParams({ id: '', amount: '', note: '', date: '' });
      };
    }, [params.id, params._t]) 
  );

  const resetForm = () => {
    setEditId(null);
    setAmount('');
    setNote('');
    setCategory('Food');
    setLocation(null);
    setAddressText('');
    setDate(new Date()); 
    setShowDatePicker(false); // 重置时也关闭日期选择器
  };

  const getCurrencyIcon = () => {
    const found = CURRENCIES.find(c => c.code === currency);
    return found ? found.icon : 'cash';
  };

  const handleBack = () => {
    router.setParams({ id: '', amount: '', note: '' });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // 🚀 核心修复：日期选择逻辑
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
    
    // Android: 选完自动关闭
    // iOS: 保持打开，直到用户再次点击按钮手动关闭 (Toggle)
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const handleGetLocation = async () => {
    setLoading(true);
    Keyboard.dismiss();
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow location access.');
      setLoading(false); return;
    }
    try {
      let userLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = userLocation.coords;
      setLocation({ lat: latitude, lng: longitude });
      try {
        let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addressResponse.length > 0) {
          const item = addressResponse[0];
          const street = item.street || item.name || '';
          const city = item.city || item.subregion || '';
          const formattedAddress = `${street}${street && city ? ', ' : ''}${city}`;
          setAddressText(formattedAddress || 'Unknown Location');
        } else {
          setAddressText(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`);
        }
      } catch (geocodeError) {
        setAddressText(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`);
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (error) {
      Alert.alert('Error', 'Could not fetch GPS signal');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!amount) { Alert.alert('Error', 'Please enter an amount'); return; }

    const expenseData = {
      id: editId || Date.now().toString(),
      amount: parseFloat(amount),
      currency: currency,
      category,
      note,
      date: date.toISOString(),
      location: location,
      address: addressText 
    };

    let success = false;
    if (editId) {
      success = await updateExpense(expenseData);
      setSnackbarMessage('✅ Transaction Updated!');
    } else {
      success = await saveExpense(expenseData);
      setSnackbarMessage('✅ Transaction Saved!');
    }
    
    if (success) {
      setSnackbarVisible(true);
      setTimeout(() => {
        if (editId) {
          handleBack();
        } else {
          resetForm(); 
        }
      }, 500); 
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const success = await deleteExpense(editId);
            if (success) {
              setSnackbarMessage('🗑️ Transaction Deleted');
              setSnackbarVisible(true);
              setTimeout(() => {
                handleBack();
              }, 500);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          
          <View style={styles.headerRow}>
            <IconButton icon="arrow-left" iconColor="#1F2937" size={26} onPress={handleBack} style={{ margin: 0 }}/>
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: '#1F2937' }}>
              {editId ? "Edit Expense" : "New Expense"}
            </Text>
            {editId ? (
              <IconButton icon="trash-can-outline" iconColor="#EF4444" size={26} onPress={handleDelete} style={{ margin: 0 }}/>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          <Surface style={styles.card} elevation={2}>
            <TextInput
              mode="outlined"
              label={`Amount (${currency})`} 
              placeholder="0.00" placeholderTextColor="#9CA3AF" keyboardType="numeric"
              value={amount} onChangeText={setAmount}
              left={<TextInput.Icon icon={getCurrencyIcon()} color={amount ? '#4F46E5' : '#9CA3AF'} />}
              activeOutlineColor="#4F46E5" outlineColor="#D1D5DB" textColor="#1F2937"
              style={[styles.input, { backgroundColor: '#FFFFFF', marginBottom: 10 }]}
            />

            <View style={{ marginBottom: 15 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                  {CURRENCIES.map((curr) => (
                    <Chip key={curr.code} selected={currency === curr.code} onPress={() => { Keyboard.dismiss(); setCurrency(curr.code); }}
                      selectedColor="#4F46E5" style={[styles.currencyChip, currency === curr.code ? { backgroundColor: '#E0E7FF', borderColor: '#4F46E5', borderWidth: 1 } : { backgroundColor: '#F3F4F6', borderColor: 'transparent', borderWidth: 1 }]}
                      textStyle={{ color: currency === curr.code ? '#4F46E5' : '#4B5563', fontWeight: currency === curr.code ? 'bold' : 'normal', fontSize: 12 }} showSelectedOverlay>
                      {curr.code}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.chipContainer}>
              {CATEGORIES.map((cat) => (
                <Chip key={cat.name} selected={category === cat.name} onPress={() => { Keyboard.dismiss(); setCategory(cat.name); }}
                  selectedColor="#4F46E5" style={[styles.categoryChip, category === cat.name ? { backgroundColor: '#E0E7FF', borderColor: '#4F46E5', borderWidth: 1 } : { backgroundColor: '#F3F4F6', borderColor: 'transparent', borderWidth: 1 }]}
                  textStyle={{ color: category === cat.name ? '#4F46E5' : '#4B5563', fontWeight: category === cat.name ? 'bold' : 'normal', fontSize: 14 }} showSelectedOverlay>
                  {cat.emoji} {cat.name}
                </Chip>
              ))}
            </View>

            {/* 🚀 核心修复：日期按钮点击事件修改为 Toggle (取反) */}
            <Button 
              mode="outlined" 
              onPress={() => setShowDatePicker((prev) => !prev)} 
              icon="calendar"
              textColor="#1F2937"
              style={{ marginBottom: 15, borderColor: '#D1D5DB', backgroundColor: 'white' }}
              contentStyle={{ justifyContent: 'flex-start' }}
            >
              Date: {date.toLocaleDateString()}
            </Button>

            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeDate}
                textColor="#000000" // 强制黑色文字
                themeVariant="light" // 强制浅色主题
              />
            )}

            <TextInput 
              mode="outlined" label="Note" placeholder="e.g., Lunch at Helsinki" placeholderTextColor="#9CA3AF"
              value={note} onChangeText={setNote} activeOutlineColor="#4F46E5" outlineColor="#D1D5DB" textColor="#1F2937"
              style={[styles.input, { backgroundColor: '#FFFFFF' }]} 
            />

            <Button mode="outlined" onPress={handleGetLocation} loading={loading} 
              icon={location ? "map-marker-check" : "map-marker"} 
              textColor={location ? '#059669' : '#4F46E5'}
              style={{ marginTop: 5, borderColor: location ? '#059669' : '#4F46E5', backgroundColor: location ? '#ECFDF5' : 'transparent' }}>
              {location ? "Location Found" : "Add Location (GPS)"}
            </Button>

            {location && (
              <Animated.View style={{ opacity: fadeAnim, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="bodySmall" style={{ color: '#059669', fontWeight: 'bold' }}>📍 {addressText}</Text>
              </Animated.View>
            )}
          </Surface>

          <Button mode="contained" onPress={handleSave} style={styles.saveButton} contentStyle={{ height: 50 }}
            buttonColor="#4F46E5" textColor="#FFFFFF" labelStyle={{ fontSize: 18, fontWeight: 'bold' }}>
            {editId ? "Update Transaction" : "Save Transaction"}
          </Button>

          <Portal>
            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={1000}
              wrapperStyle={{ bottom: 30, zIndex: 9999 }} style={{ backgroundColor: '#059669', borderRadius: 30, alignSelf: 'center', width: '90%', elevation: 6 }}>
              <Text style={{color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16}}>
                {snackbarMessage}
              </Text>
            </Snackbar>
          </Portal>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F9FAFB' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  card: { padding: 20, borderRadius: 16, backgroundColor: 'white' },
  input: { marginBottom: 15, backgroundColor: 'white' },
  currencyChip: { height: 32, borderRadius: 16, paddingHorizontal: 0 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15, rowGap: 12 },
  categoryChip: { width: '48%', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  saveButton: { marginTop: 30, borderRadius: 30, elevation: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 }
});