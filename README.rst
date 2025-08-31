# Realtime Product Stock Synchronization (Enhanced stock.quant)

**Odoo Version:** 18.0
**License:** LGPL-3.0
**Developer:** Jobaer Hossain

---

## 🔍 Overview

This module enhances Odoo’s default **Inventory → Reporting → Locations** report (based on `stock.quant`) by introducing **real-time stock synchronization** and **renaming** the menu to **“Location-wise Realtime Stock”** for better clarity and usability.

Rather than building a separate custom page, this module **injects live update capabilities** directly into the standard stock.quant list view, making it instantly responsive to stock operations such as transfers, validations, and quantity updates.

---

## 🚀 Features

- 🔄 **Real-time synchronization** of product stock via Odoo Bus Service
- 🧠 Integrated directly into **Odoo’s standard stock.quant tree view**
- ✏️ Renamed the original menu to **“Location-wise Realtime Stock”** for clarity
- ⚙️ Automatically refreshes the list view when stock changes occur (e.g. stock moves, validations)
- 💡 Lightweight, non-intrusive enhancement — no need to open or manage a custom screen

---

## 📍 Location

Navigate to:

**Inventory → Reporting → Location-wise Realtime Stock**

Here you will see the standard stock.quant view with **automatic real-time updates**.

---

## 🛠️ Technical Overview

- ✅ Inherits the `stock.quant` list view and enhances it using OWL with `bus_service`
- ✅ Emits custom bus events from `stock.picking`’s `button_validate` method
- ✅ Listens for `stock.quant.sync` bus events and reloads the view instantly
- ✅ Includes safety checks to avoid errors when switching views

---

## 🔧 Installation

1. Copy or clone this module into your Odoo `addons` directory:
   ```bash
   git clone https://github.com/yourusername/realtime_product_stock_showcase.git
