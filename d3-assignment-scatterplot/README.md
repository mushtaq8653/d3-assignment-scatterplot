# D3 Scatter Plot — Youth Smoking & Drug Dataset

## Overview
Interactive scatter plot implemented with D3.js (v7).  
Features:
- Dynamic X / Y variable selection
- Color by categorical field
- Tooltip and animated hover
- Zoom & pan (rescale axes and points)
- Toggleable trend line (linear regression)
- Correlation statistics

## Files
- `index.html` — main page
- `style.css` — styles
- `js/script.js` — visualization logic (d3)
- `data/youth_smoking_drug_data_10000_rows_expanded.csv` — dataset (place inside `data/` folder)
- `AI_USAGE.md` — AI usage statement

## How to run locally
1. Ensure the CSV file is placed at: `D3_Assignment/data/youth_smoking_drug_data_10000_rows_expanded.csv`
2. Open `index.html` in your browser (Chrome/Firefox).
3. If browser blocks local CSV due to file:// restrictions, run a simple local server:
   - Python 3: `python -m http.server 8000` (run in project root) and open `http://localhost:8000`.
   - Or use VS Code Live Server.

## Deployment (GitHub Pages)
1. Initialize git and push repository to GitHub.
2. In repo settings -> Pages: set branch `main` and root `/` -> Save. The site will be published under `https://<username>.github.io/<repo>/`.
3. Make sure the `data/` folder and CSV are committed.

## Notes
- Keep file paths relative (`data/...`) so deployment works.
- If CSV is large, consider hosting the CSV externally (e.g., GitHub large-file support or using a data API).
