import { CartItem } from '@/lib/pos/types';

const TAX_RATE = 0.08; // 8% sales tax

export function useCalculations(cart: CartItem[]) {
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.product.price * item.quantity;
    const discountAmount = item.discount ? itemTotal * (item.discount / 100) : 0;
    return sum + (itemTotal - discountAmount);
  }, 0);

  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax,
    total,
  };
}
