# Trading Journal — Setup en Vercel

## Pasos para desplegar:

1. Sube este proyecto a un repo privado en GitHub
2. Ve a vercel.com → New Project → importa el repo
3. En "Environment Variables" añade:
   - APP_PASSWORD = trading2026
4. Deploy → listo

## Importante:
- Los datos se guardan en /data/ (carpeta local del servidor)
- Para persistencia real en Vercel, considera usar Vercel KV o una base de datos externa
- En desarrollo local: npm run dev
