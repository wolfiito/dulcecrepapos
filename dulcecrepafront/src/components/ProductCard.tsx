// src/components/ProductCard.tsx

import type { MenuItem } from '../types/menu';

interface Props {
  item: MenuItem;
  onClick: (item: MenuItem) => void; 
}

// function isFixedPrice(item: MenuItem): item is FixedPriceItem {
//   return 'price' in item; 
// }
// function isVariantPrice(item: MenuItem): item is VariantPriceItem {
//   return 'variants' in item;
// }

// function getDisplayPrice(item: MenuItem): string {
//   if (isFixedPrice(item)) {
//     return `$${item.price.toFixed(2)}`;
//   }
//   if (isVariantPrice(item)) {
//     const minPrice = item.variants.reduce((min, v) => Math.min(min, v.price), Infinity);
//     return `Desde $${minPrice.toFixed(2)}`;
//   }
//   return 'N/A';
// }

export function ProductCard({ item, onClick }: Props) {
  
  const cardStyle: React.CSSProperties = { 
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px',
    width: '150px',
    cursor: 'pointer',
    textAlign: 'center',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  return (
    <div style={cardStyle} onClick={() => onClick(item)}>
      <h4>{item.name}</h4>
    </div>
  );
}