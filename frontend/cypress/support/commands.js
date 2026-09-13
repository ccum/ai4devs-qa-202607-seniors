// Comandos personalizados de Cypress.

/**
 * Arrastra una tarjeta de react-beautiful-dnd entre columnas.
 *
 * No se usa un plugin genérico de drag & drop (p. ej. @4tw/cypress-drag-drop)
 * porque esos plugins emiten eventos HTML5 (dragstart/dragover/drop) y un único
 * mousemove, mientras que react-beautiful-dnd implementa su propio sensor de
 * ratón: exige un mousedown, varios mousemove que superen su umbral de 5px y que
 * se procesen en requestAnimationFrame, y un mouseup. Con un solo mousemove rbd
 * nunca llega a registrar el movimiento sobre la columna destino.
 *
 * En su lugar se usa el sensor de teclado de rbd, que es parte de su API
 * accesible y soportada: espacio levanta la tarjeta, las flechas la mueven entre
 * columnas y espacio la suelta. Es determinista, no depende de coordenadas y
 * dispara exactamente el mismo onDragEnd que el arrastre con ratón.
 *
 * @param {number} steps  columnas a desplazar: positivo a la derecha, negativo a
 *                        la izquierda.
 */
Cypress.Commands.add('dragToColumn', { prevSubject: 'element' }, (subject, steps) => {
    const SPACE = { keyCode: 32, key: ' ', code: 'Space', which: 32, force: true };
    const ARROW_RIGHT = { keyCode: 39, key: 'ArrowRight', code: 'ArrowRight', which: 39, force: true };
    const ARROW_LEFT = { keyCode: 37, key: 'ArrowLeft', code: 'ArrowLeft', which: 37, force: true };

    const direction = steps >= 0 ? ARROW_RIGHT : ARROW_LEFT;

    // Levantar la tarjeta. rbd anuncia el "lift" en el siguiente frame, de ahí
    // las esperas cortas entre pulsaciones.
    cy.wrap(subject).focus().trigger('keydown', SPACE);
    cy.wait(150);

    // Mover entre columnas. En listas verticales rbd usa las flechas izquierda y
    // derecha para saltar de un Droppable a otro.
    for (let i = 0; i < Math.abs(steps); i += 1) {
        cy.wrap(subject).trigger('keydown', direction);
        cy.wait(150);
    }

    // Soltar.
    cy.wrap(subject).trigger('keydown', SPACE);
});
