// src/App.tsx (Reemplazo Completo del KDS - Corrección de Audio)

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
    db, 
    collection, 
    doc, 
    updateDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy,
    type Timestamp,
    type QuerySnapshot,
    type DocumentData
} from './firebase'; 

// --- 1. TIPOS DE DATOS ---

interface KDSOrder {
  orderId: string;
  orderNumber: number;
  status: string; 
  orderMode: string;
  createdAt: Timestamp; 
  items: KDSOrderItem[];
}

interface KDSOrderItem {
    ticketItemId: string;
    baseName: string;
    status: string; 
    price: number;
    details: {
        baseRule: string;
        variantName: string;
        modifiers: {name: string, group: string, price: number}[];
    };
}

// --- 2. HOOKS DE TIEMPO PERSONALIZADOS ---

function useKdsClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);
    return time.toLocaleTimeString('es-MX');
}

function useElapsedTime(startTime: Timestamp) {
    const [minutes, setMinutes] = useState(0);

    useEffect(() => {
        const calculateMinutes = () => {
            const now = Date.now();
            const startTimeMillis = startTime ? startTime.toMillis() : Date.now();
            const elapsed = Math.floor((now - startTimeMillis) / 60000); 
            setMinutes(elapsed);
        };
        
        calculateMinutes(); 
        const intervalId = setInterval(calculateMinutes, 30000); 
        
        return () => clearInterval(intervalId);
    }, [startTime]);

    return minutes;
}


// --- 3. COMPONENTE PRINCIPAL (APP) ---

function App() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  // --- PASO A: NUEVO ESTADO PARA EL AUDIO ---
  const [isInteracted, setIsInteracted] = useState(false); 
  const clockTime = useKdsClock();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!isInteracted) return;
  
    const unlockAudio = () => {
      audioRef.current?.play().catch(() => {});
      window.removeEventListener("click", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
  
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["PENDING", "PREPARING", "READY"]),
      orderBy("createdAt", "asc")
    );
  
    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        setIsConnected(true);
  
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && change.doc.data().status === "PENDING") {
            audioRef.current?.play().catch((e) =>
              console.warn("No se pudo reproducir audio:", e)
            );
          }
        });
  
        const ordersData = snapshot.docs.map((doc) => ({
          ...(doc.data() as KDSOrder),
          orderId: doc.id,
          createdAt: doc.data().createdAt || new Date(),
        }));
  
        setOrders(ordersData);
      },
      (error) => {
        console.error("Error de KDS Snapshot:", error);
        setIsConnected(false);
      }
    );
  
    return () => {
      window.removeEventListener("click", unlockAudio);
      unsubscribe();
    };
  }, [isInteracted]); // <-- El listener se activa DESPUÉS de la interacción

  // --- PASO B: PANTALLA DE BIENVENIDA ---
  if (!isInteracted) {
    return (
        <div 
            className="kds-welcome-screen"
            onClick={() => setIsInteracted(true)}
        >
            <img src="/logo.png" alt="Logo" style={{height: '150px', marginBottom: '20px', borderRadius: '20px'}} />
            <h1>KDS Dulce Crepa</h1>
            <p>Tocar para Iniciar</p>
        </div>
    );
  }

  // KDS Principal
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <KdsHeader 
        isConnected={isConnected} 
        time={clockTime} 
        stationName="Cocina Principal" 
      />
      
      <div className="order-grid">
        {orders.map(order => (
          <OrderCard key={order.orderId} order={order} />
        ))}
        {orders.length === 0 && (
            <h2 style={{color: 'var(--text-muted)'}}>No hay pedidos pendientes...</h2>
        )}
      </div>

      {/* --- PASO C: ELEMENTO DE AUDIO --- */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
    </div>
  );
}

// --- 4. SUB-COMPONENTES (HEADER) ---

interface HeaderProps {
    isConnected: boolean;
    time: string;
    stationName: string;
}
const KdsHeader: React.FC<HeaderProps> = ({ isConnected, time, stationName }) => {
    return (
        <header className="kds-header">
            <img src="/Gemini_Generated_Image_pm0x4qpm0x4qpm0x.jpg" alt="Logo" className="kds-logo" />
            <span className="kds-station-name">{stationName}</span>
            <span className="kds-clock">{time}</span>
            <div className="connection-indicator">
                <div className={`connection-dot ${isConnected ? 'connected' : ''}`}></div>
                {isConnected ? 'Conectado' : 'Sin Conexión'}
            </div>
        </header>
    );
};

// --- 5. SUB-COMPONENTES (TARJETA DE ORDEN) ---

interface OrderCardProps {
    order: KDSOrder;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const minutesElapsed = useElapsedTime(order.createdAt);
    const isAlert = minutesElapsed >= 10; 

    const updateOrderStatus = async (newStatus: "PREPARING" | "READY" | "DELIVERED") => {
        const orderRef = doc(db, "orders", order.orderId);
        try {
            await updateDoc(orderRef, { status: newStatus });
        } catch (error) {
            console.error(`Error al mover orden a ${newStatus}:`, error);
        }
    };

    const handleSetPreparing = () => {
        updateOrderStatus("PREPARING");
    };

    const handleSetReady = () => {
        updateOrderStatus("READY");
        // Desaparece después de 3 segundos
        setTimeout(() => {
            updateOrderStatus("DELIVERED");
        }, 3000); 
    };

    const isPending = order.status === 'PENDING';
    const isPreparing = order.status === 'PREPARING';
    const isReady = order.status === 'READY';

    return (
        <div className={`order-card status-${order.status} ${isAlert && !isReady ? 'alert' : ''}`}>
            <div className="order-card-header">
                <h2 className="order-number">#{order.orderNumber.toString().padStart(3, '0')}</h2>
                <div className="order-meta">
                    <span className="order-type">{order.orderMode || 'Para Llevar'}</span>
                    <span className={`order-time ${isAlert ? 'alert-time' : ''}`}>
                        {isReady ? 'LISTO' : `+${minutesElapsed} min`}
                    </span>
                </div>
            </div>

            <div className="kds-item-list">
                {order.items.map(item => (
                    <KdsItem key={item.ticketItemId} item={item} />
                ))}
            </div>

            <div className="card-actions">
                <button 
                    className="btn-action btn-preparar" 
                    onClick={handleSetPreparing}
                    disabled={!isPending}
                >
                    🔥 En Preparación
                </button>
                <button 
                    className="btn-action btn-listo"
                    onClick={handleSetReady}
                    disabled={isReady}
                >
                    ✅ Listo
                </button>
            </div>
        </div>
    );
};

// --- 6. SUB-COMPONENTES (ÍTEM INDIVIDUAL) ---

const KdsItem: React.FC<{ item: KDSOrderItem }> = ({ item }) => {
    const mainModifiers = item.details.modifiers.filter(mod =>
        mod.group.includes('sabor') || 
        mod.group.includes('leche') || 
        mod.group.includes('licuado') ||
        mod.group === "crepa_dulce_base" || 
        mod.group === "crepa_salada_base"
    ).map(mod => mod.name.split('(')[0].trim()); 

    const extras = item.details.modifiers.filter(mod => mod.price > 0);

    return (
        <div className="kds-item">
            <h3 className="kds-item-name">
                {item.baseName} {item.details.variantName && `(${item.details.variantName})`}
            </h3>
            <ul className="kds-item-details">
                {mainModifiers.map((name, i) => (
                    <li key={i}>{name}</li>
                ))}
                {extras.map((mod, i) => (
                    <li key={i} className="extra">
                        + {mod.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default App;