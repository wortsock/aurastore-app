import { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../lib/theme';

export default function Account() {
  const { user, signOut } = useAuth();
  const [failed, setFailed] = useState(false);
  const meta = user?.user_metadata || {};
  const name = meta.full_name || meta.name || 'AuraStore customer';
  const avatar = meta.avatar_url || meta.picture;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, alignItems: 'center' }}>
      {avatar && !failed ? (
        <Image source={{ uri: avatar }} onError={() => setFailed(true)} style={{ width: 96, height: 96, borderRadius: 48, marginTop: 16 }} />
      ) : (
        <View style={{ width: 96, height: 96, borderRadius: 48, marginTop: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={44} color={colors.muted} />
        </View>
      )}
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 14 }}>{name}</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>{user?.email}</Text>
      <Pressable onPress={signOut} style={{ marginTop: 32, borderWidth: 1, borderColor: colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 }}>
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}