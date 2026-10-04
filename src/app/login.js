import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, redirectTo } from '../context/AuthContext';
import { colors } from '../lib/theme';

export default function Login() {
  const { session, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  if (session) return <Redirect href="/" />;

  const go = async () => {
    setBusy(true);
    try { await signInWithGoogle(); }
    catch (e) { Alert.alert('Sign in failed', String(e.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flash" size={46} color="#06222f" />
      </View>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700', marginTop: 20 }}>AuraStore</Text>
      <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>Premium tech, delivered. Sign in to start shopping.</Text>
      <Pressable
        onPress={go}
        disabled={busy}
        style={{ marginTop: 36, backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, minWidth: 260, alignItems: 'center', opacity: busy ? 0.7 : 1 }}
      >
        {busy ? <ActivityIndicator color="#0f172a" /> : <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>Continue with Google</Text>}
      </Pressable>
      <Text selectable style={{ color: colors.muted, fontSize: 11, marginTop: 40, textAlign: 'center' }}>
        debug redirect: {redirectTo}
      </Text>
    </View>
  );
}