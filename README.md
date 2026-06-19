# Mi Murdoku

App web para generar y jugar Murdokus propios usando [`murdokugen`](https://github.com/Seyronh/MurdokuGen).

## Qué hace

- Genera un tablero con zonas, obstáculos y solución.
- Genera pistas semánticas.
- Permite jugar en navegador: colocar sospechosos, añadir marcas y comprobar la solución.
- Está preparada para publicarse en GitHub Pages.

## Ejecutar en local

Necesitas Node.js 20 o superior.

```bash
npm install
npm run dev
```

Después abre la URL local que indique Vite.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `mi-murdoku`.
2. Sube todos estos archivos al repositorio.
3. Haz commit en la rama `main`.
4. En GitHub, ve a **Settings → Pages**.
5. En **Build and deployment**, elige **GitHub Actions**.
6. Haz push a `main`; el workflow `.github/workflows/deploy.yml` generará y publicará la app.

## Personalizar

En `src/main.ts` puedes cambiar:

- `personNames`: nombres de sospechosos.
- `zoneNames`: nombres de salas/zonas.
- `zoneColors`: colores visuales.
- Textos de `hintText()`: traducción/formato de las pistas.

## Nota de licencia

Este proyecto usa `murdokugen`, cuya licencia publicada en el repositorio es AGPL-3.0. Revisa las obligaciones de esa licencia si vas a publicar o redistribuir tu app.
