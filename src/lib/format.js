export const SITE_BASE = 'https://wortsock.github.io/aurastore/';
export const FREE_DELIVERY_THRESHOLD = 100000;
export const DELIVERY_FEE = 2500;

export const formatNaira = (n) =>
  '₦' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const imageUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return SITE_BASE + path.replace(/^\//, '');
};

export const deliveryFee = (subtotal) => (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (iso) => {
  const d = new Date(iso);
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
};