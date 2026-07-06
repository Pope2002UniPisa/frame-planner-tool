import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: dopo ogni deploy chi ha installato l'app riceve subito la
      // nuova versione al reload — nessun rischio di restare su codice vecchio.
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        name: "Measure Master — Pratelli Rappresentanze",
        short_name: "Measure Master",
        description: "Portale misurazioni e preventivi Pratelli Rappresentanze",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0A1017",
        theme_color: "#F77114",
        orientation: "portrait-primary",
        lang: "it",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        // SPA: naviga sempre all'app shell in offline (escluse API/edge functions).
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/functions\//, /^\/storage\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Dati Supabase (REST/Storage): ONLINE sempre fresco (network first),
            // OFFLINE fallback all'ultima copia vista. Solo GET (le scritture vanno
            // sempre in rete). Nessuna regressione online.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-data",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Tile mappa (Leaflet/OSM): utili anche offline se già viste.
            urlPattern: ({ url }) => /tile\.openstreetmap|tile\./.test(url.hostname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "map-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react-vendor";
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("cmdk") || id.includes("vaul")) return "ui-vendor";
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) return "charts";
          if (id.includes("leaflet")) return "maps";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          return "vendor";
        },
      },
    },
  },
});
