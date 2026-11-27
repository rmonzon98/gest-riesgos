-- Carga inicial para las instituciones que todavía no tienen términos.
INSERT INTO riesgos_glosario (CODIGO_CIA, TITULO, DESCRIPCION, DESTACAR, ESTADO)
SELECT institucion.CODIGO_CIA, termino.titulo, termino.descripcion, 1, '1'
FROM seguridad_institucion institucion
CROSS JOIN (
    SELECT 1 AS orden, 'Riesgo' AS titulo,
        'Posibilidad de que un evento afecte el logro de los objetivos de la institución.' AS descripcion
    UNION ALL SELECT 2, 'Riesgo inherente',
        'Nivel de riesgo estimado antes de considerar los controles existentes.'
    UNION ALL SELECT 3, 'Riesgo residual',
        'Nivel de riesgo que permanece después de aplicar los controles.'
    UNION ALL SELECT 4, 'Probabilidad',
        'Estimación de la posibilidad de que ocurra un evento en el periodo evaluado.'
    UNION ALL SELECT 5, 'Severidad',
        'Magnitud de las consecuencias que tendría el evento si ocurriera.'
    UNION ALL SELECT 6, 'Capacidad de mitigación',
        'Grado en que un control reduce la probabilidad o la severidad de un riesgo.'
    UNION ALL SELECT 7, 'Tolerancia al riesgo',
        'Nivel de riesgo que la institución acepta antes de requerir un tratamiento adicional.'
    UNION ALL SELECT 8, 'Unidad competente',
        'Dirección o unidad con atribuciones para gestionar, tratar y dar seguimiento a un riesgo.'
) termino
WHERE NOT EXISTS (
    SELECT 1 FROM riesgos_glosario existente WHERE existente.CODIGO_CIA = institucion.CODIGO_CIA
)
ORDER BY institucion.CODIGO_CIA, termino.orden;
