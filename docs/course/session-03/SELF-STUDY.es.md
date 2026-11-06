# Sesión 3 — Práctica independiente

Completa primero [el taller](WORKSHOP.md). Mantén el mismo dominio ficticio y los contratos de fuentes. Este ejercicio de cuatro horas amplía tu razonamiento y tus evidencias, no el alcance de las decisiones de negocio aceptadas.


Como ejercicio de diseño, describe qué debe ocurrir si una evidencia en caché conserva el mismo hash de contenido, pero caduca o pierde el permiso de acceso. Enumera las versiones inmutables de entrada que necesitaría un futuro artefacto para mantener la trazabilidad; no añadas una caché ni un sistema de identidad a este ejercicio.
## Plan de cuatro horas

| Actividad | Minutos |
|---|---:|
| Revisar una consulta de extremo a extremo | 30 |
| Añadir una pregunta no vista y su fuente esperada | 45 |
| Probar los fallos externos y la vigencia | 45 |
| Descanso | 10 |
| Poner a prueba los límites de conflictos y citas | 45 |
| Comparar la selección con guion y en vivo | 40 |
| Escribir las evidencias de revisión | 25 |
| Total | 240 |

## Seguir el límite

Sigue una pregunta a través de su ruta HTTP, servicio de ejecución, herramienta de fuente, adaptador, informe de recuperación y envío de respuesta. Dibuja dónde se aplica la política y dónde se hacen duraderos los datos. Explica qué permanece tras un reinicio y qué información de las trazas originales puede desaparecer.

## Añadir una pregunta no vista

Crea una pregunta nueva utilizando hechos existentes de los datos de prueba. Antes de ejecutarla, registra los adaptadores esperados, las evidencias admisibles, los conflictos y las fuentes rechazadas. Añádela a una copia local de `examples/session-03/questions.json` utilizando el esquema existente. Mantén `calls` como instrucciones del escenario con guion, no como entrada del modelo. Explica por qué consultar todos los adaptadores haría fallar la métrica de selección de fuentes aunque encontrase una cita válida.

## Probar los fallos y la antigüedad

Utiliza el mock del FMS con los modos `normal`, `stale`, `failure` y `slow`. Configura `LOOM_FMS_DELAY_MS` y `LOOM_FMS_AGE_SECONDS` para experimentar con los límites. Detén el mock anterior antes de reiniciarlo en el mismo puerto. Predice qué lado del límite de 120 segundos pasa, incluido el tiempo transcurrido entre la recuperación y el envío.

Registra en qué se diferencia una fuente no disponible de una recuperación satisfactoria rechazada por la política. No conviertas ninguna de ellas en un estado operativo inventado. Confirma que la respuesta puede contener incertidumbre explícita sin citas cuando no existan evidencias admisibles.

## Poner a prueba las evidencias

Prueba hechos equivalentes repetidos, variantes de espacios y mayúsculas, y dos valores de una sola fuente. Explica qué casos son conflictos y por qué. Intenta utilizar una referencia desconocida, una cita modificada, una referencia caducada y un envío de respuesta duplicado mediante una prueba específica. Todos deben fallar sin sustituir una respuesta almacenada.

Describe una respuesta plausible que cite una frase real pero extraiga una conclusión sin respaldo. Explica por qué la validación de citas exactas no puede sustituir una revisión semántica. No afirmes que la comparación de hechos curados comprende prosa arbitraria.

## Comparar la selección

Ejecuta la evaluación con guion y después la evaluación en vivo si tu cuenta y la política del curso permiten enviar las preguntas ficticias y el contenido recuperado a GitHub Copilot. Compara las elecciones reales de adaptadores, las evidencias, los conflictos y los fallos. Registra el runtime/modelo, la ruta del informe y los ID de ejecución. Si el uso en vivo no está disponible, márcalo como no ejecutado; el éxito con guion no lo sustituye.

## Entregar

Proporciona una breve nota de revisión con la pregunta no vista, los resultados previstos y observados, las pruebas de límites, una captura de la procedencia y una explicación de una limitación restante. Ejecuta las comprobaciones de [validación](VALIDATION.md). Evita añadir embeddings, una nueva integración remota o identidad de producción para terminar este ejercicio.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.

## Almacenamiento local de la sesión 3

Utiliza el `.env.local` propio de esta carpeta y el archivo SQLite de aplicación de forma predeterminada; PostgreSQL sigue siendo explícito. Sigue [la configuración SQLite](../../../QUICKSTART-SQLITE.es.md). Las herramientas y los procesos anteriores se suministran completos. Separa los archivos de aplicación, pruebas, evaluación y demostración, y conserva el mismo archivo al comprobar la persistencia tras reiniciar. Elegir almacenamiento no cambia los cuatro ejercicios ni la política de evidencias.
