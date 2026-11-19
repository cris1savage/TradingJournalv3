# Trading Journal — app iPhone (Expo)

App nativa para llevar tus cuentas (reales, fondeo y demo), sus brokers o carteras, el mercado (Forex, Acciones, Cripto, Futuros…) y todos los movimientos: ganancias, pérdidas, comisiones, depósitos y retiros.

- **Dashboard**: balance total, P&L del periodo con gráfica táctil, win rate, capital propio vs. fondeo, capital por mercado, P&L mensual y por cuenta.
- **Cuentas**: tarjetas con balance, P&L, rentabilidad y mini gráfica de 60 días.
- **Movimientos**: lista por días con filtros; mantener pulsado para borrar.
- **Personalizar**: 10 colores de acento, 6 fondos, esquinas, efecto brillo, modo privado y moneda.
- **Nube (Supabase)**: inicio de sesión con email; los datos se sincronizan entre dispositivos. Sin conexión configurada, la app funciona en modo local.

## Estructura

```
src/app/(tabs)/      pestañas: index (Dashboard), cuentas, movimientos, ajustes
src/app/cuenta.tsx   formulario de cuenta (modal)
src/app/movimiento.tsx  formulario de movimiento (modal)
src/app/login.tsx    inicio de sesión / registro
src/store/store.tsx  estado, guardado local y sincronización con Supabase
src/lib/             tipos, cálculos, formato, temas, datos de ejemplo
supabase/migrations/ esquema SQL (tablas + seguridad por usuario)
```

## Desarrollo

```bash
npm install
npx expo start
```

Abre la app **Expo Go** en el iPhone y escanea el QR.

## Supabase

Proyecto `trading-journal` (organización `trading-journal`, plan Free, región eu-west-1), separado de Chris Fitness.
El esquema está en `supabase/migrations/0001_init.sql` (ya aplicado).

La URL y la clave *publishable* están en `.env` (desarrollo) y en `eas.json` (compilaciones). Esa clave es pública
por diseño: la seguridad la ponen las políticas RLS, que solo dejan a cada usuario ver y tocar sus propias filas.

## Publicar en el iPhone (TestFlight / App Store)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

EAS pide el Apple ID de la cuenta de desarrollador y crea los certificados y la ficha en App Store Connect. El identificador de la app es `com.tjpro.tradingjournal` (cámbialo en `app.json` antes del primer build si prefieres otro).
