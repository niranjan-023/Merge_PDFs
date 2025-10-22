# PDF Merge — Client-side (Catchy UI)

A small, privacy-first static web app that merges **up to 5 PDF files** directly in the browser and downloads the merged PDF.  
No server, no uploads — everything runs client-side using `pdf-lib`. The UI is polished, responsive, and supports drag & drop plus reordering.

---

## Demo
If deployed on Vercel: `https://your-project.vercel.app`  
(Replace `your-project` with your actual Vercel project domain.)

---

## Features
- Drag & drop or browse to add PDFs
- Reorder files (drag or use up/down buttons) — final order controls merged pages
- Merge up to **5** PDFs (configurable)
- Shows file count, total pages, and total size
- Downloads merged file named `merged-<timestamp>.pdf`
- Files stay on the user's machine — **no uploads** or server-side processing
- Works in modern browsers (Chrome, Edge, Firefox, Safari)

---

## Files in this repo
- `index.html` — main UI (HTML)
- `styles.css` — styling and responsive layout
- `app.js` — application logic (pdf-lib + SortableJS)
- `README.md` — this file

External libraries are loaded via CDN:
- `pdf-lib` (client-side PDF processing)
- `SortableJS` (drag/reorder)

---

## Quick local test (recommended)
1. Ensure your three files (`index.html`, `styles.css`, `app.js`) are in the repo root.
2. Start a simple static server (Python built-in is easiest):

```bash
# from repo root
python -m http.server 5500
