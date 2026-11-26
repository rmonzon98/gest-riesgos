# Prompt 09 · Glosario y recorridos guiados

> Etapa 9 de 10. Independiente; requiere la etapa 01. Lee `AGENTS.md`, `01-decisiones.md` (20), `02-modelo-datos.md` (2.11 y 2.12) y `03-pantallas.md` (P-10, P-11 y P-13). Reporte en `planificacion/MARN/entregas/09-glosario-recorridos.md`.

## 1. Glosario

- **Backend:** CRUD de `riesgos_glosario` por institución (solo con la URL `/glosario`), y `GET /glosario/destacado`, que devuelve **un** término con `DESTACAR=1`, elegido de forma estable por día: `índice = díaDelAño % cantidad`.
- **Frontend:**
  - Catálogo **Glosario** (en Catálogos): DataGrid y formulario con título, descripción, "destacar en inicio" y estado.
  - Tarjeta **Concepto destacado** en el inicio (`Home.jsx`).
- **Datos iniciales:** una migración agrega, para **todas** las instituciones que no tengan glosario, estos 8 términos de la Guía I con descripciones cortas en tus propias palabras:
  1. Riesgo
  2. Riesgo inherente
  3. Riesgo residual
  4. Probabilidad
  5. Severidad
  6. Capacidad de mitigación
  7. Tolerancia al riesgo
  8. Unidad competente

## 2. Recorridos guiados

- Agrega `react-joyride` (justifícalo en el reporte; es la única dependencia nueva permitida en esta etapa).
- **Componente** `src/funciones/RecorridoGuiado.jsx`:
  - recibe `pantalla` (clave) y `pasos`;
  - se abre solo si el usuario no ha visto esa pantalla;
  - expone un botón **?** para el encabezado.
- **Backend:** `GET /tour/vistos` y `POST /tour/visto` sobre `seguridad_persona_tour`.
- **Textos:** van en `src/Riesgos/Recorridos/<pantalla>.js`, en español, de 4 a 7 pasos cada uno.
- **Pantallas de la primera entrega:**
  - lista de riesgos (`riesgos-ingreso`);
  - detalle del riesgo (`riesgo-detalle`);
  - Mis planes (`mis-planes`);
  - Verificación (`verificacion-actividades`);
  - Reasignar (`reasignar`).
- **Selectores:** los pasos apuntan a `data-tour="..."` que agregas a los elementos. No uses clases CSS de MUI como selector.

## Criterios de aceptación

- Un usuario nuevo ve el recorrido la primera vez y no la segunda, también desde otro navegador.
- El botón **?** lo reabre.
- El concepto destacado cambia de un día a otro y es el mismo durante todo el día.
- `vite build` pasa.
