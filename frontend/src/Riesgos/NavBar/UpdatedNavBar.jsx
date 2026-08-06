import {
    AppBar, styled, Toolbar, Typography, Box, Avatar, Divider,
    Menu, MenuItem, Button, Link as MLink, IconButton, Drawer,
    List, ListItemButton, ListItemText, useTheme, useMediaQuery,
    Stack, Slide
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardIosRounded from '@mui/icons-material/ArrowForwardIosRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import apiClient from 'api/apiClient';
import { useAuth } from 'context/AuthContext';

import logoSis from 'images/logo2.png';

const NAV_COLOR = '#192854';

const StyledToolbar = styled(Toolbar)({
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8
});

const Icons = styled(Box)({
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
});

const UserBox = styled(Box)({
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
});

const UpdatedNavBar = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const CONTRAST = useMemo(() => theme.palette.getContrastText(NAV_COLOR), [theme]);

    const [roles, setRoles] = useState([]);
    const [userAnchor, setUserAnchor] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [logo, setLogo] = useState(logoSis);
    const [fotoPerfil, setFotoPerfil] = useState('');

    const [groupAnchor, setGroupAnchor] = useState(null);
    const [openGroup, setOpenGroup] = useState(null);

    const [moduleAnchor, setModuleAnchor] = useState(null);
    const [openModule, setOpenModule] = useState(null);

    const [mobileStage, setMobileStage] = useState('sections');
    const [selectedSection, setSelectedSection] = useState(null);

    const currentPath = useMemo(
        () => (location.pathname || '/').replace(/\/{2,}/g, '/'),
        [location.pathname]
    );

    const norm = (s) => String(s ?? '').trim();

    const logOut = useCallback(async () => {
        try {
            await logout();
        } finally {
            setUserAnchor(null);
            navigate('/', { replace: true });
        }
    }, [logout, navigate]);

    const refreshLogo = useCallback(async () => {
        try {
            const response = await apiClient.get('/descargar/obtener-logo-barra');
            setLogo(response.data?.logo || logoSis);
        } catch (err) {
            if (err?.response?.status === 401) {
                await logOut();
                return;
            }

            setLogo(logoSis);
        }
    }, [logOut]);

    const refreshFotoPerfil = useCallback(async () => {
        try {
            const response = await apiClient.get('/descargar/obtener-foto-perfil');
            setFotoPerfil(response.data?.foto || '');
        } catch (err) {
            if (err?.response?.status === 401) {
                await logOut();
                return;
            }

            setFotoPerfil('');
        }
    }, [logOut]);

    const obtenerRoles = useCallback(async () => {
        try {
            const response = await apiClient.get('/api/roles-actualizados', {
                params: {
                    codigo_aplicacion: 1
                }
            });

            const data = response?.data || {};

            if (data.auth === false) {
                await logOut();
                return;
            }

            setRoles(data.result || []);
        } catch (err) {
            if (err?.response?.status === 401) {
                await logOut();
                return;
            }

            console.error('[NAVBAR][ROLES]', err);
            setRoles([]);
        }
    }, [logOut]);

    useEffect(() => {
        setLogo(logoSis);
        obtenerRoles();
        refreshLogo();
        refreshFotoPerfil();
    }, [obtenerRoles, refreshLogo, refreshFotoPerfil]);

    const secciones = {
        'Módulo de Administración': [
            'Administración',
            'Administración por dirección',
            'Logs',
            'Métricas'
        ],
        'Módulo de Control Interno y Gobernanza': [
            'Consolidado de documentos de evaluación de la eficiencia del control interno y gobernanza',
            'Consolidado de evaluación de la eficiencia del control interno y gobernanza',
            'Entrada de evaluación de la eficiencia del control interno y gobernanza',
            'Revisión de evaluación de la eficiencia del control interno y gobernanza',
            'Revisión de superior de evaluación de la eficiencia del control interno y gobernanza',
            'Mantenimiento de evaluación de la eficiencia del control interno y gobernanza'
        ],
        'Módulo de Evaluación de Riesgos asociados al Fraude o Corrupción': [
            'Consolidado de documentos de riesgos de fraude o corrupción',
            'Consolidado de riesgos de fraude o corrupción',
            'Entrada de riesgos de fraude o corrupción',
            'Revisión de riesgos de fraude o corrupción',
            'Revisión de superior de evaluación de riesgos de fraude o corrupción',
            'Mantenimiento de riesgos de fraude o corrupción'
        ],
        'Módulo de Evaluación y Gestión del Riesgo': [
            'Consolidado de documentos de evaluación y gestión de riesgos',
            'Entrada de evaluación y gestión de riesgos',
            'Revisión de evaluación y gestión de riesgos',
            'Revisión de superior de evaluación y gestión de riesgos',
            'Consolidado de riesgos'
        ],
        'Módulo de Mapa de Riesgos': [
            'Consolidado de documentos de mapa de riesgos',
            'Entrada de mapa de Riesgos',
            'Revisión de mapa de riesgos',
            'Revisión de superior de mapa de riesgos',
            'Consolidado de riesgos'
        ],
        'Módulo de Continuidad y Monitoreo': [
            'Consolidado de documentos de continuidad y monitoreo',
            'Entrada de continuidad y monitoreo',
            'Revision de continuidad y monitoreo',
            'Revisión de superior de continuidad y monitoreo',
            'Consolidado de riesgos'
        ],
        'Módulo de Informe Anual': ['Informe Anual'],
        'Módulo de Monitoreo del Comportamiento de los Riesgos': [
            'Seguimiento',
            'Monitoreo de riesgos entre periodos',
            'Seguimiento de control interno institucional'
        ],
        'Módulo de Reportes': ['Reportes'],
        'Módulo de Carga de Documentos': ['archivos'],
        'Catálogos y mantenimientos': [
            'Areas',
            'Dependencia',
            'Direcciones',
            'Mantenimiento de propiedades de riesgos y reportes',
            'Objetivos',
            'Organos',
            'Períodos',
            'Tipo de Objetivo',
            'Viceministerios'
        ]
    };

    const ordenSecciones = [
        'Módulo de Administración',
        'Módulo de Control Interno y Gobernanza',
        'Módulo de Evaluación de Riesgos asociados al Fraude o Corrupción',
        'Módulo de Evaluación y Gestión del Riesgo',
        'Módulo de Mapa de Riesgos',
        'Módulo de Continuidad y Monitoreo',
        'Módulo de Monitoreo del Comportamiento de los Riesgos',
        'Módulo de Informe Anual',
        'Módulo de Reportes',
        'Módulo de Carga de Documentos',
        'Catálogos y mantenimientos',
        'Otros'
    ];

    const gruposDesktop = {
        'Administración': [
            'Módulo de Administración',
            'Catálogos y mantenimientos'
        ],
        'Matrices': [
            'Módulo de Control Interno y Gobernanza',
            'Módulo de Evaluación de Riesgos asociados al Fraude o Corrupción'
        ],
        'Riesgos': [
            'Módulo de Evaluación y Gestión del Riesgo',
            'Módulo de Mapa de Riesgos',
            'Módulo de Continuidad y Monitoreo',
            'Módulo de Monitoreo del Comportamiento de los Riesgos'
        ],
        'Reportes': [
            'Módulo de Informe Anual',
            'Módulo de Reportes'
        ],
        'Otros': ['Otros']
    };

    const ordenGrupos = ['Administración', 'Matrices', 'Riesgos', 'Reportes', 'Otros'];

    const uniqueRoles = useMemo(() => {
        const seen = new Set();
        const out = [];

        for (const r of roles) {
            const key = `${norm(r.NOMBRE)}|${norm(r.URL)}`;

            if (seen.has(key)) continue;

            seen.add(key);
            out.push(r);
        }

        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roles]);

    const agrupado = useMemo(() => {
        const out = {};

        ordenSecciones.forEach((sec) => {
            out[sec] = [];
        });

        const etiquetasPorSeccion = new Map(
            Object.entries(secciones).map(([sec, etiquetas]) => [
                sec,
                (etiquetas || []).map(norm)
            ])
        );

        const usedKeys = new Set();

        for (const item of uniqueRoles) {
            const etiqueta = norm(item.NOMBRE);
            const itemKey = `${norm(item.NOMBRE)}|${norm(item.URL)}`;

            if (usedKeys.has(itemKey)) continue;

            let placed = false;

            for (const sec of ordenSecciones) {
                const etiquetas = etiquetasPorSeccion.get(sec) || [];

                if (etiquetas.includes(etiqueta)) {
                    out[sec].push(item);
                    usedKeys.add(itemKey);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                out.Otros.push(item);
                usedKeys.add(itemKey);
            }
        }

        for (const sec of ordenSecciones) {
            const seen = new Set();

            out[sec] = (out[sec] || [])
                .filter((it) => {
                    const k = `${norm(it.NOMBRE)}|${norm(it.URL)}`;

                    if (seen.has(k)) return false;

                    seen.add(k);
                    return true;
                })
                .sort((a, b) => norm(a.NOMBRE).localeCompare(norm(b.NOMBRE)));
        }

        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uniqueRoles]);

    const buildHref = (url = '') => {
        const clean = norm(url);

        if (!clean) return '/riesgos';

        const withSlash = clean.startsWith('/') ? clean : `/${clean}`;

        return `/riesgos${withSlash}`.replace(/\/{2,}/g, '/');
    };

    const activeSection = useMemo(() => {
        const path = (currentPath || '/').replace(/\/+$/, '');

        for (const sec of ordenSecciones) {
            for (const item of (agrupado[sec] || [])) {
                const href = buildHref(item.URL).replace(/\/+$/, '');

                if (path === href || path.startsWith(`${href}/`)) {
                    return sec;
                }
            }
        }

        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPath, agrupado]);

    const activeGroup = useMemo(() => {
        if (!activeSection) return null;

        for (const [grupo, secs] of Object.entries(gruposDesktop)) {
            if (secs.includes(activeSection)) return grupo;
        }

        return null;
    }, [activeSection]);

    const handleOpenGroupMenu = (e, grupo) => {
        setGroupAnchor(e.currentTarget);
        setOpenGroup(grupo);
        setModuleAnchor(null);
        setOpenModule(null);
    };

    const handleCloseGroupMenu = () => {
        setGroupAnchor(null);
        setOpenGroup(null);
        setModuleAnchor(null);
        setOpenModule(null);
    };

    const handleOpenModuleMenu = (event, sectionName) => {
        setModuleAnchor(event.currentTarget);
        setOpenModule(sectionName);
    };

    const handleCloseModuleMenu = () => {
        setModuleAnchor(null);
        setOpenModule(null);
    };

    const TOOLBAR_MOBILE = 56;
    const TOOLBAR_DESKTOP = 64;

    const renderGroupMenuContent = () => {
        if (!openGroup) return <MenuItem disabled>(Sin opciones)</MenuItem>;

        if (openGroup === 'Otros') {
            const items = agrupado.Otros || [];

            if (!items.length) return <MenuItem disabled>(Sin opciones)</MenuItem>;

            return items.map((item, idx) => {
                const href = buildHref(item.URL);
                const isActiveItem =
                    currentPath === href || currentPath.startsWith(`${href}/`);

                return (
                    <MenuItem
                        key={`otros-${norm(item.NOMBRE)}-${idx}`}
                        component={RouterLink}
                        to={href}
                        onClick={handleCloseGroupMenu}
                        selected={isActiveItem}
                    >
                        {item.NOMBRE}
                    </MenuItem>
                );
            });
        }

        const seccionesGrupo = gruposDesktop[openGroup] || [];
        const modulesWithItems = seccionesGrupo.filter(
            (sec) => (agrupado[sec] || []).length > 0
        );

        if (!modulesWithItems.length) {
            return <MenuItem disabled>(Sin opciones)</MenuItem>;
        }

        return modulesWithItems.map((sec) => (
            <MenuItem
                key={`${openGroup}-${sec}`}
                onClick={(e) => handleOpenModuleMenu(e, sec)}
                sx={{ justifyContent: 'space-between', gap: 2 }}
            >
                <Box
                    component="span"
                    sx={{ opacity: 0.8, fontWeight: 600, fontSize: 13 }}
                >
                    {sec}
                </Box>

                <ChevronRightRounded fontSize="small" />
            </MenuItem>
        ));
    };

    const renderModuleMenuContent = () => {
        if (!openModule) return <MenuItem disabled>(Sin opciones)</MenuItem>;

        const items = agrupado[openModule] || [];

        if (!items.length) return <MenuItem disabled>(Sin opciones)</MenuItem>;

        return items.map((item, idx) => {
            const href = buildHref(item.URL);
            const isActiveItem =
                currentPath === href || currentPath.startsWith(`${href}/`);

            return (
                <MenuItem
                    key={`${openModule}-${norm(item.NOMBRE)}-${idx}`}
                    component={RouterLink}
                    to={href}
                    onClick={() => {
                        handleCloseModuleMenu();
                        handleCloseGroupMenu();
                    }}
                    selected={isActiveItem}
                >
                    {item.NOMBRE}
                </MenuItem>
            );
        });
    };

    const MobileDrawerContent = () => {
        const SectionsView = (
            <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Menú
                    </Typography>

                    <IconButton aria-label="Cerrar" onClick={() => setDrawerOpen(false)}>
                        <CloseRounded />
                    </IconButton>
                </Stack>

                <List>
                    {ordenSecciones.map((sec) => (
                        (agrupado[sec]?.length > 0) && (
                            <ListItemButton
                                key={sec}
                                onClick={() => {
                                    setSelectedSection(sec);
                                    setMobileStage('options');
                                }}
                                selected={sec === activeSection}
                                sx={{
                                    borderRadius: 1,
                                    ...(sec === activeSection
                                        ? {
                                            bgcolor: `${CONTRAST}26`,
                                            '&:hover': { bgcolor: `${CONTRAST}32` }
                                        }
                                        : {})
                                }}
                            >
                                <ListItemText
                                    primary={sec}
                                    primaryTypographyProps={{
                                        sx: {
                                            textDecoration: sec === activeSection ? 'underline' : 'none'
                                        }
                                    }}
                                />

                                <ArrowForwardIosRounded fontSize="small" />
                            </ListItemButton>
                        )
                    ))}
                </List>
            </Box>
        );

        const OptionsView = (
            <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton onClick={() => setMobileStage('sections')} aria-label="Atrás">
                            <ArrowBackRounded />
                        </IconButton>

                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {selectedSection}
                        </Typography>
                    </Stack>

                    <IconButton aria-label="Cerrar" onClick={() => setDrawerOpen(false)}>
                        <CloseRounded />
                    </IconButton>
                </Stack>

                <List disablePadding>
                    <Divider />

                    {(agrupado[selectedSection] || []).map((item, idx) => {
                        const href = buildHref(item.URL);
                        const isActiveItem =
                            currentPath === href || currentPath.startsWith(`${href}/`);

                        return (
                            <Box
                                component="li"
                                key={`${selectedSection}-${norm(item.NOMBRE)}-${idx}`}
                                sx={{ listStyle: 'none' }}
                            >
                                <ListItemButton
                                    component={RouterLink}
                                    to={href}
                                    onClick={() => setDrawerOpen(false)}
                                    selected={isActiveItem}
                                    sx={{
                                        borderRadius: 1,
                                        ...(isActiveItem
                                            ? {
                                                bgcolor: `${CONTRAST}26`,
                                                '&:hover': { bgcolor: `${CONTRAST}32` }
                                            }
                                            : {})
                                    }}
                                >
                                    <ListItemText
                                        primary={item.NOMBRE}
                                        primaryTypographyProps={{
                                            sx: {
                                                textDecoration: isActiveItem ? 'underline' : 'none'
                                            }
                                        }}
                                    />
                                </ListItemButton>

                                <Divider />
                            </Box>
                        );
                    })}
                </List>
            </Box>
        );

        return (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <Slide
                    in={mobileStage === 'sections'}
                    direction="right"
                    mountOnEnter
                    unmountOnExit
                >
                    <Box sx={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
                        {SectionsView}
                    </Box>
                </Slide>

                <Slide
                    in={mobileStage === 'options'}
                    direction="left"
                    mountOnEnter
                    unmountOnExit
                >
                    <Box sx={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
                        {OptionsView}
                    </Box>
                </Slide>
            </Box>
        );
    };

    return (
        <>
            <AppBar
                position="sticky"
                sx={{
                    background: NAV_COLOR,
                    zIndex: (t) => t.zIndex.drawer + 1
                }}
            >
                <StyledToolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {logo && (
                            <Box
                                component="img"
                                src={logo}
                                alt="Sistema de Gestión de Riesgos"
                                sx={{ height: { xs: 38, md: 48 }, width: { xs: 126, md: 170 }, objectFit: 'contain', mr: 1 }}
                            />
                        )}

                        {isMobile && (
                            <IconButton
                                sx={{ color: CONTRAST }}
                                onClick={() => {
                                    setDrawerOpen(true);
                                    setMobileStage('sections');
                                    setSelectedSection(null);
                                }}
                                aria-label="Abrir menú"
                            >
                                <MenuIcon />
                            </IconButton>
                        )}
                    </Box>

                    <Box
                        sx={{
                            display: { xs: 'flex', md: 'none' },
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Typography
                            variant="h6"
                            component={RouterLink}
                            to="/riesgos"
                            sx={{
                                color: CONTRAST,
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                textAlign: 'center',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                            }}
                        >
                            Sistema de Gestión de Riesgos
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            gap: 0.5
                        }}
                    >
                        <Typography
                            variant="h6"
                            component={RouterLink}
                            to="/riesgos"
                            sx={{
                                fontSize: { md: 18, lg: 20 },
                                color: CONTRAST,
                                fontWeight: 600,
                                lineHeight: 1,
                                mt: 2,
                                mb: 1,
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                            }}
                        >
                            Sistema de Gestión de Riesgos
                        </Typography>

                        <Box
                            sx={{
                                height: '37px',
                                width: '100%',
                                maxWidth: '1100px',
                                overflowX: 'auto',
                                whiteSpace: 'nowrap',
                                display: 'block',
                                textAlign: 'center',
                                px: 1,
                                pb: 0.5,
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(0,0,0,0.45) transparent',
                                '&::-webkit-scrollbar': { height: 8 },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: 'rgba(0,0,0,0.45)',
                                    borderRadius: 8,
                                    border: '2px solid transparent'
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.6)'
                                },
                                '&::-webkit-scrollbar-corner': {
                                    background: 'transparent'
                                }
                            }}
                        >
                            <Box
                                component="span"
                                sx={{ display: 'inline-flex', gap: 0.75, mx: 0.5 }}
                            >
                                {ordenGrupos.map((grupo) => {
                                    const seccionesGrupo = gruposDesktop[grupo] || [];
                                    const hasItems = seccionesGrupo.some(
                                        (sec) => (agrupado[sec] || []).length > 0
                                    );

                                    if (!hasItems) return null;

                                    const isActive = grupo === activeGroup;

                                    return (
                                        <Button
                                            key={grupo}
                                            variant="text"
                                            disableRipple
                                            onClick={(e) => handleOpenGroupMenu(e, grupo)}
                                            endIcon={
                                                <ExpandMoreRounded
                                                    sx={{ opacity: isActive ? 1 : 0.6 }}
                                                />
                                            }
                                            sx={{
                                                height: '20px',
                                                position: 'relative',
                                                textTransform: 'none',
                                                color: CONTRAST,
                                                whiteSpace: 'nowrap',
                                                px: 1.25,
                                                fontWeight: isActive ? 700 : 600,
                                                backgroundColor: 'transparent',
                                                '&:hover': {
                                                    backgroundColor: 'transparent'
                                                },
                                                '::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    left: 10,
                                                    right: 10,
                                                    bottom: -6,
                                                    height: 4,
                                                    borderRadius: 2,
                                                    backgroundColor: CONTRAST,
                                                    transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                                                    opacity: isActive ? 1 : 0,
                                                    transformOrigin: 'center',
                                                    transition: 'transform 200ms ease, opacity 150ms ease'
                                                },
                                                '&:hover::after': {
                                                    transform: 'scaleX(1)',
                                                    opacity: 1
                                                }
                                            }}
                                        >
                                            {grupo}
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>

                    <Icons>
                        <UserBox
                            onClick={(e) => setUserAnchor(e.currentTarget)}
                            sx={{ cursor: 'pointer' }}
                        >
                            <Avatar
                                sx={{ width: 40, height: 40 }}
                                src={fotoPerfil || undefined}
                            />
                        </UserBox>
                    </Icons>
                </StyledToolbar>
            </AppBar>

            <Menu
                anchorEl={groupAnchor}
                open={Boolean(groupAnchor)}
                onClose={handleCloseGroupMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                PaperProps={{ sx: { maxHeight: 480, minWidth: 260 } }}
                keepMounted
            >
                {renderGroupMenuContent()}
            </Menu>

            <Menu
                anchorEl={moduleAnchor}
                open={Boolean(moduleAnchor)}
                onClose={handleCloseModuleMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ sx: { maxHeight: 480, minWidth: 280 } }}
                keepMounted
            >
                {renderModuleMenuContent()}
            </Menu>

            <Menu
                anchorEl={userAnchor}
                open={Boolean(userAnchor)}
                onClose={() => setUserAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem
                    component={RouterLink}
                    to="/riesgos/perfil"
                    onClick={() => setUserAnchor(null)}
                >
                    Perfil
                </MenuItem>

                <Divider />

                <MenuItem onClick={logOut}>
                    Cerrar sesión
                </MenuItem>
            </Menu>

            <Drawer
                anchor="top"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    '& .MuiBackdrop-root': {
                        top: { xs: TOOLBAR_MOBILE, sm: TOOLBAR_DESKTOP },
                        height: {
                            xs: `calc(100% - ${TOOLBAR_MOBILE}px)`,
                            sm: `calc(100% - ${TOOLBAR_DESKTOP}px)`
                        }
                    },
                    '& .MuiDrawer-paper': {
                        top: { xs: TOOLBAR_MOBILE, sm: TOOLBAR_DESKTOP },
                        height: {
                            xs: `calc(100% - ${TOOLBAR_MOBILE}px)`,
                            sm: `calc(100% - ${TOOLBAR_DESKTOP}px)`
                        },
                        width: '100%'
                    }
                }}
            >
                <MobileDrawerContent />
            </Drawer>
        </>
    );
};

export default UpdatedNavBar;
