# New Map — Image Files Guide

Drop your PNG images into the two folders below.
The game will automatically pick them up on the next page load (hard-refresh with Ctrl+Shift+R).

---

## 📁 flags/   ← Circular country flag images

| File to create         | Used on cells                                    |
|------------------------|--------------------------------------------------|
| `japan.png`            | Osaka Bay, Shibuya Crossing                      |
| `spain.png`            | Valencia Harbor, Seville Plaza, Bilbao Docks     |
| `canada.png`           | Vancouver Quay, Toronto Market, Montreal Mile    |
| `india.png`            | Delhi Bazaar, Jaipur Gates, Kochi Port           |
| `australia.png`        | Sydney Harbour, Brisbane Bay, Perth Outback      |
| `mexico.png`           | Oaxaca Street, Cancun Shore, Tulum Ruins         |
| `southafrica.png`      | Cape Town Ridge, Durban Market, Pretoria Square  |
| `sweden.png`           | Stockholm Quay, Gothenburg Pier                  |

**Recommended size:** 64×64 px (or larger — they are displayed at 16×16 with border-radius: 50%)  
**Format:** PNG with transparent background is ideal; the image is cropped to a circle automatically.

---

## 📁 special/   ← Icons for special cells

| File to create   | Cell                                 |
|------------------|--------------------------------------|
| `airport.png`    | Shinkansen Rail, Polar Express Rail, Coral Coast Rail, Savannah Rail |
| `vacation.png`   | Safari Rest Stop (corner)            |
| `jail.png`       | Harbor Detention (corner)            |
| `go.png`         | GO (corner)                          |
| `gotojail.png`   | Go To Jail (corner)                  |
| `utility.png`    | Niagara Energy, Maya Utilities       |
| `surprise.png`   | Discovery (×3)                       |
| `treasure.png`   | Festival Fund, Heritage Chest, Heritage Fund |

**Recommended size:** 64×64 px (corners display at 40×40, others at 26×26)  
**Format:** PNG with transparent background preferred so the neon glow shows.

---

## Until you provide the real images

- **Flag cells** — each colour bar shows a solid fallback circle in the country's main colour.
- **Special cells** — a matching emoji/symbol is shown as a fallback (✈ ⚡ ★ ? ⛓ ☀ ⛔ ▶).

The SVG files in each folder are preview placeholders only — replace them with your PNG images.
