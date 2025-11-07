// src/components/CustomizeCrepeModal.tsx (Reemplazo Completo)

import { useState, useMemo } from 'react';
import Modal from 'react-modal';
import type { MenuGroup, Modifier, TicketItem, PriceRule } from '../types/menu'; 

// --- CONSTANTES DE GRUPOS DE MODIFICADORES ---
const BEBIDA_LECHE_GRUPO = "leche_opciones";
const FRA_SABORES_BASE = "frappe_sabores_base";
const MALTEADA_SABORES = "malteada_sabores";
const FRAPPE_ESP_SABORES = "frappe_especial_sabores";
const SODA_CHAMOYADA_SABORES = "soda_chamoyada_sabores";
const LICUADO_INGREDIENTES = "licuado_ingredientes";
const CREPA_DULCE_BASE = "crepa_dulce_base";
const CREPA_SALADA_BASE = "crepa_salada_base";


const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
};

Modal.setAppElement('#root');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: MenuGroup | null; 
  allModifiers: Modifier[];
  allPriceRules: PriceRule[]; 
  onAddItem: (item: TicketItem) => void;
}

export function CustomizeCrepeModal({ isOpen, onClose, group, allModifiers, allPriceRules, onAddItem }: Props) {
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, Modifier>>(new Map());

  const priceRule = useMemo(() => {
    if (!group || !group.rules_ref) return null;
    return allPriceRules.find(rule => rule.id === group.rules_ref) || null;
  }, [group, allPriceRules]);

  const relevantModifiers = useMemo(() => {
    if (!group) return [];
    
    const allowedGroups = [group.base_group, ...(group.extra_groups || []), ...(group.topping_groups || [])].filter((g): g is string => !!g);
    
    if (group.extra_groups?.includes(BEBIDA_LECHE_GRUPO)) allowedGroups.push(BEBIDA_LECHE_GRUPO);

    return allModifiers.filter(mod => allowedGroups.includes(mod.group));
  }, [group, allModifiers]);

  const groupedModifiers = useMemo(() => {
    const groups: Record<string, Modifier[]> = {};
    if (!group) return groups;

    const uiGroupNames: Record<string, string> = {
        [group.base_group || '']: group.id.includes('licuado') ? `1. Ingredientes (${group.id.includes('sencillo') ? 'Elija 1' : 'Elija 2'})` : 
                                   (group.id.includes('frappe') || group.id.includes('malteada') || group.id.includes('soda')) ? '1. Seleccione Sabor' : 
                                   (group.id.includes('postre') ? '1. Ingredientes (Cuentan para precio)' : '1. Ingredientes Base (Cuentan para precio)'),
        
        ...(group.extra_groups || []).reduce((acc, g) => ({...acc, [g]: g === BEBIDA_LECHE_GRUPO ? '2. Tipo de Leche' : '2. Extras de Costo Adicional'}), {}),
        ...(group.topping_groups || []).reduce((acc, g) => ({...acc, [g]: '3. Toppings y Finales'}), {}),
    };

    relevantModifiers.forEach(mod => {
        const uiName = uiGroupNames[mod.group] || 'Otros';
        if (!groups[uiName]) {
            groups[uiName] = [];
        }
        groups[uiName].push(mod);
    });

    return groups;
  }, [group, relevantModifiers]);

  // Lógica de cálculo y validación
  const calculateCrepePrice = (
    selectedMods: Map<string, Modifier>
  ): { price: number; rule: string; isValid: boolean } => {
    if (!priceRule || !group) return { price: 0, rule: 'N/A', isValid: false };

    let baseIngredientCount = 0;
    let extraCost = 0;
    
    selectedMods.forEach(mod => {
        if (mod.group === group.base_group || (mod.group === group.base_group && mod.price === 0)) {
            baseIngredientCount++; 
        }
        if (mod.price > 0) {
            extraCost += mod.price;
        }
    });
    
    // --- LÓGICA DE VALIDACIÓN (Obligatorios y Conteo) ---
    
    let ruleDescription = group.rules_ref === "regla_precio_fijo" ? group.name : `${baseIngredientCount} Ingredientes Base`;
    let basePrice = 0;

    // 1. Validar Sabores Exclusivos (Frappé, Malteadas, Sodas/Chamoyadas) - Debe elegir 1
    if (group.base_group === FRA_SABORES_BASE || group.base_group === MALTEADA_SABORES || group.base_group === FRAPPE_ESP_SABORES || group.base_group === SODA_CHAMOYADA_SABORES) {
        if (baseIngredientCount !== 1) {
            return { price: 0, rule: 'Debe elegir 1 Sabor Base', isValid: false };
        }
        basePrice = group.price || 0; // Usar el precio fijo del grupo
        ruleDescription = "Precio Base";
    }
    
    // 2. Validar Licuados (Conteo Exacto)
    else if (group.id.includes('licuados')) {
        const requiredCount = group.id.includes('sencillo') ? 1 : 2;
        if (baseIngredientCount !== requiredCount) {
             return { price: 0, rule: `Debe elegir ${requiredCount} Ingrediente(s)`, isValid: false };
        }
        const matchedRule = priceRule.basePrices.find(r => r.count === requiredCount);
        basePrice = matchedRule?.price || 0;
    }
    
    // 3. Validar Crepas/Postres (Debe elegir al menos 1)
    else if (group.base_group === CREPA_DULCE_BASE || group.base_group === CREPA_SALADA_BASE) {
         if (baseIngredientCount === 0) {
            return { price: 0, rule: 'Debe elegir al menos 1 Ingrediente Base', isValid: false };
         }
         const matchedRule = priceRule.basePrices.sort((a, b) => b.count - a.count).find(r => baseIngredientCount >= r.count);
         basePrice = matchedRule?.price || 0;
    }

    // 4. Validar Leche Condicional (Frappé, Licuados, Malteadas)
    if (group.extra_groups?.includes(BEBIDA_LECHE_GRUPO)) {
        const lecheSeleccionada = selectedMods.has('leche_entera') || selectedMods.has('leche_deslactosada');
        
        const selectedBaseMod = Array.from(selectedMods.values()).find(mod => mod.group === group.base_group);
        
        const requiresMilk = selectedBaseMod && !selectedBaseMod.name.includes('(sin leche cond.)');
        
        if (requiresMilk && !lecheSeleccionada) {
            return { price: basePrice + extraCost, rule: 'El sabor requiere seleccionar un tipo de Leche', isValid: false };
        }
    }
    
    const finalPrice = basePrice + extraCost;
    
    return { price: finalPrice, rule: ruleDescription, isValid: true };
  };

  const { price: currentPrice, rule: currentRule, isValid } = useMemo(() => {
    return calculateCrepePrice(selectedModifiers);
  }, [selectedModifiers, priceRule, group]);

  const handleAddToTicket = () => {
    if (!group || !isValid) return;
    
    const newTicketItem: TicketItem = {
      id: Date.now().toString(),
      baseName: group.name, 
      finalPrice: currentPrice,
      type: 'CUSTOM',
      details: {
        baseRuleId: group.rules_ref,
        basePriceRule: currentRule,
        selectedModifiers: Array.from(selectedModifiers.values()),
      }
    };
    
    onAddItem(newTicketItem);
  };
  
  const handleModifierChange = (modifier: Modifier, isExclusive: boolean) => {
    setSelectedModifiers(prev => {
        const newMap = new Map(prev);
        
        if (isExclusive) { 
            // Borra todos los del mismo grupo (ej. Sabor)
            relevantModifiers
                .filter(mod => mod.group === modifier.group)
                .forEach(mod => newMap.delete(mod.id));
        }

        // Lógica de Toggle: Si ya está, lo quita. Si no está, lo pone.
        if (newMap.has(modifier.id)) {
            newMap.delete(modifier.id);
        } else {
            newMap.set(modifier.id, modifier);
        }
        return newMap;
    });
  };

  if (!isOpen || !group) return null;
  
  if (!isOpen && selectedModifiers.size > 0) {
      setSelectedModifiers(new Map());
  }
  
  const isAddButtonDisabled = !isValid || currentPrice === 0;
  
  // Determinar si el grupo base es de selección exclusiva (Sabores)
  const exclusiveBaseGroups = [FRA_SABORES_BASE, MALTEADA_SABORES, FRAPPE_ESP_SABORES, SODA_CHAMOYADA_SABORES];
  const isBaseGroupExclusive = group.base_group ? exclusiveBaseGroups.includes(group.base_group) : false;

  // Estilos para los botones de selección
  const buttonStyle = (isSelected: boolean) => ({
      padding: '10px 15px',
      border: isSelected ? '3px solid #007bff' : '1px solid #ccc',
      cursor: 'pointer',
      backgroundColor: isSelected ? '#e6f2ff' : '#f0f0f0', // Fondo azul claro si está seleccionado
      borderRadius: '4px'
  });

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel={`Personalizar: ${group.name}`}
    >
      <h2>Personalizar: {group.name}</h2>
      <p style={{fontWeight: 'bold', color: isValid ? 'green' : 'red'}}>{currentRule} - ${currentPrice.toFixed(2)}</p>
      <hr />
      
      {/* Sección de Modificadores por Grupo */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
        {Object.entries(groupedModifiers).map(([uiGroupName, mods]) => (
            <div key={uiGroupName} style={{flex: '1 1 300px', border: '1px solid #eee', padding: '15px', borderRadius: '4px'}}>
                <h3>{uiGroupName}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {mods.map(mod => {
                        // Determinar si este botón es de selección exclusiva
                        const isExclusive = (isBaseGroupExclusive && mod.group === group.base_group) || 
                                              mod.group === BEBIDA_LECHE_GRUPO;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => handleModifierChange(mod, isExclusive)}
                                style={buttonStyle(selectedModifiers.has(mod.id))}
                            >
                                {mod.name} 
                                {mod.price > 0 && <span style={{ color: 'red', marginLeft: '5px' }}>(+${mod.price.toFixed(2)})</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
      
      <hr style={{marginTop: '20px'}}/>

      {/* Pie del Modal */}
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <button onClick={onClose} style={{padding: '10px 20px', cursor: 'pointer'}}>Cancelar</button>
        <button 
          onClick={handleAddToTicket} 
          disabled={isAddButtonDisabled}
          style={{padding: '10px 20px', cursor: 'pointer', backgroundColor: isAddButtonDisabled ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px'}}
        >
          Añadir al Ticket (${currentPrice.toFixed(2)})
        </button>
      </div>
    </Modal>
  );
}