# Sesión 2 — Validación

Utiliza esta lista después de [el taller](WORKSHOP.md). Una batería de pruebas que pasa no sustituye la explicación del equipo sobre el proceso observado.

## Comprobaciones automáticas

Comprueba que `bun --version` devuelve `1.4.0` e instala con `bun install --frozen-lockfile`. Usa `bun run test` para que Vitest aplique la selección de proyectos incluida. Registra este runtime junto a los resultados.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Todas las pruebas deben pasar en la implementación completa. En el punto de partida inicial solo fallan los nombres incluidos en [el manifiesto del taller](workshop-tests.json).

## Demuestra el proceso

| Criterio | Evidencia que se debe capturar |
|---|---|
| Reinicio sin perder el estado del workflow | Mismo ID del workflow y eventos de auditoría anteriores tras terminar y reiniciar la API de pruebas |
| Reanudación de un proceso pendiente | Nuevo intento e ID de ejecución dentro del workflow existente, respetando el presupuesto original |
| Aplicación única de un resultado | El envío repetido devuelve un único ID de resultado y crea un único evento de propuesta |
| Gestión de una invocación fallida | Ejecución fallida, reintento registrado y posterior revisión o fallo acotado |
| La aceptación corresponde a Loom | Herramienta de aceptación del agente denegada; la decisión HTTP humana cambia el estado de revisión una sola vez |
| Rechazo de decisiones desactualizadas o ilegales | Respuesta de conflicto, workflow sin cambios y ningún evento de auditoría adicional |

## Revisión del equipo

Explica qué datos sobreviven al reinicio, quién controla cada bucle, qué protege la versión, de dónde viene la clave de idempotencia y qué ocurre si el proceso termina después de almacenar el resultado. Muestra por qué una propuesta almacenada no equivale a aceptación humana. Mantén las evidencias libres de credenciales locales.

## Niveles de finalización

- Mínimo: transiciones legales, una invocación fallida gestionada, una decisión humana de aceptación o rechazo.
- Esperado: todas las comprobaciones pasan; recuperación tras reinicio, repetición idéntica y decisiones desactualizadas demostradas con historial duradero.
- Ampliado: una demora de reintento persistida o una regla de escalado del trabajo autónomo, con una prueba de transición inválida.

## Resolución de problemas

Para SQLite, comprueba la ruta del archivo y los permisos de la carpeta. Para PostgreSQL, comprueba su contenedor, el puerto local y el nombre de la base de datos. Si un workflow permanece en cola, comprueba que la API está en ejecución y que otro intento no ocupa el único hueco de ejecución. En el punto de partida, la recuperación y la revisión están incompletas de forma intencionada. Si el presupuesto de intentos se agota, crea un nuevo workflow; el estado terminal no se restablece. Si la traza ha caducado tras el reinicio, utiliza el historial del workflow y el resultado almacenado. Si la revisión produce un conflicto, actualiza e inspecciona la decisión existente antes de volver a intentarlo.

El servidor de pruebas requiere un archivo independiente `_demo.sqlite` / `_demo.db` o una base PostgreSQL terminada en `_demo` y nunca llama a Copilot. El servidor habitual necesita el inicio de sesión normal de Copilot y acceso a la red. Ejecuta un único proceso de API por base de datos. El ensayo independiente del facilitador y la decisión de publicación se registran por separado por el equipo del campus.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.
