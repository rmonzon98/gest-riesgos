export const localeTextES = {
    noRowsLabel: 'No hay registros',
    columnMenuLabel: 'Menú',
    columnMenuShowColumns: 'Mostrar columnas',
    columnMenuFilter: 'Filtrar',
    columnMenuHideColumn: 'Ocultar',
    columnMenuUnsort: 'Quitar orden',
    columnMenuSortAsc: 'Ordenar de forma ascendente',
    columnMenuSortDesc: 'Ordenar de forma descendente',
    footerRowSelected: (count) =>
        count === 1 ? `${count} fila seleccionada` : `${count} filas seleccionadas`,
    footerTotalRows: 'Total de filas:',
    footerPaginationRowsPerPage: 'Filas por página:', // ✅ Traducción corregida
    footerPagination: (pagination) =>
        `${pagination.from}-${pagination.to} de ${pagination.count}`,
    toolbarFilters: 'Filtros',
    toolbarFiltersTooltipHide: 'Ocultar filtros',
    toolbarFiltersTooltipShow: 'Mostrar filtros',
    toolbarDensity: 'Densidad',
    toolbarDensityLabel: 'Densidad',
    toolbarDensityCompact: 'Compacta',
    toolbarDensityStandard: 'Estándar',
    toolbarDensityComfortable: 'Cómoda',
    MuiTablePagination: {
        labelRowsPerPage: 'Filas por página:', // ✅ Traducción del selector de paginación
    }
};