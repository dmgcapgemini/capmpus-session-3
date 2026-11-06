# Sesión 1 — Taller

Empieza por [la lectura introductoria](INTRODUCTION.es.md) para comprender la relación entre Loom, el harness y los tres talleres.

## Antes de la sesión

Sigue `PREREQUISITES.md` y `QUICKSTART.md` en la raíz. Importa el zip de la sesión en el repositorio de tu equipo. Cada miembro utiliza su propia base de datos local. Ejecuta estos comandos desde la raíz de la aplicación importada:

Si no dispones de contenedores o PostgreSQL, sigue `QUICKSTART-SQLITE.es.md` en la raíz y configura `DATABASE_URL=sqlite:./.loom/session-01.sqlite`. No hace falta instalar otra base de datos. Las pruebas utilizan un archivo separado. Esta alternativa se limita a la sesión 1.

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
bun run dev
```

El punto de partida se compila y arranca. Algunas pruebas fallan intencionadamente: sus nombres completos aparecen en `docs/course/session-01/workshop-tests.json`. Cualquier otro fallo es un problema del entorno o de la base que debes comunicar al facilitador. No elimines pruebas, cambies sus aserciones ni actualices dependencias.

Al principio la consola no puede completar un análisis. Quedan tres bloques TODO. Lee el brief en `examples/session-01/solution-brief.md`; trata los datos que faltan como preguntas.

## Horario facilitado

| Hora | Actividad |
|---|---|
| 00:00–00:20 | Demostración del instructor: ejecución correcta, validación y denegación |
| 00:20–01:05 | Teoría: modelo, agente, harness, herramientas, skills y responsabilidades |
| 01:05–01:25 | Recorrido por los paquetes y el flujo de ejecución |
| 01:25–02:15 | Taller 1: acceso a fuentes y validación de entradas |
| 02:15–02:25 | Descanso |
| 02:25–03:10 | Taller 2: herramientas e instrucciones de la sesión |
| 03:10–03:40 | Taller 3: persistencia controlada |
| 03:40–04:00 | Demostración y revisión |

## Taller 1 — Completar el límite de acceso a las fuentes

Abre `packages/agent-tools/src/tools/read-source.ts`. El registro del manifiesto y el esquema de la herramienta ya existen. Implementa el TODO del handler:

1. Valida los argumentos recibidos con el esquema existente.
2. Rechaza los valores que parezcan rutas y los identificadores desconocidos con mensajes de fallo que permitan corregir la llamada.
3. Lee únicamente a través del registro de fuentes.
4. Registra el identificador de una lectura correcta en el conjunto de fuentes leídas de la ejecución.
5. Devuelve el identificador, nombre, tipo de medio y contenido de la fuente.

El `void z` del stub solo mantiene válido el import proporcionado hasta que lo utilices; elimínalo al implementar el ejercicio. No añadas comandos de shell ni acceso directo al sistema de archivos a la herramienta.

```bash
bun --bun run vitest run --project unit packages/agent-tools/src/tools/tools.test.ts
```

Las pruebas del límite de acceso a fuentes deben pasar. Las de persistencia siguen incompletas. Explica la diferencia entre un identificador declarado y una ruta proporcionada por el usuario. Demuestra un identificador desconocido y un intento de acceso mediante rutas a través de las pruebas.

## Taller 2 — Conectar Copilot con las herramientas de Loom

Abre `packages/agent-runtime/src/session-config.ts`. Completa el TODO de registro utilizando las herramientas e instrucciones suministradas a la ejecución. Inspecciona la lista de herramientas disponibles, el handler de permisos, el hook previo al uso de herramientas y las funciones del entorno desactivadas; conserva estos controles.

```bash
bun --bun run vitest run --project unit packages/agent-runtime/src/session-config.test.ts
```

Inicia la tarea predeterminada desde la consola. Inspecciona Context y Tool calls. El agente debe leer el brief, pero el análisis todavía no puede guardarse hasta el taller 3. Detén una ejecución en lugar de reintentar repetidamente una implementación que sabes que falta. Cada ejecución real consume tu cuota de Copilot.

Explica por qué registrar un handler y restringir las herramientas disponibles son responsabilidades distintas. Muestra en qué se diferencia una skill de estas herramientas; activar skills no forma parte de este ejercicio.

## Taller 3 — Guardar un resultado validado

Abre `packages/agent-tools/src/tools/submit-analysis.ts`. Las comprobaciones de esquema y evidencias ya existen. Completa el TODO de persistencia:

1. Rechaza un segundo envío después de guardar un resultado para esta ejecución.
2. Guarda el análisis validado mediante el puerto de almacenamiento suministrado, con el identificador de ejecución.
3. Registra el identificador del resultado guardado en el estado de herramientas de la ejecución.
4. Devuelve el contrato de resultado correcto existente.

No omitas la validación ni accedas directamente a la base de datos desde la herramienta. La aplicación externa decide el estado final de la ejecución.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Ahora deben pasar todas las pruebas deterministas. Ejecuta el análisis predeterminado en la consola e inspecciona el resultado guardado y sus evidencias. Recarga la página y selecciona la ejecución en Recent runs para demostrar la persistencia.

## Demostración final

Usa [VALIDATION.md](VALIDATION.md). Muestra una ejecución correcta, una operación rechazada o denegada, el contexto, los resultados de las herramientas y un resultado guardado. Explica por qué el mensaje final del modelo no actualiza por sí mismo el estado de la aplicación. Registra un caso en el que sea preferible una llamada directa al modelo.

Una denegación en una ejecución real depende del modelo. Usa las pruebas deterministas de política para demostrar su aplicación de forma fiable; el facilitador dispone de una prueba real controlada como evidencia adicional. Nunca debilites la política para que una ejecución termine correctamente.

## Después de la sesión

Sigue [SELF-STUDY.md](SELF-STUDY.md). Incorpora tus cambios mediante el proceso habitual de revisión del equipo. Conserva un registro de los ejercicios terminados y pendientes; la siguiente sesión proporciona un ZIP completo en una carpeta nueva con las implementaciones de referencia anteriores incluidas. Termina estos ejercicios para aprender y compararlos; completarlos no bloquea el acceso a la sesión 2. La sesión 2 también admite SQLite sin contenedores; PostgreSQL sigue siendo opcional.
