'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { POSLayout } from '@/components/pos/POSLayout';
import { TopBar } from '@/components/pos/TopBar';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { OrderPanel } from '@/components/pos/OrderPanel';
import { BottomActions } from '@/components/pos/BottomActions';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { Numberpad, PadMode } from '@/components/pos/Numberpad';
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
import { ClosureModal } from '@/components/pos/ClosureModal';
import { RefundModal } from '@/components/pos/RefundModal';
import { ImeiModal } from '@/components/pos/ImeiModal';
import { ExpensesModal } from '@/components/pos/ExpensesModal';

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
  const [quickPayId, setQuickPayId] = useState<number | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [expensesModalOpen, setExpensesModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [imeiModalOpen, setImeiModalOpen] = useState(false);
  const [numberpadValue, setNumberpadValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [padMode, setPadMode] = useState<PadMode>('qty');

  const {
    cart,
    customer,
    selectedProductId,
    setSelectedProductId,
    setCustomer,
    applyItemDiscount,
    updateImei,
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
  }, [categories, activeCategory]);

  // Filter products by active category AND search query
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.defaultCode && product.defaultCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      activeCategory === 'all' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product: any) => {
    addToCart(product);
    setSelectedProductId(product.id);
    setNumberpadValue('');
    
    if (product.requiresImei) {
      setImeiModalOpen(true);
    } else {
      toast({
        description: `${product.name} ajouté — ${product.price.toFixed(2)} DT`,
        duration: 2000,
      });
    }
  };

  const handlePaymentComplete = (cartSnapshot: any[], orderTotal: number) => {
    toast({
      title: 'Paiement Réussi',
      description: 'Merci pour votre achat !',
      duration: 3000,
    });
    clearCart();
    setNumberpadValue('');
    setPaymentOpen(false);
  };

  const handleClear = () => {
    setNumberpadValue('');
    setSelectedProductId(null);
    
    if (cart.length > 0) {
      if (confirm('Voulez-vous vider le panier ?')) {
        clearCart();
        toast({
          description: 'Panier vidé',
          duration: 2000,
        });
      }
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
    handleClear();
  };

  const handleNumberpadSubmit = () => {
    if (!numberpadValue || !selectedProductId) return;

    const val = parseFloat(numberpadValue);
    if (isNaN(val)) return;

    if (padMode === 'qty') {
      updateQuantity(selectedProductId, val);
      toast({ description: `Quantité : ${val}` });
    } else if (padMode === 'disc') {
      const item = cart.find(i => i.product.id === selectedProductId);
      if (item) {
        const costPrice = item.product.costPrice || 0;
        const lineTotal = item.product.price * item.quantity;
        const minLinePrice = costPrice * item.quantity;

        if (lineTotal - val < minLinePrice) {
          toast({ 
            variant: "destructive", 
            title: "Remise Refusée",
            description: `Marge insuffisante ! Le prix ne peut pas descendre en dessous du prix d'achat (${minLinePrice.toFixed(2)} DT).` 
          });
          return;
        }

        applyItemDiscount(selectedProductId, val);
        toast({ description: `Remise appliquée : ${val} DT` });
      }
    } else if (padMode === 'price') {
      // In this POS, we don't have direct price override via numberpad yet, 
      // but we can add it here if needed.
      toast({ description: `Nouveau prix : ${val} DT (Non implémenté)` });
    }

    setNumberpadValue('');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (paymentOpen || customerModalOpen || closureModalOpen || expensesModalOpen || refundModalOpen || imeiModalOpen) return;

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
  }, [paymentOpen, customerModalOpen, closureModalOpen, expensesModalOpen, refundModalOpen, imeiModalOpen, cart.length, numberpadValue, handleClear, handleNumberpadBackspace, handleNumberpadClear, handleNumberpadDigit, handleNumberpadSubmit]);

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
            cashierName={user?.name || 'Cashier'}
            onLogout={handleLogout}
            onClosure={() => setClosureModalOpen(true)}
            onExpenses={() => setExpensesModalOpen(true)}
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
              <p className="text-sm text-muted-foreground">Chargement des articles...</p>
            </div>
          ) : productsError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <WifiOff className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Échec du chargement</p>
                <p className="text-xs text-muted-foreground mt-1">{productsError}</p>
              </div>
              <button
                onClick={refetch}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
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
              setPadMode('price');
              setNumberpadValue('');
            }}
            onImeiSelectItem={(id) => {
              setSelectedProductId(id);
              setImeiModalOpen(true);
            }}
            onQuantityChange={updateQuantity}
            onRemoveItem={removeFromCart}
            onPayClick={() => {
              setQuickPayId(null);
              setPaymentOpen(true);
            }}
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
              placeholder="Rechercher un article..."
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
            onDiscount={() => {
              if (selectedProductId) {
                setPadMode('disc');
                setNumberpadValue('');
              } else {
                toast({ description: "Sélectionnez d'abord un article" });
              }
            }}
            onRetour={() => setRefundModalOpen(true)}
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
        sessionId={sessionId}
        onClose={() => setPaymentOpen(false)}
        onPaymentComplete={handlePaymentComplete}
        initialMethodId={quickPayId}
      />

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCustomerSelect={(c) => {
          setCustomer(c);
          toast({ description: `Client ${c.name} sélectionné`, duration: 2000 });
        }}
      />

      <ImeiModal
        open={imeiModalOpen}
        onClose={() => setImeiModalOpen(false)}
        cart={cart}
        defaultProductId={selectedProductId}
        onApplyImei={(productId, imei) => {
          updateImei(productId, imei);
          toast({ description: `IMEI enregistré : ${imei}` });
        }}
      />

      <ClosureModal
        open={closureModalOpen}
        onClose={() => setClosureModalOpen(false)}
        onSuccess={handleClosureSuccess}
        sessionId={sessionId}
      />

      <ExpensesModal
        open={expensesModalOpen}
        onClose={() => setExpensesModalOpen(false)}
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
