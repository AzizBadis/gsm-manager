'use client';

import { Category } from '@/lib/pos/types';
import { Package, Grid } from 'lucide-react';

interface CategoriesSidebarProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoriesSidebar({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoriesSidebarProps) {
  return (
    <div className="flex w-24 flex-col gap-1 border-r border-border bg-sidebar p-2 overflow-y-auto">
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        // Use Grid icon for "All", Package for all Odoo categories
        const Icon = category.id === 'all' ? Grid : Package;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg py-3 px-1 transition-all duration-200 ${
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
            title={category.name}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] text-center font-medium leading-tight w-full truncate px-1">
              {category.name.length > 8 ? category.name.substring(0, 7) + '…' : category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
