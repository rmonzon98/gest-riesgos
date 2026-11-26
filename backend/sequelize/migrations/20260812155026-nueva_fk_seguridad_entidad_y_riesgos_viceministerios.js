'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Eliminar la FK actual que apunta a seguridad_viceministerio
        await queryInterface.removeConstraint(
            'seguridad_entidad',
            'seguridad_entidad_seguridad_viceministerio_FK'
        );

        // Crear la nueva FK apuntando a riesgos_viceministerio
        await queryInterface.addConstraint(
            'seguridad_entidad',
            {
                fields: ['CODIGO_CIA', 'CODIGO_VICEMINISTERIO'],
                type: 'foreign key',
                name: 'seguridad_entidad_riesgos_viceministerio_FK',
                references: {
                    table: 'riesgos_viceministerio',
                    fields: ['CODIGO_CIA', 'CODIGO_VICEMINISTERIO']
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            }
        );
    },

    async down(queryInterface, Sequelize) {
        // Eliminar la FK nueva
        await queryInterface.removeConstraint(
            'seguridad_entidad',
            'seguridad_entidad_riesgos_viceministerio_FK'
        );

        // Restaurar la FK original hacia seguridad_viceministerio
        await queryInterface.addConstraint(
            'seguridad_entidad',
            {
                fields: ['CODIGO_CIA', 'CODIGO_VICEMINISTERIO'],
                type: 'foreign key',
                name: 'seguridad_entidad_seguridad_viceministerio_FK',
                references: {
                    table: 'seguridad_viceministerio',
                    fields: ['CODIGO_CIA', 'CODIGO_VICEMINISTERIO']
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            }
        );
    }
};