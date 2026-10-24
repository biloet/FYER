# FYER

Private money on Robinhood Chain — a green-themed landing page + wallet app shell.

- `index.html` — page structure
- `styles.css` — green theme
- `app.js` — wallet connect (EIP-1193), auto add/switch to Robinhood Chain, balance, fee calculator
- `config.js` — network settings, fees and `poolAddress` (set once the shielded pool contract is deployed)

Run locally:

```sh
python3 -m http.server 8080
```

Deploy as a static site (GitHub Pages, Vercel, Netlify, Cloudflare Pages).
