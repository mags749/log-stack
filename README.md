# Daily Logger

A fast, minimal desktop app for recording daily logs with a timeline view.

## Stack

| Layer | Technology |
|---|---|
| Shell | Tauri 2 |
| UI | Solid.js + JSX |
| Styling | SCSS → CSS (Work Sans font) |
| State | Solid Store (fine-grained reactivity) |
| Database | redb (embedded key-value, pure Rust) |
| Build | Vite + vite-plugin-solid |

---

## Project structure

```
log-stack/
├── index.html
├── vite.config.js
├── package.json
│
├── src/
│   ├── index.jsx           # Entry point
│   ├── App.jsx             # Root: routing, onboarding, loading
│   │
│   ├── store/
│   │   └── index.js        # Solid store — all app state + actions
│   │
│   ├── utils/
│   │   ├── api.js          # invoke() wrappers
│   │   └── date.js         # Grouping, formatting helpers
│   │
│   ├── components/
│   │   ├── Icons.jsx       # Inline SVG icons
│   │   ├── Toast.jsx       # Toast notifications
│   │   ├── Onboarding.jsx  # First-launch name modal
│   │   ├── EditPanel.jsx   # Slide-in log editor
│   │   └── Timeline.jsx    # Timeline + day groups + log cards
│   │
│   ├── pages/
│   │   ├── Home.jsx        # Main view: greeting + entry box + timeline
│   │   └── Settings.jsx    # Settings page
│   │
│   └── styles/
│       ├── _tokens.scss    # CSS custom properties (light + dark)
│       ├── _reset.scss     # Minimal reset
│       └── main.scss       # All components + animations
│
└── src-tauri/
    ├── tauri.conf.json
    ├── build.rs
    └── src/
        ├── main.rs         # Entry point
        ├── lib.rs          # Tauri setup + DB init
        ├── db.rs           # redb tables, models, CRUD, import/export
        └── commands.rs     # Tauri commands exposed to JS
```

---

## Getting started

### Prerequisites

- [Rust](https://rustup.rs/) stable
- [Node.js](https://nodejs.org/) 18+
- Tauri system deps: https://tauri.app/start/prerequisites/

### Install & run

```bash
npm install
npm run tauri dev
```

### Build release

```bash
npm run tauri build
```

---

## Log data format

```json
{
  "total_count": 2,
  "logs": [
    {
      "id": 101,
      "message": "Database connection timeout after 30 seconds",
      "timestamp": "2026-08-04T10:00:00Z",
      "rating": 4,
      "references": [
        {
          "type": "trace",
          "label": "Distributed Trace ID",
          "url": "https://monitoring.example.com/traces/tr-8f92a1b"
        }
      ]
    }
  ]
}
```

---

## Rating scale

| Rating | Color | Meaning |
|---|---|---|
| 1 | Gray | Routine / low significance |
| 2 | Blue | Notable |
| 3 | Amber | Needs attention |
| 4 | Orange | Warning |
| 5 | Red | Critical |

---

## Key interactions

| Action | How |
|---|---|
| Add log | Type in the entry box, press **Enter** |
| New line in entry | **Shift+Enter** |
| Edit a log | Click any entry in the timeline |
| Delete a log | Open edit panel → Delete button |
| Open settings | Gear icon (top right) |
| Switch theme | Settings → Appearance |
| Export logs | Settings → Data → Export JSON |
| Import logs | Settings → Data → Import JSON |

---

## Database

redb stores data at:
- **macOS**: `~/Library/Application Support/com.yourname.dailylogger/logger.redb`
- **Linux**: `~/.local/share/com.yourname.dailylogger/logger.redb`
- **Windows**: `%APPDATA%\com.yourname.dailylogger\logger.redb`

Two tables:
- `logs` — key: `u64` (auto-increment ID), value: JSON string of log entry
- `settings` — key: `"settings"`, value: JSON string of settings object
