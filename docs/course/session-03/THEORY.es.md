# Sesión 3 — Acceso al conocimiento

Empieza con [la lectura introductoria](INTRODUCTION.es.md) para situar esta sesión en el conjunto de Loom.

Loom responde ahora a preguntas utilizando documentos, registros relacionales y un servicio externo de flota simulado. Una herramienta de acceso a fuentes devuelve evidencias con su procedencia; la aplicación decide si esas evidencias son admisibles. Lee [el taller](WORKSHOP.md) y [la validación](VALIDATION.md).

## Elegir un método de recuperación

| Pregunta | Fuente | Recuperación |
|---|---|---|
| ¿Qué exige la política de cambios de ruta? | Documentos | Búsqueda indexada: SQLite FTS5 de forma predeterminada; PostgreSQL si se elige |
| ¿Qué permiso tiene D-101? | Registros | Consulta por ID exacto con joins relacionales |
| ¿Está disponible FT-V-001 ahora? | Mock del FMS | Petición HTTP acotada |

La búsqueda documental utiliza un índice de texto en inglés y coincidencias léxicas ordenadas por relevancia. No es un servicio de similitud semántica ni de embeddings. Los registros conservan la identidad de las entidades y sus relaciones: un conductor se une a sus registros de permisos; una ubicación se une a su cliente. El adaptador externo valida la respuesta antes de convertirla al contrato común.

## La procedencia forma parte del resultado

Cada elemento contiene `sourceId`, `evidenceRef`, `method`, `observedAt`, `retrievedAt`, `authority`, `content` y `facts` curados. El momento de observación indica cuándo estaba vigente la información de la fuente; el de recuperación indica cuándo la obtuvo Loom. Recuperar hoy una exportación antigua no actualiza sus hechos. La autoridad pertenece al adaptador y al conjunto de datos configurados, no a una afirmación del modelo.

El registro de fuentes gestiona los tres adaptadores. El agente ve `search_documents`, `lookup_records`, `get_vehicle_status` y `submit_knowledge_answer`. Las descripciones de las herramientas orientan la selección de fuentes; la evaluación comprueba qué adaptadores se invocaron realmente. Los informes de recuperación y la respuesta final sobreviven a un reinicio de la API. Las trazas originales de las invocaciones siguen siendo transitorias.

## Admisibilidad antes del razonamiento

Rechaza las fuentes no verificadas, las observaciones situadas más de cinco segundos en el futuro y las que superen el límite de antigüedad de su método. Los límites exactos son inclusivos: documentos, 365 días; registros, 7 días; FMS, 120 segundos. Pueden admitirse tanto fuentes autorizadas como secundarias. Los informes de rechazo muestran la identidad y el motivo, sin el contenido rechazado. Vuelve a comprobar la vigencia al enviar la respuesta, porque las evidencias pueden caducar durante una ejecución.

La carga de datos de prueba calcula algunos momentos de observación con relación a la carga, para que los ejercicios sean repetibles. La exportación de 2023 sigue siendo antigua. Son antigüedades simuladas de instantáneas, no fechas de sucesos empresariales reales. Volver a cargar los datos actualiza las instantáneas simuladas; no es un mecanismo de vigencia para producción.

## Las discrepancias deben seguir visibles

El manual de operaciones exige la confirmación del conductor tras un cambio de ruta; la entrevista al despachador describe una práctica sin ella. La hoja de flota indica que D-101 tiene C, mientras que RR. HH. indica C1. El acuerdo con el cliente establece una ventana de 30 minutos en LOC-SM1, mientras que ERP contiene 60 minutos. La restricción de acceso del chat de conductores no está verificada; la exportación antigua está desactualizada.

La detección de conflictos agrupa claves de hechos curados y compara valores normalizados entre fuentes distintas. Adjunta los conflictos a la respuesta almacenada incluso cuando el modelo los omite. Esto detecta las contradicciones declaradas en los datos de prueba; no descubre contradicciones arbitrarias en prosa ni establece qué fuente dice la verdad. Informa del conflicto y de la incertidumbre en lugar de resolverlo silenciosamente.

## Evidencias y respuestas

El envío solo acepta referencias recuperadas en la consulta actual, aún admisibles según la política, y citas que aparezcan en su fuente tras normalizar los espacios en blanco. Las respuestas no vacías requieren citas. Si no hay evidencias utilizables, la respuesta debe estar vacía y la incertidumbre debe ser explícita. Se rechazan las referencias inventadas, las citas alteradas y un segundo envío.

Una cita válida demuestra que un texto existe en una fuente. No demuestra que todas las afirmaciones de una respuesta generada se deduzcan de ese texto. Sigue siendo necesaria la revisión humana del significado. Las respuestas de conocimiento no aprueban un workflow de la Sesión 2 ni crean contexto semántico aceptado.

## Evaluar dos cosas distintas

Las referencias de evidencia esperadas también deben coincidir con la pregunta; una respuesta vacía no puede pasar un caso que requiere evidencias. Las expectativas del FMS utilizan un prefijo de referencia porque el momento de observación cambia. Las diez preguntas compartidas cubren la elección de fuentes, los conflictos, las fuentes no disponibles, las instantáneas antiguas y la baja autoridad. El modo con guion utiliza llamadas a herramientas predefinidas para probar el funcionamiento de la aplicación. El modo en vivo entrega únicamente la pregunta a Copilot y mide la selección real de herramientas, las citas admisibles, los conflictos, las fuentes rechazadas y los fallos. Una ejecución con guion satisfactoria no demuestra la precisión del modelo.

El uso en vivo envía preguntas y contenido ficticio recuperado de las fuentes a GitHub Copilot y consume la cuota de tu cuenta. Mantén ficticios los datos del ejercicio. El origen del servicio se limita a HTTP sobre la dirección literal de loopback; se rechazan las redirecciones, las respuestas demasiado grandes y las esperas prolongadas. Este taller ejecuta un proceso de API por base de datos y no implementa autenticación de producción ni propiedad distribuida.

## De las evidencias del taller a la procedencia del producto

Esta sesión comprueba la autoridad y la vigencia de las fuentes al recuperarlas y al enviar la respuesta. El producto final también vincula las evidencias a versiones inmutables de las fuentes y vuelve a comprobar los permisos antes de reutilizarlas. Un acierto de caché o un hash de contenido sin cambios no renueva una observación ni restablece un acceso revocado. La futura generación de contexto y artefactos debe registrar las revisiones exactas de fuentes, contexto, decisiones y guardrails. Son contratos posteriores del producto, no capacidades implementadas en este taller. Bun 1.4.0 sigue siendo el runtime de la API, los adaptadores y las herramientas de evaluación.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.

## Almacenamiento local de la sesión 3

Utiliza el `.env.local` propio de esta carpeta y el archivo SQLite de aplicación de forma predeterminada; PostgreSQL sigue siendo explícito. Sigue [la configuración SQLite](../../../QUICKSTART-SQLITE.es.md). Las herramientas y los procesos anteriores se suministran completos. Separa los archivos de aplicación, pruebas, evaluación y demostración, y conserva el mismo archivo al comprobar la persistencia tras reiniciar. Elegir almacenamiento no cambia los cuatro ejercicios ni la política de evidencias.
