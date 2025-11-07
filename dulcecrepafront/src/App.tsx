// src/App.tsx

import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { 
    MenuItem, FixedPriceItem, VariantPriceItem, Modifier, TicketItem, MenuGroup, PriceRule 
} from './types/menu'; 
import { ProductCard } from './components/ProductCard';
import { CustomizeCrepeModal } from './components/CustomizeCrepeModal'; 
import { CustomizeVariantModal } from './components/CustomizeVariantModal'; // <-- Nuevo Modal

// --- Type Guards ---
function isFixedPrice(item: MenuItem): item is FixedPriceItem {
  return 'price' in item;
}
function isVariantPrice(item: MenuItem): item is VariantPriceItem {
  return 'variants' in item;
}

// --- Componente Principal ---
function App() {
  // --- ESTADOS GLOBALES DE DATOS ---
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allModifiers, setAllModifiers] = useState<Modifier[]>([]);
  const [allPriceRules, setAllPriceRules] = useState<PriceRule[]>([]);
  
  // --- ESTADOS DE TICKET ---
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);

  // --- ESTADOS DEL MODAL DE CREPAS/POSTRES (PRICED_BY_INGREDIENT) ---
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [groupToCustomize, setGroupToCustomize] = useState<MenuGroup | null>(null);

  // --- ESTADOS DEL MODAL DE BEBIDAS (FIXED_PRICE_WITH_VARIANTS) ---
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [itemToSelectVariant, setItemToSelectVariant] = useState<VariantPriceItem | null>(null);

  // --- ESTADO DE NAVEGACIÓN ---
  const [currentGroup, setCurrentGroup] = useState<MenuGroup | null>(null); 
  
  // --- LÓGICA DE CARGA DE DATOS (Al inicio de la App) ---
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [groupsQuery, itemsQuery, modifiersQuery, rulesQuery] = await Promise.all([
          getDocs(collection(db, "menu_groups")),
          getDocs(collection(db, "menu_items")),
          getDocs(collection(db, "modifiers")),
          getDocs(collection(db, "price_rules")),
        ]);

        const groups = groupsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuGroup[];
        setMenuGroups(groups);
        setMenuItems(itemsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[]);
        setAllModifiers(modifiersQuery.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Modifier[]);
        setAllPriceRules(rulesQuery.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PriceRule[]);

        const defaultGroup = groups.find(g => g.id === 'root') || null; 
        setCurrentGroup(defaultGroup);
        
      } catch (error) {
        console.error("Error al cargar datos iniciales de Firebase:", error);
      }
    };

    fetchMenuData();
  }, []);

  const handleSubmitOrder = async () => {
    if (ticketItems.length === 0) return;

    // Mapear los items del ticket al formato de orden requerido por el KDS
    const orderItems = ticketItems.map(item => ({
        ticketItemId: item.id,
        baseName: item.baseName,
        status: 'PENDING', // El KDS inicia todos los items como PENDING
        price: item.finalPrice,
        type: item.type,
        notes: "", // Se puede añadir un campo para notas de la orden
        // Simplificamos los detalles para la cocina
        details: {
            variantName: item.details?.variantName || '',
            baseRule: item.details?.basePriceRule || '',
            // Solo incluimos el nombre de los modificadores para que la cocina lo lea fácilmente
            modifiers: item.details?.selectedModifiers.map(mod => ({
                name: mod.name + (mod.price > 0 ? ` (+$${mod.price.toFixed(2)})` : ''),
                group: mod.group 
            })) || []
        }
    }));

    // Construir el documento de orden final
    const newOrder = {
    // Buscaremos el orderNumber más alto en Firebase para auto-incrementar
    // Por ahora, usamos un número fijo o un timestamp simplificado.
      orderNumber: Math.floor(Date.now() / 100000) % 1000, // Número simple de 3 dígitos
      createdAt: serverTimestamp(), // Hora del servidor de Firebase
      status: 'PENDING',
      totalAmount: totalTicket,
      paymentStatus: 'PAID', // Asumimos que se paga antes de enviar a cocina
      items: orderItems,
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), newOrder);
      console.log("Orden enviada a Firestore con ID:", docRef.id);

      // 4. Resetear el POS
      setTicketItems([]);
      alert(`¡Orden #${newOrder.orderNumber} enviada a cocina!`);

    } catch (e) {
      console.error("Error al añadir la orden:", e);
    }
  };  
  // --- LÓGICA DE NAVEGACIÓN ---
  const handleNavigate = (groupId: string) => {
    const nextGroup = menuGroups.find(g => g.id === groupId);
    if (nextGroup) {
        setCurrentGroup(nextGroup);
    }
  };
  
  const handleGoBack = () => {
      if (currentGroup?.parent) {
          handleNavigate(currentGroup.parent);
      } else {
          setCurrentGroup(menuGroups.find(g => g.id === 'root') || null);
      }
  };

  // --- LÓGICA DE CLIC EN PRODUCTO/GRUPO ---
  const handleProductClick = (item: MenuItem | MenuGroup) => {
      // 1. Si es un GRUPO (botón de navegación)
      if ('level' in item) {
          const group = item as MenuGroup;

          // A. Si tiene reglas de precio (Arma tu Crepa, Hot Cake, Waffle), abrir el modal de personalización
          if (group.rules_ref) {
              setGroupToCustomize(group);
              setIsCustomModalOpen(true); // <-- Modal de Crepas/Postres
              return;
          }
          
          // B. Si es un grupo de navegación normal (Ej: "Especiales"), navegamos
          handleNavigate(group.id);
          return;
      }

      // 2. Si es un ITEM
      const menuItem = item as MenuItem;

      // A. Si es un ITEM con variantes (Ej: "Capuccino")
      if (isVariantPrice(menuItem)) {
          setItemToSelectVariant(menuItem);
          setIsVariantModalOpen(true); // <-- Modal de Bebidas/Variantes
          return;
      }
      
      // B. Si es un ITEM de precio fijo (Ej: "Dulce Tentación")
      if (isFixedPrice(menuItem)) {
          const newTicketItem: TicketItem = {
              id: Date.now().toString(), 
              baseName: menuItem.name,
              finalPrice: menuItem.price,
              type: 'FIXED',
              details: { itemId: menuItem.id, selectedModifiers: [] }
          };
          setTicketItems(prevItems => [...prevItems, newTicketItem]);
          return;
      }
      
      console.warn("Tipo de producto no manejado:", menuItem);
  };

  // --- LÓGICA DE MODALES ---

  // Cierre del modal de Crepas/Postres
  const handleCloseCustomModal = () => {
    setIsCustomModalOpen(false);
    setGroupToCustomize(null);
  };

  // Cierre del modal de Bebidas/Variantes
  const handleCloseVariantModal = () => {
    setIsVariantModalOpen(false);
    setItemToSelectVariant(null);
  };
  
  // Función central para añadir cualquier item (custom, fixed, variant) al ticket
  const handleAddItemToTicket = (item: TicketItem) => {
    setTicketItems(prevItems => [...prevItems, item]);
    
    // Cierra el modal correcto
    if (item.type === 'CUSTOM') {
      handleCloseCustomModal(); 
    } else if (item.type === 'VARIANT') {
      handleCloseVariantModal();
    }
  };
  
  // --- CÁLCULOS PARA LA VISTA ACTUAL ---
  const groupsToShow = useMemo(() => {
    if (currentGroup?.id === 'root') { 
        return menuGroups.filter(g => g.parent === 'root');
    }
    return menuGroups.filter(g => g.parent === currentGroup?.id);
  }, [currentGroup, menuGroups]);

  const itemsToShow = useMemo(() => {
    if (currentGroup?.items_ref) {
      return currentGroup.items_ref
        .map(refId => menuItems.find(item => item.id === refId))
        .filter((item): item is MenuItem => !!item);
    }
    return [];
  }, [currentGroup, menuItems]);
  
  const totalTicket = ticketItems.reduce((sum, item) => sum + item.finalPrice, 0);

  // --- Renderizado ---
  const appStyle: React.CSSProperties = { display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' };
  const menuStyle: React.CSSProperties = { flex: 3, padding: '20px', backgroundColor: '#f9f9f9' };
  const contentStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '10px' };
  const ticketStyle: React.CSSProperties = { flex: 1, borderLeft: '2px solid #ccc', padding: '20px', backgroundColor: '#fff' };

  return (
    <div style={appStyle}>
      
      {/* SECCIÓN DEL MENÚ CON NAVEGACIÓN */}
      <div style={menuStyle}>
        
        {/* Encabezado y Navegación */}
        <h2>
            {currentGroup && currentGroup.parent && (
                <button onClick={handleGoBack} style={{marginRight: '15px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px'}}>&lt; Atrás</button>
            )}
            {currentGroup ? currentGroup.name : 'Menú Principal'}
        </h2>
        <hr style={{width: '100%', borderTop: '1px solid #ddd'}}/>

        {/* Contenido: GRUPOS o ITEMS */}
        <div style={contentStyle}>
            {/* 1. GRUPOS HIJOS (Ej: Crepas Dulces, Especiales, Arma tu Crepa) */}
            {groupsToShow.map(group => (
                <div 
                    key={group.id} 
                    style={{...cardStyle, backgroundColor: group.rules_ref ? '#e6ffe6' : '#e0e0e0', fontWeight: 'bold'}}
                    onClick={() => handleProductClick(group)} 
                >
                    <h3>{group.name}</h3>
                </div>
            ))}

            {/* 2. ITEMS VENDIBLES (Ej: Dulce Tentación, Americano) */}
            {itemsToShow.map(item => (
              <ProductCard 
                key={item.id} 
                item={item} 
                onClick={handleProductClick} 
              />
            ))}
        </div>
      </div>

      {/* SECCIÓN DEL TICKET */}
      <div style={ticketStyle}>
        <h2>Ticket Actual</h2>
        <div style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
          <ul>
            {ticketItems.map((item) => (
              <li key={item.id} style={{ marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px dotted #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.baseName} {item.details?.variantName && `(${item.details.variantName})`}</span>
                  <span>${item.finalPrice.toFixed(2)}</span>
                </div>
                {item.type === 'CUSTOM' && item.details && (
                  <small style={{ color: '#666' }}>({item.details.basePriceRule || ''} + {item.details.selectedModifiers.filter(m => m.price > 0).length} extras)</small>
                )}
                {item.type === 'VARIANT' && item.details && item.details.selectedModifiers.length > 0 && (
                   <small style={{ color: '#666' }}>
                     (+ {item.details.selectedModifiers.map(m => m.name).join(', ')})
                   </small>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <hr/>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2em' }}>
            <span>TOTAL:</span>
            <span>${totalTicket.toFixed(2)}</span>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleSubmitOrder}
            disabled={ticketItems.length === 0}
            style={{ 
              width: '100%', 
              padding: '15px', 
              fontSize: '1.2em', 
              backgroundColor: ticketItems.length === 0 ? '#ccc' : '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
          FINALIZAR ORDEN (${totalTicket.toFixed(2)})
          </button>
        </div>
      </div>
      
      {/* MODAL DE CREPAS/POSTRES (PRICED_BY_INGREDIENT) */}
      {groupToCustomize && (
          <CustomizeCrepeModal 
              isOpen={isCustomModalOpen}
              onClose={handleCloseCustomModal}
              group={groupToCustomize} 
              allModifiers={allModifiers}
              allPriceRules={allPriceRules} 
              onAddItem={handleAddItemToTicket}
          />
      )}

      {/* MODAL DE BEBIDAS/VARIANTES (FIXED_PRICE_WITH_VARIANTS) */}
      {itemToSelectVariant && (
          <CustomizeVariantModal 
              isOpen={isVariantModalOpen}
              onClose={handleCloseVariantModal}
              item={itemToSelectVariant} 
              allModifiers={allModifiers}
              onAddItem={handleAddItemToTicket}
          />
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { 
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px',
    width: '150px',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

export default App;