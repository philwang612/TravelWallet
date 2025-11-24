import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'travel_wallet_expenses';

// 1. 获取所有记录
export const getExpenses = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Reading error:", e);
    return [];
  }
};

// 2. 保存新记录 (Create)
export const saveExpense = async (newExpense) => {
  try {
    const existingData = await getExpenses();
    const updatedData = [newExpense, ...existingData];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    return true;
  } catch (e) {
    console.error("Saving error:", e);
    return false;
  }
};

// 3. 更新现有记录 (Update) - 新增
export const updateExpense = async (updatedItem) => {
  try {
    const existingData = await getExpenses();
    // 找到对应 ID 的记录并替换它
    const newData = existingData.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return true;
  } catch (e) {
    console.error("Update error:", e);
    return false;
  }
};

// 4. 删除记录 (Delete) - 新增
export const deleteExpense = async (id) => {
  try {
    const existingData = await getExpenses();
    // 过滤掉对应 ID 的记录
    const newData = existingData.filter(item => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return true;
  } catch (e) {
    console.error("Delete error:", e);
    return false;
  }
};

// 清空所有 (调试用)
export const clearExpenses = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};