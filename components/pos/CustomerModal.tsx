'use client';

import { useState } from 'react';
import { Customer, useOdooCustomers } from '@/hooks/useOdooCustomers';
import { Search, Plus, X, User, Phone, Mail, Smartphone, MapPin, Building2, Hash } from 'lucide-react';

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

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [vat, setVat] = useState('');

  if (!open) return null;

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (typeof c.phone === 'string' && c.phone.toLowerCase().includes(q)) ||
      (typeof c.mobile === 'string' && c.mobile.toLowerCase().includes(q)) ||
      (typeof c.email === 'string' && c.email.toLowerCase().includes(q))
    );
  });

  const resetForm = () => {
    setName(''); setPhone(''); setMobile('');
    setEmail(''); setStreet(''); setCity(''); setVat('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    try {
      const newCustomer = await createCustomer({ name, phone, mobile, email, street, city, vat });
      if (newCustomer) {
        onCustomerSelect(newCustomer);
        onClose();
        resetForm();
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert('Échec de la création du client. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b p-4 bg-primary/5 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isCreating ? 'Nouveau Client' : 'Sélectionner un Client'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 bg-muted/20 overflow-y-auto flex-1">
          {isCreating ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nom complet *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className={inputClass + " text-base font-semibold"} placeholder="Nom du client" required autoFocus />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+216 XX XXX XXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Mobile</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className={inputClass} placeholder="+216 XX XXX XXX" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="client@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Adresse</label>
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputClass} placeholder="Rue" />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} placeholder="Ville" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">N° TVA</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={vat} onChange={e => setVat(e.target.value)} className={inputClass} placeholder="MF / N° TVA" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setIsCreating(false); resetForm(); }}
                  className="flex-1 rounded-xl border bg-background py-3 font-medium hover:bg-muted/50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting || !name}
                  className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 flex flex-col">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input type="text" placeholder="Rechercher par nom, téléphone..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border bg-background pl-10 pr-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <button onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0">
                  <Plus className="h-5 w-5" /> Nouveau
                </button>
              </div>

              <div className="overflow-y-auto rounded-xl border bg-background max-h-[400px]">
                {isLoading ? (
                  <div className="flex h-40 items-center justify-center p-8">
                    <p className="text-muted-foreground animate-pulse">Chargement des clients...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex h-40 items-center justify-center p-8 flex-col gap-2">
                    <User className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">Aucun client trouvé</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {filteredCustomers.map(customer => (
                      <li key={customer.id}>
                        <button onClick={() => { onCustomerSelect(customer); onClose(); }}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{customer.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                              {customer.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</span>}
                              {customer.mobile && <span className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="h-3 w-3" /> {customer.mobile}</span>}
                              {customer.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>}
                              {customer.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.city}</span>}
                            </div>
                          </div>
                          {customer.vat && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded shrink-0">
                              TVA: {customer.vat}
                            </span>
                          )}
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
