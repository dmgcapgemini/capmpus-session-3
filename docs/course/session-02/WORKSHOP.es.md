# Sesión 2 — Construye el proceso duradero

Empieza con [la lectura introductoria](INTRODUCTION.es.md) para situar esta sesión en el conjunto de Loom.

Objetivo: una invocación fallida o interrumpida puede reanudarse, un análisis se aplica una sola vez y solo una decisión humana lo acepta. Utiliza [la teoría](THEORY.md) y termina con [la validación](VALIDATION.md).

## Antes de la sesión

Antes de clase, añade el ZIP completo de la sesión 2 a una carpeta nueva `session-02/` siguiendo QUICKSTART.es.md y ejecuta los comandos dentro de ella. La base incluye la implementación de referencia completa de la sesión 1; conserva tu trabajo para compararlo. Utiliza Bun 1.4.0 y SQLite de forma predeterminada; PostgreSQL 17 sigue disponible como opción explícita. Crea el `.env.local` de esta carpeta desde `.env.example`, con `DATABASE_URL=sqlite:./.loom/session-02.sqlite` (o una base PostgreSQL independiente como `loom_session02`) y `LOOM_SOURCES_DIR=examples/session-02`. Conserva los archivos SQLite anteriores; su historial no se transfiere. La instalación y el almacenamiento se preparan fuera de las cuatro horas. Los cuatro ejercicios actuales se enseñan en tres bloques. Después ejecuta:

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
```

La comprobación de tipos y el lint deben pasar. Compara los nombres de las pruebas que fallen con [el manifiesto del taller](workshop-tests.json); todas las demás pruebas deben pasar. No cambies las pruebas para que el punto de partida aparezca en verde.

## Programa de cuatro horas

| Segmento                                                    | Minutos |
| ----------------------------------------------------------- | ------: |
| Demostración inicial de fallo y reinicio                   |      20 |
| Dos bucles, diagrama de estados y repaso de la transacción |      35 |
| Bloque 1: condiciones de transición y auditoría           |      45 |
| Descanso                                                    |      10 |
| Bloque 2: idempotencia y recuperación                      |      65 |
| Bloque 3: revisión humana                                  |      40 |
| Validación y explicación del equipo                       |      25 |
| Total                                                       |     240 |

## Taller 1 — Protege las transiciones

Abre `packages/persistence/src/workflows.ts`. Implementa `assertWorkflowTransition` utilizando la tabla de transiciones. Rechaza una conexión ilegal con un conflicto antes de actualizar nada. Estudia cómo el repositorio comprueba la versión esperada y confirma conjuntamente la actualización del estado y el evento; esas partes ya están incluidas.

SQLite serializa las transacciones mediante la conexión local; PostgreSQL utiliza bloqueos de fila. Ambos conservan la versión esperada y la auditoría atómica. Ejecuta las pruebas del repositorio de workflows. Demuestra que la aceptación no puede partir de un workflow recién creado, que una decisión terminal no puede revertirse y que una versión desactualizada no cambia ni el estado ni el historial. Explica por qué la prueba de rollback de auditoría utiliza un fallo real de base de datos.

```bash
bun --bun run vitest run --project integration packages/persistence/src/workflows.int.test.ts
```

## Taller 2 — Aplica una sola vez y recupera

En `workflowResultStore`, trata un resultado existente antes de insertar. Devuelve su ID solo cuando el análisis almacenado sea igual al análisis repetido; rechaza un contenido modificado. Conserva las comprobaciones de vinculación y de intentos obsoletos. No debilites la validación de fuentes ni de evidencias.

En `apps/api/src/workflows/service.ts`, implementa la recuperación al arrancar. Carga los workflows pendientes y habilita sus ID para este worker. Pasa las propuestas confirmadas a revisión. Marca como fallidos los análisis interrumpidos cuyo presupuesto de intentos se haya agotado. Los análisis pendientes con presupuesto siguen habilitados para una nueva invocación. El servicio de ejecuciones marca las ejecuciones interrumpidas antes de llamar a este método.

Ejecuta ambos archivos de pruebas de workflows. Observa los distintos ID de ejecución dentro de un mismo workflow y el número limitado de intentos. Explica la diferencia entre un fallo del proceso antes y después de confirmar la transacción de la propuesta.

```bash
bun --bun run vitest run --project integration workflows.int.test.ts
```

## Taller 3 — Revisión humana

En `apps/api/src/workflows/routes.ts`, implementa los endpoints de aceptación y rechazo. Utiliza los esquemas de parámetros y peticiones incluidos; pasa la versión esperada, la decisión y el motivo al repositorio. Devuelve el workflow actualizado. Mantén la revisión fuera de la lista de herramientas registradas.

Las rutas son `POST /api/workflows/:id/accept` y `POST /api/workflows/:id/reject`. Los cuerpos de las peticiones contienen `version` y `reason`. Una decisión desactualizada debe devolver un conflicto. Ejecuta la prueba HTTP de revisión y, después, acepta una propuesta y rechaza otra en el navegador. Inspecciona el evento de decisión y prueba una petición desactualizada.

## Demostración repetible de fallo y reinicio

Completa los ejercicios antes de esta demostración. Detén primero la API normal. En el terminal utilizado para la API de pruebas, establece `DATABASE_URL=sqlite:./.loom/session-02_demo.sqlite` o selecciona una base PostgreSQL independiente llamada `loom_session02_demo` con tus datos de conexión local. Mantén el mismo puerto de API que espera el proxy web. El servidor de pruebas crea y migra esta base de datos de demostración sin vaciarla.

```bash
bun run demo:workflow fail-once
```

En otro terminal, inicia la aplicación web:

```bash
bun run --filter @loom/web dev
```

Inicia un workflow. La primera invocación falla; la siguiente almacena una propuesta dos veces con un único ID de resultado e intenta utilizar una herramienta de aceptación que Loom deniega. El workflow espera tu decisión. Inspecciona ambos intentos y su historial. Detén la API de pruebas y reiníciala en modo de espera:

```bash
bun run demo:workflow hold
```

Inicia un nuevo workflow y espera a que su estado sea de análisis. Anota su ID y el PID que muestra el servidor de pruebas. En un terminal independiente, termina únicamente ese proceso de pruebas:

```bash
kill -9 <printed-fixture-pid>
```

Reinicia contra la misma base de datos de demostración:

```bash
bun run demo:workflow succeed
```

Actualiza el navegador. El mismo workflow se reanuda con un número de intentos mayor y llega a revisión. El historial anterior del workflow permanece. Las trazas antiguas sin procesar del agente pueden no estar disponibles. Utiliza el modo `fail-always` con un nuevo workflow para demostrar el fallo acotado.

## Termina

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Restaura la configuración de la base de datos normal de la sesión, detén el servidor de pruebas y utiliza `bun run dev` para un workflow real con Copilot. Envía tus cambios mediante el proceso de revisión habitual del equipo. Registra el ID del workflow, el intento fallido, el historial de recuperación, el ID del resultado duplicado y la decisión humana en tus evidencias de validación.
