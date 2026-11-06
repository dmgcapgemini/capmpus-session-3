# Sesión 3 — Configuración con SQLite

El ZIP completo incluye las herramientas terminadas de la sesión 1 y los procesos de la sesión 2. Extráelo en una carpeta nueva `session-03/`; no necesitas la aplicación, las implementaciones ni la base de datos de sesiones anteriores. Conserva las carpetas y los datos previos. Instala Git, Bun 1.4.0 y Copilot CLI e inicia sesión con `copilot login`. SQLite no necesita servidor de base de datos ni contenedores.

## 1. Configurar esta aplicación

Ejecuta todos los comandos desde la carpeta nueva de aplicación:

```bash
cp .env.example .env.local
```

Los valores predeterminados son:

```dotenv
DATABASE_URL=sqlite:./.loom/session-03.sqlite
LOOM_SOURCES_DIR=examples/session-03
LOOM_FMS_URL=http://127.0.0.1:3010
```

Deja `DATABASE_URL_TEST` sin definir para obtener `.loom/session-03_test.sqlite`, o elige explícitamente otro archivo. Las rutas relativas parten de la raíz de esta aplicación. En macOS, aplica la indicación de preflight sobre `LOOM_COPILOT_CLI_PATH`. Conserva `.env.local` como archivo privado.

## 2. Preparar antes de clase

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
bun run build
```

En el punto de partida solo deben fallar las catorce pruebas de `docs/course/session-03/workshop-tests.json`. Los cuatro ejercicios son registros con joins, política de evidencias, conflictos y registro FMS. Las herramientas anteriores, las transiciones de procesos, la repetición idempotente, la recuperación y la revisión humana ya están implementadas. La búsqueda documental SQLite forma parte de la base suministrada.

## 3. Iniciar la aplicación

En un terminal ejecuta:

```bash
bun run mock:fms normal
```

En otro terminal, desde la misma carpeta:

```bash
bun run dev
```

El navegador suele abrirse en `http://localhost:5173`. Detén los servidores anteriores si ocupan esos puertos. FMS sigue siendo un mock HTTP local; SQLite no lo sustituye.

## 4. Separar el almacenamiento

Las ejecuciones, la auditoría de procesos, los informes de conocimiento, las respuestas y los diagnósticos persisten en `.loom/session-03.sqlite`. Conserva ese archivo y sus acompañantes `-wal`/`-shm` durante las demostraciones de reinicio. Las pruebas usan `_test.sqlite`. `bun run eval:knowledge scripted` utiliza otro archivo `_eval.sqlite` y debe superar diez casos tras los ejercicios. El modo con guion no hace llamadas al modelo.

Para `bun run demo:knowledge` o `bun run demo:workflow`, elige `DATABASE_URL=sqlite:./.loom/session-03_demo.sqlite` en el entorno privado de esta carpeta. Detén primero la API habitual, conserva el mismo archivo de demostración al reiniciar y restaura después la URL normal. Utiliza un solo proceso API por base. Nunca dirijas las pruebas ni la evaluación al almacenamiento habitual.

## 5. PostgreSQL opcional

PostgreSQL 17 sigue disponible como selección explícita según `QUICKSTART.es.md`; utiliza una base independiente `loom_session03`. Los fallos de conexión no cambian automáticamente el almacenamiento. Los registros anteriores no se copian ni se convierten. [English guide](QUICKSTART-SQLITE.md).
