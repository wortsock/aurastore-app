import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Image, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';
import { formatNaira, imageUrl } from '../../lib/format';

function Card({ p, width, onPress }) {
  const out = p.stock_qty < 1;
  const off = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  return (
    <Pressable onPress={onPress} style={{ width, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <View>
        <Image source={{ uri: imageUrl(p.image_urls?.[0]) }} style={{ width: '100%', height: width, backgroundColor: colors.surface, opacity: out ? 0.4 : 1 }} />
        {off > 0 && (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: colors.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>-{off}%</Text>
          </View>
        )}
        {out && (
          <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.danger, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#0f172a', fontSize: 11, fontWeight: '700' }}>Out of stock</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={{ color: colors.text, fontWeight: '600', minHeight: 36 }}>{p.name}</Text>
        <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 4 }}>{formatNaira(p.price)}</Text>
        {p.old_price ? <Text style={{ color: colors.muted, textDecorationLine: 'line-through', fontSize: 12 }}>{formatNaira(p.old_price)}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function Shop() {
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const cardW = (winW - 32 - 12) / 2;
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null); setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    if (p.error || c.error) setErr((p.error || c.error).message);
    else { setProducts(p.data); setCats(c.data); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const catName = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) =>
      (!cat || p.category_id === cat) &&
      (!s || p.name.toLowerCase().includes(s) || (p.brand || '').toLowerCase().includes(s) || (catName[p.category_id] || '').toLowerCase().includes(s))
    );
  }, [products, q, cat, catName]);

  const chip = (label, active, onPress, key) => (
    <Pressable key={key} onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8, backgroundColor: active ? colors.accent : colors.surface, borderWidth: 1, borderColor: active ? colors.accent : colors.border }}>
      <Text style={{ color: active ? '#0f172a' : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TextInput
          value={q} onChangeText={setQ} placeholder="Search products" placeholderTextColor={colors.muted}
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12, flexGrow: 0 }}>
          {chip('All', cat === null, () => setCat(null), 'all')}
          {cats.map((c) => chip(c.name, cat === c.id, () => setCat(c.id), c.id))}
        </ScrollView>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
      ) : err ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: colors.danger }}>Could not load products.</Text>
          <Pressable onPress={load} style={{ marginTop: 12, padding: 12 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={shown}
          numColumns={2}
          keyExtractor={(p) => String(p.id)}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => <Card p={item} width={cardW} onPress={() => router.push('/product/' + item.slug)} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: colors.muted }}>No products match.</Text>
              <Pressable onPress={() => { setQ(''); setCat(null); }} style={{ marginTop: 12, padding: 12 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>Clear</Text></Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}