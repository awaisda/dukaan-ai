/**
 * inventory.js — Dukaan AI
 * -------------------------------------------------------
 * Yahan apne products add / edit karein.
 * Har product mein ye fields hain:
 *   id       — unique number
 *   name     — product ka naam
 *   cat      — category: Grocery | Beverage | Cosmetic | Detergent
 *   stock    — abhi kitni units hain
 *   reorder  — kitni units pe reorder karna chahiye
 *   daily    — average rozana bikti hain kitni
 *   price    — selling price (Rs)
 *   cost     — purchase / cost price (Rs)
 * -------------------------------------------------------
 */

var DEFAULT_INVENTORY = [
  { id:1,  name: "Basmati Rice 5kg",    cat: "Grocery",   stock: 18,  reorder: 30, daily: 6,  price: 650,  cost: 520 },
  { id:2,  name: "Cooking Oil 1L",      cat: "Grocery",   stock: 95,  reorder: 20, daily: 12, price: 480,  cost: 370 },
  { id:3,  name: "Surf Excel 1kg",      cat: "Detergent", stock: 12,  reorder: 25, daily: 5,  price: 320,  cost: 260 },
  { id:4,  name: "Lifebuoy Soap",       cat: "Cosmetic",  stock: 80,  reorder: 40, daily: 8,  price: 90,   cost: 65  },
  { id:5,  name: "Head & Shoulders",    cat: "Cosmetic",  stock: 35,  reorder: 15, daily: 3,  price: 580,  cost: 610 },
  { id:6,  name: "Rooh Afza 800ml",     cat: "Beverage",  stock: 55,  reorder: 20, daily: 7,  price: 420,  cost: 310 },
  { id:7,  name: "Dalda Ghee 1kg",      cat: "Grocery",   stock: 28,  reorder: 25, daily: 4,  price: 900,  cost: 940 },
  { id:8,  name: "Tapal Danedar",       cat: "Beverage",  stock: 110, reorder: 30, daily: 9,  price: 250,  cost: 190 },
  { id:9,  name: "Colgate 120g",        cat: "Cosmetic",  stock: 60,  reorder: 25, daily: 6,  price: 140,  cost: 100 },
  { id:10, name: "Ariel 1kg",           cat: "Detergent", stock: 22,  reorder: 20, daily: 4,  price: 580,  cost: 430 },
];

/** Active inventory — can be replaced by uploaded data */
var INVENTORY = [];

/**
 * Load inventory from localStorage or use defaults
 */
function loadInventory() {
  try {
    var saved = localStorage.getItem('dukaan_inventory');
    if (saved) {
      INVENTORY = JSON.parse(saved);
      console.log('[Dukaan AI] Inventory loaded from localStorage (' + INVENTORY.length + ' products)');
      return;
    }
  } catch (e) {
    console.warn('[Dukaan AI] localStorage read failed:', e);
  }
  INVENTORY = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
}

/**
 * Save current inventory to localStorage
 */
function saveInventory() {
  try {
    localStorage.setItem('dukaan_inventory', JSON.stringify(INVENTORY));
    console.log('[Dukaan AI] Inventory saved (' + INVENTORY.length + ' products)');
  } catch (e) {
    console.warn('[Dukaan AI] localStorage write failed:', e);
  }
}

/**
 * Reset to default inventory
 */
function resetInventory() {
  INVENTORY = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
  saveInventory();
}

/**
 * Check if user is using custom (uploaded) data
 */
function isCustomData() {
  return localStorage.getItem('dukaan_inventory') !== null;
}

/**
 * Helper: is product mein kitne din ka stock bacha hai
 * @param {object} product
 * @returns {number}
 */
function daysLeft(product) {
  return product.daily > 0 ? Math.floor(product.stock / product.daily) : 999;
}

/**
 * Helper: profit / loss margin percentage
 * @param {object} product
 * @returns {number}
 */
function marginPct(product) {
  return Math.round(((product.price - product.cost) / product.cost) * 100);
}

/**
 * Helper: critical / low / ok status
 * @param {object} product
 * @returns {'critical'|'low'|'ok'}
 */
function stockStatus(product) {
  var dl = daysLeft(product);
  if (dl <= 3)  return 'critical';
  if (dl <= 7)  return 'low';
  return 'ok';
}

// Initialize on load
loadInventory();
