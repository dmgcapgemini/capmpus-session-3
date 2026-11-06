# Las fuentes de datos de la demo · Sesión 3

FruitTrucks es un caso ficticio. En esta sesión Loom responde preguntas consultando **documentos, registros y un servicio de flota simulado**. Al terminar los talleres, la aplicación también comprueba la evidencia y muestra las discrepancias.

Las rutas de este documento son relativas a la carpeta raíz del proyecto extraído del ZIP.

Los **adaptadores** son las piezas que recuperan datos de cada familia de fuentes. La herramienta es lo que puede invocar el agente; el adaptador hace la consulta correspondiente.

| Familia de fuentes | Herramienta del agente | ID del adaptador |
| --- | --- | --- |
| Documentos | `search_documents` | `documents` |
| Registros de RR. HH., ERP y flota | `lookup_records` | `records` |
| Servicio de flota FMS | `get_vehicle_status` | `fms` |

Sus implementaciones están en [adapters.ts](apps/api/src/knowledge/adapters.ts), función `createKnowledgeRegistry`. Ruta: `apps/api/src/knowledge/adapters.ts`. En el ZIP inicial falta implementar la consulta de registros del taller 1 y registrar la herramienta FMS del taller 4.

## 1. Documentos: normas y explicaciones · `search_documents`

Los originales que usa la demo están en `examples/session-03/` y vienen en inglés. Puedes leer estas traducciones de apoyo:

| Documento | Original usado por la demo | Traducción para leer |
| --- | --- | --- |
| Manual de operaciones | [operations-manual.md](examples/session-03/operations-manual.md) | [Manual en español](examples/session-03/es/operations-manual.md) |
| Entrevista al despachador | [dispatcher-interview.md](examples/session-03/dispatcher-interview.md) | [Entrevista en español](examples/session-03/es/dispatcher-interview.md) |
| Acuerdo del cliente | [customer-agreement.md](examples/session-03/customer-agreement.md) | [Acuerdo en español](examples/session-03/es/customer-agreement.md) |
| Hoja del responsable de flota | [fleet-spreadsheet.md](examples/session-03/fleet-spreadsheet.md) | [Hoja de flota en español](examples/session-03/es/fleet-spreadsheet.md) |
| Chat informal del conductor | [driver-chat.md](examples/session-03/driver-chat.md) | [Chat en español](examples/session-03/es/driver-chat.md) |
| Exportación de 2023 | [export-2023.md](examples/session-03/export-2023.md) | [Exportación en español](examples/session-03/es/export-2023.md) |

**¿Se usan los Markdown o la base de datos?** Las dos cosas, en momentos distintos. Las migraciones crean las tablas y el índice de búsqueda; el **seed**, un paso posterior, carga los contenidos:

1. Al preparar o volver a cargar los datos, `seedKnowledge` lee los Markdown **originales en inglés** indicados en [knowledge-seed.json](examples/session-03/knowledge-seed.json).
2. Guarda su contenido y metadatos en la tabla `knowledge_documents` y prepara el índice de búsqueda de la base local.
3. Cuando el agente llama a `search_documents`, la aplicación busca en esa **copia indexada de la base de datos**, no vuelve a abrir el Markdown en cada pregunta.

**¿Qué es la columna `search`?** Sirve a la búsqueda de texto en PostgreSQL: guarda automáticamente una representación del contenido preparada para buscar, a partir de `content`. En **SQLite**, la columna existe por compatibilidad, pero la búsqueda utiliza el índice FTS `knowledge_documents_fts`, que se mantiene actualizado a partir de `content`. Por eso es normal que `search` esté vacía en SQLite; el texto sigue estando en `content` y se puede buscar.

Solo se cargan los archivos enumerados en `knowledge-seed.json`: la carpeta española no está en esa lista. Cada documento tiene un ID único; si se ejecuta el seed otra vez, se actualiza la fila con ese ID en lugar de crear otra. Por tanto, las traducciones de `examples/session-03/es/` son **solo una ayuda de lectura**: no se cargan ni se usan para las búsquedas o las citas.

Si editas un original, hay que volver a cargar los datos para que la búsqueda refleje el cambio. El seed actualiza los datos ficticios; sigue las instrucciones del taller antes de modificar fuentes.

## 2. Registros: datos concretos por identificador · `lookup_records`

El archivo [knowledge-seed.json](examples/session-03/knowledge-seed.json) aporta los datos iniciales que se cargan en tablas de la base local:

| Sistema representado | Fuente | ID del adaptador | Tablas | Ejemplo |
| --- | --- | --- | --- | --- |
| RR. HH. | `hr` | `records` | `knowledge_drivers` y `knowledge_licences` | El conductor D-101 tiene permiso **C1**. |
| ERP | `erp` | `records` | `knowledge_locations` y `knowledge_customers` | La ubicación LOC-SM1 tiene una ventana de **60 minutos**. |
| Registro técnico de flota | `fleet-register` | `records` | `knowledge_vehicles` | El vehículo FT-V-001 requiere permiso **C** y admite **8.000 kg**. |

Además, `knowledge_documents` guarda el texto y los metadatos de los documentos; el índice de búsqueda de SQLite se llama `knowledge_documents_fts`. La tabla `knowledge_queries` guarda las consultas y sus resultados. Son tablas de la base de datos, no archivos individuales.

Para encontrar los datos y el código:

- **Datos iniciales:** [knowledge-seed.json](examples/session-03/knowledge-seed.json). Ruta: `examples/session-03/knowledge-seed.json`.
- **Migraciones de SQLite:** [sqlite-migrations.ts](packages/persistence/src/sqlite-migrations.ts), migración `s03-0001-knowledge`. Ruta: `packages/persistence/src/sqlite-migrations.ts`. Para PostgreSQL se usa [s03-0001-knowledge.ts](packages/persistence/src/migrations/s03-0001-knowledge.ts).
- **Carga y consultas:** [knowledge.ts](packages/persistence/src/knowledge.ts). `seedKnowledge` carga los datos; `lookupKnowledgeRecords` consulta los registros y realiza las uniones que se completan en el taller 1. Ruta: `packages/persistence/src/knowledge.ts`.

El acuerdo del cliente indica **30 minutos** para LOC-SM1, mientras que el registro ERP indica **60**. Son dos valores distintos para el mismo dato: el taller 3 enseña a conservar el desacuerdo y sus referencias.

## 3. FMS: qué ocurre en la flota · `get_vehicle_status`

El FMS es un **servicio HTTP simulado**. Sus respuestas de ejemplo parten de [fms-fixtures.json](examples/session-03/fms-fixtures.json): FT-V-001 está disponible a 5 °C y FT-V-069 está en mantenimiento a 9 °C. El servidor genera el momento de observación al responder.

El registro técnico de la base describe las especificaciones del vehículo; el FMS aporta su estado operativo. El servicio simulado se implementa en [mock.ts](apps/api/src/knowledge/mock.ts), con la ruta `GET /vehicles/:vehicleId`. El taller 4 conecta la herramienta del agente con este adaptador; la evaluación también prueba respuestas antiguas, errores y retrasos.

Para localizar y probar el servicio:

- **Servicio HTTP simulado:** [mock.ts](apps/api/src/knowledge/mock.ts), función `buildFmsMock`, con `GET /vehicles/:vehicleId`. Ruta: `apps/api/src/knowledge/mock.ts`.
- **Datos de ejemplo:** [fms-fixtures.json](examples/session-03/fms-fixtures.json). Ruta: `examples/session-03/fms-fixtures.json`.
- **Arranque independiente:** [fms-mock.ts](tools/fms-mock.ts). Ruta: `tools/fms-mock.ts`.
- **Servicio usado por la demo programada:** [knowledge-demo.ts](tools/knowledge-demo.ts). Ruta: `tools/knowledge-demo.ts`. En modo `--demo` crea su propio FMS en un puerto dinámico.
- **Ejemplo en el navegador:** [FT-V-001 en el FMS](http://127.0.0.1:13311/vehicles/FT-V-001). Solo funciona si el FMS independiente está en marcha en el puerto `13311`; no corresponde al puerto dinámico de `--demo`.

## ¿Dónde está todo?

- **Base SQLite:** normalmente `.loom/session-03.sqlite` después del setup; la ruta efectiva está en `DATABASE_URL` de tu `.env.local`. Las pruebas, la demo y la evaluación usan bases separadas.
- **Creación de las tablas:** [sqlite-migrations.ts](packages/persistence/src/sqlite-migrations.ts), en la migración `s03-0001-knowledge`.
- **Carga y consultas:** [knowledge.ts](packages/persistence/src/knowledge.ts), funciones `seedKnowledge`, `searchKnowledgeDocuments` y `lookupKnowledgeRecords`.
- **Herramientas y validación:** [tools.ts](packages/agent-tools/src/knowledge/tools.ts); las reglas de autoridad, vigencia y conflictos están en [policy.ts](packages/agent-tools/src/knowledge/policy.ts).
- **Arquitectura general:** [ARQUITECTURA-SESION-03.es.md](ARQUITECTURA-SESION-03.es.md).

En el ZIP inicial las soluciones de los cuatro talleres están pendientes: la búsqueda de documentos y la carga de datos ya existen, pero la consulta de registros, los controles de evidencia, la detección estructurada de conflictos y el registro de la herramienta FMS se completan durante la sesión.
