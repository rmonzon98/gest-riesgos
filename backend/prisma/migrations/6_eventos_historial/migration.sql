-- EVENTO conserva la proyección textual que consumen las matrices y los reportes.
ALTER TABLE `riesgos_riesgo_extendido` MODIFY COLUMN `EVENTO` LONGTEXT NULL;

-- Añadir los campos MARN a las imágenes de auditoría del riesgo.
SET @riesgo_marn_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP TRIGGER `trg_riesgos_riesgo_extendido_insert`;

CREATE TRIGGER `trg_riesgos_riesgo_extendido_insert` AFTER INSERT ON `riesgos_riesgo_extendido` FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;
    DECLARE v_usuario   INT;
    SET v_usuario = NEW.USUARIO_CREACION;
    SELECT IFNULL(MAX(codigo_log), 0) + 1
      INTO v_codigo_log
      FROM riesgos_logs
     WHERE codigo_cia = NEW.codigo_cia;
    INSERT INTO riesgos_logs (
        CODIGO_CIA,
        CODIGO_LOG,
        USUARIO_CREACION,
        FECHA_CREACION,
        NOMBRE_TABLA,
        ACCION,
        INFORMACION
    )
    VALUES (
        NEW.CODIGO_CIA,
        v_codigo_log,
        v_usuario,
        NOW(),
        'riesgos_riesgo_extendido',
        1,
        JSON_OBJECT(
            'accion', 'INSERT',
            'registro', JSON_OBJECT(
                'CODIGO_CIA',                NEW.CODIGO_CIA,
                'CODIGO_PERIODO',            NEW.CODIGO_PERIODO,
                'CODIGO_TIPO_OBJETIVO',      NEW.CODIGO_TIPO_OBJETIVO,
                'CODIGO_OBJETIVO',           NEW.CODIGO_OBJETIVO,
                'OBJETIVO_TEXTO', NEW.OBJETIVO_TEXTO,
                'CODIGO_EJE', NEW.CODIGO_EJE,
                'CODIGO_DUENO', NEW.CODIGO_DUENO,
                'EFICIENCIA_MITIGADOR', NEW.EFICIENCIA_MITIGADOR,
                'CODIGO_AREA',               NEW.CODIGO_AREA,
                'CODIGO_RIESGO',             NEW.CODIGO_RIESGO,
                'DESCRIPCION',               NEW.DESCRIPCION,
                'CODIGO_PROBABILIDAD',       NEW.CODIGO_PROBABILIDAD,
                'CODIGO_SEVERIDAD',          NEW.CODIGO_SEVERIDAD,
                'CODIGO_TOLERANCIA',         NEW.CODIGO_TOLERANCIA,
                'CODIGO_MITIGACION',         NEW.CODIGO_MITIGACION,
                'OBSERVACIONES',             NEW.OBSERVACIONES,
                'VARIABLE_MITIGACION',       NEW.VARIABLE_MITIGACION,
                'CODIGO_ENTIDAD',            NEW.CODIGO_ENTIDAD,
                'REF',                       NEW.REF,
                'USUARIO_CREACION',          NEW.USUARIO_CREACION,
                'USUARIO_MODIFICACION',      NEW.USUARIO_MODIFICACION,
                'FECHA_CREACION',            NEW.FECHA_CREACION,
                'FECHA_MODIFICACION',        NEW.FECHA_MODIFICACION,
                'COMENTARIO_SUPERVISOR_ME',  NEW.COMENTARIO_SUPERVISOR_ME,
                'SUPERVISOR_MODIFICACION_ME',NEW.SUPERVISOR_MODIFICACION_ME,
                'FECHA_SUPERVISOR_ME',       NEW.FECHA_SUPERVISOR_ME,
                'MOSTRAR_GENERAL',           NEW.MOSTRAR_GENERAL,
                'SEVERIDAD_NARRACION',       NEW.SEVERIDAD_NARRACION,
                'PROBABILIDAD_AJUSTADA',     NEW.PROBABILIDAD_AJUSTADA,
                'SEVERIDAD_AJUSTADA',        NEW.SEVERIDAD_AJUSTADA,
                'RIESGO_RESIDUAL',           NEW.RIESGO_RESIDUAL,
                'RIESGO_INHERENTE',          NEW.RIESGO_INHERENTE,
                'EVENTO',                    NEW.EVENTO,
                'CONTROL',                   NEW.CONTROL,
                'MONITOREO',                 NEW.MONITOREO,
                'CODIGO_FRECUENCIA',         NEW.CODIGO_FRECUENCIA,
                'RESPONSABLE',               NEW.RESPONSABLE,
                'EXTRAS_MC',                 NEW.EXTRAS_MC,
                'ESTADO_ME',                 NEW.ESTADO_ME,
                'EXTRAS_ME',                 NEW.EXTRAS_ME,
                'EXTRAS_MCE',                NEW.EXTRAS_MCE,
                'ESTADO_MC',                 NEW.ESTADO_MC,
                'ESTADO_MCE',                NEW.ESTADO_MCE,
                'FECHA_SUPERVISOR_MC',       NEW.FECHA_SUPERVISOR_MC,
                'FECHA_SUPERVISOR_MCE',      NEW.FECHA_SUPERVISOR_MCE,
                'SUPERVISOR_MODIFICACION_MC',NEW.SUPERVISOR_MODIFICACION_MC,
                'SUPERVISOR_MODIFICACION_MCE',NEW.SUPERVISOR_MODIFICACION_MCE,
                'COMENTARIO_SUPERVISOR_MC',  NEW.COMENTARIO_SUPERVISOR_MC,
                'COMENTARIO_SUPERVISOR_MCE', NEW.COMENTARIO_SUPERVISOR_MCE,
                'ELIMINADO',                 NEW.ELIMINADO,
                'PERIODO_ANTERIOR',          NEW.PERIODO_ANTERIOR,
                'VICEMINISTERIO',            NEW.VICEMINISTERIO,
                'ORGANO',                    NEW.ORGANO
            )
        )
    );
END;

DROP TRIGGER `trg_riesgos_riesgo_extendido_update`;

CREATE TRIGGER `trg_riesgos_riesgo_extendido_update` AFTER UPDATE ON `riesgos_riesgo_extendido` FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;
    DECLARE v_usuario   INT;
    SET v_usuario = COALESCE(NEW.USUARIO_MODIFICACION, NEW.USUARIO_CREACION);
    SELECT IFNULL(MAX(codigo_log), 0) + 1
      INTO v_codigo_log
      FROM riesgos_logs
     WHERE codigo_cia = NEW.codigo_cia;
    INSERT INTO riesgos_logs (
        CODIGO_CIA,
        CODIGO_LOG,
        USUARIO_CREACION,
        FECHA_CREACION,
        NOMBRE_TABLA,
        ACCION,
        INFORMACION
    )
    VALUES (
        NEW.CODIGO_CIA,
        v_codigo_log,
        v_usuario,
        NOW(),
        'riesgos_riesgo_extendido',
        2,
        JSON_OBJECT(
            'accion', 'UPDATE',
            'antes', JSON_OBJECT(
                'CODIGO_CIA',                OLD.CODIGO_CIA,
                'CODIGO_PERIODO',            OLD.CODIGO_PERIODO,
                'CODIGO_TIPO_OBJETIVO',      OLD.CODIGO_TIPO_OBJETIVO,
                'CODIGO_OBJETIVO',           OLD.CODIGO_OBJETIVO,
                'OBJETIVO_TEXTO', OLD.OBJETIVO_TEXTO,
                'CODIGO_EJE', OLD.CODIGO_EJE,
                'CODIGO_DUENO', OLD.CODIGO_DUENO,
                'EFICIENCIA_MITIGADOR', OLD.EFICIENCIA_MITIGADOR,
                'CODIGO_AREA',               OLD.CODIGO_AREA,
                'CODIGO_RIESGO',             OLD.CODIGO_RIESGO,
                'DESCRIPCION',               OLD.DESCRIPCION,
                'CODIGO_PROBABILIDAD',       OLD.CODIGO_PROBABILIDAD,
                'CODIGO_SEVERIDAD',          OLD.CODIGO_SEVERIDAD,
                'CODIGO_TOLERANCIA',         OLD.CODIGO_TOLERANCIA,
                'CODIGO_MITIGACION',         OLD.CODIGO_MITIGACION,
                'OBSERVACIONES',             OLD.OBSERVACIONES,
                'VARIABLE_MITIGACION',       OLD.VARIABLE_MITIGACION,
                'CODIGO_ENTIDAD',            OLD.CODIGO_ENTIDAD,
                'REF',                       OLD.REF,
                'USUARIO_CREACION',          OLD.USUARIO_CREACION,
                'USUARIO_MODIFICACION',      OLD.USUARIO_MODIFICACION,
                'FECHA_CREACION',            OLD.FECHA_CREACION,
                'FECHA_MODIFICACION',        OLD.FECHA_MODIFICACION,
                'COMENTARIO_SUPERVISOR_ME',  OLD.COMENTARIO_SUPERVISOR_ME,
                'SUPERVISOR_MODIFICACION_ME',OLD.SUPERVISOR_MODIFICACION_ME,
                'FECHA_SUPERVISOR_ME',       OLD.FECHA_SUPERVISOR_ME,
                'MOSTRAR_GENERAL',           OLD.MOSTRAR_GENERAL,
                'SEVERIDAD_NARRACION',       OLD.SEVERIDAD_NARRACION,
                'PROBABILIDAD_AJUSTADA',     OLD.PROBABILIDAD_AJUSTADA,
                'SEVERIDAD_AJUSTADA',        OLD.SEVERIDAD_AJUSTADA,
                'RIESGO_RESIDUAL',           OLD.RIESGO_RESIDUAL,
                'RIESGO_INHERENTE',          OLD.RIESGO_INHERENTE,
                'EVENTO',                    OLD.EVENTO,
                'CONTROL',                   OLD.CONTROL,
                'MONITOREO',                 OLD.MONITOREO,
                'CODIGO_FRECUENCIA',         OLD.CODIGO_FRECUENCIA,
                'RESPONSABLE',               OLD.RESPONSABLE,
                'EXTRAS_MC',                 OLD.EXTRAS_MC,
                'ESTADO_ME',                 OLD.ESTADO_ME,
                'EXTRAS_ME',                 OLD.EXTRAS_ME,
                'EXTRAS_MCE',                OLD.EXTRAS_MCE,
                'ESTADO_MC',                 OLD.ESTADO_MC,
                'ESTADO_MCE',                OLD.ESTADO_MCE,
                'FECHA_SUPERVISOR_MC',       OLD.FECHA_SUPERVISOR_MC,
                'FECHA_SUPERVISOR_MCE',      OLD.FECHA_SUPERVISOR_MCE,
                'SUPERVISOR_MODIFICACION_MC',OLD.SUPERVISOR_MODIFICACION_MC,
                'SUPERVISOR_MODIFICACION_MCE',OLD.SUPERVISOR_MODIFICACION_MCE,
                'COMENTARIO_SUPERVISOR_MC',  OLD.COMENTARIO_SUPERVISOR_MC,
                'COMENTARIO_SUPERVISOR_MCE', OLD.COMENTARIO_SUPERVISOR_MCE,
                'ELIMINADO',                 OLD.ELIMINADO,
                'PERIODO_ANTERIOR',          OLD.PERIODO_ANTERIOR,
                'VICEMINISTERIO',            OLD.VICEMINISTERIO,
                'ORGANO',                    OLD.ORGANO
            ),
            'despues', JSON_OBJECT(
                'CODIGO_CIA',                NEW.CODIGO_CIA,
                'CODIGO_PERIODO',            NEW.CODIGO_PERIODO,
                'CODIGO_TIPO_OBJETIVO',      NEW.CODIGO_TIPO_OBJETIVO,
                'CODIGO_OBJETIVO',           NEW.CODIGO_OBJETIVO,
                'OBJETIVO_TEXTO', NEW.OBJETIVO_TEXTO,
                'CODIGO_EJE', NEW.CODIGO_EJE,
                'CODIGO_DUENO', NEW.CODIGO_DUENO,
                'EFICIENCIA_MITIGADOR', NEW.EFICIENCIA_MITIGADOR,
                'CODIGO_AREA',               NEW.CODIGO_AREA,
                'CODIGO_RIESGO',             NEW.CODIGO_RIESGO,
                'DESCRIPCION',               NEW.DESCRIPCION,
                'CODIGO_PROBABILIDAD',       NEW.CODIGO_PROBABILIDAD,
                'CODIGO_SEVERIDAD',          NEW.CODIGO_SEVERIDAD,
                'CODIGO_TOLERANCIA',         NEW.CODIGO_TOLERANCIA,
                'CODIGO_MITIGACION',         NEW.CODIGO_MITIGACION,
                'OBSERVACIONES',             NEW.OBSERVACIONES,
                'VARIABLE_MITIGACION',       NEW.VARIABLE_MITIGACION,
                'CODIGO_ENTIDAD',            NEW.CODIGO_ENTIDAD,
                'REF',                       NEW.REF,
                'USUARIO_CREACION',          NEW.USUARIO_CREACION,
                'USUARIO_MODIFICACION',      NEW.USUARIO_MODIFICACION,
                'FECHA_CREACION',            NEW.FECHA_CREACION,
                'FECHA_MODIFICACION',        NEW.FECHA_MODIFICACION,
                'COMENTARIO_SUPERVISOR_ME',  NEW.COMENTARIO_SUPERVISOR_ME,
                'SUPERVISOR_MODIFICACION_ME',NEW.SUPERVISOR_MODIFICACION_ME,
                'FECHA_SUPERVISOR_ME',       NEW.FECHA_SUPERVISOR_ME,
                'MOSTRAR_GENERAL',           NEW.MOSTRAR_GENERAL,
                'SEVERIDAD_NARRACION',       NEW.SEVERIDAD_NARRACION,
                'PROBABILIDAD_AJUSTADA',     NEW.PROBABILIDAD_AJUSTADA,
                'SEVERIDAD_AJUSTADA',        NEW.SEVERIDAD_AJUSTADA,
                'RIESGO_RESIDUAL',           NEW.RIESGO_RESIDUAL,
                'RIESGO_INHERENTE',          NEW.RIESGO_INHERENTE,
                'EVENTO',                    NEW.EVENTO,
                'CONTROL',                   NEW.CONTROL,
                'MONITOREO',                 NEW.MONITOREO,
                'CODIGO_FRECUENCIA',         NEW.CODIGO_FRECUENCIA,
                'RESPONSABLE',               NEW.RESPONSABLE,
                'EXTRAS_MC',                 NEW.EXTRAS_MC,
                'ESTADO_ME',                 NEW.ESTADO_ME,
                'EXTRAS_ME',                 NEW.EXTRAS_ME,
                'EXTRAS_MCE',                NEW.EXTRAS_MCE,
                'ESTADO_MC',                 NEW.ESTADO_MC,
                'ESTADO_MCE',                NEW.ESTADO_MCE,
                'FECHA_SUPERVISOR_MC',       NEW.FECHA_SUPERVISOR_MC,
                'FECHA_SUPERVISOR_MCE',      NEW.FECHA_SUPERVISOR_MCE,
                'SUPERVISOR_MODIFICACION_MC',NEW.SUPERVISOR_MODIFICACION_MC,
                'SUPERVISOR_MODIFICACION_MCE',NEW.SUPERVISOR_MODIFICACION_MCE,
                'COMENTARIO_SUPERVISOR_MC',  NEW.COMENTARIO_SUPERVISOR_MC,
                'COMENTARIO_SUPERVISOR_MCE', NEW.COMENTARIO_SUPERVISOR_MCE,
                'ELIMINADO',                 NEW.ELIMINADO,
                'PERIODO_ANTERIOR',          NEW.PERIODO_ANTERIOR,
                'VICEMINISTERIO',            NEW.VICEMINISTERIO,
                'ORGANO',                    NEW.ORGANO
            )
        )
    );
END;

DROP TRIGGER `trg_riesgos_riesgo_extendido_delete`;

CREATE TRIGGER `trg_riesgos_riesgo_extendido_delete` AFTER DELETE ON `riesgos_riesgo_extendido` FOR EACH ROW BEGIN
    DECLARE v_codigo_log INT;
    SELECT IFNULL(MAX(codigo_log), 0) + 1
      INTO v_codigo_log
      FROM riesgos_logs
     WHERE codigo_cia = OLD.codigo_cia;
    INSERT INTO riesgos_logs (
        CODIGO_CIA,
        CODIGO_LOG,
        USUARIO_CREACION,
        FECHA_CREACION,
        NOMBRE_TABLA,
        ACCION,
        INFORMACION
    )
    VALUES (
        OLD.CODIGO_CIA,
        v_codigo_log,
        -1,
        NOW(),
        'riesgos_riesgo_extendido',
        3,
        JSON_OBJECT(
            'accion', 'DELETE',
            'registro', JSON_OBJECT(
                'CODIGO_CIA',                OLD.CODIGO_CIA,
                'CODIGO_PERIODO',            OLD.CODIGO_PERIODO,
                'CODIGO_TIPO_OBJETIVO',      OLD.CODIGO_TIPO_OBJETIVO,
                'CODIGO_OBJETIVO',           OLD.CODIGO_OBJETIVO,
                'OBJETIVO_TEXTO', OLD.OBJETIVO_TEXTO,
                'CODIGO_EJE', OLD.CODIGO_EJE,
                'CODIGO_DUENO', OLD.CODIGO_DUENO,
                'EFICIENCIA_MITIGADOR', OLD.EFICIENCIA_MITIGADOR,
                'CODIGO_AREA',               OLD.CODIGO_AREA,
                'CODIGO_RIESGO',             OLD.CODIGO_RIESGO,
                'DESCRIPCION',               OLD.DESCRIPCION,
                'CODIGO_PROBABILIDAD',       OLD.CODIGO_PROBABILIDAD,
                'CODIGO_SEVERIDAD',          OLD.CODIGO_SEVERIDAD,
                'CODIGO_TOLERANCIA',         OLD.CODIGO_TOLERANCIA,
                'CODIGO_MITIGACION',         OLD.CODIGO_MITIGACION,
                'OBSERVACIONES',             OLD.OBSERVACIONES,
                'VARIABLE_MITIGACION',       OLD.VARIABLE_MITIGACION,
                'CODIGO_ENTIDAD',            OLD.CODIGO_ENTIDAD,
                'REF',                       OLD.REF,
                'USUARIO_CREACION',          OLD.USUARIO_CREACION,
                'USUARIO_MODIFICACION',      OLD.USUARIO_MODIFICACION,
                'FECHA_CREACION',            OLD.FECHA_CREACION,
                'FECHA_MODIFICACION',        OLD.FECHA_MODIFICACION,
                'COMENTARIO_SUPERVISOR_ME',  OLD.COMENTARIO_SUPERVISOR_ME,
                'SUPERVISOR_MODIFICACION_ME',OLD.SUPERVISOR_MODIFICACION_ME,
                'FECHA_SUPERVISOR_ME',       OLD.FECHA_SUPERVISOR_ME,
                'MOSTRAR_GENERAL',           OLD.MOSTRAR_GENERAL,
                'SEVERIDAD_NARRACION',       OLD.SEVERIDAD_NARRACION,
                'PROBABILIDAD_AJUSTADA',     OLD.PROBABILIDAD_AJUSTADA,
                'SEVERIDAD_AJUSTADA',        OLD.SEVERIDAD_AJUSTADA,
                'RIESGO_RESIDUAL',           OLD.RIESGO_RESIDUAL,
                'RIESGO_INHERENTE',          OLD.RIESGO_INHERENTE,
                'EVENTO',                    OLD.EVENTO,
                'CONTROL',                   OLD.CONTROL,
                'MONITOREO',                 OLD.MONITOREO,
                'CODIGO_FRECUENCIA',         OLD.CODIGO_FRECUENCIA,
                'RESPONSABLE',               OLD.RESPONSABLE,
                'EXTRAS_MC',                 OLD.EXTRAS_MC,
                'ESTADO_ME',                 OLD.ESTADO_ME,
                'EXTRAS_ME',                 OLD.EXTRAS_ME,
                'EXTRAS_MCE',                OLD.EXTRAS_MCE,
                'ESTADO_MC',                 OLD.ESTADO_MC,
                'ESTADO_MCE',                OLD.ESTADO_MCE,
                'FECHA_SUPERVISOR_MC',       OLD.FECHA_SUPERVISOR_MC,
                'FECHA_SUPERVISOR_MCE',      OLD.FECHA_SUPERVISOR_MCE,
                'SUPERVISOR_MODIFICACION_MC',OLD.SUPERVISOR_MODIFICACION_MC,
                'SUPERVISOR_MODIFICACION_MCE',OLD.SUPERVISOR_MODIFICACION_MCE,
                'COMENTARIO_SUPERVISOR_MC',  OLD.COMENTARIO_SUPERVISOR_MC,
                'COMENTARIO_SUPERVISOR_MCE', OLD.COMENTARIO_SUPERVISOR_MCE,
                'ELIMINADO',                 OLD.ELIMINADO,
                'PERIODO_ANTERIOR',          OLD.PERIODO_ANTERIOR,
                'VICEMINISTERIO',            OLD.VICEMINISTERIO,
                'ORGANO',                    OLD.ORGANO
            )
        )
    );
END;

SET SESSION sql_mode = @riesgo_marn_sql_mode;
