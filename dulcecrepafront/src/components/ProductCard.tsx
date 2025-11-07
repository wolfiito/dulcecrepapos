// src/components/ProductCard.tsx

import type { MenuItem, FixedPriceItem, VariantPriceItem } from '../types/menu';

interface Props {
  item: MenuItem;
  onClick: (item: MenuItem) => void; 
}

function isFixedPrice(item: MenuItem): item is FixedPriceItem {
  return 'price' in item; 
}
function isVariantPrice(item: MenuItem): item is VariantPriceItem {
  return 'variants' in item;
}

function getDisplayPrice(item: MenuItem): string {
  if (isFixedPrice(item)) {
    return `$${item.price.toFixed(2)}`;
  }
  if (isVariantPrice(item)) {
    const minPrice = item.variants.reduce((min, v) => Math.min(min, v.price), Infinity);
    return `Desde $${minPrice.toFixed(2)}`;
  }
  return 'N/A';
}

export function ProductCard({ item, onClick }: Props) {
  
  return (
    // Aplicamos las clases CSS
    <div className="card-base card-item" onClick={() => onClick(item)}>
      <h4>{item.name}</h4>
      <p>{getDisplayPrice(item)}</p>
      {isVariantPrice(item) && <small>Elige tamaño</small>}
      {(isFixedPrice(item) && item.modifierGroups && item.modifierGroups.length > 0) && (
        <small>Personalizar</small>
      )}
    </div>
  );
}