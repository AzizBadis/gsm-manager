'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { Product, Category } from '@/lib/pos/types';

// Color palette for products without images
const PLACEHOLDER_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-violet-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-orange-600', 'bg-teal-600',
  'bg-indigo-600', 'bg-pink-600', 'bg-lime-600', 'bg-sky-600',
];

function getPlaceholderColor(id: string | number): string {
  const index = typeof id === 'number' ? id : parseInt(id, 10) || 0;
  return PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
}

interface OdooProduct {
  id: number;
  name: string;
  list_price: number;
  pos_categ_ids: number[] | [number, string][];
  image_128: string | false;
  barcode: string | false;
  default_code: string | false;
  description_sale: string | false;
  standard_price: number;
}

interface OdooCategory {
  id: number;
  name: string;
  parent_id: [number, string] | false;
  sequence: number;
}

function transformProduct(odooProduct: OdooProduct): Product {
  const hasImage = typeof odooProduct.image_128 === 'string' && odooProduct.image_128.length > 0;
  let categoryId = 'uncategorized';
  if (odooProduct.pos_categ_ids && odooProduct.pos_categ_ids.length > 0) {
    const firstCat = odooProduct.pos_categ_ids[0];
    categoryId = String(Array.isArray(firstCat) ? firstCat[0] : firstCat);
  }
  return {
    id: String(odooProduct.id),
    odooId: odooProduct.id,
    name: odooProduct.name,
    category: categoryId,
    price: odooProduct.list_price,
    image: hasImage ? `data:image/png;base64,${odooProduct.image_128}` : getPlaceholderColor(odooProduct.id),
    description: odooProduct.description_sale || undefined,
    barcode: odooProduct.barcode || undefined,
    costPrice: odooProduct.standard_price,
  };
}

function transformCategory(odooCategory: OdooCategory): Category {
  return {
    id: String(odooCategory.id),
    name: odooCategory.name,
    icon: 'Package',
  };
}

export function useOdooProducts() {
  const { sessionId, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Prevent duplicate in-flight requests
  const fetchingRef = useRef(false);

  const fetchProducts = useCallback(async (sid: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/odoo/products?session_id=${encodeURIComponent(sid)}`),
        fetch(`/api/odoo/categories?session_id=${encodeURIComponent(sid)}`),
      ]);
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      if (!productsRes.ok || productsData.error) {
        throw new Error(productsData.error || 'Failed to fetch products');
      }
      setProducts((productsData.products || []).map(transformProduct));
      if (categoriesRes.ok && !categoriesData.error) {
        setCategories([
          { id: 'all', name: 'All', icon: 'Grid' },
          ...(categoriesData.categories || []).map(transformCategory),
        ]);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []); // stable — sid passed as argument

  // Only re-fetch when the sessionId string actually changes
  useEffect(() => {
    if (!sessionId || !isAuthenticated) {
      setIsLoading(false);
      return;
    }
    fetchProducts(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    products,
    categories,
    isLoading,
    error,
    refetch: () => { if (sessionId) fetchProducts(sessionId); },
  };
}
