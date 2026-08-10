/**
 * Bottom tabs — Home, Shop, Cart, Orders, Account.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useCart } from '@/context/CartContext';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';

function CartBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <AppText variant="tiny" color="#fff" style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </AppText>
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const { count } = useCart();

  const icon = (name: keyof typeof Ionicons.glyphMap, focused: boolean) => (
    <Ionicons name={name} size={22} color={focused ? theme.primary : theme.gray} />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.gray,
        tabBarStyle: {
          backgroundColor: theme.cardBg,
          borderTopColor: theme.border,
          height: 60 + 12,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => icon(focused ? 'home' : 'home-outline', focused),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ focused }) => icon(focused ? 'storefront' : 'storefront-outline', focused),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => (
            <View>
              {icon(focused ? 'cart' : 'cart-outline', focused)}
              <View style={{ position: 'absolute', top: -6, right: -10 }}>
                <CartBadge count={count} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => icon(focused ? 'receipt' : 'receipt-outline', focused),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => icon(focused ? 'person' : 'person-outline', focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '800' },
});
