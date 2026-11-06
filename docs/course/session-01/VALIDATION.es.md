# Sesión 1 — Validación

## Comprobaciones del punto de partida

La base entregada debe superar la comprobación de tipos y el linting. La suite de pruebas deterministas debe fallar exactamente en los casos de `workshop-tests.json`. Esa lista identifica ejercicios, no pruebas que eliminar. Todas las demás pruebas deben pasar.

## Implementación terminada

Comprueba que `bun --version` devuelve `1.4.0` e instala con `bun install --frozen-lockfile`. Usa `bun run test` para que Vitest aplique la selección de proyectos incluida. Registra este runtime junto a los resultados.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Los cuatro comandos deben terminar correctamente después de los ejercicios. La suite real es independiente y consume tu cuota de Copilot:

```bash
bun run test:live
```

Ejecuta las pruebas reales únicamente con las fuentes ficticias del taller y una autenticación de Copilot operativa. También necesitan la base de datos dedicada a pruebas. Las interrupciones del proveedor o las variaciones del modelo deben registrarse por separado de los fallos deterministas.

## Checklist de demostración

- [ ] Arrancar la aplicación y mostrar las herramientas configuradas y los identificadores de fuentes.
- [ ] Completar un análisis real y mostrar el resultado guardado.
- [ ] Mostrar una lectura correcta y el rechazo de un identificador desconocido o una ruta.
- [ ] Mostrar una denegación de política o un resultado fallido de herramienta con información para corregirlo.
- [ ] Inspeccionar el contexto proporcionado, los argumentos, los resultados y el uso.
- [ ] Mostrar que un esquema o unas evidencias inválidos no pueden guardarse.
- [ ] Recargar y recuperar el resultado guardado de la ejecución.
- [ ] Detener una ejecución y explicar su estado final.

## Checklist de explicación

- [ ] Distinguir un modelo, un asistente y un runtime de agentes.
- [ ] Describir qué aporta el harness.
- [ ] Identificar el bucle interno de Copilot y la autoridad de aplicación de Loom.
- [ ] Distinguir herramientas ejecutables de skills reutilizables.
- [ ] Explicar por qué una salida guardada no es contexto aprobado por personas.
- [ ] Dar un caso en el que baste una llamada directa al modelo o código determinista.
- [ ] Explicar que las trazas pueden caducar o desaparecer al reiniciar aunque los resultados persistan.

## Registro de evidencias

Registra el identificador de ejecución, la hora, los identificadores de fuentes, el estado del resultado, el resultado de las pruebas, un fallo y su gestión, y tu explicación de las responsabilidades. No envíes credenciales ni archivos locales de entorno. Usa [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para los fallos de entorno.

## Alternativa con SQLite

Ejecuta las mismas comprobaciones con `DATABASE_URL=sqlite:./.loom/session-01.sqlite`. La base de pruebas debe ser otro archivo. Comprueba que, tras completar los ejercicios, el análisis guardado y sus evidencias siguen disponibles al detener y volver a arrancar la API. Un fallo de PostgreSQL no cambia automáticamente a SQLite.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.
