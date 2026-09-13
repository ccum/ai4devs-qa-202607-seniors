# Prompts iniciales — Pruebas E2E con Cypress (interfaz Position)

## Descripción del ejercicio

Ejercicio: **Pruebas E2E con Cypress** sobre la interfaz `/positions/:id` (tablero kanban de candidatos por fase de contratación) del proyecto AI4Devs-qa.

Objetivo: crear pruebas End-to-End que verifiquen:
1. La carga correcta de la página de una posición (título, columnas de fases, tarjetas de candidatos en su columna correcta).
2. El cambio de fase de un candidato mediante drag & drop, incluyendo la actualización real en el backend vía `PUT /candidates/:id`.

Stack relevante: React (`react-beautiful-dnd` para el drag & drop) en `/frontend`, Express + Prisma en `/backend`.

Los prompts siguientes se ejecutaron en orden, cada uno contra el repo ya clonado con backend y frontend corriendo localmente (`backend` en `http://localhost:3010`, `frontend` en `http://localhost:3000`).

---

## Prompt 1 — Instalar y configurar Cypress

```
Estoy en el proyecto frontend (React, carpeta /frontend) de un monorepo. Quiero añadir
pruebas E2E con Cypress para la interfaz de detalle de posición, ubicada en
frontend/src/components/PositionDetails.js (ruta /positions/:id).

Instala Cypress como devDependency en /frontend, inicialízalo, y configura
cypress.config.js con baseUrl apuntando a http://localhost:3000. Usa la estructura
de carpetas vigente de Cypress (cypress/e2e), y añade en package.json los scripts
"cypress:open" y "cypress:run".

No escribas todavía ningún test, solo deja el setup listo y verificado (que
`npx cypress open` levante correctamente).
```

---

## Prompt 2 — Añadir selectores accesibles (data-testid) a los componentes

```
En frontend/src/components/PositionDetails.js, StageColumn.js y CandidateCard.js
necesito selectores estables para pruebas E2E, porque hoy no hay ningún data-testid
y los tests tendrían que depender de clases de Bootstrap frágiles (.card-header,
.card-title).

Añade atributos data-testid sin cambiar el comportamiento ni el estilo:
- El <h2> del nombre de la posición en PositionDetails.js: data-testid="position-title".
- Cada columna de fase (Card) en StageColumn.js: data-testid="stage-column-{index}",
  y su header: data-testid="stage-column-title".
- Cada tarjeta de candidato en CandidateCard.js: data-testid="candidate-card",
  con un data-candidate-id={candidate.id} adicional para poder identificarla en los tests.

Mantén el resto del JSX y la lógica de drag & drop (react-beautiful-dnd) intactos.
```

---

## Prompt 3 — Test E2E: carga de la página de Position

```
Crea el archivo frontend/cypress/e2e/position.spec.js con un primer test E2E
(usando Cypress) para la interfaz de posición (ruta /positions/:id).

Estructura el test como Given/When/Then en los comentarios:
- Given: existe una posición con id conocido y al menos un candidato asignado
  (usa un id real de los datos sembrados en la base de datos local, o documenta
  cómo sembrar uno vía el backend/Prisma antes de correr los tests).
- When: se visita /positions/:id.
- Then: se debe verificar:
  1. Que el título de la posición (data-testid="position-title") es visible y
     no está vacío.
  2. Que se muestran las columnas correspondientes a cada fase del proceso
     (data-testid="stage-column-{index}"), al menos una por cada fase configurada
     en el interviewFlow de esa posición.
  3. Que las tarjetas de candidato (data-testid="candidate-card") aparecen dentro
     de la columna que corresponde a su fase actual (currentInterviewStep),
     comparando contra los datos devueltos por GET /positions/:id/candidates.

Usa selectores accesibles vía data-testid, no selectores de clase CSS. No hagas
mocks del backend en este test: debe correr contra el backend real en
http://localhost:3010.
```

---

## Prompt 4 — Test E2E: cambio de fase por drag & drop

```
Añade un segundo test en frontend/cypress/e2e/position.spec.js que verifique el
cambio de fase de un candidato mediante drag & drop.

El drag & drop está implementado con react-beautiful-dnd (Draggable/Droppable),
así que cy.trigger('dragstart'/'drop') nativo no funciona de forma fiable. Instala
y usa el plugin @4tw/cypress-drag-drop (o el que consideres más adecuado para
react-beautiful-dnd) y regístralo en cypress/support/e2e.js.

El test debe seguir esta estructura Given/When/Then:
- Given: la posición tiene al menos un candidato en la primera columna y existe
  una segunda columna de destino.
- When: se arrastra la primera tarjeta de candidato (data-testid="candidate-card")
  desde su columna origen hasta la columna de destino
  (data-testid="stage-column-{index}").
- Then:
  1. La tarjeta del candidato debe aparecer visualmente dentro de la nueva columna.
  2. Debe haberse disparado una llamada PUT a /candidates/:id (intercéptala con
     cy.intercept antes del drag) con el applicationId correcto y el
     currentInterviewStep correspondiente al id de la fase de destino.
  3. La respuesta interceptada debe tener status 200.

Ejecuta el archivo completo con `npx cypress run` y ajusta el test hasta que pase
de forma estable en al menos 3 ejecuciones seguidas.
```

---

## Instrucciones para ejecutar las pruebas E2E

1. Levantar la base de datos y aplicar migraciones/seed de Prisma si aplica.
2. Levantar el backend:
   ```bash
   cd backend
   npm run build && npm start
   # o en desarrollo: npm run dev
   ```
   Debe quedar escuchando en `http://localhost:3010`.
3. Levantar el frontend:
   ```bash
   cd frontend
   npm start
   ```
   Debe quedar escuchando en `http://localhost:3000`.
4. Asegurarse de que exista al menos una posición con candidatos asignados en la
   base de datos (ajustar el id usado en `position.spec.js` si es necesario).
5. Ejecutar las pruebas:
   ```bash
   cd frontend
   npx cypress open   # modo interactivo, recomendado para desarrollo/depuración
   # o
   npx cypress run    # modo headless, para CI
   ```
