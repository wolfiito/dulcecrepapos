// src/components/CustomizeCrepeModal.tsx (Reemplazo Completo)

import { useState, useMemo, useEffect } from 'react';
import Modal from 'react-modal';
import type { MenuGroup, Modifier, TicketItem, PriceRule } from '../types/menu'; 

// --- CONSTANTES DE GRUPOS DE MODIFICADORES ---
const BEBIDA_LECHE_GRUPO = "leche_opciones";
const FRA_SABORES_BASE = "frappe_sabores";
const MALTEADA_SABORES = "malteada_sabores";
const FRAPPE_ESP_SABORES = "frappe_especial_sabores";
const SODA_SABORES = "soda_sabores";
const CHAMOYADA_SABORES = "chamoyada_sabores";
const ICEE_SABORES = "icee_sabores";
const LICUADO_INGREDIENTES = "licuado_ingredientes";
const CREPA_DULCE_BASE = "crepa_dulce_base";
const CREPA_SALADA_BASE = "crepa_salada_base";
const CREPA_TOPPING_SALSA = "crepa_topping_salsa";
const CREPA_TOPPING_SECO = "crepa_topping_seco";

const exclusiveBaseGroups = [FRA_SABORES_BASE, MALTEADA_SABORES, FRAPPE_ESP_SABORES, SODA_SABORES, CHAMOYADA_SABORES, ICEE_SABORES];
const exclusiveGroups = [...exclusiveBaseGroups, BEBIDA_LECHE_GRUPO, CREPA_TOPPING_SALSA, CREPA_TOPPING_SECO];

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
        border: 'none',
        borderRadius: '8px',
        padding: '25px'
    },
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
    }
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
  const [step, setStep] = useState(0);
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, Modifier>>(new Map());

  const MAX_INGREDIENTS = 5;

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSelectedModifiers(new Map());
    }
  }, [isOpen, group]);

  const priceRule = useMemo(() => {
    if (!group || !group.rules_ref) return null;
    return allPriceRules.find(rule => rule.id === group.rules_ref) || null;
  }, [group, allPriceRules]);

  // --- Definición de Pasos del Asistente ---
  const steps = useMemo(() => {
    if (!group) return [];
    
    const baseGroups = group.base_group ? [group.base_group] : [];
    const extraGroups = group.extra_groups || [];
    const toppingGroups = group.topping_groups || [];

    const allSteps = [];

    if (baseGroups.length > 0) {
        allSteps.push({ 
            name: group.id.includes('licuado') ? `Ingredientes (${group.id.includes('sencillo') ? 'Elija 1' : 'Elija 2'})` : 
                  (group.id.includes('frappe') || group.id.includes('malteada') || group.id.includes('soda') || group.id.includes('chamoyada') || group.id.includes('icee')) ? 'Seleccione Sabor' : 
                  (group.id.includes('postre') ? `Ingredientes (Max ${MAX_INGREDIENTS})` : `Ingredientes Base (Max ${MAX_INGREDIENTS})`),
            groups: baseGroups,
            isRequired: true
        });
    }
    if (extraGroups.length > 0) {
        allSteps.push({
            name: extraGroups.includes(BEBIDA_LECHE_GRUPO) ? 'Tipo de Leche' : 'Extras Adicionales',
            groups: extraGroups,
            isRequired: extraGroups.includes(BEBIDA_LECHE_GRUPO) 
        });
    }
    if (toppingGroups.length > 0) {
        // Lógica para Crepas: 2 tipos de toppings gratis
        if (group.id.includes('dulces') || group.id.includes('postre')) {
             allSteps.push({ name: 'Topping de Salsa (1 Gratis)', groups: [CREPA_TOPPING_SALSA], isRequired: false });
             allSteps.push({ name: 'Topping Seco (1 Gratis)', groups: [CREPA_TOPPING_SECO], isRequired: false });
        } else {
            // Lógica para Bebidas Frías
            allSteps.push({ name: 'Toppings y Finales', groups: toppingGroups, isRequired: false });
        }
    }
    return allSteps.filter(s => s.groups.length > 0); // Filtra pasos que no tienen grupos asignados
  }, [group]);

  const currentStepInfo = steps[step];
  const isLastStep = step === steps.length - 1;

  // Modificadores para el paso actual
  const modifiersForCurrentStep = useMemo(() => {
      if (!currentStepInfo) return [];
      return allModifiers.filter(mod => currentStepInfo.groups.includes(mod.group));
  }, [currentStepInfo, allModifiers]);


  // Contar ingredientes base seleccionados (para el límite de 5 en crepas)
  const selectedBaseCount = useMemo(() => {
    let count = 0;
    if (group?.base_group === CREPA_DULCE_BASE || group?.base_group === CREPA_SALADA_BASE) {
        selectedModifiers.forEach(mod => {
            if (mod.group === group.base_group) count++;
        });
    }
    return count;
  }, [group, selectedModifiers]);
  
  const isCrepeLimitReached = selectedBaseCount >= MAX_INGREDIENTS;


  const calculateCrepePrice = (
    selectedMods: Map<string, Modifier>
  ): { price: number; rule: string; isValid: boolean } => {
    if (!priceRule || !group) return { price: 0, rule: 'N/A', isValid: false };

    let baseIngredientCount = 0;
    let extraCost = 0;
    
    selectedMods.forEach(mod => {
        if (mod.group === group.base_group) baseIngredientCount++; 
        if (mod.price > 0) extraCost += mod.price;
    });
    
    let ruleDescription = group.rules_ref === "regla_precio_fijo" ? (group.name.split('(')[0].trim()) : `${baseIngredientCount} Ingredientes`;
    let basePrice = 0;
    let isValid = true;
    
    const isBaseGroupExclusive = group.base_group ? exclusiveBaseGroups.includes(group.base_group) : false;

    if (isBaseGroupExclusive) {
        if (baseIngredientCount !== 1) {
            isValid = false;
            ruleDescription = 'Debe elegir 1 Sabor Base';
        }
        basePrice = group.price || 0; 
    }
    else if (group.id.includes('licuados')) {
        const requiredCount = group.id.includes('sencillo') ? 1 : 2;
        if (baseIngredientCount !== requiredCount) {
             isValid = false;
             ruleDescription = `Debe elegir ${requiredCount} Ingrediente(s)`;
        }
        const matchedRule = priceRule.basePrices.find(r => r.count === requiredCount);
        basePrice = matchedRule?.price || 0;
    }
    else if (group.base_group === CREPA_DULCE_BASE || group.base_group === CREPA_SALADA_BASE) {
         if (baseIngredientCount === 0) {
            isValid = false;
            ruleDescription = 'Debe elegir al menos 1 Ingrediente Base';
         }
         const matchedRule = priceRule.basePrices.sort((a, b) => b.count - a.count).find(r => baseIngredientCount >= r.count);
         basePrice = matchedRule?.price || 0;
    }

    if (group.extra_groups?.includes(BEBIDA_LECHE_GRUPO)) {
        const lecheSeleccionada = selectedMods.has('leche_entera') || selectedMods.has('leche_deslactosada');
        const selectedBaseMod = Array.from(selectedMods.values()).find(mod => mod.group === group.base_group);
        const requiresMilk = selectedBaseMod && !selectedBaseMod.name.includes('(sin leche cond.)');
        
        if (requiresMilk && !lecheSeleccionada) {
            isValid = false;
            ruleDescription = 'El sabor requiere seleccionar un tipo de Leche';
        }
    }
    
    const finalPrice = basePrice + extraCost;
    return { price: finalPrice, rule: ruleDescription, isValid: isValid };
  };

  const { price: currentPrice, rule: currentRule, isValid } = useMemo(() => {
    return calculateCrepePrice(selectedModifiers);
  }, [selectedModifiers, priceRule, group]);


  // Validación del Paso Actual para el botón "Continuar"
  const isStepValid = useMemo(() => {
    if (!currentStepInfo || !currentStepInfo.isRequired) return true;
    
    // Si el paso es obligatorio (ej. Sabor Frappé o Leche), verifica que al menos uno de ESE GRUPO esté seleccionado
    return Array.from(selectedModifiers.values()).some(mod => currentStepInfo.groups.includes(mod.group));
  }, [currentStepInfo, selectedModifiers]);


  const handleAddToTicket = () => {
    if (!group || !isValid) {
        alert("Por favor, revisa las selecciones obligatorias.");
        return;
    }
    
    const newTicketItem: TicketItem = {
      id: Date.now().toString(),
      baseName: group.name.split('(')[0].trim(), 
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
  
  const handleModifierChange = (modifier: Modifier) => {
    const isExclusive = exclusiveGroups.includes(modifier.group);

    setSelectedModifiers(prev => {
        const newMap = new Map(prev);
        
        if (isExclusive) { 
            allModifiers 
                .filter(mod => mod.group === modifier.group)
                .forEach(mod => newMap.delete(mod.id));
        }

        if (newMap.has(modifier.id)) newMap.delete(modifier.id);
        else newMap.set(modifier.id, modifier);
        
        return newMap;
    });
  };

  const handleNext = () => {
    if (isStepValid) setStep(s => s + 1);
    else alert(`Por favor, selecciona una opción para ${currentStepInfo.name}.`);
  };
  const handlePrev = () => setStep(s => s - 1);

  if (!isOpen || !group || !currentStepInfo) return null;
  
  const isAddButtonDisabled = !isValid || (currentPrice === 0 && !group.id.includes('licuados'));
  const isBaseGroupExclusive = group.base_group ? exclusiveBaseGroups.includes(group.base_group) : false;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel={`Personalizar: ${group.name}`}
    >
      <div className="modal-header">
        <h2>{group.name}</h2>
        <div className="wizard-steps">
            {steps.map((s, index) => (
                <div key={s.name} className={`step-indicator ${index <= step ? 'active' : ''}`} />
            ))}
        </div>
        <p 
          className="modal-price"
          style={{ backgroundColor: isValid ? '#e6ffe6' : '#ffe6e6', color: isValid ? 'green' : 'red' }}
        >
          {currentRule} &rarr; **${currentPrice.toFixed(2)}**
        </p>
      </div>
      
      {/* Contenido del Asistente */}
      <div className="modal-section">
          <h4>Paso {step + 1}: {currentStepInfo.name} {currentStepInfo.isRequired && !isStepValid && '(Obligatorio)'}</h4>
          <div className="modal-options-grid">
              {modifiersForCurrentStep.map(mod => {
                  const isSelected = selectedModifiers.has(mod.id);
                  
                  // Lógica de deshabilitación (Max 5 ingredientes para Crepas/Postres)
                  const isCrepeOrPostreBase = mod.group === CREPA_DULCE_BASE || mod.group === CREPA_SALADA_BASE;
                  const shouldBeDisabled = isCrepeOrPostreBase && isCrepeLimitReached && !isSelected;

                  const isExclusive = (isBaseGroupExclusive && mod.group === group.base_group) || 
                                        exclusiveGroups.includes(mod.group);

                  return (
                      <button
                          key={mod.id}
                          onClick={() => handleModifierChange(mod)}
                          disabled={shouldBeDisabled}
                          className={`btn-modal-option ${isSelected ? 'selected' : ''}`}
                          style={{
                              opacity: shouldBeDisabled ? 0.6 : 1,
                              cursor: shouldBeDisabled ? 'not-allowed' : 'pointer'
                          }}
                      >
                          {mod.name} 
                          {mod.price > 0 && <span className="price-tag">(+${mod.price.toFixed(2)})</span>}
                      </button>
                  );
              })}
          </div>
      </div>
      
      <div className="modal-footer">
        <button onClick={step === 0 ? onClose : handlePrev} className="btn-secondary">
            {step === 0 ? 'Cancelar' : 'Atrás'}
        </button>

        {isLastStep ? (
            <button 
                onClick={handleAddToTicket} 
                disabled={isAddButtonDisabled}
                className="btn-primary"
            >
                Añadir al Ticket
            </button>
        ) : (
            <button onClick={handleNext} disabled={!isStepValid} className="btn-primary">
                Continuar &rarr;
            </button>
        )}
      </div>
    </Modal>
  );
}