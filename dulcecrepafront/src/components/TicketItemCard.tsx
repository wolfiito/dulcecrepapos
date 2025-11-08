// src/components/TicketItemCard.tsx
import { motion, useAnimation } from 'framer-motion';
import type { TicketItem } from '../types/menu';

interface Props {
  item: TicketItem;
  onRemove: (id: string) => void;
}

// Icono de Basura (reemplaza la "X")
const IconTrash = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

export const TicketItemCard: React.FC<Props> = ({ item, onRemove }) => {
  const controls = useAnimation();
  const dragThreshold = -80; // Cuánto deslizar (en px) para borrar

  const onDragEnd = (event: any, info: any) => {
    if (info.offset.x < dragThreshold) {
      // Si deslizó lo suficiente, animar la salida
      controls.start({ 
        x: "-100%", 
        opacity: 0,
        transition: { duration: 0.3 } 
      }).then(() => onRemove(item.id));
    } else {
      // Si no, volver al inicio
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
    }
  };

  return (
    <li className="ticket-item">
      {/* 1. El Fondo Rojo (Oculto) */}
      <div className="delete-action-background">
        <IconTrash />
      </div>
      
      {/* 2. El Contenido Deslizable */}
      <motion.div
        className="ticket-item-content"
        drag="x" // Habilitar drag horizontal
        dragConstraints={{ right: 0, left: 0 }} // No jalar a la derecha
        onDragEnd={onDragEnd}
        animate={controls}
        dragElastic={0.1} // Poca resistencia a jalar más de 0
      >
        <div className="ticket-item-header">
          <div className="ticket-item-info">
            <span>{item.baseName} {item.details?.variantName && `(${item.details.variantName})`}</span>
          </div>
          <span className="ticket-item-price">${item.finalPrice.toFixed(2)}</span>
          {/* (El botón de eliminar 'X' se ha ido) */}
        </div>
        
        {item.details && item.details.selectedModifiers.length > 0 && (
          <ul className="ticket-item-details">
            {item.details.selectedModifiers.map(mod => (
                <li key={mod.id}>
                    {mod.name} {mod.price > 0 ? `(+$${mod.price.toFixed(2)})` : ''}
                </li>
            ))}
          </ul>
        )}
      </motion.div>
    </li>
  );
};