// src/types/menu.ts

// --- TIPOS DE ITEMS VENDIBLES (Colección: menu_items) ---
export interface FixedPriceItem {
  id: string; 
  name: string;
  category: string;
  price: number;
  description?: string;
  modifierGroups?: string[]; // (ej. Bublee Tee)
}

export interface VariantPriceItem {
  id: string;
  name: string;
  category: string;
  variants: {
    name: string;
    price: number;
  }[];
  modifierGroups?: string[]; // (ej. Capuccino)
}

export type MenuItem = FixedPriceItem | VariantPriceItem;


// --- TIPO DE MODIFICADOR (Colección: modifiers) ---
export interface Modifier {
  id: string;
  name: string;
  price: number;
  group: string; // ej: "leche_opciones", "sabor_te"
}

// --- TIPO DE REGLA DE PRECIO (Colección: price_rules) ---
export interface PriceRule {
  id: string;
  name: string;
  basePrices: {
    count: number;
    price: number;
  }[];
}

// --- TIPO DE GRUPO DE MENÚ (Colección: menu_groups) ---
export interface MenuGroup {
  id: string;
  name: string;
  level: number;
  price?: number; // (Para Frappés, Malteadas)
  parent?: string; 
  children?: string[]; 
  items_ref?: string[]; 
  rules_ref?: string; 
  base_group?: string; 
  extra_groups?: string[]; 
  topping_groups?: string[]; 
}


// --- TIPO DE ITEM EN EL TICKET (Colección: orders) ---
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