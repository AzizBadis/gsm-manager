'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { POSLayout } from '@/components/pos/POSLayout';
import { TopBar } from '@/components/pos/TopBar';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { BottomActions } from '@/components/pos/BottomActions';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { Numberpad } from '@/components/pos/Numberpad';
import { SearchBar } from '@/components/pos/SearchBar';
import { CategoriesSidebar } from '@/components/pos/CategoriesSidebar';
import { usePOSState } from '@/hooks/usePOSState';
import { useCalculations } from '@/hooks/useCalculations';
import { useAuth } from '@/hooks/useAuth';
import { recordAuditLog } from '@/lib/audit';
import { useOdooProducts } from '@/hooks/useOdooProducts';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { CustomerModal } from '@/components/pos/CustomerModal';
import { DiscountModal } from '@/components/pos/DiscountModal';
import { ClosureModal } from '@/components/pos/ClosureModal';
import { RefundModal } from '@/components/pos/RefundModal';

export default function Home() {
  const router = useRouter();
  const { user, sessionId, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const {
    products,
    categories,
    isLoading: productsLoading,
    error: productsError,
    refetch,
  } = useOdooProducts();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [numberpadValue, setNumberpadValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sidebarMode, setSidebarMode] = useState<'edit' | 'confirm'>('edit');
  const [padMode, setPadMode] = useState<'qty' | 'disc'>('qty');

  const {
    cart,
    customer,
    selectedProductId,
    setSelectedProductId,
    setCustomer,
    applyItemDiscount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = usePOSState();
  const { subtotal, tax, total } = useCalculations(cart);
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Reset active category to 'all' when category list changes (e.g. first load)
  useEffect(() => {
    if (categories.length > 0 && activeCategory !== 'all') {
      const stillExists = categories.some((c) => c.id === activeCategory);
      if (!stillExists) setActiveCategory('all');
    }
  }, [categories]);

  // Filter products by active category AND search query
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'all' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product: any) => {
    addToCart(product);
    setSelectedProductId(product.id);
    setSidebarMode('edit');
    setNumberpadValue('');
    toast({
      description: `${product.name} ajouté — ${product.price.toFixed(2)} DT`,
      duration: 2000,
    });
  };

  const handlePaymentComplete = (cartSnapshot: any[], orderTotal: number) => {
    toast({
      title: 'Payment Successful',
      description: 'Thank you for your purchase!',
      duration: 3000,
    });
    clearCart();
    setNumberpadValue('');
    setPaymentOpen(false);
  };

  const handleClear = () => {
    if (cart.length > 0 && confirm('Clear all items from cart?')) {
      clearCart();
      setNumberpadValue('');
      toast({
        description: 'Cart cleared',
        duration: 2000,
      });
    }
  };

  const handleClosureSuccess = () => {
    setClosureModalOpen(false);
    toast({
      title: 'Session Clôturée',
      description: 'La session a été fermée avec succès dans Odoo.',
      duration: 5000,
    });
    logout();
    router.push('/login');
  };

  const handleLogout = async () => {
    // Record session closure in audit logs
    await recordAuditLog({
      action: 'closed',
      entityType: 'session',
      entityName: 'Session POS',
      actor: user?.name || user?.username || 'Utilisateur',
      details: `Utilisateur ${user?.name || user?.username} s'est déconnecté`,
    });

    logout();
    router.push('/login');
  };

  const handleNumberpadDigit = (digit: string) => {
    if (digit === '.') {
      if (!numberpadValue.includes('.')) {
        setNumberpadValue(numberpadValue + digit);
      }
    } else {
      setNumberpadValue(numberpadValue + digit);
    }
  };

  const handleNumberpadBackspace = () => {
    setNumberpadValue(numberpadValue.slice(0, -1));
  };

  const handleNumberpadClear = () => {
    setNumberpadValue('');
  };

  const handleNumberpadSubmit = () => {
    if (!numberpadValue || !selectedProductId) return;

    const val = parseFloat(numberpadValue);
    if (isNaN(val)) return;

    if (padMode === 'qty') {
      updateQuantity(selectedProductId, val);
      toast({ description: `Quantité : ${val}` });
    } else if (padMode === 'disc') {
      applyItemDiscount(selectedProductId, val);
      toast({ description: `Remise : ${val}%` });
    }

    setNumberpadValue('');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (paymentOpen) return;

      if (/^[0-9]$/.test(e.key)) {
        handleNumberpadDigit(e.key);
        return;
      }
      if (e.key === '.') {
        handleNumberpadDigit('.');
        return;
      }
      if (e.key === 'Backspace') {
        handleNumberpadBackspace();
        return;
      }
      if (e.key === 'Enter') {
        handleNumberpadSubmit();
        return;
      }
      if (e.key === 'Delete') {
        handleNumberpadClear();
        return;
      }
      if (e.key === 'Escape' && cart.length > 0) {
        handleClear();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [paymentOpen, cart.length, numberpadValue]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render POS if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <POSLayout
        topBar={
          <TopBar
            companyName={user?.company_name || 'COMPANY'}
            cashierName={user?.name || 'Cashier'}
            onLogout={handleLogout}
          />
        }
        categoriesSidebar={
          categories.length > 1 ? (
            <CategoriesSidebar
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={(id) => {
                setActiveCategory(id);
                setSearchQuery(''); // Clear search when switching category
              }}
            />
          ) : undefined
        }
        main={
          productsLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading products from Odoo...</p>
            </div>
          ) : productsError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <WifiOff className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Failed to load products</p>
                <p className="text-xs text-muted-foreground mt-1">{productsError}</p>
              </div>
              <button
                onClick={refetch}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              onProductClick={handleProductClick}
            />
          )
        }
        orderPanel={
          <OrderPanel
            items={cart}
            total={total}
            mode={sidebarMode}
            selectedProductId={selectedProductId}
            onSelectItem={(id) => {
              setSelectedProductId(id);
              setPadMode('qty');
              setNumberpadValue('');
            }}
            onQtySelectItem={(id) => {
              setSelectedProductId(id);
              setPadMode('qty');
              setNumberpadValue('');
            }}
            onPriceSelectItem={(id) => {
              setSelectedProductId(id);
              setPadMode('disc');
              setNumberpadValue('');
            }}
            onConfirmArticles={() => {
              setSidebarMode('confirm');
              setSelectedProductId(null);
            }}
            onBackToEdit={() => setSidebarMode('edit')}
            onQuantityChange={updateQuantity}
            onRemoveItem={removeFromCart}
            onPayClick={() => setPaymentOpen(true)}
          />
        }
        numberpad={
          <div className="flex flex-col gap-3">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                if (val) setActiveCategory('all'); // reset category filter when typing
              }}
              onClear={() => setSearchQuery('')}
              placeholder="Search products..."
            />
            <Numberpad
              onNumber={handleNumberpadDigit}
              onBackspace={handleNumberpadBackspace}
              onClear={handleNumberpadClear}
              onSubmit={handleNumberpadSubmit}
              activeMode={padMode}
              onModeChange={setPadMode}
              value={numberpadValue}
            />
          </div>
        }
        bottomActions={
          <BottomActions
            customer={customer}
            onCustomer={() => setCustomerModalOpen(true)}
            onDiscount={() => setDiscountModalOpen(true)}
            onRetour={() => setRefundModalOpen(true)}
            onClosure={() => setClosureModalOpen(true)}
            onClear={handleClear}
            disabled={cart.length === 0}
          />
        }
      />

      <PaymentModal
        open={paymentOpen}
        subtotal={subtotal}
        tax={tax}
        total={total}
        cart={cart}
        customer={customer}
        uid={user?.uid || null}
        actorName={user?.name || null}
        sessionId={sessionId}
        onClose={() => setPaymentOpen(false)}
        onPaymentComplete={handlePaymentComplete}
      />

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCustomerSelect={(c) => {
          setCustomer(c);
          toast({ description: `Customer ${c.name} selected`, duration: 2000 });
        }}
      />

      <DiscountModal
        open={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        cart={cart}
        onApplyDiscount={(productId, discount) => {
          applyItemDiscount(productId, discount);
          toast({ description: `Discount applied`, duration: 2000 });
        }}
      />

      <ClosureModal
        open={closureModalOpen}
        onClose={() => setClosureModalOpen(false)}
        onSuccess={handleClosureSuccess}
        sessionId={sessionId}
      />

      <RefundModal
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={(msg) => toast({ title: 'Retour effectué', description: msg, duration: 4000 })}
        sessionId={sessionId}
        uid={user?.uid || null}
      />

      <Toaster />
    </>
  );
}
