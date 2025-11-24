import { Tabs } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <PaperProvider>
      {/* 状态栏设置 */}
      <StatusBar style="light" backgroundColor="#4F46E5" />
      
      <Tabs
        screenOptions={{
          headerShown: false, // 我们自己写了 Header，所以隐藏默认的
          tabBarActiveTintColor: '#4F46E5', // 选中时的颜色 (深靛蓝)
          tabBarInactiveTintColor: '#9CA3AF', // 未选中时的颜色 (灰色)
          tabBarStyle: { 
            paddingBottom: 5, 
            height: 60,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            elevation: 5 // 安卓阴影
          },
        }}
      >
        {/* Tab 1: 首页列表 */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Trips',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="wallet-outline" size={28} color={color} />
            ),
          }}
        />

        {/* Tab 2: 统计图表 (这里就是你要的显眼入口！) */}
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Analysis',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="chart-pie" size={28} color={color} />
            ),
          }}
        />

        {/* Hidden Route: Add 页面 */}
        {/* 我们不希望 Add 出现在底部 Tab 栏里，所以设为 href: null */}
        <Tabs.Screen
          name="add"
          options={{
            href: null, // 隐藏入口
            tabBarStyle: { display: 'none' }, // 进入 Add 页面后隐藏底部栏
          }}
        />
      </Tabs>
    </PaperProvider>
  );
}