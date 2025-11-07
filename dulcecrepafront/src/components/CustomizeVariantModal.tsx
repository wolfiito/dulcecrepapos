// src/components/CustomizeVariantModal.tsx (Reemplazo Completo)

import { useState, useMemo, useEffect } from 'react';
import Modal from 'react-modal';
import type { VariantPriceItem, FixedPriceItem, Modifier, TicketItem, MenuItem } from '../types/menu'; 

// --- CONSTANTES DE GRUPOS DE MODIFICADORES ---
const BEBIDA_LECHE_GRUPO = "leche_opciones";
const BEBIDA_SABOR_GRUPO = "sabor_te";
const SABOR_TISANA_GRUPO = "sabor_tisana";
const TOPPING_GRUPOS_TODOS = ["bebida_topping_general", "bublee_topping"];

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
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
  item: VariantPriceItem | FixedPriceItem | null; 
  allModifiers: Modifier[];
  onAddItem: (item: TicketItem) => void;
}

const initialVariant = { name: '', price: 0 };

function isVariantPrice(item: MenuItem): item is VariantPriceItem {
  return 'variants' in item;
}

// Tipo para un paso del asistente
type WizardStep = {
    name: string;
    options: (Modifier | {name: string, price: number})[]; // Puede ser Modifiers o Variants
    isExclusive: boolean;
    isRequired: boolean;
    group: string;
}

export function CustomizeVariantModal({ isOpen, onClose, item, allModifiers, onAddItem }: Props) {
    if (!item) return null;
    
    // --- ESTADOS DEL ASISTENTE ---
    const [step, setStep] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(isVariantPrice(item) ? item.variants[0] : initialVariant);
    const [selectedModifiers, setSelectedModifiers] = useState<Map<string, Modifier>>(new Map());
    
    useEffect(() => {
        if (isOpen && item) {
            setStep(0);
            setSelectedVariant(isVariantPrice(item) ? item.variants[0] : initialVariant);
            setSelectedModifiers(new Map());
        }
    }, [isOpen, item]);

    const allowedModifierGroups = item.modifierGroups || [];

    // Opciones filtradas
    const { milkOptions, flavorOptions, toppingOptions } = useMemo(() => { 
        const relevantMods = allModifiers.filter(mod => 
            allowedModifierGroups.includes(mod.group)
        );
        return {
            milkOptions: relevantMods.filter(mod => mod.group === BEBIDA_LECHE_GRUPO),
            flavorOptions: relevantMods.filter(mod => mod.group === BEBIDA_SABOR_GRUPO || mod.group === SABOR_TISANA_GRUPO),
            toppingOptions: relevantMods.filter(mod => TOPPING_GRUPOS_TODOS.includes(mod.group)),
        };
    }, [allModifiers, allowedModifierGroups]);
    
    const { price: currentPrice, extraCost } = useMemo(() => {
        const variantPrice = isVariantPrice(item) ? selectedVariant.price : item.price;
        const extra = Array.from(selectedModifiers.values()).reduce((sum, mod) => sum + mod.price, 0);
        return { price: variantPrice + extra, extraCost: extra };
    }, [item, selectedVariant, selectedModifiers]);

    // --- Definición de Pasos del Asistente ---
    const steps = useMemo(() => {
        const stepList: WizardStep[] = [];
        
        if (isVariantPrice(item)) {
            stepList.push({ 
                name: 'Tamaño', 
                options: item.variants, 
                isRequired: true, 
                group: 'variants',
                isExclusive: true
            });
        }
        
        if (milkOptions.length > 0) stepList.push({ name: 'Leche', options: milkOptions, isExclusive: true, isRequired: true, group: BEBIDA_LECHE_GRUPO });
        if (flavorOptions.length > 0) stepList.push({ name: 'Sabor', options: flavorOptions, isExclusive: true, isRequired: true, group: (item.id.includes('tisana') ? SABOR_TISANA_GRUPO : BEBIDA_SABOR_GRUPO) });
        if (toppingOptions.length > 0) stepList.push({ name: 'Toppings', options: toppingOptions, isExclusive: false, isRequired: false, group: 'toppings' });
        
        return stepList;
    }, [item, milkOptions, flavorOptions, toppingOptions]);


    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    // --- Validación de Paso Actual ---
    const isStepValid = useMemo(() => {
        if (!currentStep || !currentStep.isRequired) return true;
        if (currentStep.group === 'variants') return selectedVariant.price > 0; // Validar que se seleccionó un tamaño
        return Array.from(selectedModifiers.values()).some(mod => mod.group === currentStep.group);
    }, [currentStep, selectedModifiers, selectedVariant]);


    const handleModifierChange = (modifier: Modifier, isExclusive: boolean) => {
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

    const handleAddToTicket = () => {
        const modsArray = Array.from(selectedModifiers.values());
        const newTicketItem: TicketItem = {
            id: Date.now().toString(),
            baseName: item.name,
            finalPrice: currentPrice,
            type: 'VARIANT',
            details: {
                itemId: item.id,
                variantName: isVariantPrice(item) ? selectedVariant.name : '',
                selectedModifiers: modsArray,
            }
        };
        onAddItem(newTicketItem);
    };
    
    const handleNext = () => {
        if (isStepValid) setStep(s => s + 1);
        else alert(`Por favor, selecciona una opción para ${currentStep.name}.`);
    };
    const handlePrev = () => setStep(s => s - 1);

    const isAddButtonDisabled = !isStepValid;

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            style={customStyles}
            contentLabel={`Personalizar: ${item.name}`}
        >
            <div className="modal-header">
                <h2>Personalizar: {item.name}</h2>
                <div className="wizard-steps">
                    {steps.map((s, index) => (
                        <div key={s.name} className={`step-indicator ${index <= step ? 'active' : ''}`} />
                    ))}
                </div>
            </div>
            
            {currentStep && (
                 <div className="modal-section">
                    <h4>Paso {step + 1}: {currentStep.name} {currentStep.isRequired && !isStepValid && '(Obligatorio)'}</h4>
                    <div className="modal-options-grid">
                        
                        {currentStep.group === 'variants' && (currentStep.options as {name: string, price: number}[]).map(variant => (
                            <button
                                key={variant.name}
                                onClick={() => setSelectedVariant(variant)}
                                className={`btn-modal-option ${selectedVariant.name === variant.name ? 'selected' : ''}`}
                            >
                                {variant.name} (${variant.price.toFixed(2)})
                            </button>
                        ))}
                        
                        {currentStep.group !== 'variants' && (currentStep.options as Modifier[]).map(mod => (
                            <button
                                key={mod.id}
                                onClick={() => handleModifierChange(mod, currentStep.isExclusive)}
                                className={`btn-modal-option ${selectedModifiers.has(mod.id) ? 'selected' : ''}`}
                            >
                                {mod.name} 
                                {mod.price > 0 && <span className="price-tag">(+${mod.price.toFixed(2)})</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="modal-footer">
                <button onClick={step === 0 ? onClose : handlePrev} className="btn-secondary">
                    {step === 0 ? 'Cancelar' : 'Atrás'}
                </button>
                
                <div className="total-display">
                    Total: ${currentPrice.toFixed(2)}
                </div>

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