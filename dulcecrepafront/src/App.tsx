// src/App.tsx (Reemplazo Completo)

import { useEffect, useState, useMemo } from 'react';
import { 
    db, 
    collection, 
    getDocs, 
    doc, 
    runTransaction, 
    serverTimestamp,
    type Transaction, 
    type QueryDocumentSnapshot,
    type DocumentData
} from './firebase'; 

import type { 
    MenuItem, FixedPriceItem, VariantPriceItem, Modifier, TicketItem, MenuGroup, PriceRule 
} from './types/menu'; 
import { CustomizeCrepeModal } from './components/CustomizeCrepeModal'; 
import { CustomizeVariantModal } from './components/CustomizeVariantModal'; 

// --- Tipos de Vista ---
type View = 'menu' | 'ticket';
type OrderMode = 'Mesa 1' | 'Mesa 2' | 'Para Llevar';

// --- Type Guards ---
function isFixedPrice(item: MenuItem): item is FixedPriceItem {
  return 'price' in item;
}
function isVariantPrice(item: MenuItem): item is VariantPriceItem {
  return 'variants' in item;
}

// --- Componente Principal ---
function App() {
  // --- ESTADO GLOBAL DE DATOS ---
  const [allData, setAllData] = useState({
    groups: [] as MenuGroup[],
    items: [] as MenuItem[],
    modifiers: [] as Modifier[],
    rules: [] as PriceRule[],
  });
  
  // --- ESTADO DE NAVEGACIÓN Y ORDEN ---
  const [view, setView] = useState<View>('menu');
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);
  const [currentOrderMode, setCurrentOrderMode] = useState<OrderMode>('Para Llevar');
  const [currentOrderNumber, setCurrentOrderNumber] = useState(101); 

  // --- ESTADOS DE MODALES ---
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [groupToCustomize, setGroupToCustomize] = useState<MenuGroup | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [itemToSelectVariant, setItemToSelectVariant] = useState<MenuItem | null>(null);

  // --- ESTADO DE NAVEGACIÓN (LEVANTADO) ---
  const [currentGroup, setCurrentGroup] = useState<MenuGroup | null>(null); 
  
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [groupsQuery, itemsQuery, modifiersQuery, rulesQuery] = await Promise.all([
          getDocs(collection(db, "menu_groups")),
          getDocs(collection(db, "menu_items")),
          getDocs(collection(db, "modifiers")),
          getDocs(collection(db, "price_rules")),
        ]);

        const groups = groupsQuery.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() })) as MenuGroup[];
        const items = itemsQuery.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() })) as MenuItem[];
        const modifiers = modifiersQuery.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() })) as Modifier[];
        const rules = rulesQuery.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() })) as PriceRule[];
        
        setAllData({ groups, items, modifiers, rules });

        // Establecer el grupo 'root' al cargar
        const defaultGroup = groups.find(g => g.id === 'root') || null; 
        setCurrentGroup(defaultGroup);
        
      } catch (error) {
        console.error("Error al cargar datos iniciales de Firebase:", error);
      }
    };
    fetchMenuData();
  }, []);

  // --- LÓGICA DE NAVEGACIÓN (AHORA VIVE EN APP) ---
  const handleNavigate = (groupId: string) => {
    const nextGroup = allData.groups.find(g => g.id === groupId);
    if (nextGroup) setCurrentGroup(nextGroup);
  };
  
  const handleGoBack = () => {
      if (currentGroup?.parent) handleNavigate(currentGroup.parent);
      else setCurrentGroup(allData.groups.find(g => g.id === 'root') || null);
  };

  const handleProductClick = (item: MenuItem | MenuGroup) => {
      if ('level' in item) {
          const group = item as MenuGroup;
          if (group.rules_ref) {
              setGroupToCustomize(group);
              setIsCustomModalOpen(true); 
              return;
          }
          handleNavigate(group.id);
          return;
      }
      const menuItem = item as MenuItem;
      if (isVariantPrice(menuItem) || (isFixedPrice(menuItem) && menuItem.modifierGroups && menuItem.modifierGroups.length > 0)) {
          setItemToSelectVariant(menuItem);
          setIsVariantModalOpen(true); 
          return;
      }
      if (isFixedPrice(menuItem)) {
          const newTicketItem: TicketItem = {
              id: Date.now().toString(), 
              baseName: menuItem.name,
              finalPrice: menuItem.price,
              type: 'FIXED',
              details: { itemId: menuItem.id, selectedModifiers: [] }
          };
          setTicketItems(prevItems => [...prevItems, newTicketItem]);
          // --- CORRECCIÓN AQUÍ TAMBIÉN ---
          handleNavigate('root'); // Volver al inicio después de añadir un item fijo
          return;
      }
  };

  // --- LÓGICA DE MODALES (CORREGIDA) ---
  const handleCloseCustomModal = () => {
    setIsCustomModalOpen(false);
    setGroupToCustomize(null);
  };

  const handleCloseVariantModal = () => {
    setIsVariantModalOpen(false);
    setItemToSelectVariant(null);
  };
  
  const handleAddItemToTicket = (item: TicketItem) => {
    setTicketItems(prevItems => [...prevItems, item]);
    
    if (item.type === 'CUSTOM') handleCloseCustomModal();
    else handleCloseVariantModal();

    // --- ¡AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL! ---
    // Regresa a la vista de menú Y resetea la navegación al 'root'.
    setView('menu');
    handleNavigate('root'); 
  };
  
  // --- LÓGICA DE ORDEN (AUTO-INCREMENTO) ---
  const handleSubmitOrder = async () => {
    if (ticketItems.length === 0) return;

    const orderItems = ticketItems.map(item => ({
        ticketItemId: item.id,
        baseName: item.baseName,
        status: 'PENDING', 
        price: item.finalPrice,
        type: item.type,
        notes: "", 
        details: {
            variantName: item.details?.variantName || '',
            baseRule: item.details?.basePriceRule || '',
            modifiers: item.details?.selectedModifiers.map(mod => ({
                name: mod.name.replace(/\(\+\$\d+\.\d+\)/, '').trim() + (mod.price > 0 ? ` (+${mod.price.toFixed(2)})` : ''),
                group: mod.group,
                price: mod.price
            })) || []
        }
    }));
    
    let finalOrderNumber = 0;
    const counterId = "orderNumberCounter"; 

    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const counterRef = doc(db, "counters", counterId);
            const counterDoc = await transaction.get(counterRef);

            const currentNumber = counterDoc.exists() ? counterDoc.data().currentNumber : 0;
            const newNumber = currentNumber + 1;
            finalOrderNumber = newNumber;
            
            transaction.set(counterRef, { currentNumber: newNumber }, { merge: true });
            
            const newOrder = {
                orderNumber: finalOrderNumber, 
                orderMode: currentOrderMode,
                createdAt: serverTimestamp(),
                status: 'PENDING',
                totalAmount: totalTicket,
                paymentStatus: 'PAID', 
                items: orderItems,
            };
            
            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, newOrder);
        });

        const displayOrderNumber = finalOrderNumber.toString().padStart(3, '0');
        setCurrentOrderNumber(finalOrderNumber + 1); 
        setTicketItems([]);
        alert(`¡Orden #${displayOrderNumber} enviada a cocina!`);
        setView('menu'); 

    } catch (e) {
        console.error("Error en la transacción de la orden:", e);
        alert("Error al enviar la orden. Por favor, inténtalo de nuevo.");
    }
  };

  const totalTicket = useMemo(() => {
    return ticketItems.reduce((sum, item) => sum + item.finalPrice, 0);
  }, [ticketItems]);

  return (
    <div className="app-container">
      
      {/* Vista de Menú */}
      <div className="view" style={{ display: view === 'menu' ? 'flex' : 'none' }}>
        <MenuScreen
          // Pasa los datos
          allData={allData}
          currentGroup={currentGroup}
          currentOrderNumber={currentOrderNumber}
          currentOrderMode={currentOrderMode}
          // Pasa los controladores
          onSetOrderMode={setCurrentOrderMode}
          onProductClick={handleProductClick}
          onGoBack={handleGoBack}
        />
        <BottomNav ticketCount={ticketItems.length} onNavigate={setView} />
      </div>

      {/* Vista de Ticket */}
      <div className="view" style={{ display: view === 'ticket' ? 'flex' : 'none' }}>
        <TicketScreen
          ticketItems={ticketItems}
          totalTicket={totalTicket}
          onSubmitOrder={handleSubmitOrder}
          onNavigate={setView}
        />
      </div>
      
      {/* MODALES */}
      {groupToCustomize && (
          <CustomizeCrepeModal 
              isOpen={isCustomModalOpen}
              onClose={handleCloseCustomModal}
              group={groupToCustomize} 
              allModifiers={allData.modifiers}
              allPriceRules={allData.rules} 
              onAddItem={handleAddItemToTicket}
          />
      )}
      {itemToSelectVariant && (
          <CustomizeVariantModal 
              isOpen={isVariantModalOpen}
              onClose={handleCloseVariantModal}
              item={itemToSelectVariant} 
              allModifiers={allData.modifiers}
              onAddItem={handleAddItemToTicket}
          />
      )}
    </div>
  );
}

// --- PANTALLA DE MENÚ (Sub-componente) ---

interface MenuScreenProps {
  allData: { groups: MenuGroup[], items: MenuItem[] };
  currentGroup: MenuGroup | null;
  currentOrderNumber: number;
  currentOrderMode: OrderMode;
  onSetOrderMode: (mode: OrderMode) => void;
  onProductClick: (item: MenuItem | MenuGroup) => void;
  onGoBack: () => void;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ 
  allData, 
  currentGroup,
  currentOrderNumber, 
  currentOrderMode, 
  onSetOrderMode,
  onProductClick,
  onGoBack
}) => {
  
  // Los cálculos ahora viven aquí, usando los props
  const groupsToShow = useMemo(() => {
    if (currentGroup?.id === 'root') return allData.groups.filter(g => g.parent === 'root');
    return allData.groups.filter(g => g.parent === currentGroup?.id);
  }, [currentGroup, allData.groups]);

  const itemsToShow = useMemo(() => {
    if (currentGroup?.items_ref) {
      return currentGroup.items_ref
        .map(refId => allData.items.find(item => item.id === refId))
        .filter((item): item is MenuItem => !!item);
    }
    return [];
  }, [currentGroup, allData.items]);

  return (
    <>
      <header className="header-bar">
        <span className="header-order-id">Orden #{currentOrderNumber.toString().padStart(3, '0')}</span>
        {(['Mesa 1', 'Mesa 2', 'Para Llevar'] as OrderMode[]).map(mode => (
          <button 
            key={mode} 
            className={`btn-order-type ${currentOrderMode === mode ? 'active' : ''}`}
            onClick={() => onSetOrderMode(mode)}
          >
            {mode}
          </button>
        ))}
      </header>

      <div className="menu-content">
        <div className="menu-header">
            {currentGroup && currentGroup.parent && (
                <button onClick={onGoBack} className="btn-back">&larr;</button>
            )}
            <h2>{currentGroup ? currentGroup.name : 'Cargando Menú...'}</h2>
        </div>

        <div className="menu-list">
            {groupsToShow.map(group => (
                <MenuButton 
                  key={group.id} 
                  item={group} 
                  onClick={() => onProductClick(group)} 
                />
            ))}
            {itemsToShow.map(item => (
              <MenuButton 
                key={item.id} 
                item={item} 
                onClick={() => onProductClick(item)} 
              />
            ))}
        </div>
      </div>
    </>
  );
};

// --- PANTALLA DE TICKET (Sub-componente) ---

interface TicketScreenProps {
  ticketItems: TicketItem[];
  totalTicket: number;
  onSubmitOrder: () => void;
  onNavigate: (view: View) => void;
}

const TicketScreen: React.FC<TicketScreenProps> = ({ ticketItems, totalTicket, onSubmitOrder, onNavigate }) => {
  return (
    <>
      <header className="ticket-header">
        <button onClick={() => onNavigate('menu')} className="btn-back">&larr;</button>
        <h2>Pedido Actual</h2>
      </header>
      
      <div className="ticket-scroll-area">
        {ticketItems.length === 0 ? (
          <div className="ticket-placeholder">
            <p>Agrega productos para iniciar un pedido.</p>
          </div>
        ) : (
          <ul className="ticket-list">
            {ticketItems.map((item) => (
              <li key={item.id} className="ticket-item">
                <div className="ticket-item-header">
                  <span>{item.baseName} {item.details?.variantName && `(${item.details.variantName})`}</span>
                  <span>${item.finalPrice.toFixed(2)}</span>
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
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="ticket-footer">
        <div className="ticket-total">
            <span>TOTAL:</span>
            <span>${totalTicket.toFixed(2)}</span>
        </div>
        <div>
            <button 
                onClick={onSubmitOrder}
                disabled={ticketItems.length === 0}
                className="btn-submit-order"
            >
                Cobrar y Enviar a Cocina (${totalTicket.toFixed(2)})
            </button>
        </div>
      </div>
    </>
  );
};

// --- BARRA DE NAVEGACIÓN INFERIOR (Sub-componente) ---

interface BottomNavProps {
  ticketCount: number;
  onNavigate: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ ticketCount, onNavigate }) => {
  return (
    <nav className="bottom-nav">
      <button className="nav-button" onClick={() => onNavigate('menu')}>
        Menú
      </button>
      <button className="nav-button" onClick={() => onNavigate('ticket')}>
        Ver Ticket
        {ticketCount > 0 && <span className="badge">{ticketCount}</span>}
      </button>
    </nav>
  );
};

// --- BOTÓN DE MENÚ (Sub-componente) ---

function getIconForItem(item: MenuItem | MenuGroup): string {
    if ('level' in item) { // Es un Grupo
        if (item.rules_ref) return '✨'; // Arma tu...
        if (item.id.includes('dulces')) return '🥞';
        if (item.id.includes('saladas')) return '🥓';
        if (item.id.includes('bebidas_frias')) return '🧊';
        if (item.id.includes('bebidas_calientes')) return '☕';
        if (item.id.includes('bebidas')) return '🥤';
        if (item.id.includes('postres')) return '🍰';
        return '➡️';
    }
    // Es un Item
    if (item.category.includes('Calientes')) return '☕';
    if (item.id.includes('bublee')) return '🧋';
    if (item.category.includes('Frias')) return '🧊';
    if (item.category.includes('Dulces')) return '🥞';
    if (item.category.includes('Saladas')) return '🥓';
    if (item.category.includes('Postres')) return '🍮';
    return '🍽️';
}

interface MenuButtonProps {
  item: MenuItem | MenuGroup;
  onClick: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ item, onClick }) => {
    let className = 'btn-menu-item';
    if ('level' in item) {
        className += item.rules_ref ? ' rule' : ' category';
    }
    return (
        <button className={className} onClick={onClick}>
            <span className="btn-menu-item-icon">{getIconForItem(item)}</span>
            {item.name.split('(')[0]}
        </button>
    );
}

export default App;