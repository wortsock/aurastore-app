import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { formatNaira, formatDate, imageUrl } from '../../lib/format';
import { STATUS_COLORS } from '../../lib/constants';

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const o = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      if (o.error || !o.data) { setErr(o.error?.message || 'Order not found'); return; }
      const it = await supabase.from('order_items').select('*').eq('order_id', id).order('id');
      setOrder(o.data);
      setItems(it.data || []);
    })();
  }, [id]);

  if (err) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24 }}><Text style={{ color: colors.danger }}>{err}</Text></View>;
  if (!order) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} size="large" /></View>;

  const box = { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 14 };
  const sc = STATUS_COLORS[order.status] || colors.muted;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {placed === '1' && (
        <View style={{ backgroundColor: '#064e3b', borderRadius: 16, padding: 16 }}>
          <Text style={{ color: '#34d399', fontWeight: '700', fontSize: 18 }}>Order placed. Thank you!</Text>
          <Text style={{ color: '#d1fae5', marginTop: 6 }}>
            {order.email_status === 'sent'
              ? 'A confirmation email was sent to ' + order.contact_email + '.'
              : order.email_status === 'failed'
              ? 'Your order is saved, but we could not send the confirmation email.'
              : 'Your order is saved. The confirmation email is on its way.'}
          </Text>
        </View>
      )}

      <View style={box}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17 }}>{order.order_number}</Text>
          <View style={{ borderWidth: 1, borderColor: sc, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: sc, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{order.status}</Text>
          </View>
        </View>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{formatDate(order.created_at)}</Text>
      </View>

      <View style={box}>
        {items.map((i) => (
          <View key={i.id} style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Image source={{ uri: imageUrl(i.image_url) }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.surface }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text numberOfLines={2} style={{ color: colors.text, fontWeight: '600' }}>{i.product_name}</Text>
              <Text style={{ color: colors.muted, marginTop: 2 }}>{i.quantity + ' x ' + formatNaira(i.unit_price)}</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{formatNaira(i.line_total)}</Text>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={{ color: colors.muted }}>Subtotal</Text><Text style={{ color: colors.text }}>{formatNaira(order.subtotal)}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}><Text style={{ color: colors.muted }}>Delivery</Text><Text style={{ color: colors.text }}>{order.delivery_fee === 0 ? 'Free' : formatNaira(order.delivery_fee)}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Total</Text><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 18 }}>{formatNaira(order.total)}</Text></View>
      </View>

      <View style={box}>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Delivering to</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>{order.ship_name + '\n' + order.ship_address + '\n' + order.ship_city + ', ' + order.ship_state + '\n' + order.ship_phone}</Text>
        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12, marginBottom: 2 }}>Payment</Text>
        <Text style={{ color: colors.muted }}>Pay on Delivery</Text>
      </View>

      {placed === '1' && (
        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <Pressable onPress={() => router.replace('/orders')} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, height: 46, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>View orders</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 8, height: 46, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>Continue shopping</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}