# Loom Campus — Inicio del equipo

Cada sesión llega como un **ZIP inicial completo**. Descomprímelo en una **carpeta nueva para esa sesión** y trabaja allí. Ya incluye las implementaciones de referencia anteriores; el código propio del equipo y su historial de datos no se transfieren automáticamente. Conserva el trabajo anterior para compararlo. Incorporar mejoras seleccionadas es una actividad opcional posterior a la clase.

Completa la instalación, las bases de datos locales y las comprobaciones iniciales **antes del taller de cuatro horas**. Empieza por [la guía breve de inicio de sesión](SESSION-START.es.md). [English guide](QUICKSTART.md).

## 1. Qué recibes

El instructor comparte un ZIP inicial completo y verificado, por ejemplo `session-03.zip`. El nombre real puede incluir una revisión. Utiliza el archivo exacto asignado a tu equipo.

| Contenido | Finalidad |
|---|---|
| `apps/`, `packages/`, `tools/` | Aplicación ejecutable con solo los ejercicios actuales pendientes |
| `docs/course/session-NN/` | Introducción, teoría, taller, autoestudio y validación |
| `examples/session-NN/` | Material de origen y datos ficticios |
| `.env.example` | Ajustes que copiarás a tu archivo privado `.env.local` |
| `SESSION.json` | Identidad de la versión entregada |

Las sesiones 01–03 tienen puntos de partida preparados. Las sesiones posteriores se entregarán cuando su material esté listo. Conserva `SESSION.json` sin modificarlo. El equipo utiliza su servidor Git; Copilot utiliza tu propia cuenta de GitHub con licencia.

## 2. Añadir la carpeta una vez por equipo

Un integrante actúa como **integrador**: añade el ZIP al repositorio Git compartido en una rama de revisión. Los demás descargan el resultado revisado. El repositorio puede estar en GitHub, Azure DevOps, GitLab u otro servicio; utiliza su equivalente a una pull request.

Un equipo nuevo clona su repositorio una vez:

```bash
git clone <TEAM_REPOSITORY_URL> loom
cd loom
```

Un equipo existente entra en su repositorio actual. Termina o confirma los cambios de código antes de cambiar de rama. El ejemplo empieza la sesión 3; sustituye `02` por `01` o `03` y utiliza el nombre real del ZIP para otra sesión.

```bash
git switch main
git pull
git switch -c start/session-03
test ! -e session-03
unzip -q ~/Downloads/session-03.zip -d session-03
git add session-03
git commit -m "Add Session 3 full starter"
git push --set-upstream origin start/session-03
```

Ejecuta los comandos uno a uno. Si `test` falla, detente: la carpeta ya existe. Consérvala y consulta con el instructor qué carpeta nueva utilizar. Revisa y fusiona la solicitud, comprobando que añade la carpeta nueva y no incluye archivos privados.

La estructura habitual es:

```text
loom/                         Repositorio Git del equipo
├── session-01/               Trabajo anterior
├── session-02/               Aplicación nueva de la sesión 2
└── session-03/               Se añade cuando empieza la sesión 3
```

Si la sesión 1 ya ocupa la raíz del repositorio, conserva allí esos archivos y añade `session-03/` junto a ellos. No hace falta reorganizar la sesión 1. Cada carpeta contiene una aplicación independiente: ábrela en el editor y ejecuta sus comandos desde allí.

## 3. Cada integrante abre la nueva sesión

Después de fusionar la solicitud, cada integrante ejecuta lo siguiente desde la raíz del repositorio:

```bash
git switch main
git pull
cd session-03
```

Ya tienes el código inicial suministrado. Las soluciones del equipo de la sesión anterior no se han importado ni fusionado. Terminar esos ejercicios sigue siendo un objetivo de aprendizaje, pero no bloquea el acceso al siguiente punto de partida.

## 4. Preparar el almacenamiento local antes de clase

**Sesiones 1, 2 y 3:** sigue [la configuración SQLite](QUICKSTART-SQLITE.es.md) como vía predeterminada sin contenedores. Con SQLite, omite los comandos PostgreSQL de este apartado y pasa al apartado 5. Las tres sesiones también admiten PostgreSQL como selección explícita. **Sesión 3:** SQLite es la opción predeterminada; PostgreSQL 17 es opcional.

Para PostgreSQL, inicia Podman. En macOS, inicia primero su máquina ya configurada:

```bash
podman machine start
```

Crea el contenedor local una sola vez:

```bash
podman volume create loom-postgres-data
podman run --name loom-postgres \
  --detach \
  --publish 5432:5432 \
  --env POSTGRES_USER=loom \
  --env POSTGRES_PASSWORD=loom-dev \
  --env POSTGRES_DB=loom \
  --volume loom-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:17
```

En los siguientes arranques utiliza `podman start loom-postgres`. Comprueba su disponibilidad:

```bash
podman exec loom-postgres pg_isready -U loom
```

Crea una **base de aplicación independiente para la sesión actual**, una sola vez:

```bash
podman exec loom-postgres createdb -U loom loom_session03
```

Utiliza `loom_session01` o `loom_session03` para esas sesiones. Son credenciales de desarrollo local. Las pruebas utilizan otra base con el sufijo `_test`, que crea su preparación; la cuenta local necesita permiso para crearla. Conserva las bases y los archivos SQLite anteriores. Empezar otra sesión no copia ni convierte sus registros.

## 5. Configurar y comprobar la aplicación nueva

Desde la carpeta nueva, crea sus ajustes privados una sola vez:

```bash
cp .env.example .env.local
```

Utiliza el ejemplo de esta sesión. Para la vía SQLite predeterminada de la sesión 3, comprueba:

```dotenv
DATABASE_URL=sqlite:./.loom/session-03.sqlite
LOOM_SOURCES_DIR=examples/session-03
```

Para PostgreSQL opcional en la sesión 3, selecciona `DATABASE_URL=postgresql://loom:loom-dev@localhost:5432/loom_session03` tras crear esa base. Para la sesión 3, utiliza `loom_session03`, `examples/session-03` y la configuración FMS suministrada. Aplica la ruta local de CLI que recomiende preflight. Conserva `.env.local` como archivo privado; evita copiar íntegramente el de la sesión anterior.

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

Utiliza Bun **1.4.0** y `bun run test` para seleccionar los proyectos Vitest configurados. Tipos, lint y compilación deben pasar. En el punto de partida solo fallan las pruebas indicadas en `docs/course/session-NN/workshop-tests.json`:

| Sesión | Fallos previstos de ejercicios |
|---|---:|
| 01 | 13 |
| 02 | 10 |
| 03 | 14 |

Comunica cualquier otro fallo antes de clase. La aplicación arranca aunque los ejercicios actuales estén pendientes. Inicia con `bun run dev`; la sesión 3 también necesita `bun run mock:fms normal` en otra terminal. Detén los servidores de la sesión anterior para liberar sus puertos. Comprueba el acceso a Copilot y un proceso real con el instructor antes de impartirla; las comprobaciones automáticas no acreditan por sí solas el funcionamiento real.

## 6. Trabajar en equipo durante la sesión

Desde la raíz del repositorio, crea una rama pequeña para el ejercicio y entra después en la carpeta de la aplicación actual. Confirma el código y utiliza la revisión habitual mediante pull request. Si otro integrante modifica dependencias o migraciones, descarga sus cambios y repite instalación y migración dentro de esa carpeta.

Mantén fuera de Git los entornos privados, las bases, las dependencias instaladas y los informes de ejecución. Conserva las pruebas y las versiones fijadas. Al terminar, registra ejercicios completados y evidencias. La siguiente sesión proporciona otro punto de referencia preparado; las mejoras opcionales del trabajo anterior pueden revisarse después de clase.

## 7. Si falla la preparación

| Síntoma | Siguiente paso |
|---|---|
| La carpeta de sesión ya existe | Consérvala; elige otra carpeta nueva con el instructor |
| Pruebas incorrectas o fallos adicionales | Comprueba carpeta, versión de Bun y manifiesto; comunica la salida |
| PostgreSQL no está disponible | Inicia Podman y el contenedor existente; revisa el puerto configurado |
| Falta la base de la sesión | Crea esa base y ejecuta migración y carga de datos |
| Falla el acceso a Copilot | Ejecuta `copilot login` y sigue la indicación de ruta de preflight |
| Falla la instalación congelada | Conserva el lockfile y la opción; pide ayuda al facilitador |
| Esquema o fuentes incorrectos | Revisa `.env.local` de la carpeta nueva y su base específica |

Conserva la carpeta que falla y sus datos mientras el instructor la revisa. Si hace falta empezar de nuevo, descomprime el mismo ZIP verificado en otra carpeta libre. Las demostraciones de reinicio del taller siguen utilizando la misma base de la sesión actual; transferir datos entre sesiones es una actividad opcional independiente.
