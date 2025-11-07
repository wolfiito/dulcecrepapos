// src/App.tsx

import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore'; 
import { db } from './firebase';

// Definimos un tipo simple para la orden del KDS
interface KDSOrder {
  orderId: string;
  orderNumber: number;
  status: string;
  createdAt: string; // Simplificamos el timestamp a string para el display
  items: KDSOrderItem[];
}

interface KDSOrderItem {
    ticketItemId: string;
    baseName: string;
    status: string; // PENDING, PREPARING, READY
    details: {
        baseRule: string;
        variantName: string;
        modifiers: {name: string, group: string}[];
    };
}

function App() {
  const [pendingOrders, setPendingOrders] = useState<KDSOrder[]>([]);

  useEffect(() => {
    // 1. Crear una consulta: Órdenes NO entregadas, ordenadas por número (más antiguo primero)
    const q = query(
      collection(db, "orders"),
      where("status", "!=", "DELIVERED"), // Excluye las órdenes ya entregadas/terminadas
      orderBy("status"), // Usaremos el status para agrupar (PENDING antes de READY)
      orderBy("orderNumber", "asc")
    );

    // 2. Establecer el listener en tiempo real (onSnapshot)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders: KDSOrder[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          orderId: doc.id,
          orderNumber: data.orderNumber,
          status: data.status,
          createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString() : 'N/A',
          items: data.items,
        } as KDSOrder);
      });
      
      console.log(`[KDS] Órdenes recibidas: ${orders.length}`);
      setPendingOrders(orders);
    }, (error) => {
        console.error("Error al suscribirse a las órdenes:", error);
    });

    // 3. Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#333', color: '#fff' }}>
      <h1>👨‍🍳 KDS - Dulce Crepa (Órdenes Pendientes)</h1>
      <p>Total de órdenes en la cola: **{pendingOrders.length}**</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
        {pendingOrders.map(order => (
          <OrderCard key={order.orderId} order={order} />
        ))}
        {pendingOrders.length === 0 && <p>¡No hay órdenes pendientes! Tiempo de descanso.</p>}
      </div>
    </div>
  );
}

// Componente simple para mostrar una orden (Lo desarrollaremos en el Paso 18)
const OrderCard: React.FC<{ order: KDSOrder }> = ({ order }) => {
    // Lógica para mostrar los ítems pendientes
    const pendingItems = order.items.filter(item => item.status !== 'READY');

    return (
        <div style={{ border: `3px solid ${order.status === 'READY' ? 'gold' : 'red'}`, padding: '15px', borderRadius: '8px', width: '300px', backgroundColor: '#555' }}>
            <h2>ORDEN #{order.orderNumber}</h2>
            <p>Estado: **{order.status}**</p>
            <p>Hora: {order.createdAt}</p>
            <hr />
            
            {pendingItems.map(item => (
                <div key={item.ticketItemId} style={{ marginBottom: '10px' }}>
                    <p style={{ fontWeight: 'bold' }}>{item.baseName} {item.details?.variantName && `(${item.details.variantName})`}</p>
                    <ul>
                        {item.details.modifiers.map((mod, index) => (
                            <li key={index} style={{ color: mod.group === 'crepa_dulce_extra' ? 'yellow' : '#ccc', listStyle: 'disc' }}>
                                {mod.name}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            
            <button style={{ width: '100%', padding: '10px', marginTop: '10px' }} disabled>
                Marcar Orden Lista (Próximamente)
            </button>
        </div>
    );
};


export default App;