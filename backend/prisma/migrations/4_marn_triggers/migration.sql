-- Bitácora de las tablas MARN con el formato de riesgos_area.

CREATE TRIGGER `trg_riesgos_eje_estrategico_insert` AFTER INSERT ON `riesgos_eje_estrategico`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_eje_estrategico', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_EJE', NEW.CODIGO_EJE,
                'NOMBRE', NEW.NOMBRE,
                'DESCRIPCION', NEW.DESCRIPCION,
                'ORDEN', NEW.ORDEN,
                'ESTADO', NEW.ESTADO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_eje_estrategico_update` AFTER UPDATE ON `riesgos_eje_estrategico`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_eje_estrategico', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_EJE', OLD.CODIGO_EJE,
                'NOMBRE', OLD.NOMBRE,
                'DESCRIPCION', OLD.DESCRIPCION,
                'ORDEN', OLD.ORDEN,
                'ESTADO', OLD.ESTADO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_EJE', NEW.CODIGO_EJE,
                'NOMBRE', NEW.NOMBRE,
                'DESCRIPCION', NEW.DESCRIPCION,
                'ORDEN', NEW.ORDEN,
                'ESTADO', NEW.ESTADO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_eje_estrategico_delete` AFTER DELETE ON `riesgos_eje_estrategico`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_eje_estrategico', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_EJE', OLD.CODIGO_EJE,
                'NOMBRE', OLD.NOMBRE,
                'DESCRIPCION', OLD.DESCRIPCION,
                'ORDEN', OLD.ORDEN,
                'ESTADO', OLD.ESTADO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_riesgo_evento_insert` AFTER INSERT ON `riesgos_riesgo_evento`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_riesgo_evento', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_EVENTO', NEW.CODIGO_EVENTO,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'DESCRIPCION', NEW.DESCRIPCION,
                'ORDEN', NEW.ORDEN,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_riesgo_evento_update` AFTER UPDATE ON `riesgos_riesgo_evento`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_riesgo_evento', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_EVENTO', OLD.CODIGO_EVENTO,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'DESCRIPCION', OLD.DESCRIPCION,
                'ORDEN', OLD.ORDEN,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_EVENTO', NEW.CODIGO_EVENTO,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'DESCRIPCION', NEW.DESCRIPCION,
                'ORDEN', NEW.ORDEN,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_riesgo_evento_delete` AFTER DELETE ON `riesgos_riesgo_evento`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_riesgo_evento', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_EVENTO', OLD.CODIGO_EVENTO,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'DESCRIPCION', OLD.DESCRIPCION,
                'ORDEN', OLD.ORDEN,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_riesgo_vinculo_insert` AFTER INSERT ON `riesgos_riesgo_vinculo`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_riesgo_vinculo', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_VINCULO', NEW.CODIGO_VINCULO,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'CODIGO_ENTIDAD_VINCULADA', NEW.CODIGO_ENTIDAD_VINCULADA,
                'CODIGO_AREA_VINCULADA', NEW.CODIGO_AREA_VINCULADA,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_riesgo_vinculo_update` AFTER UPDATE ON `riesgos_riesgo_vinculo`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_riesgo_vinculo', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_VINCULO', OLD.CODIGO_VINCULO,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'CODIGO_ENTIDAD_VINCULADA', OLD.CODIGO_ENTIDAD_VINCULADA,
                'CODIGO_AREA_VINCULADA', OLD.CODIGO_AREA_VINCULADA,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_VINCULO', NEW.CODIGO_VINCULO,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'CODIGO_ENTIDAD_VINCULADA', NEW.CODIGO_ENTIDAD_VINCULADA,
                'CODIGO_AREA_VINCULADA', NEW.CODIGO_AREA_VINCULADA,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_riesgo_vinculo_delete` AFTER DELETE ON `riesgos_riesgo_vinculo`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_riesgo_vinculo', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_VINCULO', OLD.CODIGO_VINCULO,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'CODIGO_ENTIDAD_VINCULADA', OLD.CODIGO_ENTIDAD_VINCULADA,
                'CODIGO_AREA_VINCULADA', OLD.CODIGO_AREA_VINCULADA,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_accion_insert` AFTER INSERT ON `riesgos_plan_accion`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_plan_accion', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_PLAN', NEW.CODIGO_PLAN,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'DESCRIPCION', NEW.DESCRIPCION,
                'PORCENTAJE_MITIGACION', NEW.PORCENTAJE_MITIGACION,
                'ORDEN', NEW.ORDEN,
                'CODIGO_PLAN_ANTERIOR', NEW.CODIGO_PLAN_ANTERIOR,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_accion_update` AFTER UPDATE ON `riesgos_plan_accion`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_plan_accion', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_PLAN', OLD.CODIGO_PLAN,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'DESCRIPCION', OLD.DESCRIPCION,
                'PORCENTAJE_MITIGACION', OLD.PORCENTAJE_MITIGACION,
                'ORDEN', OLD.ORDEN,
                'CODIGO_PLAN_ANTERIOR', OLD.CODIGO_PLAN_ANTERIOR,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_PLAN', NEW.CODIGO_PLAN,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'DESCRIPCION', NEW.DESCRIPCION,
                'PORCENTAJE_MITIGACION', NEW.PORCENTAJE_MITIGACION,
                'ORDEN', NEW.ORDEN,
                'CODIGO_PLAN_ANTERIOR', NEW.CODIGO_PLAN_ANTERIOR,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_accion_delete` AFTER DELETE ON `riesgos_plan_accion`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_plan_accion', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_PLAN', OLD.CODIGO_PLAN,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'DESCRIPCION', OLD.DESCRIPCION,
                'PORCENTAJE_MITIGACION', OLD.PORCENTAJE_MITIGACION,
                'ORDEN', OLD.ORDEN,
                'CODIGO_PLAN_ANTERIOR', OLD.CODIGO_PLAN_ANTERIOR,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_responsable_insert` AFTER INSERT ON `riesgos_plan_responsable`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_plan_responsable', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_RESPONSABLE_PLAN', NEW.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_PLAN', NEW.CODIGO_PLAN,
                'CODIGO_COLABORADOR', NEW.CODIGO_COLABORADOR,
                'NOMBRE_EXTERNO', NEW.NOMBRE_EXTERNO,
                'PUESTO_EXTERNO', NEW.PUESTO_EXTERNO,
                'CODIGO_FRECUENCIA', NEW.CODIGO_FRECUENCIA,
                'METODO', NEW.METODO,
                'RECURSO', NEW.RECURSO,
                'FECHA_INICIO', NEW.FECHA_INICIO,
                'FECHA_FIN', NEW.FECHA_FIN,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_responsable_update` AFTER UPDATE ON `riesgos_plan_responsable`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_plan_responsable', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_RESPONSABLE_PLAN', OLD.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_PLAN', OLD.CODIGO_PLAN,
                'CODIGO_COLABORADOR', OLD.CODIGO_COLABORADOR,
                'NOMBRE_EXTERNO', OLD.NOMBRE_EXTERNO,
                'PUESTO_EXTERNO', OLD.PUESTO_EXTERNO,
                'CODIGO_FRECUENCIA', OLD.CODIGO_FRECUENCIA,
                'METODO', OLD.METODO,
                'RECURSO', OLD.RECURSO,
                'FECHA_INICIO', OLD.FECHA_INICIO,
                'FECHA_FIN', OLD.FECHA_FIN,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_RESPONSABLE_PLAN', NEW.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_PLAN', NEW.CODIGO_PLAN,
                'CODIGO_COLABORADOR', NEW.CODIGO_COLABORADOR,
                'NOMBRE_EXTERNO', NEW.NOMBRE_EXTERNO,
                'PUESTO_EXTERNO', NEW.PUESTO_EXTERNO,
                'CODIGO_FRECUENCIA', NEW.CODIGO_FRECUENCIA,
                'METODO', NEW.METODO,
                'RECURSO', NEW.RECURSO,
                'FECHA_INICIO', NEW.FECHA_INICIO,
                'FECHA_FIN', NEW.FECHA_FIN,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_responsable_delete` AFTER DELETE ON `riesgos_plan_responsable`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_plan_responsable', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_RESPONSABLE_PLAN', OLD.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_PLAN', OLD.CODIGO_PLAN,
                'CODIGO_COLABORADOR', OLD.CODIGO_COLABORADOR,
                'NOMBRE_EXTERNO', OLD.NOMBRE_EXTERNO,
                'PUESTO_EXTERNO', OLD.PUESTO_EXTERNO,
                'CODIGO_FRECUENCIA', OLD.CODIGO_FRECUENCIA,
                'METODO', OLD.METODO,
                'RECURSO', OLD.RECURSO,
                'FECHA_INICIO', OLD.FECHA_INICIO,
                'FECHA_FIN', OLD.FECHA_FIN,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_actividad_insert` AFTER INSERT ON `riesgos_plan_actividad`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_plan_actividad', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_ACTIVIDAD', NEW.CODIGO_ACTIVIDAD,
                'CODIGO_RESPONSABLE_PLAN', NEW.CODIGO_RESPONSABLE_PLAN,
                'FECHA_ACTIVIDAD', NEW.FECHA_ACTIVIDAD,
                'DESCRIPCION', NEW.DESCRIPCION,
                'DOCUMENTO_GENERADO', NEW.DOCUMENTO_GENERADO,
                'ESTADO', NEW.ESTADO,
                'CODIGO_VERIFICADOR', NEW.CODIGO_VERIFICADOR,
                'FECHA_VERIFICACION', NEW.FECHA_VERIFICACION,
                'COMENTARIO_VERIFICADOR', NEW.COMENTARIO_VERIFICADOR,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_actividad_update` AFTER UPDATE ON `riesgos_plan_actividad`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_plan_actividad', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_ACTIVIDAD', OLD.CODIGO_ACTIVIDAD,
                'CODIGO_RESPONSABLE_PLAN', OLD.CODIGO_RESPONSABLE_PLAN,
                'FECHA_ACTIVIDAD', OLD.FECHA_ACTIVIDAD,
                'DESCRIPCION', OLD.DESCRIPCION,
                'DOCUMENTO_GENERADO', OLD.DOCUMENTO_GENERADO,
                'ESTADO', OLD.ESTADO,
                'CODIGO_VERIFICADOR', OLD.CODIGO_VERIFICADOR,
                'FECHA_VERIFICACION', OLD.FECHA_VERIFICACION,
                'COMENTARIO_VERIFICADOR', OLD.COMENTARIO_VERIFICADOR,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_ACTIVIDAD', NEW.CODIGO_ACTIVIDAD,
                'CODIGO_RESPONSABLE_PLAN', NEW.CODIGO_RESPONSABLE_PLAN,
                'FECHA_ACTIVIDAD', NEW.FECHA_ACTIVIDAD,
                'DESCRIPCION', NEW.DESCRIPCION,
                'DOCUMENTO_GENERADO', NEW.DOCUMENTO_GENERADO,
                'ESTADO', NEW.ESTADO,
                'CODIGO_VERIFICADOR', NEW.CODIGO_VERIFICADOR,
                'FECHA_VERIFICACION', NEW.FECHA_VERIFICACION,
                'COMENTARIO_VERIFICADOR', NEW.COMENTARIO_VERIFICADOR,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_actividad_delete` AFTER DELETE ON `riesgos_plan_actividad`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_plan_actividad', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_ACTIVIDAD', OLD.CODIGO_ACTIVIDAD,
                'CODIGO_RESPONSABLE_PLAN', OLD.CODIGO_RESPONSABLE_PLAN,
                'FECHA_ACTIVIDAD', OLD.FECHA_ACTIVIDAD,
                'DESCRIPCION', OLD.DESCRIPCION,
                'DOCUMENTO_GENERADO', OLD.DOCUMENTO_GENERADO,
                'ESTADO', OLD.ESTADO,
                'CODIGO_VERIFICADOR', OLD.CODIGO_VERIFICADOR,
                'FECHA_VERIFICACION', OLD.FECHA_VERIFICACION,
                'COMENTARIO_VERIFICADOR', OLD.COMENTARIO_VERIFICADOR,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_actividad_doc_insert` AFTER INSERT ON `riesgos_plan_actividad_doc`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_plan_actividad_doc', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_DOC', NEW.CODIGO_DOC,
                'CODIGO_ACTIVIDAD', NEW.CODIGO_ACTIVIDAD,
                'NOMBRE', NEW.NOMBRE,
                'MIME', NEW.MIME,
                'TAMANO', NEW.TAMANO,
                'RUTA', NEW.RUTA,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_actividad_doc_update` AFTER UPDATE ON `riesgos_plan_actividad_doc`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_plan_actividad_doc', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_DOC', OLD.CODIGO_DOC,
                'CODIGO_ACTIVIDAD', OLD.CODIGO_ACTIVIDAD,
                'NOMBRE', OLD.NOMBRE,
                'MIME', OLD.MIME,
                'TAMANO', OLD.TAMANO,
                'RUTA', OLD.RUTA,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_DOC', NEW.CODIGO_DOC,
                'CODIGO_ACTIVIDAD', NEW.CODIGO_ACTIVIDAD,
                'NOMBRE', NEW.NOMBRE,
                'MIME', NEW.MIME,
                'TAMANO', NEW.TAMANO,
                'RUTA', NEW.RUTA,
                'ACTIVO', NEW.ACTIVO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_actividad_doc_delete` AFTER DELETE ON `riesgos_plan_actividad_doc`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_plan_actividad_doc', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_DOC', OLD.CODIGO_DOC,
                'CODIGO_ACTIVIDAD', OLD.CODIGO_ACTIVIDAD,
                'NOMBRE', OLD.NOMBRE,
                'MIME', OLD.MIME,
                'TAMANO', OLD.TAMANO,
                'RUTA', OLD.RUTA,
                'ACTIVO', OLD.ACTIVO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_mensaje_insert` AFTER INSERT ON `riesgos_plan_mensaje`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_plan_mensaje', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_MENSAJE', NEW.CODIGO_MENSAJE,
                'CODIGO_RESPONSABLE_PLAN', NEW.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_AUTOR', NEW.CODIGO_AUTOR,
                'MENSAJE', NEW.MENSAJE,
                'FECHA', NEW.FECHA,
                'LEIDO', NEW.LEIDO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_mensaje_update` AFTER UPDATE ON `riesgos_plan_mensaje`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_plan_mensaje', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_MENSAJE', OLD.CODIGO_MENSAJE,
                'CODIGO_RESPONSABLE_PLAN', OLD.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_AUTOR', OLD.CODIGO_AUTOR,
                'MENSAJE', OLD.MENSAJE,
                'FECHA', OLD.FECHA,
                'LEIDO', OLD.LEIDO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_MENSAJE', NEW.CODIGO_MENSAJE,
                'CODIGO_RESPONSABLE_PLAN', NEW.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_AUTOR', NEW.CODIGO_AUTOR,
                'MENSAJE', NEW.MENSAJE,
                'FECHA', NEW.FECHA,
                'LEIDO', NEW.LEIDO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_plan_mensaje_delete` AFTER DELETE ON `riesgos_plan_mensaje`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_plan_mensaje', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_MENSAJE', OLD.CODIGO_MENSAJE,
                'CODIGO_RESPONSABLE_PLAN', OLD.CODIGO_RESPONSABLE_PLAN,
                'CODIGO_AUTOR', OLD.CODIGO_AUTOR,
                'MENSAJE', OLD.MENSAJE,
                'FECHA', OLD.FECHA,
                'LEIDO', OLD.LEIDO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_colaborador_cargo_insert` AFTER INSERT ON `riesgos_colaborador_cargo`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_colaborador_cargo', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_CARGO', NEW.CODIGO_CARGO,
                'CODIGO_COLABORADOR', NEW.CODIGO_COLABORADOR,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'NOMBRE_CARGO', NEW.NOMBRE_CARGO,
                'FECHA_POSESION', NEW.FECHA_POSESION,
                'FECHA_ENTREGA', NEW.FECHA_ENTREGA,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_colaborador_cargo_update` AFTER UPDATE ON `riesgos_colaborador_cargo`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_colaborador_cargo', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_CARGO', OLD.CODIGO_CARGO,
                'CODIGO_COLABORADOR', OLD.CODIGO_COLABORADOR,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'NOMBRE_CARGO', OLD.NOMBRE_CARGO,
                'FECHA_POSESION', OLD.FECHA_POSESION,
                'FECHA_ENTREGA', OLD.FECHA_ENTREGA,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_CARGO', NEW.CODIGO_CARGO,
                'CODIGO_COLABORADOR', NEW.CODIGO_COLABORADOR,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'NOMBRE_CARGO', NEW.NOMBRE_CARGO,
                'FECHA_POSESION', NEW.FECHA_POSESION,
                'FECHA_ENTREGA', NEW.FECHA_ENTREGA,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_colaborador_cargo_delete` AFTER DELETE ON `riesgos_colaborador_cargo`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_colaborador_cargo', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_CARGO', OLD.CODIGO_CARGO,
                'CODIGO_COLABORADOR', OLD.CODIGO_COLABORADOR,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'NOMBRE_CARGO', OLD.NOMBRE_CARGO,
                'FECHA_POSESION', OLD.FECHA_POSESION,
                'FECHA_ENTREGA', OLD.FECHA_ENTREGA,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_solicitud_eliminacion_insert` AFTER INSERT ON `riesgos_solicitud_eliminacion`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_solicitud_eliminacion', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_SOLICITUD', NEW.CODIGO_SOLICITUD,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'MOTIVO', NEW.MOTIVO,
                'CODIGO_SOLICITANTE', NEW.CODIGO_SOLICITANTE,
                'FECHA_SOLICITUD', NEW.FECHA_SOLICITUD,
                'ESTADO', NEW.ESTADO,
                'CODIGO_RESOLUTOR', NEW.CODIGO_RESOLUTOR,
                'FECHA_RESOLUCION', NEW.FECHA_RESOLUCION,
                'COMENTARIO_RESOLUCION', NEW.COMENTARIO_RESOLUCION,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_solicitud_eliminacion_update` AFTER UPDATE ON `riesgos_solicitud_eliminacion`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_solicitud_eliminacion', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_SOLICITUD', OLD.CODIGO_SOLICITUD,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'MOTIVO', OLD.MOTIVO,
                'CODIGO_SOLICITANTE', OLD.CODIGO_SOLICITANTE,
                'FECHA_SOLICITUD', OLD.FECHA_SOLICITUD,
                'ESTADO', OLD.ESTADO,
                'CODIGO_RESOLUTOR', OLD.CODIGO_RESOLUTOR,
                'FECHA_RESOLUCION', OLD.FECHA_RESOLUCION,
                'COMENTARIO_RESOLUCION', OLD.COMENTARIO_RESOLUCION,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_SOLICITUD', NEW.CODIGO_SOLICITUD,
                'CODIGO_ENTIDAD', NEW.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', NEW.CODIGO_PERIODO,
                'CODIGO_RIESGO', NEW.CODIGO_RIESGO,
                'MOTIVO', NEW.MOTIVO,
                'CODIGO_SOLICITANTE', NEW.CODIGO_SOLICITANTE,
                'FECHA_SOLICITUD', NEW.FECHA_SOLICITUD,
                'ESTADO', NEW.ESTADO,
                'CODIGO_RESOLUTOR', NEW.CODIGO_RESOLUTOR,
                'FECHA_RESOLUCION', NEW.FECHA_RESOLUCION,
                'COMENTARIO_RESOLUCION', NEW.COMENTARIO_RESOLUCION,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_solicitud_eliminacion_delete` AFTER DELETE ON `riesgos_solicitud_eliminacion`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_solicitud_eliminacion', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_SOLICITUD', OLD.CODIGO_SOLICITUD,
                'CODIGO_ENTIDAD', OLD.CODIGO_ENTIDAD,
                'CODIGO_PERIODO', OLD.CODIGO_PERIODO,
                'CODIGO_RIESGO', OLD.CODIGO_RIESGO,
                'MOTIVO', OLD.MOTIVO,
                'CODIGO_SOLICITANTE', OLD.CODIGO_SOLICITANTE,
                'FECHA_SOLICITUD', OLD.FECHA_SOLICITUD,
                'ESTADO', OLD.ESTADO,
                'CODIGO_RESOLUTOR', OLD.CODIGO_RESOLUTOR,
                'FECHA_RESOLUCION', OLD.FECHA_RESOLUCION,
                'COMENTARIO_RESOLUCION', OLD.COMENTARIO_RESOLUCION,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_glosario_insert` AFTER INSERT ON `riesgos_glosario`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'riesgos_glosario', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_TERMINO', NEW.CODIGO_TERMINO,
                'TITULO', NEW.TITULO,
                'DESCRIPCION', NEW.DESCRIPCION,
                'DESTACAR', NEW.DESTACAR,
                'ESTADO', NEW.ESTADO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_glosario_update` AFTER UPDATE ON `riesgos_glosario`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'riesgos_glosario', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_TERMINO', OLD.CODIGO_TERMINO,
                'TITULO', OLD.TITULO,
                'DESCRIPCION', OLD.DESCRIPCION,
                'DESTACAR', OLD.DESTACAR,
                'ESTADO', OLD.ESTADO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_TERMINO', NEW.CODIGO_TERMINO,
                'TITULO', NEW.TITULO,
                'DESCRIPCION', NEW.DESCRIPCION,
                'DESTACAR', NEW.DESTACAR,
                'ESTADO', NEW.ESTADO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_riesgos_glosario_delete` AFTER DELETE ON `riesgos_glosario`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'riesgos_glosario', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_TERMINO', OLD.CODIGO_TERMINO,
                'TITULO', OLD.TITULO,
                'DESCRIPCION', OLD.DESCRIPCION,
                'DESTACAR', OLD.DESTACAR,
                'ESTADO', OLD.ESTADO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_seguridad_persona_tour_insert` AFTER INSERT ON `seguridad_persona_tour`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, NEW.USUARIO_CREACION, NOW(), 'seguridad_persona_tour', 1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_COLABORADOR', NEW.CODIGO_COLABORADOR,
                'PANTALLA', NEW.PANTALLA,
                'FECHA_VISTO', NEW.FECHA_VISTO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_seguridad_persona_tour_update` AFTER UPDATE ON `seguridad_persona_tour`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = NEW.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        NEW.CODIGO_CIA, v_codigo_log, COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION), NOW(), 'seguridad_persona_tour', 2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_COLABORADOR', OLD.CODIGO_COLABORADOR,
                'PANTALLA', OLD.PANTALLA,
                'FECHA_VISTO', OLD.FECHA_VISTO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA', NEW.CODIGO_CIA,
                'CODIGO_COLABORADOR', NEW.CODIGO_COLABORADOR,
                'PANTALLA', NEW.PANTALLA,
                'FECHA_VISTO', NEW.FECHA_VISTO,
                'USUARIO_CREACION', NEW.USUARIO_CREACION,
                'FECHA_CREACION', NEW.FECHA_CREACION,
                'USUARIO_MODIFICACION', NEW.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', NEW.FECHA_MODIFICACION
            )
        )
    );
END;

CREATE TRIGGER `trg_seguridad_persona_tour_delete` AFTER DELETE ON `seguridad_persona_tour`
FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;

    SELECT IFNULL(MAX(CODIGO_LOG), 0) + 1 INTO v_codigo_log
    FROM riesgos_logs
    WHERE CODIGO_CIA = OLD.CODIGO_CIA;

    INSERT INTO riesgos_logs (
        CODIGO_CIA, CODIGO_LOG, USUARIO_CREACION, FECHA_CREACION, NOMBRE_TABLA, ACCION, INFORMACION
    ) VALUES (
        OLD.CODIGO_CIA, v_codigo_log, -1, NOW(), 'seguridad_persona_tour', 3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA', OLD.CODIGO_CIA,
                'CODIGO_COLABORADOR', OLD.CODIGO_COLABORADOR,
                'PANTALLA', OLD.PANTALLA,
                'FECHA_VISTO', OLD.FECHA_VISTO,
                'USUARIO_CREACION', OLD.USUARIO_CREACION,
                'FECHA_CREACION', OLD.FECHA_CREACION,
                'USUARIO_MODIFICACION', OLD.USUARIO_MODIFICACION,
                'FECHA_MODIFICACION', OLD.FECHA_MODIFICACION
            )
        )
    );
END;
