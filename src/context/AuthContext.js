import { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const redirectTo = makeRedirectUri();

function parseParams(url) {
  const out = {};
  const hashIdx = url.indexOf('#');
  const main = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const qIdx = main.indexOf('?');
  const query = qIdx >= 0 ? main.slice(qIdx + 1) : '';
  [query, hash].forEach((part) =>
    part.split('&').forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf('=');
      const k = i < 0 ? pair : pair.slice(0, i);
      const v = i < 0 ? '' : pair.slice(i + 1);
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    })
  );
  return out;
}

async function sessionFromUrl(url) {
  const p = parseParams(url);
  if (p.error_description || p.error) throw new Error(p.error_description || p.error);
  if (!p.access_token || !p.refresh_token) return null;
  const { data, error } = await supabase.auth.setSession({
    access_token: p.access_token,
    refresh_token: p.refresh_token,
  });
  if (error) throw error;
  return data.session;
}

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handle = ({ url }) => { sessionFromUrl(url).catch(() => {}); };
    const sub = Linking.addEventListener('url', handle);
    Linking.getInitialURL().then((u) => { if (u) sessionFromUrl(u).catch(() => {}); });
    return () => sub.remove();
  }, []);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success') await sessionFromUrl(res.url);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}