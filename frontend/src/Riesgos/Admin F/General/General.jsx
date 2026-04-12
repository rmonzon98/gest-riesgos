/**
 * @fileoverview
 * Vista contenedora de la configuración general (detalle e imagen de logo).
 *
 * @module Riesgos/Admin F/General/General.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React from 'react'
import CambiarLogo from './CambiarLogo'
import CambiarLogoBarra from './CambiarLogoBarra'
import GeneralDetalle from './GeneralDetalle'

/**
 * Agrupa los componentes de configuración general (detalle y logo).
 *
 * @component
 */
function General() {
    return (
        <>
            <GeneralDetalle />
            <CambiarLogo />
            <CambiarLogoBarra />
        </>
    )
}

export default General