# Sesión 1 — De las llamadas al modelo a un harness agéntico

Para conocer el propósito de la sesión 1 y su relación con Loom, lee [Comprender los fundamentos de Loom](INTRODUCTION.es.md).

## Objetivo de aprendizaje

Construir un runtime de agentes controlado que lea fuentes permitidas, entregue un análisis estructurado y muestre su ejecución. Al terminar, explicar qué decisiones corresponden a Copilot y cuáles a Loom.

## Modelo, asistente y agente

Una llamada al modelo transforma el contexto proporcionado en una salida. Un asistente añade una interfaz conversacional. Un runtime de agentes puede seleccionar herramientas repetidamente, observar sus resultados y continuar una tarea acotada. Usa una llamada estructurada directa al modelo cuando no haga falta utilizar herramientas de forma iterativa; usa código determinista cuando las reglas ya determinen la respuesta.

El harness es la infraestructura de aplicación que rodea al modelo: instrucciones, contexto, herramientas, permisos, ciclo de vida de la sesión, gestión de fallos, validación, terminación y observabilidad. Unos prompts mejores no pueden sustituir estos controles.

## Las dos responsabilidades

| Runtime de Copilot | Aplicación Loom |
|---|---|
| Interactúa con el modelo y ejecuta el bucle interno de uso de herramientas | Proporciona la tarea, las instrucciones y las herramientas disponibles |
| Selecciona herramientas y observa sus resultados | Valida argumentos, comprueba evidencias y controla los efectos secundarios |
| Aplica las decisiones configuradas de hooks y permisos | Define la política de herramientas y registra las denegaciones |
| Emite eventos de ejecución | Guarda los resultados de las ejecuciones y transmite la traza a la consola |

La sesión 1 persiste ejecuciones y resultados de análisis en PostgreSQL, o en un archivo SQLite local cuando se utiliza la alternativa de la sesión 1. Las trazas son locales al proceso. Al reiniciar, las ejecuciones interrumpidas se marcan como fallidas. Los workflows duraderos, los reintentos y las transiciones humanas de aceptación o rechazo llegan en la sesión 2.

## Herramientas, skills y contexto

Una herramienta es una capacidad ejecutable de la aplicación con un contrato de entrada, un resultado y efectos secundarios explícitos. Una skill es una guía reutilizable con recursos de apoyo para un tipo de tarea. La sesión 1 introduce la distinción, pero desactiva deliberadamente las skills del entorno y el descubrimiento de instrucciones.

El contexto es lo que el modelo puede ver en su interacción actual: instrucciones del runtime, la tarea, las definiciones de herramientas y el contenido devuelto por las fuentes. El manifiesto de fuentes identifica los archivos permitidos; el agente recibe identificadores, nunca permiso para elegir rutas arbitrarias. El texto de las fuentes es evidencia que analizar, no instrucciones que obedecer.

## Validación y autoridad

Loom expone tres herramientas: `list_sources`, `read_source` y `submit_analysis_result`. Solo la última guarda un análisis. Su handler valida el esquema y comprueba cada cita contra una fuente leída durante esa ejecución.

La política previa a la herramienta rechaza herramientas no registradas, envíos antes de leer una fuente y llamadas que superen el presupuesto. El handler sigue validando sus propias entradas. Una denegación es una decisión de política; un resultado fallido de herramienta es información para corregir la llamada. Ambos deben ser visibles.

Un análisis guardado es una salida de ejecución. El campo `accepted: true` de la herramienta confirma el almacenamiento tras la validación, no la aprobación humana de un modelo semántico. El contexto aprobado por personas corresponde a sesiones posteriores.

## Observación de la ejecución

Usa Agent activity para la secuencia; Context para las instrucciones y herramientas proporcionadas; Tool calls para argumentos y resultados; Raw events para el diagnóstico del SDK; Errors para denegaciones y fallos. La consola muestra llamadas al modelo, tokens, llamadas a herramientas y denegaciones. Los recuentos de tokens son evidencia de uso, no una estimación de coste monetario.

Un mensaje final del asistente no demuestra que la tarea haya terminado. La finalización requiere un resultado guardado y el estado final de ejecución de la aplicación.

## Referencias en tu paquete

Lee [el taller](WORKSHOP.md), [los contratos de herramientas](TOOL-CONTRACTS.md) y [los criterios de validación](VALIDATION.md). Las decisiones de arquitectura de la aplicación están en `docs/adr/`, incluidos ADR 0009 y ADR 0010.

## La base de runtime

Loom se ejecuta con Bun 1.4.0. La API, las herramientas TypeScript y la suite de Vitest usan este runtime fijado; el runtime de Copilot sigue siendo un proceso independiente. Usa `bun install --frozen-lockfile` y `bun run test`. Este último selecciona los proyectos de Vitest del taller; `bun test` es otro ejecutor de pruebas. Lee el ADR 0013 en `docs/adr/`.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.
