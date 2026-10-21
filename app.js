/**
 * Meri Dukaan - Application Logic
 * Mobile-First, Offline-First Stock & Reorder Assistant
 */

import {
  openDB,
  addProduct,
  getAllProducts,
  getProductById,
  restockProduct,
  recordSale,
  undoLastSale,
  correctStock,
  getAllMovements,
  getLowStockProducts,
  getNotMovingProducts,
  calculateTiedUpCapital,\n  getExpiringProducts,
  getSetting,
  setSetting,
  loadDemoData,
  exportDatabaseJSON,
  importDatabaseJSON
} from "./db.js";

// --- STATE MANAGEMENT ---
let currentLang = "hi";
let currentView = "view-stock";
let inactivityDays = 30;
let lastSaleMovement = null;
let undoTimer = null;
let isProcessingSale = false;
let currentStockFilter = "all";
let currentStockSort = "name";

// --- TRANSLATIONS (Hindi / English) ---
const I18N = {
  hi: {
    appTitle: "मेरी दुकान",
    tagline: "कम टैप्स। सही स्टॉक। ज़्यादा मुनाफ़ा।",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन (एरोप्लेन मोड)",
    tabStock: "स्टॉक",
    tabSale: "तुरंत बिक्री",
    tabLowStock: "कम स्टॉक",
    tabNotMoving: "रुका माल",
    tabSettings: "सेटिंग्स",
    addStock: "सामान जोड़ें",
    restock: "माल आया",
    correctStock: "स्टॉक सुधारें",
    saleRecorded: "बिक्री दर्ज हुई",
    undo: "वापस करें",
    undoSuccess: "पिछली बिक्री सफलतापूर्वक वापस कर दी गई",
    restockSuccess: "माल स्टॉक में जोड़ दिया गया",
    correctSuccess: "स्टॉक ठीक कर दिया गया",
    productAdded: "नया सामान सफलतापूर्वक जोड़ा गया",
    demoLoaded: "15 डेमो सामान लोड हो गए!",
    tiedUpIn: "अटका हुआ धन",
    itemsWithoutCost: "सामान बिना खरीद भाव के",
    stoppedSelling: "बिकना रुक गया",
    neverSold: "कभी नहीं बिका",
    currentStock: "वर्तमान स्टॉक",
    minStock: "कम से कम (न्यूनतम)",
    suggestedOrder: "सुझाया गया ऑर्डर",
    daysAgo: "दिन पहले",
    neverSoldLabel: "कभी बिक्री नहीं हुई",
    shareOrderTitle: "ऑर्डर सूची भेजें",
    reorderHeading: "ऑर्डर सूची / Restock Order - मेरी दुकान",
    whatsappSend: "व्हाट्सएप पर भेजें",
    copied: "ऑर्डर सूची कॉपी हो गई!",
    noLowStock: "बहुत बढ़िया! कोई भी सामान कम स्टॉक में नहीं है।",
    noNotMoving: "कोई रुका हुआ माल नहीं है! सब सामान बिक रहा है।",
    noProducts: "अभी कोई सामान नहीं है। नीचे दिए बटन से सामान जोड़ें या डेमो डेटा लोड करें।"
  },
  en: {
    appTitle: "Meri Dukaan",
    tagline: "Kam Taps. Sahi Stock. Zyada Munafa.",
    online: "Online",
    offline: "Offline (Aeroplane Mode)",
    tabStock: "Stock",
    tabSale: "Quick Sale",
    tabLowStock: "Low Stock",
    tabNotMoving: "Not Moving",
    tabSettings: "Settings",
    addStock: "Add Stock",
    restock: "Stock In",
    correctStock: "Correct Stock",
    saleRecorded: "Sale recorded",
    undo: "Undo",
    undoSuccess: "Last sale undone successfully",
    restockSuccess: "Stock added successfully",
    correctSuccess: "Stock corrected successfully",
    productAdded: "New product added successfully",
    demoLoaded: "15 demo products loaded!",
    tiedUpIn: "Tied-up Capital",
    itemsWithoutCost: "items without cost price",
    stoppedSelling: "Stopped selling",
    neverSold: "Never sold",
    currentStock: "Current Stock",
    minStock: "Min Threshold",
    suggestedOrder: "Suggested Order",
    daysAgo: "days ago",
    neverSoldLabel: "Never sold since added",
    shareOrderTitle: "Share Order List",
    reorderHeading: "Reorder List - Meri Dukaan",
    whatsappSend: "Send on WhatsApp",
    copied: "Order list copied!",
    noLowStock: "Great! No products are currently low in stock.",
    noNotMoving: "No dead stock found! All items are active.",
    noProducts: "No products added yet. Tap below to add stock or load demo data."
  }
};

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N["en"] && I18N["en"][key]) || key;
}


// --- HINGLISH & TRANSLITERATED SEARCH DICTIONARY ---
const HINGLISH_MAP = {
  namak: ["नमक", "salt"],
  chini: ["चीनी", "sugar"],
  cheeni: ["चीनी", "sugar"],
  tel: ["तेल", "oil"],
  tail: ["तेल", "oil"],
  sarson: ["सरसों", "mustard"],
  atta: ["आटा", "flour"],
  dal: ["दाल", "pulses", "toor", "chana"],
  daal: ["दाल", "pulses", "toor", "chana"],
  chawal: ["चावल", "rice"],
  biscuit: ["बिस्कुट", "cookie", "parle"],
  biskut: ["बिस्कुट", "cookie", "parle"],
  chai: ["चाय", "tea", "gold"],
  patti: ["पत्ती", "tea"],
  doodh: ["दूध", "milk"],
  makhan: ["मक्खन", "butter", "amul"],
  ghee: ["घी"],
  sabun: ["साबुन", "soap", "dettol"],
  detergent: ["सर्फ", "surf", "वॉश"],
  surf: ["सर्फ", "detergent", "excel"],
  cleaner: ["क्लीनर", "lizol", "floor"],
  masala: ["मसाला", "spices", "garam", "everest"],
  mirch: ["मिर्च", "chilli"],
  haldi: ["हल्दी", "turmeric"],
  dhaniya: ["धनिया", "coriander"],
  maggi: ["मैगी", "noodles"],
  noodle: ["मैगी", "नूडल्स"],
  coil: ["मॉर्टिन", "coil", "कछुआ", "mortein"],
  sharbat: ["शरबत", "rooh", "afza"]
};

function matchesSearchQuery(productName, query) {
  if (!query) return true;
  const lowerName = productName.toLowerCase();
  const lowerQ = query.trim().toLowerCase();

  if (lowerName.includes(lowerQ)) return true;

  const tokens = lowerQ.split(/\s+/);
  return tokens.every((token) => {
    if (lowerName.includes(token)) return true;
    const synonyms = HINGLISH_MAP[token];
    if (synonyms) {
      return synonyms.some((syn) => lowerName.includes(syn.toLowerCase()));
    }
    return false;
  });
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- DOM ELEMENTS ---
const elements = {};

function cacheElements() {
  elements.app = document.getElementById("app");
  elements.txtAppTitle = document.getElementById("txt-app-title");
  elements.txtAppTagline = document.getElementById("txt-app-tagline");
  elements.statusPill = document.getElementById("status-pill");
  elements.statusText = document.getElementById("status-text");
  elements.btnLangToggle = document.getElementById("btn-lang-toggle");
  elements.langLabel = document.getElementById("lang-label");
  elements.btnToggleFrame = document.getElementById("btn-toggle-frame");

  // Navigation
  elements.navTabs = document.querySelectorAll(".nav-tab");
  elements.viewSections = document.querySelectorAll(".view-section");

  // View: Stock
  elements.searchStock = document.getElementById("search-stock");
  elements.listAllStock = document.getElementById("list-all-stock");
  elements.emptyAllStock = document.getElementById("empty-all-stock");
  elements.btnFabAdd = document.getElementById("btn-fab-add") || document.getElementById("fab-add-product");
  elements.badgeLowStock = document.getElementById("badge-low-stock");

  // View: Quick Sale
  elements.searchSale = document.getElementById("search-sale");
  elements.listQuickSale = document.getElementById("list-quick-sale");
  elements.emptyQuickSale = document.getElementById("empty-quick-sale");

  // View: Low Stock
  elements.listLowStock = document.getElementById("list-low-stock");
  elements.emptyLowStock = document.getElementById("empty-low-stock");
  elements.btnShareOrder = document.getElementById("btn-share-order") || document.getElementById("btn-share-order-top");

  // View: Not Moving
  elements.listNotMoving = document.getElementById("list-not-moving");
  elements.emptyNotMoving = document.getElementById("empty-not-moving");
  elements.bannerTiedUp = document.getElementById("banner-tied-up") || document.getElementById("capital-summary-card");
  elements.txtTiedUpMoney = document.getElementById("txt-tied-up-money") || document.getElementById("txt-capital-amount");
  elements.txtTiedUpDetail = document.getElementById("txt-tied-up-detail") || document.getElementById("txt-capital-sub");

  // View: Settings
  elements.btnLoadDemo = document.getElementById("btn-load-demo");
  elements.selectInactivityDays = document.getElementById("select-inactivity-days");
  elements.listRecentActivity = document.getElementById("list-recent-activity");
  elements.btnExportBackup = document.getElementById("btn-export-backup");
  elements.btnImportTrigger = document.getElementById("btn-import-trigger");
  elements.fileImportBackup = document.getElementById("file-import-backup");

  // Modals
  elements.modalAddProduct = document.getElementById("modal-add-product");
  elements.formAddProduct = document.getElementById("form-add-product");
  elements.inpAddName = document.getElementById("inp-add-name");
  elements.inpAddQty = document.getElementById("inp-add-qty");
  elements.inpAddUnit = document.getElementById("inp-add-unit");
  elements.inpAddMin = document.getElementById("inp-add-min");
  elements.inpAddCost = document.getElementById("inp-add-cost");\n  elements.inpAddExpiry = document.getElementById("inp-add-expiry");
  elements.unitPillsAdd = document.querySelectorAll("#unit-pills-add .pill");

  elements.modalRestock = document.getElementById("modal-restock");
  elements.formRestock = document.getElementById("form-restock");
  elements.restockProdId = document.getElementById("restock-prod-id");
  elements.restockProdName = document.getElementById("restock-prod-name");
  elements.restockCurrentQty = document.getElementById("restock-current-qty");
  elements.inpRestockQty = document.getElementById("inp-restock-qty");

  elements.modalCorrect = document.getElementById("modal-correct");
  elements.formCorrect = document.getElementById("form-correct");
  elements.correctProdId = document.getElementById("correct-prod-id");
  elements.correctProdName = document.getElementById("correct-prod-name");
  elements.correctCurrentQty = document.getElementById("correct-current-qty");
  elements.inpCorrectQty = document.getElementById("inp-correct-qty") || document.getElementById("inp-correct-actual-qty");
  elements.selectCorrectReason = document.getElementById("select-correct-reason");

  elements.modalShare = document.getElementById("modal-share");
  elements.txtShareOrderContent = document.getElementById("txt-share-order-content");
  elements.btnCopyOrder = document.getElementById("btn-copy-order") || document.getElementById("btn-copy-order-text");
  elements.btnSendWhatsapp = document.getElementById("btn-send-whatsapp");

  // Snackbars & Toasts
  elements.undoSnackbar = document.getElementById("undo-snackbar") || document.getElementById("undo-toast");
  elements.txtUndoMsg = document.getElementById("txt-undo-msg") || document.getElementById("undo-toast-text");
  elements.btnUndoAction = document.getElementById("btn-undo-action") || document.getElementById("btn-toast-undo");
  elements.toast = document.getElementById("toast");
}

// --- INITIALIZATION ---
async function init() {
  cacheElements();
  await openDB();

  // Load persistent settings
  inactivityDays = await getSetting("inactivityDays", 30);
  currentLang = await getSetting("language", "hi");

  if (elements.selectInactivityDays) {
    elements.selectInactivityDays.value = String(inactivityDays);
  }

  updateLanguageUI();
  setupEventListeners();
  setupKeyboardShortcuts();
  setupNetworkMonitoring();
  registerServiceWorker();
  setupPWAInstallPrompt();

  await refreshAllViews();
}

// --- VIEW NAVIGATION ---
function switchView(targetViewId) {
  currentView = targetViewId;
  elements.viewSections.forEach((s) => {
    s.classList.toggle("active", s.id === targetViewId);
  });
  elements.navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === targetViewId);
  });

  refreshAllViews();
}

// --- REFRESH VIEWS ---
async function refreshAllViews() {
  const products = await getAllProducts();
  renderStockList(products);
  renderQuickSaleList(products);
  await renderLowStockView();
  await renderNotMovingView();
  await renderRecentActivity();
}

// --- RENDER ALL STOCK VIEW ---
function renderStockList(products) {
  if (!elements.listAllStock) return;

  const query = (elements.searchStock ? elements.searchStock.value : "").trim();
  let filtered = products.filter((p) => matchesSearchQuery(p.name, query));

  // Apply category pill filter
  if (currentStockFilter === "low") {
    filtered = filtered.filter((p) => p.quantity <= p.minimumStock);
  } else if (currentStockFilter === "available") {
    filtered = filtered.filter((p) => p.quantity > p.minimumStock);
  } else if (currentStockFilter === "out") {
    filtered = filtered.filter((p) => p.quantity <= 0);
  } else if (currentStockFilter === "expiry") {
    const nowMs = new Date().setHours(0,0,0,0);
    const limitMs = nowMs + 30 * 86400000;
    filtered = filtered.filter((p) => {
      if (!p.expiryDate) return false;
      const expMs = new Date(p.expiryDate).getTime();
      return expMs <= limitMs;
    });
  }

  // Apply sorting
  if (currentStockSort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name, "hi"));
  } else if (currentStockSort === "low-first") {
    filtered.sort((a, b) => a.quantity - b.quantity);
  } else if (currentStockSort === "high-first") {
    filtered.sort((a, b) => b.quantity - a.quantity);
  } else if (currentStockSort === "recent") {
    filtered.sort((a, b) => {
      const timeA = a.lastSaleAt ? new Date(a.lastSaleAt).getTime() : 0;
      const timeB = b.lastSaleAt ? new Date(b.lastSaleAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  const countEl = document.getElementById("count-all-stock");
  if (countEl) countEl.textContent = filtered.length + " सामान";

  if (filtered.length === 0) {
    elements.listAllStock.innerHTML = "";
    if (elements.emptyAllStock) elements.emptyAllStock.style.display = "block";
    return;
  }
  if (elements.emptyAllStock) elements.emptyAllStock.style.display = "none";

  elements.listAllStock.innerHTML = filtered
    .map((prod) => {
      const isLow = prod.quantity <= prod.minimumStock;
      let badgeHtml = isLow
        ? `<span class="badge badge-danger">कम स्टॉक / Low Stock</span>`
        : `<span class="badge badge-success">उपलब्ध / In Stock</span>`;

      // Check Expiry status
      let expiryLabel = "";
      if (prod.expiryDate) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const expDate = new Date(prod.expiryDate);
        expDate.setHours(0,0,0,0);
        const diffDays = Math.round((expDate - today) / 86400000);

        if (diffDays < 0) {
          badgeHtml = `<span class="badge badge-danger">⚠️ एक्सपायर हो चुका!</span>`;
          expiryLabel = `<span class="cost-label text-danger font-bold">एक्सपायरी: ${expDate.toLocaleDateString("hi-IN")} (${Math.abs(diffDays)} दिन पहले)</span>`;
        } else if (diffDays <= 30) {
          badgeHtml = `<span class="badge badge-warning">⏳ ${diffDays} दिन में एक्सपायर</span>`;
          expiryLabel = `<span class="cost-label text-warning font-bold">एक्सपायरी: ${expDate.toLocaleDateString("hi-IN")}</span>`;
        } else {
          expiryLabel = `<span class="cost-label">एक्सपायरी: ${expDate.toLocaleDateString("hi-IN")}</span>`;
        }
      }

      return `
        <div class="product-card ${isLow ? "is-low" : ""}" data-id="${prod.id}">
          <div class="card-header-row">
            <h4 class="prod-title">${escapeHTML(prod.name)}</h4>
            ${badgeHtml}
          </div>
          <div class="card-meta-row">
            <div class="qty-display">
              <span class="qty-num ${isLow ? "text-danger" : ""}">${prod.quantity}</span>
              <span class="qty-unit">${escapeHTML(prod.unit)}</span>
            </div>
            <div class="threshold-display">
              <span class="meta-label">न्यूनतम: ${prod.minimumStock} ${escapeHTML(prod.unit)}</span>
              ${prod.costPrice ? `<span class="cost-label">खरीद: ₹${prod.costPrice}</span>` : ""}
              ${expiryLabel}
            </div>
          </div>
          <div class="card-actions-row">
            <button class="btn btn-outline btn-sm btn-action-restock" data-id="${prod.id}">
              + माल आया (Restock)
            </button>
            <button class="btn btn-ghost btn-sm btn-action-correct" data-id="${prod.id}">
              ✏️ सुधार (Correct)
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach card action listeners
  elements.listAllStock.querySelectorAll(".btn-action-restock").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const prod = await getProductById(btn.dataset.id);
      if (prod) openRestockModal(prod);
    });
  });

  elements.listAllStock.querySelectorAll(".btn-action-correct").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const prod = await getProductById(btn.dataset.id);
      if (prod) openCorrectModal(prod);
    });
  });
}

// --- RENDER QUICK SALE VIEW (2-TAP SALES) ---
function renderQuickSaleList(products) {
  if (!elements.listQuickSale) return;

  const query = (elements.searchSale ? elements.searchSale.value : "").trim().toLowerCase();
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query));

  if (filtered.length === 0) {
    elements.listQuickSale.innerHTML = "";
    if (elements.emptyQuickSale) elements.emptyQuickSale.style.display = "block";
    return;
  }
  if (elements.emptyQuickSale) elements.emptyQuickSale.style.display = "none";

  elements.listQuickSale.innerHTML = filtered
    .map((prod) => {
      const isLow = prod.quantity <= prod.minimumStock;
      const isOut = prod.quantity <= 0;

      return `
        <div class="sale-card ${isLow ? "low-border" : ""}" data-id="${prod.id}">
          <div class="sale-card-info">
            <h4 class="sale-card-title">${escapeHTML(prod.name)}</h4>
            <div class="sale-card-stock">
              स्टॉक: <strong class="${isLow ? "text-danger" : ""}">${prod.quantity} ${escapeHTML(prod.unit)}</strong>
            </div>
          </div>
          <div class="sale-card-actions">
            <button class="btn btn-primary btn-sale-tap" data-id="${prod.id}" ${isOut ? "disabled" : ""}>
              <span class="sale-tap-icon">⚡</span>
              <span>1 ${escapeHTML(prod.unit)} बेचें</span>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  elements.listQuickSale.querySelectorAll(".btn-sale-tap").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (isProcessingSale) return;
      await handleQuickSale(btn.dataset.id, 1, btn);
    });
  });
}


// --- OFFLINE WEB AUDIO FEEDBACK (Synthesized Chimes) ---
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSaleChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.08); // A5
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (e) {}
}

function playUndoChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(440, now + 0.1); // A4
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

// --- PWA INSTALL PROMPT MANAGEMENT ---
let deferredInstallPrompt = null;
function setupPWAInstallPrompt() {
  const banner = document.getElementById("pwa-install-banner");
  const btnInstall = document.getElementById("btn-pwa-install");
  const btnDismiss = document.getElementById("btn-pwa-dismiss");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (banner) banner.style.display = "flex";
  });

  if (btnInstall) {
    btnInstall.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === "accepted") {
        console.log("[PWA] User accepted install");
      }
      deferredInstallPrompt = null;
      if (banner) banner.style.display = "none";
    });
  }

  if (btnDismiss && banner) {
    btnDismiss.addEventListener("click", () => {
      banner.style.display = "none";
    });
  }
}

// --- RAPID SALE HANDLER (P0: 2-TAP SALE & ATOMIC TRANSACTION) ---
async function handleQuickSale(productId, qtyToSell, buttonEl) {
  if (isProcessingSale) return;
  isProcessingSale = true;
  if (buttonEl) buttonEl.disabled = true;

  try {
    const opId = "sale_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const result = await recordSale(productId, qtyToSell, opId);
    lastSaleMovement = result.movement;

    // Haptic feedback if supported
    if (navigator.vibrate) navigator.vibrate(40);
    playSaleChime();

    // Show undo snackbar
    showUndoSnackbar(result.product, result.movement);

    // Refresh UI
    await refreshAllViews();
  } catch (err) {
    showToast("त्रुटि: " + err.message);
  } finally {
    isProcessingSale = false;
    if (buttonEl) buttonEl.disabled = false;
  }
}

// --- RENDER LOW STOCK VIEW (P0) ---
async function renderLowStockView() {
  if (!elements.listLowStock) return;

  const lowProducts = await getLowStockProducts();

  // Update badge on tabs
  if (elements.badgeLowStock) {
    elements.badgeLowStock.textContent = String(lowProducts.length);
    elements.badgeLowStock.style.display = lowProducts.length > 0 ? "inline-block" : "none";
  }

  if (lowProducts.length === 0) {
    elements.listLowStock.innerHTML = "";
    if (elements.emptyLowStock) elements.emptyLowStock.style.display = "block";
    if (elements.btnShareOrder) elements.btnShareOrder.style.display = "none";
    return;
  }

  if (elements.emptyLowStock) elements.emptyLowStock.style.display = "none";
  if (elements.btnShareOrder) elements.btnShareOrder.style.display = "flex";

  elements.listLowStock.innerHTML = lowProducts
    .map((prod) => {
      const suggested = Math.max(1, Math.ceil(2 * prod.minimumStock - prod.quantity));

      return `
        <div class="product-card is-low" data-id="${prod.id}">
          <div class="card-header-row">
            <h4 class="prod-title">${escapeHTML(prod.name)}</h4>
            <span class="badge badge-danger">ऑर्डर चाहिए / Reorder</span>
          </div>
          <div class="card-meta-row">
            <div class="qty-display">
              <span class="qty-num text-danger">${prod.quantity}</span>
              <span class="qty-unit">${escapeHTML(prod.unit)}</span>
            </div>
            <div class="threshold-display">
              <span class="meta-label">न्यूनतम सीमा: ${prod.minimumStock} ${escapeHTML(prod.unit)}</span>
              <span class="suggest-label">सुझाया गया ऑर्डर: <strong>+${suggested} ${escapeHTML(prod.unit)}</strong></span>
            </div>
          </div>
          <div class="card-actions-row">
            <button class="btn btn-primary btn-sm btn-low-restock" data-id="${prod.id}">
              ⚡ माल आया (+ दर्ज करें)
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  elements.listLowStock.querySelectorAll(".btn-low-restock").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prod = await getProductById(btn.dataset.id);
      if (prod) openRestockModal(prod);
    });
  });
}

// --- RENDER NOT MOVING VIEW (P0 & P1) ---
async function renderNotMovingView() {
  if (!elements.listNotMoving) return;

  const notMoving = await getNotMovingProducts(inactivityDays);

  if (notMoving.length === 0) {
    elements.listNotMoving.innerHTML = "";
    if (elements.emptyNotMoving) elements.emptyNotMoving.style.display = "block";
    if (elements.bannerTiedUp) elements.bannerTiedUp.style.display = "none";
    return;
  }

  if (elements.emptyNotMoving) elements.emptyNotMoving.style.display = "none";

  // Calculate capital locked up (P1)
  const capital = calculateTiedUpCapital(notMoving);
  if (elements.bannerTiedUp) {
    elements.bannerTiedUp.style.display = "block";
    if (elements.txtTiedUpMoney) {
      elements.txtTiedUpMoney.textContent = "₹" + capital.totalRupees.toLocaleString("en-IN");
    }
    if (elements.txtTiedUpDetail) {
      elements.txtTiedUpDetail.textContent =
        notMoving.length + " सामान " + inactivityDays + " दिनों से नहीं बिके" +
        (capital.itemsWithoutCost > 0 ? " (" + capital.itemsWithoutCost + " बिना खरीद भाव के)" : "");
    }
  }

  elements.listNotMoving.innerHTML = notMoving
    .map((prod) => {
      const isNeverSold = prod.statusType === "never_sold";
      const statusBadge = isNeverSold
        ? `<span class="badge badge-warning">कभी नहीं बिका / Never Sold</span>`
        : `<span class="badge badge-muted">${prod.daysSinceSale} दिनों से नहीं बिका</span>`;

      const tiedUpSingle = prod.costPrice && prod.costPrice > 0 ? prod.quantity * prod.costPrice : null;

      return `
        <div class="product-card" data-id="${prod.id}">
          <div class="card-header-row">
            <h4 class="prod-title">${escapeHTML(prod.name)}</h4>
            ${statusBadge}
          </div>
          <div class="card-meta-row">
            <div class="qty-display">
              <span class="qty-num">${prod.quantity}</span>
              <span class="qty-unit">${escapeHTML(prod.unit)}</span>
            </div>
            <div class="threshold-display">
              <span class="meta-label">
                ${isNeverSold ? "दुकान में आया: " + (prod.daysSinceCreated || 30) + " दिन पहले" : "आखिरी बिक्री: " + new Date(prod.lastSaleAt).toLocaleDateString("hi-IN")}
              </span>
              ${tiedUpSingle ? `<span class="cost-label text-accent font-bold">अटका धन: ₹${Math.round(tiedUpSingle)}</span>` : `<span class="cost-label text-muted">खरीद भाव दर्ज नहीं</span>`}
            </div>
          </div>
          <div class="card-actions-row">
            <button class="btn btn-outline btn-sm btn-not-moving-sale" data-id="${prod.id}">
              ⚡ 1 ${escapeHTML(prod.unit)} बेचें
            </button>
            <button class="btn btn-ghost btn-sm btn-not-moving-correct" data-id="${prod.id}">
              ✏️ सुधारें
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  elements.listNotMoving.querySelectorAll(".btn-not-moving-sale").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await handleQuickSale(btn.dataset.id, 1, btn);
    });
  });

  elements.listNotMoving.querySelectorAll(".btn-not-moving-correct").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prod = await getProductById(btn.dataset.id);
      if (prod) openCorrectModal(prod);
    });
  });
}

// --- RENDER RECENT ACTIVITY LEDGER (UNDO HISTORY) ---
async function renderRecentActivity() {
  if (!elements.listRecentActivity) return;

  const movements = await getAllMovements();
  const products = await getAllProducts();
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const sorted = movements
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 15);

  if (sorted.length === 0) {
    elements.listRecentActivity.innerHTML = `<div class="text-muted p-2 text-center">कोई गतिविधि दर्ज नहीं है।</div>`;
    return;
  }

  elements.listRecentActivity.innerHTML = sorted
    .map((m) => {
      const prod = prodMap.get(m.productId) || { name: "हटाया गया सामान", unit: "" };
      const isSale = m.type === "sale";
      const isRestock = m.type === "restock";
      const isUndone = m.undone;

      let typeBadge = "";
      if (isSale) {
        typeBadge = `<span class="badge badge-primary">बिक्री / Sale</span>`;
      } else if (isRestock) {
        typeBadge = `<span class="badge badge-success">माल आया / Restock</span>`;
      } else {
        typeBadge = `<span class="badge badge-warning">सुधार / Adjust</span>`;
      }

      return `
        <div class="activity-item ${isUndone ? "is-undone" : ""}">
          <div class="activity-left">
            <div>
              <strong>${escapeHTML(prod.name)}</strong>
              ${typeBadge}
              ${isUndone ? `<span class="badge badge-muted">वापस लिया (Undone)</span>` : ""}
            </div>
            <div class="activity-time">
              ${new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • 
              ${m.quantity > 0 ? "+" : ""}${m.quantity} ${escapeHTML(prod.unit)}
            </div>
          </div>
          <div>
            ${isSale && !isUndone ? `<button class="btn btn-outline btn-xs btn-undo-specific" data-id="${m.id}">वापस लें</button>` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  elements.listRecentActivity.querySelectorAll(".btn-undo-specific").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await undoLastSale(btn.dataset.id);
        showToast(t("undoSuccess"));
        await refreshAllViews();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

// --- UNDO SNACKBAR & ACTION ---
function showUndoSnackbar(product, movement) {
  if (!elements.undoSnackbar) return;

  if (undoTimer) clearTimeout(undoTimer);

  if (elements.txtUndoMsg) {
    elements.txtUndoMsg.textContent = `${product.name} की 1 ${product.unit} बिक्री दर्ज हुई!`;
  }
  elements.undoSnackbar.classList.add("active");
  elements.undoSnackbar.classList.add("show");

  undoTimer = setTimeout(() => {
    elements.undoSnackbar.classList.remove("active");
    elements.undoSnackbar.classList.remove("show");
  }, 9000);
}

// --- MODAL HANDLERS ---
function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.remove("active"));
}

function openAddModal() {
  closeAllModals();
  if (elements.formAddProduct) elements.formAddProduct.reset();
  // Select default unit (pkt)
  elements.unitPillsAdd.forEach((p) => p.classList.remove("active"));
  const defaultPill = document.querySelector("#unit-pills-add [data-unit=pkt]");
  if (defaultPill) defaultPill.classList.add("active");
  if (elements.inpAddUnit) elements.inpAddUnit.value = "pkt";

  elements.modalAddProduct.classList.add("active");
  setTimeout(() => {
    if (elements.inpAddName) elements.inpAddName.focus();
  }, 100);
}

function openRestockModal(product) {
  closeAllModals();
  elements.restockProdId.value = product.id;
  elements.restockProdName.textContent = product.name;
  elements.restockCurrentQty.textContent = product.quantity + " " + product.unit;
  elements.inpRestockQty.value = "5";
  elements.modalRestock.classList.add("active");
  setTimeout(() => {
    if (elements.inpRestockQty) elements.inpRestockQty.focus();
  }, 100);
}

function openCorrectModal(product) {
  closeAllModals();
  elements.correctProdId.value = product.id;
  elements.correctProdName.textContent = product.name;
  elements.correctCurrentQty.textContent = product.quantity + " " + product.unit;
  elements.inpCorrectQty.value = String(product.quantity);
  elements.modalCorrect.classList.add("active");
  setTimeout(() => {
    if (elements.inpCorrectQty) elements.inpCorrectQty.focus();
  }, 100);
}

// --- REORDER LIST GENERATOR (WHATSAPP SHARE) ---
async function generateShareOrderList() {
  const lowProducts = await getLowStockProducts();
  if (lowProducts.length === 0) {
    showToast(t("noLowStock"));
    return;
  }

  let text = "📦 *" + t("reorderHeading") + "*\n";
  text += "तारीख: " + new Date().toLocaleDateString("hi-IN") + "\n";
  text += "दुकान के लिए आवश्यक सामान की सूची:\n\n";

  lowProducts.forEach((p, idx) => {
    const suggested = Math.max(1, Math.ceil(2 * p.minimumStock - p.quantity));
    text += (idx + 1) + ". *" + p.name + "*\n";
    text += "   - वर्तमान स्टॉक: " + p.quantity + " " + p.unit + "\n";
    text += "   - सुझाया गया नया ऑर्डर: *" + suggested + " " + p.unit + "*\n\n";
  });

  text += "_Meri Dukaan ऐप द्वारा सुझाई गई ऑर्डर सूची_";

  elements.txtShareOrderContent.value = text;

  // Load saved distributor phone
  const inpPhone = document.getElementById("inp-distributor-phone");
  if (inpPhone) {
    const savedPhone = await getSetting("distributorPhone", "");
    inpPhone.value = savedPhone;
  }

  // Check Web Share API support
  const btnNative = document.getElementById("btn-native-share");
  if (btnNative) {
    btnNative.style.display = navigator.share ? "block" : "none";
  }

  elements.modalShare.classList.add("active");\n  elements.modalShare.classList.add("open");\n  elements.modalShare.style.display = "flex";
}

async function shareViaWhatsApp() {
  const text = elements.txtShareOrderContent.value;
  const encoded = encodeURIComponent(text);
  const inpPhone = document.getElementById("inp-distributor-phone");
  const phone = inpPhone ? inpPhone.value.replace(/\D/g, "") : "";

  if (phone) {
    await setSetting("distributorPhone", inpPhone.value.trim());
    const fullPhone = phone.length === 10 ? "91" + phone : phone;
    window.open("https://api.whatsapp.com/send?phone=" + fullPhone + "&text=" + encoded, "_blank");
  } else {
    window.open("https://api.whatsapp.com/send?text=" + encoded, "_blank");
  }
}

async function shareViaNative() {
  const text = elements.txtShareOrderContent.value;
  if (navigator.share) {
    try {
      await navigator.share({
        title: "मेरी दुकान - ऑर्डर सूची",
        text: text
      });
      showToast("ऑर्डर सूची शेयर हो गई!");
    } catch (err) {
      if (err.name !== "AbortError") {
        fallbackCopy(text);
      }
    }
  } else {
    copyOrderText();
  }
}

function copyOrderText() {
  const text = elements.txtShareOrderContent.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(t("copied"));
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  elements.txtShareOrderContent.select();
  document.execCommand("copy");
  showToast(t("copied"));
}

// --- BACKUP RESTORE HANDLER ---
function handleImportBackupFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      await importDatabaseJSON(event.target.result);
      showToast("बैकअप सफलतापूर्वक लोड हो गया! / Backup restored successfully");
      await refreshAllViews();
    } catch (err) {
      alert("बैकअप लोड करने में त्रुटि: " + err.message);
    }
  };
  reader.readAsText(file);
}

// --- TOAST NOTIFICATIONS ---
function showToast(msg) {
  if (!elements.toast) return;
  elements.toast.textContent = msg;
  elements.toast.classList.add("active");
  setTimeout(() => {
    elements.toast.classList.remove("active");
  }, 3000);
}

// --- SETUP EVENT LISTENERS ---

// --- KEYBOARD SHORTCUTS FOR DESKTOP / COUNTER USE ---
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // If typing in an input or textarea, only handle Escape
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
    const isInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

    if (e.key === "Escape") {
      closeAllModals();
      return;
    }

    if (isInput) return;

    // Hotkeys outside input
    if (e.key === "1") {
      switchView("view-stock");
    } else if (e.key === "2") {
      switchView("view-quick-sale");
    } else if (e.key === "3") {
      switchView("view-low-stock");
    } else if (e.key === "4") {
      switchView("view-not-moving");
    } else if (e.key === "5") {
      switchView("view-settings");
    } else if (e.key === "+" || e.key.toLowerCase() === "a") {
      e.preventDefault();
      openAddModal();
    } else if (e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      const currentSearch = currentView === "view-quick-sale" ? elements.searchSale : elements.searchStock;
      if (currentSearch) {
        currentSearch.focus();
        currentSearch.select();
      }
    } else if (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "u") {
      if (lastSaleMovement && !lastSaleMovement.undone) {
        undoLastSale(lastSaleMovement.id).then(() => {
          playUndoChime();
          showToast(t("undoSuccess"));
          refreshAllViews();
        }).catch((err) => showToast(err.message));
      }
    }
  });
}

function setupEventListeners() {
  // Navigation tabs
  elements.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchView(tab.dataset.view);
    });
  });

  // Stock filter pills
  document.querySelectorAll("#stock-filter-pills .filter-pill").forEach((pill) => {
    pill.addEventListener("click", async () => {
      document.querySelectorAll("#stock-filter-pills .filter-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentStockFilter = pill.dataset.filter;
      const products = await getAllProducts();
      renderStockList(products);
    });
  });

  // Stock sort select
  const selectSort = document.getElementById("select-stock-sort");
  if (selectSort) {
    selectSort.addEventListener("change", async (e) => {
      currentStockSort = e.target.value;
      const products = await getAllProducts();
      renderStockList(products);
    });
  }

  // Quick expiry pills (+1 month, +3 months, etc.)
  document.querySelectorAll(".pill-expiry-quick").forEach((pill) => {
    pill.addEventListener("click", () => {
      const addMonths = parseInt(pill.dataset.addMonths, 10);
      const d = new Date();
      d.setMonth(d.getMonth() + addMonths);
      if (elements.inpAddExpiry) {
        elements.inpAddExpiry.value = d.toISOString().split("T")[0];
      }
    });
  });

  const btnClearExpiry = document.getElementById("btn-clear-expiry");
  if (btnClearExpiry && elements.inpAddExpiry) {
    btnClearExpiry.addEventListener("click", () => {
      elements.inpAddExpiry.value = "";
    });
  }

  // Search filters
  if (elements.searchStock) {
    elements.searchStock.addEventListener("input", async () => {
      const products = await getAllProducts();
      renderStockList(products);
    });
  }
  if (elements.searchSale) {
    elements.searchSale.addEventListener("input", async () => {
      const products = await getAllProducts();
      renderQuickSaleList(products);
    });
  }

  // Add product FAB
  if (elements.btnFabAdd) {
    elements.btnFabAdd.addEventListener("click", openAddModal);
  }

  // Quick starter chips in Add Product modal
  document.querySelectorAll(".starter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (elements.inpAddName) elements.inpAddName.value = chip.dataset.name;
      if (elements.inpAddMin) elements.inpAddMin.value = chip.dataset.min;
      if (elements.inpAddCost) elements.inpAddCost.value = chip.dataset.cost;
      if (elements.inpAddQty && !elements.inpAddQty.value) elements.inpAddQty.value = "10";
      
      const targetUnit = chip.dataset.unit;
      if (elements.inpAddUnit) elements.inpAddUnit.value = targetUnit;
      elements.unitPillsAdd.forEach((p) => {
        p.classList.toggle("active", p.dataset.unit === targetUnit);
      });
      if (elements.inpAddQty) elements.inpAddQty.focus();
    });
  });


  // Unit pills in Add modal
  elements.unitPillsAdd.forEach((pill) => {
    pill.addEventListener("click", () => {
      elements.unitPillsAdd.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      if (elements.inpAddUnit) elements.inpAddUnit.value = pill.dataset.unit;
    });
  });

  // Add Product Form submit
  if (elements.formAddProduct) {
    elements.formAddProduct.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = elements.inpAddName.value.trim();
      const qty = parseFloat(elements.inpAddQty.value);
      const unit = elements.inpAddUnit.value || "pkt";
      const minStock = parseFloat(elements.inpAddMin.value);
      const costPrice = elements.inpAddCost.value ? parseFloat(elements.inpAddCost.value) : null;

      if (!name || isNaN(qty) || isNaN(minStock)) {
        showToast("कृपया सभी आवश्यक फ़ील्ड भरें");
        return;
      }

      const expiryDate = elements.inpAddExpiry && elements.inpAddExpiry.value ? elements.inpAddExpiry.value : null;

      await addProduct({
        name,
        quantity: qty,
        unit,
        minimumStock: minStock,
        costPrice,
        expiryDate
      });

      closeAllModals();
      showToast(t("productAdded"));
      await refreshAllViews();
    });
  }

  // Restock Form submit
  if (elements.formRestock) {
    elements.formRestock.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = elements.restockProdId.value;
      const qty = parseFloat(elements.inpRestockQty.value);
      if (!id || isNaN(qty) || qty <= 0) return;

      await restockProduct(id, qty);
      closeAllModals();
      showToast(t("restockSuccess"));
      await refreshAllViews();
    });
  }

  // Quick preset buttons for restock (+5, +10, +25)
  document.querySelectorAll(".pill-restock-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (elements.inpRestockQty) elements.inpRestockQty.value = btn.dataset.add;
    });
  });

  // Correct Stock Form submit
  if (elements.formCorrect) {
    elements.formCorrect.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = elements.correctProdId.value;
      const actualQty = parseFloat(elements.inpCorrectQty.value);
      const reason = elements.selectCorrectReason ? elements.selectCorrectReason.value : "Recount";
      if (!id || isNaN(actualQty)) return;

      await correctStock(id, actualQty, reason);
      closeAllModals();
      showToast(t("correctSuccess"));
      await refreshAllViews();
    });
  }

  // Undo button in snackbar
  if (elements.btnUndoAction) {
    elements.btnUndoAction.addEventListener("click", async () => {
      try {
        await undoLastSale(lastSaleMovement ? lastSaleMovement.id : null);
        playUndoChime();
        if (elements.undoSnackbar) elements.undoSnackbar.classList.remove("active");
        showToast(t("undoSuccess"));
        await refreshAllViews();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  // Share Order button in Low Stock view
  if (elements.btnShareOrder) {
    elements.btnShareOrder.addEventListener("click", generateShareOrderList);
  }
  if (elements.btnSendWhatsapp) {
    elements.btnSendWhatsapp.addEventListener("click", shareViaWhatsApp);
  }
    if (elements.btnCopyOrder) {
    elements.btnCopyOrder.addEventListener("click", copyOrderText);
  }
  const btnCopyAlt = document.getElementById("btn-copy-order-text");
  if (btnCopyAlt) {
    btnCopyAlt.addEventListener("click", copyOrderText);
  }
  const btnNative = document.getElementById("btn-native-share");
  if (btnNative) {
    btnNative.addEventListener("click", shareViaNative);
  }

  // Demo Data loader button
  if (elements.btnLoadDemo) {
    elements.btnLoadDemo.addEventListener("click", async () => {
      await loadDemoData();
      showToast(t("demoLoaded"));
      await refreshAllViews();
    });
  }

  // Inactivity days select
  if (elements.selectInactivityDays) {
    elements.selectInactivityDays.addEventListener("change", async (e) => {
      inactivityDays = parseInt(e.target.value, 10);
      await setSetting("inactivityDays", inactivityDays);
      await renderNotMovingView();
    });
  }

  // Export JSON backup button
  if (elements.btnExportBackup) {
    elements.btnExportBackup.addEventListener("click", async () => {
      await exportDatabaseJSON();
      showToast("बैकअप फ़ाइल डाउनलोड हो गई!");
    });
  }

  // Import JSON backup button & file picker
  if (elements.btnImportTrigger) {
    elements.btnImportTrigger.addEventListener("click", () => {
      if (elements.fileImportBackup) elements.fileImportBackup.click();
    });
  }
  if (elements.fileImportBackup) {
    elements.fileImportBackup.addEventListener("change", handleImportBackupFile);
  }

  // Language toggle button
  if (elements.btnLangToggle) {
    elements.btnLangToggle.addEventListener("click", async () => {
      currentLang = currentLang === "hi" ? "en" : "hi";
      await setSetting("language", currentLang);
      updateLanguageUI();
      await refreshAllViews();
    });
  }

  // Desktop Frame Toggle (phone frame / full width)
  if (elements.btnToggleFrame) {
    elements.btnToggleFrame.addEventListener("click", () => {
      elements.app.classList.toggle("wide-mode");
    });
  }

  // Close modals on close button or click overlay
  document.querySelectorAll(".modal-close, [data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeAllModals);
  });
  document.querySelectorAll(".modal-overlay").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target === el) closeAllModals();
    });
  });

  // Stepper buttons for restock modal
  const btnRestockPlus = document.getElementById("btn-restock-plus");
  const btnRestockMinus = document.getElementById("btn-restock-minus");
  if (btnRestockPlus) {
    btnRestockPlus.addEventListener("click", () => {
      if (elements.inpRestockQty) {
        elements.inpRestockQty.value = (parseFloat(elements.inpRestockQty.value || 0) + 1).toString();
      }
    });
  }
  if (btnRestockMinus) {
    btnRestockMinus.addEventListener("click", () => {
      if (elements.inpRestockQty) {
        const v = Math.max(1, parseFloat(elements.inpRestockQty.value || 0) - 1);
        elements.inpRestockQty.value = v.toString();
      }
    });
  }
}

// --- LANGUAGE SWITCHER UI ---
function updateLanguageUI() {
  if (elements.langLabel) {
    elements.langLabel.textContent = currentLang === "hi" ? "हिन्दी" : "English";
  }
  if (elements.txtAppTitle) {
    elements.txtAppTitle.innerHTML = currentLang === "hi" 
      ? `मेरी दुकान <span style="font-size:0.8rem; font-weight:400; opacity:0.9;">(Meri Dukaan)</span>`
      : `Meri Dukaan <span style="font-size:0.8rem; font-weight:400; opacity:0.9;">(मेरी दुकान)</span>`;
  }
  if (elements.txtAppTagline) {
    elements.txtAppTagline.textContent = t("tagline");
  }
}

// --- NETWORK & OFFLINE DETECTION ---
function setupNetworkMonitoring() {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    if (elements.statusPill) {
      elements.statusPill.className = `offline-pill ${isOnline ? "online" : "offline"}`;
    }
    if (elements.statusText) {
      elements.statusText.textContent = isOnline ? t("online") : t("offline");
    }
  };

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();
}

// --- SERVICE WORKER REGISTRATION ---
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          console.log("[ServiceWorker] Registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[ServiceWorker] Registration failed:", err);
        });
    });
  }
}

// Run init when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}