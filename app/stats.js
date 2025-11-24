import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useFocusEffect } from 'expo-router';
import { getExpenses } from '../src/storage';

const screenWidth = Dimensions.get('window').width;

const CATEGORY_COLORS = {
  'Food': '#FF6384',
  'Transport': '#36A2EB',
  'Shopping': '#FFCE56',
  'Hotel': '#4BC0C0',
};

const CATEGORY_EMOJIS = {
  'Food': '🍔',
  'Transport': '🚕',
  'Shopping': '🛍️',
  'Hotel': '🏨',
};

// 支持的货币列表 (与首页保持一致)
const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'JPY', 'GBP', 'CNY', 'SEK'];

// 货币符号辅助函数
const getCurrencySymbol = (code) => {
  const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CNY': '¥', 'SEK': 'kr' };
  return symbols[code] || code;
};

export default function StatsScreen() {
  const router = useRouter();
  
  // 日期初始化
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(now);
  
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('start'); 

  const [chartData, setChartData] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState({});
  
  // 🚀 新增：显示币种状态
  const [displayCurrency, setDisplayCurrency] = useState('EUR');

  const fetchRates = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      setRates(data.rates);
    } catch (error) {
      console.error(error);
    }
  };

  // 🚀 新增：切换币种功能
  const toggleCurrency = () => {
    const currentIndex = SUPPORTED_CURRENCIES.indexOf(displayCurrency);
    const nextIndex = (currentIndex + 1) % SUPPORTED_CURRENCIES.length;
    setDisplayCurrency(SUPPORTED_CURRENCIES[nextIndex]);
  };

  // 监听数据变化 (包括 displayCurrency 变化)
  useFocusEffect(
    useCallback(() => {
      if (Object.keys(rates).length > 0) {
        processData();
      }
    }, [rates, startDate, endDate, displayCurrency]) // 👈 加入 displayCurrency 依赖
  );

  const processData = async () => {
    setLoading(true);
    const expenses = await getExpenses();
    
    const filtered = expenses.filter(item => {
      const itemDate = new Date(item.date);
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      return itemDate >= start && itemDate <= end;
    });

    const grouped = {};
    let totalInBaseEur = 0;

    // 1. 先全部归一化为欧元
    filtered.forEach(item => {
      const itemCurrency = item.currency || 'EUR';
      const rateToEur = rates[itemCurrency] || 1;
      const amountInEur = item.amount / rateToEur;

      if (!grouped[item.category]) {
        grouped[item.category] = 0;
      }
      grouped[item.category] += amountInEur;
      totalInBaseEur += amountInEur;
    });

    // 2. 获取目标币种的汇率
    const targetRate = rates[displayCurrency] || 1;

    // 3. 转换总金额
    setTotalSpent(totalInBaseEur * targetRate);

    // 4. 转换各分类金额并格式化
    const formattedData = Object.keys(grouped).map(category => ({
      name: category,
      // 核心转换逻辑：欧元金额 * 目标汇率
      amount: parseFloat((grouped[category] * targetRate).toFixed(2)),
      color: CATEGORY_COLORS[category] || '#999',
      legendFontColor: '#1F2937',
      legendFontSize: 15,
      emoji: CATEGORY_EMOJIS[category]
    }));

    formattedData.sort((a, b) => b.amount - a.amount);
    setChartData(formattedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || (pickerMode === 'start' ? startDate : endDate);
    if (Platform.OS === 'android') setShowPicker(false);
    
    if (pickerMode === 'start') {
      setStartDate(currentDate);
    } else {
      setEndDate(currentDate);
    }
  };

  const handleDatePress = (mode) => {
    if (showPicker && pickerMode === mode) {
      setShowPicker(false);
    } else {
      setPickerMode(mode);
      setShowPicker(true);
    }
  };

  // 获取当前显示的货币符号
  const currentSymbol = getCurrencySymbol(displayCurrency);

  return (
    <View style={styles.container}>
      
      {/* 🚀 升级后的 Header：包含币种切换 */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* 标题区域 */}
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#1F2937' }}>Statistics</Text>
        </View>

        {/* 币种切换按钮 (放在标题下方，居中) */}
        <TouchableOpacity onPress={toggleCurrency} activeOpacity={0.6}>
          <View style={styles.currencySwitchButton}>
            <Text style={styles.currencySwitchText}>
              Show in {displayCurrency} ↻
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* 日期过滤器 */}
        <Surface style={styles.filterCard} elevation={2}>
          <Text variant="titleMedium" style={{ marginBottom: 15, fontWeight: 'bold', color: '#1F2937' }}>Date Range</Text>
          <View style={styles.dateRow}>
            <Button 
              mode="outlined" 
              onPress={() => handleDatePress('start')} 
              style={[styles.dateBtn, showPicker && pickerMode === 'start' && styles.activeDateBtn]}
              textColor="#1F2937" 
              icon="calendar"
            >
              From: {startDate.toLocaleDateString()}
            </Button>

            <Button 
              mode="outlined" 
              onPress={() => handleDatePress('end')} 
              style={[styles.dateBtn, showPicker && pickerMode === 'end' && styles.activeDateBtn]}
              textColor="#1F2937" 
              icon="calendar"
            >
              To: {endDate.toLocaleDateString()}
            </Button>
          </View>
        </Surface>

        {showPicker && (
          <DateTimePicker
            value={pickerMode === 'start' ? startDate : endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            textColor="#000000" 
            themeVariant="light" 
          />
        )}

        {/* 饼图区域 */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} color="#4F46E5" size="large" />
        ) : chartData.length > 0 ? (
          <View>
            <Surface style={styles.chartCard} elevation={2}>
              {/* 🚀 总金额跟随币种变化 */}
              <Text variant="titleLarge" style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10, color: '#1F2937' }}>
                Total: {currentSymbol}{totalSpent.toFixed(2)}
              </Text>
              
              <PieChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={"amount"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute 
                hasLegend={false} 
              />
            </Surface>

            {/* 列表区域 */}
            <View style={styles.legendContainer}>
              {chartData.map((item, index) => (
                <Surface key={index} style={styles.legendItem} elevation={1}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={{ fontSize: 16, marginLeft: 10, fontWeight: '600', color: '#1F2937' }}>
                      {item.emoji} {item.name}
                    </Text>
                  </View>
                  <View>
                    {/* 🚀 分项金额跟随币种变化 */}
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1F2937' }}>
                      {currentSymbol}{item.amount.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'right' }}>
                      {totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(1) : 0}%
                    </Text>
                  </View>
                </Surface>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 50 }}>📉</Text>
            <Text variant="bodyLarge" style={{ color: '#6B7280', marginTop: 10, fontWeight: '500' }}>
              No expenses in this range.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  // Header 样式调整
  header: { 
    paddingTop: 60, paddingBottom: 15, backgroundColor: 'white', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6' 
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  
  // 币种切换按钮样式 (淡蓝色胶囊)
  currencySwitchButton: {
    backgroundColor: '#E0E7FF', 
    paddingHorizontal: 12, 
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  currencySwitchText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 12,
  },

  filterCard: { margin: 15, padding: 15, backgroundColor: 'white', borderRadius: 12 },
  dateRow: { flexDirection: 'column', gap: 10 },
  dateBtn: { borderColor: '#D1D5DB', backgroundColor: 'white', borderRadius: 8 },
  activeDateBtn: { borderColor: '#4F46E5', backgroundColor: '#E0E7FF', borderWidth: 2 },
  
  chartCard: { margin: 15, padding: 20, backgroundColor: 'white', borderRadius: 16, alignItems: 'center' },
  legendContainer: { paddingHorizontal: 15 },
  legendItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, marginBottom: 10, backgroundColor: 'white', borderRadius: 12
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  emptyState: { alignItems: 'center', marginTop: 50 }
});