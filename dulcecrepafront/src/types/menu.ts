// src/types/menu.ts
export interface FixedPriceItem {
  id: string; 
  name: string;
  category: string;
  price: number;
  description?: string;
  modifierGroups?: string[]; 
}

export interface VariantPriceItem {
  id: string;
  name: string;
  category: string;
  variants: {
    name: string;
    price: number;
  }[];
  modifierGroups?: string[]; 
}

export type MenuItem = FixedPriceItem | VariantPriceItem;

export interface Modifier {
  id: string;
  name: string;
  price: number;
  group: string; 
}

export interface PriceRule {
  id: string;
  name: string;
  basePrices: {
    count: number;
    price: number;
  }[];
}

export interface MenuGroup {
  id: string;
  name: string;
  level: number;
  price?: number; 
  parent?: string; 
  children?: string[]; 
  items_ref?: string[]; 
  rules_ref?: string; 
  base_group?: string; 
  extra_groups?: string[]; 
  topping_groups?: string[]; 
}

export interface TicketItem {
  id: string; 
  baseName: string; 
  finalPrice: number; 
  type: 'CUSTOM' | 'FIXED' | 'VARIANT'; 
  
  details?: {
    itemId?: string; 
    baseRuleId?: string; 
    basePriceRule?: string; 
    selectedModifiers: Modifier[]; 
    variantName?: string;
  }
}