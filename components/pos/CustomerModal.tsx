import { useState } from 'react';
import { Customer, useOdooCustomers } from '@/hooks/useOdooCustomers';
import { Search, Plus, X, User, Phone, Mail } from 'lucide-react';

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
}

export function CustomerModal({ open, onClose, onCustomerSelect }: CustomerModalProps) {
  const { customers, isLoading, createCustomer } = useOdooCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  if (!open) return null;

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (typeof c.phone === 'string' && c.phone.toLowerCase().includes(q)) ||
      (typeof c.email === 'string' && c.email.toLowerCase().includes(q))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const newCustomer = await createCustomer({ name, phone, email });
      if (newCustomer) {
        onCustomerSelect(newCustomer);
        onClose();
        // Reset form
        setName(''); setPhone(''); setEmail('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert('Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b p-4 relative bg-primary/5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isCreating ? 'Create New Customer' : 'Select Customer'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-black/5 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 bg-muted/20 min-h-[400px]">
          {isCreating ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full rounded-xl border bg-background pl-10 pr-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all text-lg" 
                    placeholder="Customer Name"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      placeholder="Email Address"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-8 border-t">
                 <button 
                  type="button"
                  onClick={() => setIsCreating(false)} 
                  className="flex-1 rounded-xl border bg-background py-3 font-medium hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !name}
                  className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border bg-background pl-10 pr-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Plus className="h-5 w-5" />
                  New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto rounded-xl border bg-background max-h-[400px]">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center p-8">
                    <p className="text-muted-foreground animate-pulse">Loading customers...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-8 flex-col gap-2">
                    <User className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">No customers found</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {filteredCustomers.map(customer => (
                      <li key={customer.id}>
                        <button 
                          onClick={() => {
                            onCustomerSelect(customer);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{customer.name}</p>
                            {(customer.phone || customer.email) && (
                              <p className="text-xs text-muted-foreground flex gap-3 mt-1">
                                {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {customer.phone}</span>}
                                {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {customer.email}</span>}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
