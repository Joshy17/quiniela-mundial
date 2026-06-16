# Quiniela Mundial automática para Vercel

Este proyecto muestra la quiniela y actualiza marcadores automáticamente usando API-Football desde una función serverless de Vercel.

## Estructura

```txt
index.html
css/styles.css
js/data.js
js/app.js
api/worldcup-results.js
package.json
```

## Cómo correr localmente

1. Instala Vercel CLI si no lo tienes:

```bash
npm install -g vercel
```

2. Entra a la carpeta:

```bash
cd quiniela-mundial-auto
```

3. Crea un archivo `.env.local` con tu API key gratuita:

```env
APIFOOTBALL_KEY=TU_API_KEY_AQUI
```

4. Corre el proyecto:

```bash
vercel dev
```

5. Abre la URL que te indique la terminal, normalmente:

```txt
http://localhost:3000
```

## Cómo subirlo a Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio desde Vercel.
3. En Vercel, agrega esta variable de entorno:

```txt
APIFOOTBALL_KEY
```

4. Pega como valor tu API key de API-Football.
5. Deploy.

## Notas importantes

- La API key nunca debe ir en `index.html`, `app.js` o `data.js`.
- La función `api/worldcup-results.js` consulta API-Football desde el servidor.
- La respuesta usa caché de 60 segundos para no gastar muchas requests del plan gratis.
- La tabla de puntos solo cuenta partidos finalizados. Los partidos en vivo muestran marcador, pero no suman puntos hasta que la API los marque como finalizados.
- Si un partido no se actualiza, revisa los nombres de equipos en `TEAM_ALIASES` dentro de `js/app.js`.
