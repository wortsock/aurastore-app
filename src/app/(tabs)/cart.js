import { useCallback, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCart } from '../../context/CartContext';
import { colors } from '../../lib/theme';
import { formatNaira, imageUrl, deliveryFee, FREE_DELIVERY_THRESHOLD } from '../../lib/format';

export default function CartScreen() {
  const router = useRouter();
  const { items, loaded, subtotal, refetch, setQty, remove } = useCart();
  const [refreshing, setRefreshing] = useState(false);

  // Safety net: refetch when the tab opens and every 15 seconds while it is focused
  useFocusEffect(useCallback(() => {
    refetch();
    const t = setInterval(refetch, 15000);
    return () => clearInterval(t);
  }, [refetch]));

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  const fee = deliveryFee(subtotal);
  const total = subtotal + fee;

  const step = (label, onPress, disabled) => (
    <Pressable onPress={onPress} disabled={disabled} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ color: colors.text, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );

  const row = (label, value, strong) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
      <Text style={{ color: strong ? colors.text : colors.muted, fontWeight: strong ? '700' : '400', fontSize: strong ? 18 : 14 }}>{label}</Text>
      <Text style={{ color: strong ? colors.accent : colors.text, fontWeight: strong ? '700' : '400', fontSize: strong ? 18 : 14 }}>{value}</Text>
    </View>
  );

  const footer = items.length ? (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 }}>
      {row('Subtotal', formatNaira(subtotal))}
      {row('Delivery', fee === 0 ? 'Free' : formatNaira(fee))}
      {fee > 0 ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{'Add ' + formatNaira(FREE_DELIVERY_THRESHOLD - subtotal) + ' more for free delivery'}</Text> : null}
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
      {row('Total', formatNaira(total), true)}
      <Pressable onPress={() => router.push('/checkout')} style={{ marginTop: 14, backgroundColor: colors.accent, borderRadius: 8, height: 46, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>Checkout</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.product_id)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListFooterComponent={footer}
        ListEmptyComponent={
          !loaded ? <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} /> : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Your cart is empty</Text>
              <Pressable onPress={() => router.navigate('/')} style={{ marginTop: 16, backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 }}>
                <Text style={{ color: '#0f172a', fontWeight: '700' }}>Go to shop</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => {
          const p = item.product;
          return (
            <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 }}>
              <Image source={{ uri: imageUrl(p.image_urls?.[0]) }} style={{ width: 76, height: 76, borderRadius: 8, backgroundColor: colors.surface }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={2} style={{ color: colors.text, fontWeight: '600' }}>{p.name}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }}>{formatNaira(p.price)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  {step('−', () => setQty(item.product_id, item.quantity - 1), item.quantity <= 1)}
                  <Text style={{ color: colors.text, width: 36, textAlign: 'center', fontWeight: '700' }}>{item.quantity}</Text>
                  {step('+', () => setQty(item.product_id, item.quantity + 1), item.quantity >= p.stock_qty)}
                  <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 'auto' }}>{formatNaira(p.price * item.quantity)}</Text>
                </View>
                <Pressable onPress={() => remove(item.product_id)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                  <Text style={{ color: colors.danger, fontSize: 13 }}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}