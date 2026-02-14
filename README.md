# ArcGIS-SDK-JS — Sentinel‑2 Land Cover by HUC‑12

A responsive web app that visualizes Sentinel‑2 10m land‑cover within HUC‑12 subwatersheds around Boston, MA. Click a watershed to view percent cover by class (computed from ArcGIS Living Atlas services) and an interactive Chart.js histogram.

## Live demo
https://dk32093.github.io/ArcGIS-SDK-JS/

## Features
- Loads Sentinel‑2 10m land‑cover from ArcGIS Living Atlas and clips it to a selected HUC‑4 region.
- Queries HUC‑12 subwatersheds and renders them as selectable graphics.
- Computes land‑cover histograms for a selected watershed and displays percentages with Chart.js.
- Responsive UI with hover highlights, zoom-to, and adjustable land‑cover opacity.
- Mobile-friendly: Works on mobile and desktop browsers with touch and click interactions.

## Data sources
- Sentinel‑2 10m Land Cover (Image Service): https://www.arcgis.com/home/item.html?id=cfcb7609de5f478eb7666240902d4d3d
- Watershed Boundary Dataset (HUC‑4 subregions): https://www.arcgis.com/home/item.html?id=b92b73b36ef74c5cba1e3035fce94623
- Watershed Boundary Dataset (HUC‑12 subwatersheds): https://www.arcgis.com/home/item.html?id=b60aa1d756b245cf9db03a92254af878