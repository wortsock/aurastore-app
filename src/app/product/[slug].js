import { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../context/CartContext';
import { colors } from '../../lib/theme';
import { formatNaira, imageUrl } from '../../lib/format';

const Section = ({ title, children }) => (
  <View style={{ marginTop: 22 }}>
    <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
    {children}
  </View>
);

export default function ProductScreen() {
  const { slug } = useLocalSearchParams();
  const { add } = useCart();
  const { width } = useWindowDimensions();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.from('products').select('*').eq('slug', slug).maybeSingle().then(({ data, error }) => {
      if (error) setErr(error.message);
      else if (!data) setErr('Product not found');
      else setP(data);
    });
  }, [slug]);

  if (err) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24 }}><Text style={{ color: colors.danger }}>{err}</Text></View>;
  if (!p) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} size="large" /></View>;

  const out = p.stock_qty < 1;
  const off = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const specs = Object.entries(p.specifications || {});

  const onAdd = async () => {
    const r = await add(p, qty);
    setMsg(!r.ok ? 'Out of stock' : r.capped ? 'Only ' + p.stock_qty + ' available, cart updated' : 'Added to cart');
    setTimeout(() => setMsg(''), 2500);
  };

  const stepBtn = (label, onPress, disabled) => (
    <Pressable onPress={onPress} disabled={disabled} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ color: colors.text, fontSize: 20 }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <FlatList
        data={p.image_urls || []} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => u + i}
        renderItem={({ item }) => <Image source={{ uri: imageUrl(item) }} style={{ width, height: width * 0.9, backgroundColor: colors.surface }} resizeMode="cover" />}
      />
      <View style={{ padding: 16 }}>
        {p.brand ? <Text style={{ color: colors.accent, fontWeight: '600' }}>{p.brand}</Text> : null}
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 2 }}>{p.name}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{'★ ' + p.rating_avg + '  (' + p.rating_count + ' reviews)'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700' }}>{formatNaira(p.price)}</Text>
          {p.old_price ? <Text style={{ color: colors.muted, textDecorationLine: 'line-through', marginLeft: 10 }}>{formatNaira(p.old_price)}</Text> : null}
          {off > 0 ? <Text style={{ color: colors.success, fontWeight: '700', marginLeft: 10 }}>-{off}%</Text> : null}
        </View>
        <Text style={{ marginTop: 6, color: out ? colors.danger : p.stock_qty <= 5 ? '#f59e0b' : colors.success, fontWeight: '600' }}>
          {out ? 'Out of stock' : p.stock_qty <= 5 ? 'Only ' + p.stock_qty + ' left' : 'In stock'}
        </Text>

        {!out && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            {stepBtn('−', () => setQty((q) => Math.max(1, q - 1)), qty <= 1)}
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', width: 48, textAlign: 'center' }}>{qty}</Text>
            {stepBtn('+', () => setQty((q) => Math.min(p.stock_qty, q + 1)), qty >= p.stock_qty)}
            <Pressable onPress={onAdd} style={{ flex: 1, marginLeft: 12, backgroundColor: colors.accent, borderRadius: 8, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>Add to cart</Text>
            </Pressable>
          </View>
        )}
        {msg ? <Text style={{ color: colors.accent, marginTop: 10 }}>{msg}</Text> : null}

        {p.highlights?.length ? (
          <Section title="Highlights">{p.highlights.map((h, i) => <Text key={i} style={{ color: colors.muted, marginBottom: 4 }}>{'•  ' + h}</Text>)}</Section>
        ) : null}
        {p.description ? <Section title="Description"><Text style={{ color: colors.muted, lineHeight: 21 }}>{p.description}</Text></Section> : null}
        {specs.length ? (
          <Section title="Specifications">
            {specs.map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.muted, flex: 1 }}>{k}</Text>
                <Text style={{ color: colors.text, flex: 1.4 }}>{String(v)}</Text>
              </View>
            ))}
          </Section>
        ) : null}
        {p.box_contents?.length ? (
          <Section title="In the box">{p.box_contents.map((b, i) => <Text key={i} style={{ color: colors.muted, marginBottom: 4 }}>{'•  ' + b}</Text>)}</Section>
        ) : null}
        {p.warranty ? <Section title="Warranty"><Text style={{ color: colors.muted }}>{p.warranty}</Text></Section> : null}
      </View>
    </ScrollView>
  );
}