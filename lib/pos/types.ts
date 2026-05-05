export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Product {
  id: string;
  odooId?: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  barcode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: number; // percentage discount (e.g. 10 for 10%)
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  timestamp: Date;
}
