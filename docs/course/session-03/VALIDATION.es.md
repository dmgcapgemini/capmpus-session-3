# Sesión 3 — Validación

Utiliza esta lista después de [el taller](WORKSHOP.md). Separa las comprobaciones locales deterministas de las evidencias del modelo en vivo.

## Punto de partida

La comprobación de tipos y el lint pasan antes de implementar. Los nombres de las pruebas fallidas coinciden exactamente con [el manifiesto del taller](workshop-tests.json). El adaptador documental y el servicio mock funcionan; la consulta de registros, la política, la detección de conflictos y el registro de la herramienta FMS son ejercicios.

## Implementación completa

Comprueba que `bun --version` devuelve `1.4.0` e instala con `bun install --frozen-lockfile`. Usa `bun run test` para que Vitest aplique la selección de proyectos incluida. Registra este runtime junto a los resultados.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run eval:knowledge scripted
```

Todas las pruebas deben pasar; el informe con guion debe contener diez filas satisfactorias para el conjunto de preguntas sin modificar. Las pruebas existentes de workflows y revisión humana deben seguir pasando. Esto verifica el comportamiento de la aplicación, no la selección de fuentes del modelo.

## Evidencias que conservar

| Comprobación | Evidencia requerida |
|---|---|
| Recuperación documental | Pregunta de ruta con cita exacta y procedencia documental |
| Registros unidos | Consulta del permiso de D-101 y del cliente/ventana de LOC-SM1 |
| Fuente externa | Estado de FT-V-001 del mock del FMS con ambos momentos |
| Admisibilidad | Rechazo del chat no verificado, RR. HH. antiguo, exportación antigua y FMS antiguo |
| Fallos | FMS fallido y con tiempo de espera agotado registrados sin evidencias inventadas |
| Conflicto | Discrepancias de ruta, permiso y ventana con ambas referencias |
| Envío | Rechazo de referencia desconocida, cita falsa, evidencia caducada y envío duplicado |
| Persistencia | Mismo ID de consulta, informes y respuesta tras reiniciar la API |
| Interfaz de usuario | Cita, autoridad, antigüedad, incertidumbre y conflicto visibles junto a la respuesta |

## Selección de fuentes en vivo

```bash
bun run eval:knowledge live
```

La evaluación en vivo envía preguntas y contenido ficticio recuperado de las fuentes a GitHub Copilot y consume la cuota de la cuenta. Guarda la ruta del informe, los ID de ejecución, el modelo, los adaptadores reales y los fallos. El evaluador comprueba la selección exacta de adaptadores, las citas admisibles, los conflictos esperados y las fuentes rechazadas, el fallo de fuente y la ejecución completada. No puntúa cada afirmación en lenguaje natural. Revisa el significado de la respuesta por separado.

Si la evaluación en vivo no puede ejecutarse, registra el motivo y deja pendiente ese criterio. No cambies el nombre de un informe con guion ni lo describas como precisión del modelo. Un modelo que elige una fuente adicional falla la selección exacta aunque las demás comprobaciones pasen.

## Conversación de revisión

Explica por qué el momento de recuperación no puede corregir un momento de observación antiguo; por qué una fuente secundaria puede ser admisible y discrepar de una autorizada; por qué la aplicación adjunta los conflictos; y por qué una cita por sí sola no demuestra que una respuesta sea correcta. Muestra que hacer una pregunta de conocimiento no acepta un workflow de la Sesión 2.

## Condiciones de entrega

Envía el código y las evidencias mediante el proceso habitual de revisión del equipo. Un facilitador independiente todavía debe ejecutar el taller de cuatro horas en un host distinto de GitHub antes de la publicación oficial del curso. Un ZIP candidato verificado localmente no demuestra que se haya realizado ese ensayo.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.

## Almacenamiento local de la sesión 3

Utiliza el `.env.local` propio de esta carpeta y el archivo SQLite de aplicación de forma predeterminada; PostgreSQL sigue siendo explícito. Sigue [la configuración SQLite](../../../QUICKSTART-SQLITE.es.md). Las herramientas y los procesos anteriores se suministran completos. Separa los archivos de aplicación, pruebas, evaluación y demostración, y conserva el mismo archivo al comprobar la persistencia tras reiniciar. Elegir almacenamiento no cambia los cuatro ejercicios ni la política de evidencias.
