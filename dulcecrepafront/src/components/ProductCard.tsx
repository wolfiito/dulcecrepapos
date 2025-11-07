// src/components/ProductCard.tsx

import type { MenuItem, MenuGroup } from '../types/menu';

// --- Type Guards ---
function isGroup(item: MenuItem | MenuGroup): item is MenuGroup {
    return 'level' in item;
}
function isVariantPrice(item: MenuItem | MenuGroup): item is (MenuItem & { variants: any }) {
    return 'variants' in item;
}
function isFixedPrice(item: MenuItem | MenuGroup): item is (MenuItem & { price: number }) {
    return 'price' in item;
}

// --- Iconos ---
function getIconForItem(item: MenuItem | MenuGroup): string {
    if (isGroup(item)) { 
        if (item.rules_ref) return ''; 
        if (item.id.includes('dulces')) return '🥞';
        if (item.id.includes('saladas')) return '🥓';
        if (item.id.includes('bebidas_frias')) return '🧊';
        if (item.id.includes('bebidas_calientes')) return '☕';
        if (item.id.includes('bebidas')) return '🥤';
        if (item.id.includes('postres')) return '🍰';
        return '➡️';
    }
    if (item.category.includes('Calientes')) return '';
    if (item.id.includes('bublee')) return '';
    if (item.category.includes('Frias')) return '';
    if (item.category.includes('Dulces')) return '';
    if (item.category.includes('Saladas')) return '';
    if (item.category.includes('Postres')) return '';
    return '🍽️';
}

// --- Precio ---
function getDisplayPrice(item: MenuItem | MenuGroup): string {
    if (isFixedPrice(item)) {
      return `$${item.price.toFixed(2)}`;
    }
    
    return '';
}

interface ProductCardProps {
  item: MenuItem | MenuGroup;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onClick }) => {
    
    let className = 'card-base';
    if (isGroup(item)) {
        className += item.rules_ref ? ' card-rule' : ' card-group';
    } else {
        className += ' card-item';
    }

    return (
        <div className={className} onClick={onClick}>
            <span style={{fontSize: '2.5em', marginBottom: '10px'}}>{getIconForItem(item)}</span>
            <h4 style={{margin: 0}}>{item.name.split('(')[0]}</h4>
        </div>
    );
}