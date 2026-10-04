import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { formatNaira, formatDate } from '../../lib/format';
import { STATUS_COLORS } from '../../lib/constants';

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders').select('id,order_number,status,total,created_at')
      .order('created_at', { ascending: false });
    if (!error) setOrders(data || []);
    setLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          !loaded ? <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} /> : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>No orders yet</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>Orders you place will show here.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] || colors.muted;
          return (
            <Pressable onPress={() => router.push('/order/' + item.id)} style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.order_number}</Text>
                <View style={{ borderWidth: 1, borderColor: sc, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: sc, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{item.status}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: colors.muted }}>{formatDate(item.created_at)}</Text>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>{formatNaira(item.total)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}