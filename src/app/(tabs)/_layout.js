import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  const { session } = useAuth();
  const { count } = useCart();
  if (!session) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shop', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarBadge: count > 0 ? count : undefined, tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}