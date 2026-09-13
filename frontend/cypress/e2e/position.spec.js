/**
 * E2E — Interfaz de detalle de posición (ruta /positions/:id)
 *
 * Este test corre contra el BACKEND REAL (http://localhost:3010). No hay mocks:
 * los datos esperados se leen de la propia API y se contrastan contra el DOM.
 *
 * -------------------------------------------------------------------------
 * PREPARACIÓN DEL ENTORNO (sembrado de datos)
 * -------------------------------------------------------------------------
 * La posición usada por defecto es la id=1 ("Senior Full-Stack Engineer") de
 * prisma/seed.ts, que tiene 3 fases y 3 candidatos asignados.
 *
 * Para sembrarla desde cero:
 *
 *   1. Levantar la base de datos (desde la raíz del monorepo):
 *        docker compose up -d db
 *      Comprobar que publica el puerto: `docker ps` debe mostrar
 *      0.0.0.0:5432->5432/tcp. Si solo aparece "5432/tcp", el contenedor se
 *      creó sin mapeo y hay que recrearlo con el comando de arriba.
 *
 *   2. Aplicar migraciones y sembrar (desde /backend):
 *        npx prisma migrate deploy
 *        npx prisma generate
 *        npx ts-node --transpile-only prisma/seed.ts
 *      (--transpile-only evita un fallo de type-check de ts-node en este repo)
 *
 *   3. Arrancar backend (:3010) y frontend (:3000):
 *        cd backend  && npm run dev
 *        cd frontend && npm start
 *
 * Si tu base tiene otros ids, no hace falta tocar el test:
 *   npx cypress run --expose positionId=7,apiUrl=http://localhost:3010
 */

const API_URL = Cypress.expose('apiUrl') || 'http://localhost:3010';
const POSITION_ID = Cypress.expose('positionId') || 1;

describe('Interfaz de detalle de posición', () => {
    let positionName;
    let interviewSteps = [];
    let candidates = [];

    before(() => {
        // GIVEN: existe una posición con un id conocido, con su interviewFlow
        // configurado y al menos un candidato asignado.
        cy.request(`${API_URL}/positions/${POSITION_ID}/interviewFlow`).then((response) => {
            expect(response.status).to.eq(200);

            const payload = response.body.interviewFlow;
            positionName = payload.positionName;
            interviewSteps = payload.interviewFlow.interviewSteps;

            expect(
                interviewSteps,
                `la posición ${POSITION_ID} debe tener al menos una fase en su interviewFlow`
            ).to.have.length.greaterThan(0);
        });

        cy.request(`${API_URL}/positions/${POSITION_ID}/candidates`).then((response) => {
            expect(response.status).to.eq(200);

            candidates = response.body;

            expect(
                candidates,
                `la posición ${POSITION_ID} debe tener al menos un candidato asignado (ver cabecera del fichero para sembrar datos)`
            ).to.have.length.greaterThan(0);
        });
    });

    beforeEach(() => {
        // WHEN: se visita la vista de detalle de esa posición.
        cy.visit(`/positions/${POSITION_ID}`);
    });

    it('THEN muestra el título de la posición, visible y no vacío', () => {
        cy.get('[data-testid="position-title"]')
            .should('be.visible')
            .invoke('text')
            .should((text) => {
                expect(text.trim()).to.not.be.empty;
                expect(text.trim()).to.eq(positionName);
            });
    });

    it('THEN muestra una columna por cada fase configurada en el interviewFlow', () => {
        // Una columna por fase, en el mismo orden que devuelve la API, y con el
        // nombre de la fase en su cabecera.
        interviewSteps.forEach((step, index) => {
            cy.get(`[data-testid="stage-column-${index}"]`)
                .should('be.visible')
                .find('[data-testid="stage-column-title"]')
                .should('have.text', step.name);
        });

        // Y ninguna columna de más: se cuentan por la cabecera, porque el
        // selector de prefijo [data-testid^="stage-column-"] también casaría
        // con "stage-column-title".
        cy.get('[data-testid="stage-column-title"]').should('have.length', interviewSteps.length);
    });

    it('THEN coloca cada tarjeta de candidato en la columna de su fase actual', () => {
        candidates.forEach((candidate) => {
            // La API devuelve currentInterviewStep como el NOMBRE de la fase,
            // que es lo que la UI usa como título de columna.
            const stageIndex = interviewSteps.findIndex(
                (step) => step.name === candidate.currentInterviewStep
            );

            expect(
                stageIndex,
                `la fase "${candidate.currentInterviewStep}" de ${candidate.fullName} debe existir en el interviewFlow`
            ).to.be.at.least(0);

            cy.get(`[data-testid="stage-column-${stageIndex}"]`)
                .find(`[data-testid="candidate-card"][data-candidate-id="${candidate.candidateId}"]`)
                .should('be.visible')
                .and('contain.text', candidate.fullName);
        });

        // No sobran ni faltan tarjetas respecto a lo que devuelve la API.
        cy.get('[data-testid="candidate-card"]').should('have.length', candidates.length);
    });

    describe('Cambio de fase de un candidato mediante drag & drop', () => {
        let sourceIndex;
        let destIndex;
        let destStepId;
        let draggedCandidate;
        let originalStepId;

        before(() => {
            // GIVEN: hay al menos un candidato en una columna origen y existe
            // otra columna distinta que sirva de destino.
            sourceIndex = interviewSteps.findIndex((step) =>
                candidates.some((candidate) => candidate.currentInterviewStep === step.name)
            );
            expect(
                sourceIndex,
                'debe haber al menos una columna con candidatos para poder arrastrar'
            ).to.be.at.least(0);

            destIndex = interviewSteps.findIndex((_step, index) => index !== sourceIndex);
            expect(
                destIndex,
                'debe existir una segunda columna que sirva de destino'
            ).to.be.at.least(0);

            destStepId = interviewSteps[destIndex].id;

            // El candidato que se va a arrastrar es el primero de la columna origen,
            // en el mismo orden en que la UI los pinta.
            draggedCandidate = candidates.find(
                (candidate) => candidate.currentInterviewStep === interviewSteps[sourceIndex].name
            );
            originalStepId = interviewSteps[sourceIndex].id;
        });

        after(() => {
            // El drag escribe en la base de datos real. Se restaura la fase original
            // para que el fichero sea idempotente y pueda re-ejecutarse en verde.
            if (!draggedCandidate) return;

            cy.request('PUT', `${API_URL}/candidates/${draggedCandidate.candidateId}`, {
                applicationId: draggedCandidate.applicationId,
                currentInterviewStep: originalStepId,
            });
        });

        it('THEN mueve la tarjeta de columna y persiste la nueva fase vía PUT', () => {
            cy.intercept('PUT', `${API_URL}/candidates/*`).as('updateCandidateStep');

            // WHEN: se arrastra la primera tarjeta de la columna origen hasta
            // la columna de destino.
            cy.get(`[data-testid="stage-column-${sourceIndex}"]`)
                .find('[data-testid="candidate-card"]')
                .first()
                .dragToColumn(destIndex - sourceIndex);

            // THEN 1: la tarjeta aparece dentro de la nueva columna.
            cy.get(`[data-testid="stage-column-${destIndex}"]`)
                .find(`[data-candidate-id="${draggedCandidate.candidateId}"]`)
                .should('be.visible');

            // THEN 2 y 3: se disparó el PUT con el applicationId y la fase de
            // destino correctos, y el backend respondió 200.
            cy.wait('@updateCandidateStep').then((interception) => {
                expect(interception.request.body.applicationId).to.eq(draggedCandidate.applicationId);
                expect(interception.request.body.currentInterviewStep).to.eq(destStepId);
                expect(interception.response.statusCode).to.eq(200);
            });
        });
    });
});
