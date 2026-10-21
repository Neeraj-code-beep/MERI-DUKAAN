# MERI DUKAAN (मेरी दुकान)
### Offline-First Stock & Reorder Assistant
**Tagline:** *Kam Taps. Sahi Stock. Zyada Munafa.* (कम टैप्स। सही स्टॉक। ज़्यादा मुनाफ़ा।)

---

## 📌 Overview
**Meri Dukaan** is a lightweight, mobile-first inventory and reorder assistant tailored for neighbourhood retailers (Kirana stores, chemists, hardware shops, stationery stores) who currently manage inventory in a notebook or from memory.

It directly solves the two most costly retail inventory failures:
1. **Dead Stock:** Working capital locked up in products that have stopped moving.
2. **Stockouts:** Fast-moving items running out before being reordered, causing lost sales and losing customers to competitors.

Built strictly according to the hackathon specification, Meri Dukaan is **100% offline-first**, requires **no sign-up/account/backend**, stores all business data locally on the device in **IndexedDB**, and is installable as a **Progressive Web App (PWA)**.

---

## 🚀 Key Features

### P0 Core Essentials (Non-Negotiable)
- **Quick Stock & Rapid Sales:**
  - Add products with name, quantity, unit (`pkt`, `kg`, `g`, `L`, `ml`, `pc`, `box`), and minimum threshold (optional cost price). Supports decimals (e.g. `0.5 kg`, `1.25 L`).
  - **1-Tap Kirana Starter Chips:** Quick presets for staples (Tata Salt, Fortune Oil, Sugar, Atta, Maggi, Parle-G, Dettol Soap, Toor Dal) with pre-filled units and thresholds.
  - Restock existing items (*"माल आया / Stock Received"*) in a single atomic transaction.
  - **2-Tap Rapid Sales:** Tap product card to record sale with default quantity 1. Guarded against accidental double-taps.
  - **Instant Undo (*"पिछली बिक्री वापस करें / Undo Last Sale"*):** Restores quantity, marks movement as `undone: true` (never deleted for audit history), and recalculates `lastSaleAt`.
  - Stock recount/adjustment (*"स्टॉक सुधारें / Correct Stock"*).
- **Actionable Lists:**
  - **Low Stock (*कम स्टॉक*):** Items where `quantity <= minimumStock` with one-tap restock action.
  - **Not Moving (*काफ़ी समय से नहीं बिका*):** Flags products with no sales within a configurable period (default: 30 days, demo: 1 day). Distinguishes items that *never sold* vs *stopped selling*, and ignores newly added items.
- **100% Offline Operation:**
  - Service Worker (`sw.js`) app-shell caching ensures full functionality in aeroplane mode.
  - IndexedDB storage with persistent storage request (`navigator.storage.persist()`).
- **Zero Technical Jargon:**
  - Simple Hindi and English labels (no "SKU", no accounting formulas).

### P1 Enhancements
- **Tied-Up Capital:** Real-time calculation of `Σ(quantity × costPrice)` for dead stock, highlighting locked working capital in rupees.
- **WhatsApp & Web Share Reorder List:** Plain text reorder list with suggested order quantities (`suggested = 2 * min - current`). Supports direct distributor WhatsApp phone number routing and the native Web Share API.
- **One-Tap JSON Backup:** Full export and restore of database records.
- **Instant 15-Item Demo Loader:** Injects realistic Kirana staples with backdated sales for instant judging.
- **Hinglish Smart Search:** Retailers can type in Hinglish (`namak`, `chini`, `tel`, `atta`, `dal`, `sabun`, `masala`) to find Hindi products.
- **Synthesized Offline Audio:** Pleasant Web Audio chime on sale and undo without external audio files.
- **Counter Keyboard Shortcuts:** Hotkeys `1-5` for tab navigation, `+`/`A` for Add Stock, `/` for search, `Z`/`U` for undo, and `Esc` to close modals.

---

## 🛠️ Technology Stack
- **Interface:** HTML5 (Semantic, accessible, mobile-first)
- **Styling:** Vanilla CSS3 (Custom properties, thumb-friendly touch targets ≥ 48px, high contrast)
- **Logic:** Vanilla JavaScript (ES modules)
- **Database:** IndexedDB (Atomic transactions for stock and movements)
- **Offline Shell:** Web App Manifest + Service Worker (Stale-While-Revalidate caching)

---

## 🧪 Section 11 Automated Acceptance Tests
Meri Dukaan includes a built-in automated test suite verifying all 14 criteria from Section 11 of the documentation:
1. Add a Product
2. Refresh & IndexedDB Persistence
3. Restock Product (Atomic update & movement record)
4. Record Sale (Atomic stock decrease & lastSaleAt update)
5. Undo Last Sale (Quantity restored, undone flag, date recalculated)
6. Fractional Quantity Support (0.5 kg / 1.25 L precision)
7. Prevent Duplicate Sale Taps (Operation UUID guard)
8. Low Stock Threshold Detection
9. Not-Moving Detection (Never sold vs stopped selling, ignore new items)
10. Money Tied Up Calculation
11. Load Demo Data (15 realistic items populated)
12. Service Worker & Offline Manifest validation
13. Hinglish & Transliteration Search matching
14. JSON Backup Export & Restore roundtrip integrity

👉 **Run live tests in browser:** Open `/tests.html` or click **"स्वचालित परीक्षण चलाएं"** in the Settings tab!

---

## 📱 60-Second Demo Flow (Section 1.3)
1. Turn on **Aeroplane Mode** to prove 100% offline operation.
2. Open **Settings** and tap **"⚡ डेमो डेटा लोड करें (Load Demo Data)"**.
3. Record a quick sale in **two taps** from the **Quick Sale** tab.
4. Tap **"वापस करें (Undo)"** to restore stock, or view the sold product in **Low Stock**.
5. Switch to **Not Moving** to see dead stock items and total capital tied up in rupees.
6. Close and reopen the browser offline to verify full data persistence.