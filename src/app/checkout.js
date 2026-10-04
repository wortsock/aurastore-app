import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Modal, FlatList, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { colors } from '../lib/theme';
import { formatNaira, deliveryFee } from '../lib/format';
import { STATES } from '../lib/constants';

function Field({ label, error, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.muted, marginBottom: 6, fontSize: 13 }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: error ? colors.danger : colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 },
          props.multiline && { minHeight: 70, textAlignVertical: 'top' },
        ]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

function validate(f) {
  const e = {};
  const name = f.name.trim(), email = f.email.trim(), phone = f.phone.replace(/[\s-]/g, '');
  const address = f.address.trim(), city = f.city.trim();
  if (name.length < 2 || name.length > 80) e.name = 'Enter your full name.';
  if (!/^(\+234|0)[789][01]\d{8}$/.test(phone)) e.phone = 'Enter a valid Nigerian phone number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
  if (address.length < 5 || address.length > 200) e.address = 'Enter your delivery address.';
  if (city.length < 2 || city.length > 80) e.city = 'Enter your city or town.';
  if (!STATES.includes(f.state)) e.state = 'Choose your state.';
  return e;
}

export default function Checkout() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { items, subtotal, refetch } = useCart();
  const [f, setF] = useState({ name: '', phone: '', email: user?.email || '', address: '', city: '', state: '' });
  const [errors, setErrors] = useState({});
  const [saveDetails, setSaveDetails] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickState, setPickState] = useState(false);
  const rid = useRef(null);   // one request id per checkout attempt, reused on retries
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setF((p) => ({
        ...p,
        name: p.name || data.full_name || '',
        phone: p.phone || data.phone || '',
        email: p.email || data.email || user.email || '',
        address: p.address || data.default_address || '',
        city: p.city || data.city || '',
        state: p.state || (STATES.includes(data.state) ? data.state : ''),
      }));
    });
  }, [user?.id]);

  const fee = deliveryFee(subtotal);
  const total = subtotal + fee;

  const submit = async () => {
    if (busy) return;
    if (!items.length) { Alert.alert('Your cart is empty'); return; }
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      if (!rid.current) rid.current = randomUUID();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Session expired', 'Please sign in again.'); await signOut(); return; }
      const res = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
          address: f.address.trim(), city: f.city.trim(), state: f.state, request_id: rid.current,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        rid.current = null;
        if (saveDetails) {
          supabase.from('profiles').update({
            full_name: f.name.trim(), phone: f.phone.trim(), default_address: f.address.trim(), city: f.city.trim(), state: f.state,
          }).eq('id', user.id).then(() => {});
        }
        await refetch();
        router.replace('/order/' + body.order_id + '?placed=1');
        return;
      }
      if (res.status === 400 && body.error === 'VALIDATION') { setErrors(body.fields || {}); return; }
      if (res.status === 400 && body.error === 'EMPTY_CART') { Alert.alert('Your cart is empty'); await refetch(); return; }
      if (res.status === 401) { Alert.alert('Session expired', 'Please sign in again.'); await signOut(); return; }
      if (res.status === 409 && body.error === 'STOCK_PROBLEM') {
        const lines = (body.items || []).map((i) => i.name + ': you asked for ' + i.requested + ', only ' + i.available + ' left').join('\n');
        Alert.alert('Some items are low on stock', lines, [{ text: 'Go to cart', onPress: () => router.replace('/cart') }]);
        await refetch();
        return;
      }
      Alert.alert('Something went wrong', 'Your details are kept. Please try again. (' + res.status + ' ' + (body.error || '') + ')');
    } catch (err) {
      Alert.alert('Network problem', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Field label="Full name" value={f.name} onChangeText={set('name')} error={errors.name} autoCapitalize="words" />
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" placeholder="0801 234 5678" />
        <Field label="Email" value={f.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Delivery address" value={f.address} onChangeText={set('address')} error={errors.address} multiline />
        <Field label="City / town" value={f.city} onChangeText={set('city')} error={errors.city} />

        <Text style={{ color: colors.muted, marginBottom: 6, fontSize: 13 }}>State</Text>
        <Pressable onPress={() => setPickState(true)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: errors.state ? colors.danger : colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13 }}>
          <Text style={{ color: f.state ? colors.text : colors.muted }}>{f.state || 'Choose your state'}</Text>
        </Pressable>
        {errors.state ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{errors.state}</Text> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
          <Text style={{ color: colors.text }}>Save these details for next time</Text>
          <Switch value={saveDetails} onValueChange={setSaveDetails} trackColor={{ true: colors.accentDark }} thumbColor={colors.accent} />
        </View>

        <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 20 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Order summary</Text>
          {items.map((i) => (
            <View key={i.product_id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text numberOfLines={1} style={{ color: colors.muted, flex: 1, marginRight: 8 }}>{i.quantity + ' x ' + i.product.name}</Text>
              <Text style={{ color: colors.text }}>{formatNaira(i.quantity * i.product.price)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.muted }}>Subtotal</Text><Text style={{ color: colors.text }}>{formatNaira(subtotal)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}><Text style={{ color: colors.muted }}>Delivery</Text><Text style={{ color: colors.text }}>{fee === 0 ? 'Free' : formatNaira(fee)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Total</Text><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 18 }}>{formatNaira(total)}</Text></View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 10 }}>Payment: Pay on Delivery</Text>
        </View>

        <Pressable onPress={submit} disabled={busy} style={{ marginTop: 20, backgroundColor: colors.accent, borderRadius: 8, height: 50, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
          {busy ? <ActivityIndicator color="#0f172a" /> : <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>{'Place order  ' + formatNaira(total)}</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={pickState} animationType="slide" onRequestClose={() => setPickState(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Choose your state</Text>
            <Pressable onPress={() => setPickState(false)}><Text style={{ color: colors.accent, fontWeight: '700' }}>Close</Text></Pressable>
          </View>
          <FlatList
            data={STATES}
            keyExtractor={(s) => s}
            renderItem={({ item }) => (
              <Pressable onPress={() => { set('state')(item); setPickState(false); }} style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: item === f.state ? colors.accent : colors.text, fontWeight: item === f.state ? '700' : '400' }}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}