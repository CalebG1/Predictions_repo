# Kalshi Replica

A front-end replica of the [Kalshi](https://kalshi.com) prediction-market UI, built from reference screenshots. Includes the **Trending** home page and the **Elections** market page with a shared header and category navigation.

## Stack

- React 18 + TypeScript
- Vite
- React Router

## Getting started

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Project structure

```
src/
  components/
    Header.tsx        # top nav bar (logo, nav, search, balance, icons)
    CategoryNav.tsx   # category tab strip (Trending, Elections, ...)
    MarketCard.tsx    # reusable market card (outcomes, odds, volume)
    FeaturedCard.tsx  # featured "Mentions" card with odds chart
    Sidebar.tsx       # promo, quick links, Customize view, Trending lists
  pages/
    Trending.tsx      # home page (featured + Corporate Finance grid)
    Elections.tsx     # elections page (filter rail + market grid)
  data.ts             # mock market data
  index.css           # design tokens + all styling
  App.tsx             # routes
```

## Notes

All data is mock data in `src/data.ts`; no backend is required. Styling uses a
small set of CSS custom properties (see `:root` in `index.css`) to mirror
Kalshi's green accent, clean white cards, and Inter typography.
