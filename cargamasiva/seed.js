// seed.js
const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json"); 

const groupsData = require('./menu_groups.json');
const itemsData = require('./menu_items.json');
const rulesData = require('./price_rules.json');
const modifiersData = require('./modifiers.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function loadData(collectionName, dataArray) {
  console.log(`\nCargando datos a la colección: ${collectionName}`);
  
  let batch = db.batch();
  let count = 0;
  
  for (const item of dataArray) {
    // Usamos el ID del JSON como el ID del documento
    const docRef = db.collection(collectionName).doc(item.id); 
    
    if (count >= 499) {
      console.log(`Ejecutando lote...`);
      await batch.commit();
      batch = db.batch();
      count = 0;
    }

    const { id, ...data } = item; 
    batch.set(docRef, data); // Guardamos los datos sin el campo 'id' duplicado
    count++;
  }

  if (count > 0) {
    console.log(`Ejecutando lote final...`);
    await batch.commit();
    console.log(`✅ ¡Éxito! ${dataArray.length} documentos cargados en '${collectionName}'.`);
  }
}

async function main() {
  try {
    console.log("Iniciando carga de datos... Asegúrate de borrar las colecciones antiguas en Firebase si es necesario.");
    
    // 1. CARGA DE ESTRUCTURA Y REGLAS
    await loadData('price_rules', rulesData); 
    await loadData('menu_groups', groupsData);
    
    // 2. CARGA DE DATOS TRANSACCIONALES
    await loadData('menu_items', itemsData);
    await loadData('modifiers', modifiersData);
    
    console.log("\n🥳 CARGA DE DATOS INICIAL COMPLETA.");
  } catch (error) {
    console.error("❌ ERROR CRÍTICO DURANTE LA CARGA:", error);
  }
}

main().then(() => process.exit());