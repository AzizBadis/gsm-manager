export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Product {
  id: string;
  odooId?: number;
  productTemplateId?: number;
  productCategoryName?: string;
  requiresImei?: boolean;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  barcode?: string;
  costPrice?: number;
  defaultCode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountAmount?: number; // absolute discount in DT
  imei?: string;
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
