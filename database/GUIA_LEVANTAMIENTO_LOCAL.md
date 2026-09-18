# Guía para levantar NuryBase localmente

Esta guía explica cómo levantar PostgreSQL y PostgREST localmente para el proyecto Angular NuryBase.

## 1. Arquitectura local

La comunicación funciona así:

```text
Angular                  http://localhost:4200
    |
    v
PostgREST                http://localhost:3000
    |
    v
PostgreSQL               localhost:5433 desde Windows
                         puerto 5432 dentro de Docker
```

Angular no se conecta directamente a PostgreSQL. Las consultas se realizan mediante PostgREST, que expone las tablas, vistas y funciones SQL como una API REST.

## 2. Requisitos

Cada integrante debe instalar:

- Git.
- Node.js y npm compatibles con el proyecto. (ya deberian tenerlos si pasa el npm install)
- Docker Desktop para Windows.
- pgAdmin 4, opcional pero recomendado para visualizar la base.

Docker Desktop se descarga desde:

https://www.docker.com/products/docker-desktop/

Durante la instalación se recomienda utilizar WSL 2. Después de instalarlo, abrir Docker Desktop y esperar hasta que indique que está funcionando.

Verificar desde PowerShell:

```powershell
docker --version
docker compose version
docker info
```

`docker info` debe mostrar información del servidor. Si solo funciona la parte Client, Docker Desktop todavía no está iniciado.

## 3. Obtener el proyecto

Clonar el repositorio y entrar a la carpeta:

```powershell
git clone <URL_DEL_REPOSITORIO>
Set-Location .\NuryBase
``` (No es necesario si ya lo tienen pero si hacer merge con la rama develop del repositorio)

La estructura necesaria de la base es:

```text
database/
├── schema_nury.sql
├── seed/
│   ├── carga_productos_nury.sql
│   └── carga_proveedores_nury.sql
└── local/
    ├── 04_roles.sql
    ├── 05_sucursal.sql
    └── 06_auth.sql
```

También debe existir:

```text
infra/
├── .env.local
└── docker-compose.yml
```

Los archivos anteriores ya deben venir incluidos en el repositorio después de hacer `clone`, `pull` o `merge`. No es necesario crearlos manualmente. Solo se crea localmente `infra/.env.local`, porque contiene la contraseña de desarrollo y no se versiona.

Verificar que los archivos versionados estén presentes dentro de estas rutas:

```powershell
Test-Path .\infra\docker-compose.yml
Test-Path .\database\schema_nury.sql
Test-Path .\database\local\04_roles.sql
Test-Path .\database\local\05_sucursal.sql
Test-Path .\database\local\06_auth.sql
```

Todos deben devolver `True`.

## 4. Variables locales

Crear únicamente `infra/.env.local` con este contenido:

```env
POSTGRES_DB=nury
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_local_only
PGRST_JWT_SECRET=nurybase-dev-jwt-secret-change-me
```

Este archivo es solo para desarrollo local y no debe subirse al repositorio. Debe estar incluido en `.gitignore`:

```text
/infra/.env.local
```

## 5. Configuración de Docker Compose

El archivo `infra/docker-compose.yml` debe contener una configuración equivalente a esta:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: nury-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - nury_pgdata:/var/lib/postgresql/data
      - ../database/schema_nury.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
      - ../database/seed/carga_productos_nury.sql:/docker-entrypoint-initdb.d/02_productos.sql:ro
      - ../database/seed/carga_proveedores_nury.sql:/docker-entrypoint-initdb.d/03_proveedores.sql:ro
      - ../database/local/04_roles.sql:/docker-entrypoint-initdb.d/04_roles.sql:ro
      - ../database/local/05_sucursal.sql:/docker-entrypoint-initdb.d/05_sucursal.sql:ro
      - ../database/local/06_auth.sql:/docker-entrypoint-initdb.d/06_auth.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  postgrest:
    image: postgrest/postgrest:latest
    container_name: nury-postgrest
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:postgrest_local_only@postgres:5432/${POSTGRES_DB}
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: web_anon
      PGRST_JWT_SECRET: ${PGRST_JWT_SECRET:-nurybase-dev-jwt-secret-change-me}
      PGRST_SERVER_PORT: 3000
      PGRST_SERVER_CORS_ALLOWED_ORIGINS: http://localhost:4200
    ports:
      - "3000:3000"

volumes:
  nury_pgdata:
```

La configuración `5433:5432` es intencional:

- `5433` es el puerto usado desde Windows y pgAdmin.
- `5432` es el puerto interno de PostgreSQL dentro del contenedor.

No cambiarlo a `5433:5433`, porque PostgreSQL escucha internamente en `5432`.

## 6. Archivos SQL incluidos en el repositorio

Los siguientes archivos ya vienen incluidos en el proyecto y no deben crearse nuevamente:

```text
database/local/04_roles.sql
database/local/05_sucursal.sql
database/local/06_auth.sql
```

`04_roles.sql` crea los roles necesarios para PostgREST, `05_sucursal.sql` crea la sucursal local inicial y `06_auth.sql` instala el login JWT y las cuentas de desarrollo. Docker los ejecutará automáticamente mediante `docker-compose.yml`.

## 7. Permisos locales de PostgREST

El contenido de `database/local/04_roles.sql` ya está versionado. Estos permisos son para desarrollo local. Antes de publicar el sistema en un VPS hay que implementar autenticación, JWT, RLS y permisos más restrictivos. No se debe exponer `password_hash` al navegador.

## 8. Sucursal inicial

El archivo `database/local/05_sucursal.sql` ya está versionado y será ejecutado automáticamente después del esquema y los seeds.

Las cuentas locales usan la contraseña `1234`:

- `c.rojas@nurys.cl`
- `pa.menares@duocuc.cl`
- `s.vera@nurys.cl`

## 9. Iniciar la base y PostgREST

Desde la raíz del proyecto:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml up -d
```

Ver el estado:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml ps
```

El resultado esperado es:

```text
nury-postgres    running (healthy)
nury-postgrest   running
```

Los scripts se ejecutan en este orden:

1. `schema_nury.sql` crea tablas, funciones, triggers y vistas.
2. `carga_productos_nury.sql` carga productos, ingredientes y recetas.
3. `carga_proveedores_nury.sql` carga proveedores.
4. `04_roles.sql` crea los roles de PostgREST.
5. `05_sucursal.sql` crea la sucursal inicial.

## 10. Verificar PostgreSQL

Consultar la cantidad de productos:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml exec postgres `
  psql -U postgres -d nury `
  -c "SELECT COUNT(*) AS productos FROM productos;"
```

Consultar las tablas:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml exec postgres `
  psql -U postgres -d nury `
  -c "\dt"
```

## 11. Verificar PostgREST

Consultar productos mediante la API:

```powershell
Invoke-RestMethod `
  -Uri 'http://localhost:3000/productos?select=id,nombre,precio_venta&limit=5'
```

Consultar sucursales:

```powershell
Invoke-RestMethod `
  -Uri 'http://localhost:3000/sucursales?select=id,nombre'
```

Algunas rutas disponibles son:

```text
GET  http://localhost:3000/productos
GET  http://localhost:3000/ingredientes
GET  http://localhost:3000/sucursales
GET  http://localhost:3000/v_ventas_por_sucursal
POST http://localhost:3000/rpc/fn_registrar_venta
```

## 12. Conectar desde pgAdmin

En pgAdmin seleccionar `Register → Server`.

En `General`:

```text
Name: NuryBase Docker
```

En `Connection`:

```text
Host name/address: 127.0.0.1
Port: 5433
Maintenance database: nury
Username: postgres
Password: postgres_local_only
```

Después abrir:

```text
Servers
└── NuryBase Docker
    └── Databases
        └── nury
            └── Schemas
                └── public
                    └── Tables
```

Para ver datos, hacer clic derecho en una tabla, por ejemplo `productos`, y seleccionar `View/Edit Data → All Rows`.

La contraseña `postgres_local_only` es la de PostgreSQL. La contraseña `postgrest_local_only` corresponde al usuario interno de PostgREST y no se utiliza para pgAdmin.

## 13. Conexión inicial de Angular

El archivo `src/environments/environment.ts` ya está incluido en el repositorio y contiene la URL local de PostgREST:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
```

En `src/app/app.config.ts` agregar:

```ts
import { provideHttpClient } from '@angular/common/http';
```

Y agregar `provideHttpClient()` dentro de `providers`.

El servicio para el catálogo debe estar en:

```text
src/app/core/api/productos-api.service.ts
```

El POS actualmente utiliza un catálogo fijo en memoria. La conexión se integra en:

```text
src/app/features/pos/services/pos.service.ts
```

El componente que carga el catálogo es:

```text
src/app/features/pos/pages/pos-layout/pos-layout.component.ts
```

La primera integración recomendada es reemplazar solamente el catálogo de productos. El login, los pagos y el historial de ventas todavía usan datos simulados.

## 14. Reinicializar la base durante el desarrollo

Los scripts de `/docker-entrypoint-initdb.d` solo se ejecutan cuando el volumen está vacío.

Si se modifica el esquema y no hay datos importantes, reiniciar completamente:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml down -v
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml up -d
```

El parámetro `-v` elimina el volumen local `nury_pgdata`. No usarlo si existen datos que deban conservarse.

## 15. Errores frecuentes

### Docker API no disponible

Mensaje similar a:

```text
failed to connect to the docker API at npipe://...
```

Solución: abrir Docker Desktop y esperar a que indique que el motor está funcionando. Luego verificar con `docker info`.

### Contraseña incorrecta en pgAdmin

Usar exactamente:

```text
Usuario: postgres
Contraseña: postgres_local_only
Puerto: 5433
```

Si el volumen se creó con otra contraseña, cambiarla desde el contenedor o reinicializar el volumen si no contiene datos importantes.

### Puerto 5432 ocupado

Si existe otra instalación de PostgreSQL en Windows, usar el mapeo:

```yaml
- "5433:5432"
```

En pgAdmin utilizar `5433`. PostgREST continúa utilizando internamente el puerto `5432`.

### Conexión cerrada en el puerto 5433

Revisar que el mapeo no esté escrito como `5433:5433`. La configuración correcta es:

```yaml
- "5433:5432"
```

### PostgreSQL se cierra al iniciar

Consultar los registros:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml logs postgres --tail=200
```

El nombre correcto del archivo es `infra\docker-compose.yml`.

### Migración de turnos

No ejecutar todavía:

```text
database/migrations/0001_add_turno_id_to_venta.sql
database/functions/cuadrar_y_cerrar_turno.sql
```

Esos archivos utilizan nombres antiguos como `venta` y `turno`, mientras el esquema actual utiliza `ventas` y `turnos`. Deben corregirse antes de aplicarse.

## 16. Comandos diarios

Iniciar servicios:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml up -d
```

Detener servicios sin borrar datos:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml down
```

Ver estado:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml ps
```

Ver registros:

```powershell
docker compose --env-file .\infra\.env.local -f .\infra\docker-compose.yml logs --tail=100
```

## 17. Verificaciones del proyecto Angular

Con la base levantada, ejecutar desde la raíz:

```powershell
npm start
npm test -- --watch=false
npm run build
```

La aplicación Angular se abre en:

```text
http://localhost:4200
```

La API local se encuentra en:

```text
http://localhost:3000
```

## 18. Preparación futura para el VPS

En el VPS se puede reutilizar Docker Compose, pero se deben realizar cambios de seguridad:

- Usar contraseñas nuevas y privadas.
- No publicar PostgreSQL en Internet.
- Exponer PostgREST mediante HTTPS y un dominio.
- Configurar JWT y políticas RLS.
- No utilizar permisos completos para `web_anon`.
- Crear respaldos automáticos.
- Cambiar la URL de Angular a la URL pública de la API.

El puerto `5433` es solamente una decisión de desarrollo local. En producción PostgreSQL debería permanecer dentro de la red privada de Docker.
