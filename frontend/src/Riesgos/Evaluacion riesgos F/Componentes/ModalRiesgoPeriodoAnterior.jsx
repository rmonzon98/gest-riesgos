/**
 * @fileoverview
 * Modal para consultar y reutilizar la información de riesgos de periodos anteriores.
 *
 * @module Riesgos/Evaluacion riesgos F/Componentes/ModalRiesgoPeriodoAnterior.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useMemo } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Stack, Typography, IconButton, Button, Chip, Divider,
    Grid, TextField, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Paper
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";

/* Helpers genéricos */
const safe = (v, dash = "—") => (v == null || v === "" ? dash : v);
const riskBg = (v) =>
    !v ? "transparent" : v <= 10 ? "success.light" : v <= 15 ? "warning.light" : "error.light";

/** 
 * Toma el primer valor no vacío según una lista de claves 
 * */
const pickAny = (obj, keys = []) => {
    for (const k of keys) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && String(v) !== "") return v;
    }
    return undefined;
};

/** Extrae un código numérico desde:
 *  - número (3) → 3
 *  - string "3", "3 - Probable" → 3
 *  - otro → NaN
 */
const parseCode = (val) => {
    if (val === null || val === undefined) return NaN;
    if (typeof val === "number") return Number(val);
    const m = String(val).match(/^\s*(\d+)/);
    return m ? Number(m[1]) : NaN;
};

/** Busca descripción por código en [{CODIGO, DESCRIPCION}] */
const findDesc = (arr, code, dash = "—") => {
    if (!Array.isArray(arr)) return dash;
    const it = arr.find((x) => String(x.CODIGO) === String(code));
    return it ? (it.DESCRIPCION ?? dash) : dash;
};

/** Busca genérico por código con clave variable (DESCRIPCION/NOMBRE) */
const findGeneric = (arr, code, key = "DESCRIPCION", dash = "—") => {
    if (!Array.isArray(arr)) return dash;
    const it = arr.find((x) => String(x.CODIGO) === String(code));
    return it ? (it[key] ?? dash) : dash;
};

const displayFromCatalogOrText = ({ catsArr, code, text, key = "DESCRIPCION", dash = "—" }) => {
    if (code !== undefined && code !== null && String(code) !== "" && Array.isArray(catsArr)) {
        const found =
            key === "DESCRIPCION" ? findDesc(catsArr, code, undefined) : findGeneric(catsArr, code, key, undefined);
        if (found !== undefined) return found;
    }
    return safe(text, dash);
};

/**
 * Modal para consultar la información de un riesgo en el periodo anterior.
 *
 * Facilita la comparación y reutilización de datos históricos.
 *
 * @component
 */
export default function ModalRiesgoPeriodoAnterior({
    open,
    onClose,
    riesgo = {},
    cats = {},
    periodoAnterior,
    siglas = "",
}) {
  
    // Identificadores y referencias
    const codigoRiesgo = pickAny(riesgo, ["CODIGO_RIESGO", "Código de riesgo"]);
    const codigoEntidad = pickAny(riesgo, ["CODIGO_ENTIDAD", "Entidad"]);
    const ref = pickAny(riesgo, ["REF", "Ref.", "Ref"]);

    const areaCode = pickAny(riesgo, ["CODIGO_AREA"]);
    const areaText = pickAny(riesgo, ["Área evaluada", "Area evaluada", "Área", "Area"]);

    const tipoObjCode = pickAny(riesgo, ["CODIGO_TIPO_OBJETIVO"]);
    const tipoObjText = pickAny(riesgo, ["Tipo de objetivo", "Tipo objetivo"]);

    const objetivoCode = pickAny(riesgo, ["CODIGO_OBJETIVO"]);
    const objetivoText = pickAny(riesgo, ["Objetivo"]);

    const descripcion = pickAny(riesgo, ["DESCRIPCION", "Descripción del riesgo", "Descripcion del riesgo"]);
    

    const probCode = parseCode(pickAny(riesgo, ["CODIGO_PROBABILIDAD", "Probabilidad"]));
    const probText = pickAny(riesgo, ["Probabilidad"]);

    const sevCode = parseCode(pickAny(riesgo, ["CODIGO_SEVERIDAD", "Severidad"]));
    const sevText = pickAny(riesgo, ["Severidad"]);

    // Mitigación
    const mitigCodeRaw = pickAny(riesgo, ["CODIGO_MITIGACION", "Eficiencia del mitigador"]);
    const mitigCode = parseCode(mitigCodeRaw); 
    const mitigText = pickAny(riesgo, ["Eficiencia del mitigador"]);
    const capEfectiva = Number.isFinite(mitigCode) ? Math.max(0, mitigCode - 1) : undefined;

    const varMit = String(pickAny(riesgo, ["VARIABLE_MITIGACION", "A mitigar"]) || "")
        .trim()
        .toUpperCase()
        .slice(0, 1);

    // Tabla de cálculo (acepta nombres alternativos)
    const probAdj = Number(
        pickAny(riesgo, ["PROBABILIDAD_AJUSTADA", "Probabilidad ajustada"])
    ) || (Number.isFinite(probCode) ? (varMit === "P" ? Math.max(1, probCode - (capEfectiva ?? 0)) : probCode) : undefined);

    const sevAdj = Number(
        pickAny(riesgo, ["SEVERIDAD_AJUSTADA", "Severidad ajustada"])
    ) || (Number.isFinite(sevCode) ? (varMit === "S" ? Math.max(1, sevCode - (capEfectiva ?? 0)) : sevCode) : undefined);

    const inh =
        Number(pickAny(riesgo, ["RIESGO_INHERENTE", "Riesgo Inherente"])) ||
        (Number.isFinite(probCode) && Number.isFinite(sevCode) ? probCode * sevCode : undefined);

    const res =
        Number(pickAny(riesgo, ["RIESGO_RESIDUAL", "Riesgo residual"])) ||
        (Number.isFinite(probAdj) && Number.isFinite(sevAdj) ? probAdj * sevAdj : undefined);

    // Extras
    const extras = useMemo(() => {
        const e = pickAny(riesgo, ["EXTRAS_JSON"]) ?? {};
        if (!e) return [];
        if (typeof e === "object") return Object.entries(e);
        try {
            const parsed = JSON.parse(e);
            return typeof parsed === "object" && !Array.isArray(parsed) ? Object.entries(parsed) : [];
        } catch {
            return [];
        }
    }, [riesgo]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" color="text.secondary">
                        Período anterior
                    </Typography>
                    <Chip size="small" label={`Período ${periodoAnterior ?? "—"}`} />
                    {!!siglas && <Chip size="small" variant="outlined" label={siglas} />}
                </Stack>
                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>
                    Riesgo del período anterior
                </Typography>
                <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
                    <CloseRounded />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>

                    {/* Catálogos principales */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="REF"
                                value={safe(ref)}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Área de evaluación"
                                value={displayFromCatalogOrText({
                                    catsArr: cats.areas,
                                    code: areaCode,
                                    text: areaText,
                                })}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tipo de objetivo"
                                value={displayFromCatalogOrText({
                                    catsArr: cats.tiposObjetivo,
                                    code: tipoObjCode,
                                    text: tipoObjText,
                                })}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Objetivo"
                                value={displayFromCatalogOrText({
                                    catsArr: cats.objetivosPorTipo, // si lo pasas precargado
                                    code: objetivoCode,
                                    text: objetivoText,
                                })}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Descripción del riesgo"
                                value={safe(descripcion)}
                                fullWidth size="small" multiline minRows={2}
                                InputProps={{ readOnly: true }}
                            />
                        </Grid>
                    </Grid>

                    <Divider />

                    {/* Variables base y mitigación */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Probabilidad"
                                value={probCode + ' - ' + displayFromCatalogOrText({
                                    catsArr: cats.probabilidad,
                                    code: probCode,
                                    text: probText,
                                })}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Severidad"
                                value={sevCode + ' - ' + displayFromCatalogOrText({
                                    catsArr: cats.severidad,
                                    code: sevCode,
                                    text: sevText,
                                })}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="A mitigar"
                                value={varMit === "S" ? "Severidad" : varMit === "P" ? "Probabilidad" : "—"}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Eficiencia del mitigador"
                                value={displayFromCatalogOrText({
                                    catsArr: cats.capacidadMitigacion,
                                    code: mitigCode,
                                    text: mitigText,
                                })}
                                fullWidth size="small" InputProps={{ readOnly: true }}
                                helperText={
                                    Number.isFinite(mitigCode) ? `Efectiva: ${Math.max(0, mitigCode - 1)}` : " "
                                }
                            />
                        </Grid>
                    </Grid>

                    {/* Tabla de cálculo */}
                    <TableContainer component={Paper} sx={{ borderRadius: 1, border: "1px solid #e0e0e0" }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Probabilidad</TableCell>
                                    <TableCell>Severidad</TableCell>
                                    <TableCell>A mitigar</TableCell>
                                    <TableCell>Capacidad mitigación (efectiva)</TableCell>
                                    <TableCell>Riesgo inherente</TableCell>
                                    <TableCell>Prob. ajustada</TableCell>
                                    <TableCell>Sev. ajustada</TableCell>
                                    <TableCell>Riesgo residual</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow hover>
                                    <TableCell>
                                        {probCode + ' - ' + displayFromCatalogOrText({ catsArr: cats.probabilidad, code: probCode, text: probText })}
                                    </TableCell>
                                    <TableCell>
                                        {sevCode + ' - ' + displayFromCatalogOrText({ catsArr: cats.severidad, code: sevCode, text: sevText })}
                                    </TableCell>
                                    <TableCell>{varMit === "S" ? "Severidad" : varMit === "P" ? "Probabilidad" : "—"}</TableCell>
                                    <TableCell>
                                        {Number.isFinite(mitigCode) ? Math.max(0, mitigCode - 1) : "—"}
                                    </TableCell>
                                    <TableCell sx={{ bgcolor: riskBg(Number(inh)) }}>
                                        {Number.isFinite(inh) ? inh : "—"}
                                    </TableCell>
                                    <TableCell>{Number.isFinite(probAdj) ? probAdj : "—"}</TableCell>
                                    <TableCell>{Number.isFinite(sevAdj) ? sevAdj : "—"}</TableCell>
                                    <TableCell sx={{ bgcolor: riskBg(Number(res)) }}>
                                        {Number.isFinite(res) ? res : "—"}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}
