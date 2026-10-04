import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('cart_items')
      .select('product_id, quantity, products(id,slug,name,price,old_price,stock_qty,image_urls)')
      .eq('user_id', userId);
    if (error) { console.log('cart fetch error', error.message); return; }
    setItems(
      (data || [])
        .filter((r) => r.products)
        .map((r) => ({ product_id: r.product_id, quantity: r.quantity, product: r.products }))
    );
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) { setItems([]); setLoaded(false); return; }
    refetch();
    const channel = supabase
      .channel('app-cart-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${userId}` },
        () => refetch()
      )
      .subscribe((status) => console.log('realtime status:', status));
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refetch(); });
    return () => { supabase.removeChannel(channel); sub.remove(); };
  }, [userId, refetch]);

  // One row per write, never "replace the whole cart"
  const write = async (productId, qty) => {
    const q = qty <= 0
      ? supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId)
      : supabase.from('cart_items').upsert({
          user_id: userId, product_id: productId, quantity: qty, updated_at: new Date().toISOString(),
        });
    const { error } = await q;
    if (error) { console.log('cart write error', error.message); await refetch(); return false; }
    return true;
  };

  const add = async (product, n = 1) => {
    if (product.stock_qty < 1) return { ok: false };
    const cur = items.find((i) => i.product_id === product.id);
    const want = (cur ? cur.quantity : 0) + n;
    const qty = Math.min(want, product.stock_qty);
    setItems((prev) =>
      cur
        ? prev.map((i) => (i.product_id === product.id ? { ...i, quantity: qty } : i))
        : [...prev, { product_id: product.id, quantity: qty, product }]
    );
    await write(product.id, qty);
    return { ok: true, capped: qty < want };
  };

  const setQty = async (productId, q) => {
    const cur = items.find((i) => i.product_id === productId);
    if (!cur) return;
    const qty = Math.max(1, Math.min(q, cur.product.stock_qty));
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i)));
    await write(productId, qty);
  };

  const remove = async (productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    await write(productId, 0);
  };

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.product.price, 0);

  return (
    <CartContext.Provider value={{ items, loaded, count, subtotal, refetch, add, setQty, remove }}>
      {children}
    </CartContext.Provider>
  );
}