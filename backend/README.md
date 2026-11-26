# Guía rápida — Sequelize y ejecución del proyecto

## 1. Instalación

Instalar dependencias del proyecto:

```bash
npm install
```

Si Sequelize todavía no está instalado:

```bash
npm install sequelize mysql2
npm install --save-dev sequelize-cli
```

## 2. Configuración

Verificar que la configuración de la base de datos y las variables de entorno estén correctamente definidas.

Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=gestion_riesgos
DB_USERNAME=root
DB_PASSWORD=********
```

> No subir credenciales reales al repositorio.

---

## 3. Migraciones

### Crear una migración

```bash
npx sequelize-cli migration:generate --name nombre-de-la-migracion
```

Ejemplo:

```bash
npx sequelize-cli migration:generate --name agregar-fk-viceministerio-seguridad-entidad
```

### Ver estado

```bash
npx sequelize-cli db:migrate:status
```

Estados:

- `up`: migración ejecutada.
- `down`: migración pendiente.

### Ejecutar migraciones pendientes

```bash
npx sequelize-cli db:migrate
```

### Revertir la última migración

```bash
npx sequelize-cli db:migrate:undo
```

### Revertir todas las migraciones

```bash
npx sequelize-cli db:migrate:undo:all
```

> Usar `undo:all` con precaución, especialmente en ambientes compartidos o producción.

---

## 4. Seeders

Los **seeders** se utilizan para insertar o actualizar datos existentes.

### Crear un Seeder

```bash
npx sequelize-cli seed:generate --name nombre-del-seeder
```

Ejemplo:

```bash
npx sequelize-cli seed:generate --name asignar-viceministerios-entidades
```

### Ejecutar todos los Seeders

```bash
npx sequelize-cli db:seed:all
```

### Ejecutar un Seeder específico

```bash
npx sequelize-cli db:seed --seed nombre-del-archivo.js
```

### Revertir el último Seeder

```bash
npx sequelize-cli db:seed:undo
```

### Revertir todos los Seeders

```bash
npx sequelize-cli db:seed:undo:all
```

---

## 5. ¿Migración o Seeder?

| Cambio | Utilizar |
|---|---|
| Crear tabla | Migración |
| Eliminar tabla | Migración |
| Agregar columna | Migración |
| Modificar columna | Migración |
| Crear Foreign Key | Migración |
| Crear índice | Migración |
| Insertar datos iniciales | Seeder |
| Actualizar datos existentes | Seeder |
| Asignar códigos a registros | Seeder |
| Cargar catálogos | Seeder |

**Regla rápida:**

> Cambia la estructura → **Migración**  
> Cambian los datos → **Seeder**

---

## 6. Estructura básica de una migración

```javascript
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

    async up(queryInterface, Sequelize) {

        // Aplicar cambios
    },

    async down(queryInterface, Sequelize) {

        // Revertir cambios
    }

};
```

Siempre que sea posible, implementar `down()` para poder realizar rollback.

---

## 7. Flujo recomendado para una migración

```bash
# 1. Crear migración
npx sequelize-cli migration:generate --name nombre-cambio

# 2. Revisar migraciones pendientes
npx sequelize-cli db:migrate:status

# 3. Ejecutar migraciones
npx sequelize-cli db:migrate

# 4. Verificar nuevamente
npx sequelize-cli db:migrate:status
```

Si es necesario revertir:

```bash
npx sequelize-cli db:migrate:undo
```

---

## 8. Flujo recomendado para un Seeder

```bash
# 1. Crear Seeder
npx sequelize-cli seed:generate --name nombre-cambio-datos

# 2. Ejecutar
npx sequelize-cli db:seed:all

# 3. Revertir si es necesario
npx sequelize-cli db:seed:undo
```

---

## 9. Ejecución del proyecto

Primero instalar las dependencias:

```bash
npm install
```

Después verificar que la base de datos esté disponible y ejecutar las migraciones:

```bash
npx sequelize-cli db:migrate
```

Si el proyecto utiliza Seeders:

```bash
npx sequelize-cli db:seed:all
```

Finalmente ejecutar el proyecto mediante el script definido en `package.json`. Por ejemplo:

```bash
npm start
```

o, si el proyecto utiliza un script de desarrollo:

```bash
npm run devStart
```

Para conocer los comandos disponibles:

```bash
npm run
```

---

## 10. Flujo completo para levantar el proyecto

```bash
# Instalar dependencias
npm install

# Verificar estado de migraciones
npx sequelize-cli db:migrate:status

# Ejecutar migraciones pendientes
npx sequelize-cli db:migrate

# Ejecutar Seeders, si corresponde
npx sequelize-cli db:seed:all

# Ejecutar aplicación
npm start
```

Si el proyecto utiliza desarrollo:

```bash
npm run devStart
```

---

## 11. Rollback

### Última migración

```bash
npx sequelize-cli db:migrate:undo
```

### Todas las migraciones

```bash
npx sequelize-cli db:migrate:undo:all
```

### Último Seeder

```bash
npx sequelize-cli db:seed:undo
```

### Todos los Seeders

```bash
npx sequelize-cli db:seed:undo:all
```

---

## 12. Comandos esenciales

| Acción | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Ejecutar proyecto | `npm start` |
| Desarrollo | `npm run dev` |
| Ver scripts disponibles | `npm run` |
| Estado de migraciones | `npx sequelize-cli db:migrate:status` |
| Ejecutar migraciones | `npx sequelize-cli db:migrate` |
| Rollback última migración | `npx sequelize-cli db:migrate:undo` |
| Rollback todas las migraciones | `npx sequelize-cli db:migrate:undo:all` |
| Crear migración | `npx sequelize-cli migration:generate --name nombre` |
| Ejecutar todos los Seeders | `npx sequelize-cli db:seed:all` |
| Crear Seeder | `npx sequelize-cli seed:generate --name nombre` |
| Ejecutar Seeder específico | `npx sequelize-cli db:seed --seed archivo.js` |
| Rollback último Seeder | `npx sequelize-cli db:seed:undo` |
| Rollback todos los Seeders | `npx sequelize-cli db:seed:undo:all` |

---

## 13. Buenas prácticas

- No modificar una migración que ya fue ejecutada y compartida con otros ambientes.
- Para corregir una migración existente, crear una nueva migración.
- Implementar siempre `up()` y `down()`.
- Verificar `db:migrate:status` antes y después de ejecutar cambios.
- No guardar contraseñas ni credenciales reales en Git.
- Utilizar nombres descriptivos para migraciones y Seeders.
- Probar las migraciones en desarrollo antes de ejecutarlas en producción.
- Realizar respaldo de la base de datos antes de cambios estructurales importantes.

## 14. Flujo recomendado para Git

Después de crear una migración o Seeder:

```bash
git status
git add .
git commit -m "feat: agregar migracion de viceministerios"
git push
```

En otro ambiente, después de actualizar el código:

```bash
git pull
npm install
npx sequelize-cli db:migrate
```

Si existen Seeders nuevos:

```bash
npx sequelize-cli db:seed:all
```
