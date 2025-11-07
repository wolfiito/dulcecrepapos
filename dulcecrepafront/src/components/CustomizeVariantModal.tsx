// src/components/CustomizeVariantModal.tsx (Reemplazo Completo)

import { useState, useMemo } from 'react';
import Modal from 'react-modal';
import type { VariantPriceItem, Modifier, TicketItem } from '../types/menu'; 

// --- CONSTANTES DE GRUPOS DE MODIFICADORES ---
const BEBIDA_LECHE_GRUPO = "leche_opciones";
const BEBIDA_SABOR_GRUPO = "sabor_te";
const TOPPING_GRUPOS_TODOS = ["bebida_topping_caliente", "bebida_topping_frio", ""];

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
        maxHeight: '80vh',
        overflow: 'auto',
    },
};

Modal.setAppElement('#root');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: VariantPriceItem | null;
  allModifiers: Modifier[];
  onAddItem: (item: TicketItem) => void;
}

const initialVariant = { name: '', price: 0 };

export function CustomizeVariantModal({ isOpen, onClose, item, allModifiers, onAddItem }: Props) {
    if (!item) return null;

    const [selectedVariant, setSelectedVariant] = useState(item.variants[0] || initialVariant);
    const [selectedModifiers, setSelectedModifiers] = useState<Map<string, Modifier>>(new Map());
    
    // --- LÓGICA CONDICIONAL DE MODIFICADORES ---
    const allowedModifierGroups = item.modifierGroups || [];

    const { milkOptions, flavorOptions, toppingOptions } = useMemo(() => { 
        const relevantMods = allModifiers.filter(mod => 
            allowedModifierGroups.includes(mod.group)
        );

        return {
            milkOptions: relevantMods.filter(mod => mod.group === BEBIDA_LECHE_GRUPO),
            flavorOptions: relevantMods.filter(mod => mod.group === BEBIDA_SABOR_GRUPO),
            toppingOptions: relevantMods.filter(mod => TOPPING_GRUPOS_TODOS.includes(mod.group)),
        };
    }, [allModifiers, allowedModifierGroups]);
    
    // --- CÁLCULO DE PRECIO Y DESCRIPCIÓN ---
    const { price: currentPrice, extraCost } = useMemo(() => {
        const variantPrice = selectedVariant.price;
        const extra = Array.from(selectedModifiers.values()).reduce((sum, mod) => sum + mod.price, 0);
        return { price: variantPrice + extra, extraCost: extra };
    }, [selectedVariant, selectedModifiers]);

    // --- VALIDACIÓN ---
    const isMilkRequired = milkOptions.length > 0;
    const isFlavorRequired = flavorOptions.length > 0;
    
    const isMilkSelected = selectedModifiers.size > 0 && Array.from(selectedModifiers.values()).some(mod => mod.group === BEBIDA_LECHE_GRUPO);
    const isFlavorSelected = selectedModifiers.size > 0 && Array.from(selectedModifiers.values()).some(mod => mod.group === BEBIDA_SABOR_GRUPO);

    const isMissingRequiredSelection = 
        (isMilkRequired && !isMilkSelected) ||
        (isFlavorRequired && !isFlavorSelected);

    // --- MANEJO DE SELECCIÓN DE MODIFICADORES ---
    const handleModifierChange = (modifier: Modifier, isExclusive: boolean) => {
        setSelectedModifiers(prev => {
            const newMap = new Map(prev);
            
            if (isExclusive) { 
                // Borra todos los modificadores del mismo grupo (Leche o Sabor de Té)
                allModifiers
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

    // --- ACCIÓN: AÑADIR AL TICKET ---
    const handleAddToTicket = () => {
        if (isMissingRequiredSelection) {
             alert(`Por favor, selecciona las opciones requeridas: ${isMilkRequired && !isMilkSelected ? 'Tipo de Leche' : ''} ${isFlavorRequired && !isFlavorSelected ? 'Sabor' : ''}`);
             return;
        }

        const modsArray = Array.from(selectedModifiers.values());
        const newTicketItem: TicketItem = {
            id: Date.now().toString(),
            baseName: item.name,
            finalPrice: currentPrice,
            type: 'VARIANT',
            details: {
                itemId: item.id,
                variantName: selectedVariant.name,
                selectedModifiers: modsArray,
            }
        };
        onAddItem(newTicketItem);
    };
    
    const handleClose = () => {
        setSelectedVariant(item.variants[0] || initialVariant);
        setSelectedModifiers(new Map());
        onClose();
    };

    const isAddButtonDisabled = currentPrice === 0 || selectedVariant.price === 0 || isMissingRequiredSelection;

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
            onRequestClose={handleClose}
            style={customStyles}
            contentLabel={`Personalizar: ${item.name}`}
        >
            <h2>Personalizar: {item.name}</h2>
            <hr />
            
            {/* 1. SELECCIÓN DE VARIANTE (TAMAÑO) */}
            <h3>1. Tamaño/Sabor</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {item.variants.map(variant => (
                    <button
                        key={variant.name}
                        onClick={() => setSelectedVariant(variant)}
                        style={buttonStyle(selectedVariant.name === variant.name)}
                    >
                        {variant.name} (${variant.price.toFixed(2)})
                    </button>
                ))}
            </div>

            {/* 2. MODIFICADORES CONDICIONALES */}
            <h3>2. Modificadores</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* LECHE (Opciones Condicionales - Botones Exclusivos) */}
                {milkOptions.length > 0 && (
                    <div style={{ border: `1px solid ${isMilkRequired && !isMilkSelected ? 'red' : '#eee'}`, padding: '15px', borderRadius: '4px' }}>
                        <h4>Tipo de Leche (Obligatorio)</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {milkOptions.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => handleModifierChange(mod, true)}
                                    style={buttonStyle(selectedModifiers.has(mod.id))}
                                >
                                    {mod.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* SABOR (Opciones Condicionales - Botones Exclusivos) */}
                {flavorOptions.length > 0 && (
                    <div style={{ border: `1px solid ${isFlavorRequired && !isFlavorSelected ? 'red' : '#eee'}`, padding: '15px', borderRadius: '4px' }}>
                        <h4>Selecciona Sabor (Obligatorio)</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {flavorOptions.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => handleModifierChange(mod, true)}
                                    style={buttonStyle(selectedModifiers.has(mod.id))}
                                >
                                    {mod.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* TOPPINGS (Botones Múltiples) */}
                {toppingOptions.length > 0 && (
                    <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '4px' }}>
                        <h4>Toppings Adicionales</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {toppingOptions.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => handleModifierChange(mod, false)} // false = Multi-select
                                    style={buttonStyle(selectedModifiers.has(mod.id))}
                                >
                                    {mod.name} 
                                    {mod.price > 0 && <span style={{ color: 'red', marginLeft: '5px' }}>(+${mod.price.toFixed(2)})</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {milkOptions.length === 0 && flavorOptions.length === 0 && toppingOptions.length === 0 && (
                    <p>No hay modificadores adicionales para esta bebida.</p>
                )}
            </div>
            
            <hr style={{ marginTop: '20px' }}/>

            {/* PIE Y TOTAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleClose} style={{ padding: '10px 20px', cursor: 'pointer' }}>Cancelar</button>
                <div style={{ fontSize: '1.2em' }}>
                    Base: ${selectedVariant.price.toFixed(2)} + Extras: ${extraCost.toFixed(2)}
                </div>
                <button 
                    onClick={handleAddToTicket} 
                    disabled={isAddButtonDisabled}
                    style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: isAddButtonDisabled ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Añadir al Ticket (${currentPrice.toFixed(2)})
                </button>
            </div>
        </Modal>
    );
}