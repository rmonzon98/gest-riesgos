'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Marca los riesgos nuevos: se registran en el periodo en que se identifican,
        // pero no cuentan en métricas, reportes ni seguimiento de ese periodo.
        await queryInterface.addColumn(
            'riesgos_riesgo_extendido',
            'ES_NUEVO',
            {
                type: Sequelize.TINYINT(1),
                allowNull: false,
                defaultValue: 0,
                after: 'PERIODO_ANTERIOR'
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('riesgos_riesgo_extendido', 'ES_NUEVO');
    }
};
