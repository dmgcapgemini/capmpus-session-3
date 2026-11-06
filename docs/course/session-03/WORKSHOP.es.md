# Sesión 3 — Conectar y evaluar el conocimiento

Empieza con [la lectura introductoria](INTRODUCTION.es.md) para situar esta sesión en el conjunto de Loom.

Objetivo: seleccionar la fuente adecuada, conservar la procedencia, rechazar evidencias no admisibles y mostrar las discrepancias. Utiliza [la teoría](THEORY.md) y termina con [la validación](VALIDATION.md).

## Antes de la sesión

Para preparar y arrancar juntos API, web y simulador con SQLite en Mac o Windows, utiliza `guia super rapida.md` de la raíz del ZIP. Los comandos manuales siguientes se conservan como referencia.

Antes de clase, añade el ZIP completo de la sesión 3 a una carpeta nueva `session-03/` siguiendo QUICKSTART.es.md y ejecuta los comandos dentro de ella. La base incluye las implementaciones de referencia anteriores y la navegación de procesos. Conserva tu trabajo y tus bases anteriores. Utiliza Bun 1.4.0; crea el `.env.local` de esta carpeta desde `.env.example`, con `DATABASE_URL=sqlite:./.loom/session-03.sqlite` de forma predeterminada (o una base PostgreSQL independiente `loom_session03` seleccionada explícitamente), `LOOM_SOURCES_DIR=examples/session-03` y la URL FMS suministrada. Migra y carga esta base nueva; el historial anterior no se transfiere. La instalación, el almacenamiento y el mock se preparan antes del taller de cuatro horas:

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
```

La comprobación de tipos y el lint deben pasar. Los fallos de las pruebas deben coincidir exactamente con [el manifiesto del taller](workshop-tests.json); todas las demás pruebas deben pasar. No cambies las pruebas ni elimines controles para que pasen.

## Programa de cuatro horas

| Segmento | Minutos |
|---|---:|
| Demostración inicial de selección de fuentes | 20 |
| Repaso de procedencia, registro y política | 30 |
| Bloque 1: consulta relacional | 40 |
| Bloque 2: autoridad y vigencia | 40 |
| Descanso | 10 |
| Bloque 3: conflictos | 35 |
| Bloque 4: herramienta externa y evaluación | 40 |
| Validación y explicación del equipo | 25 |
| Total | 240 |

## Taller 1 — Unir registros exactos

Abre `packages/persistence/src/knowledge.ts` e implementa la función `lookupKnowledgeRecords`. Debe buscar por **tipo de entidad e ID exacto**, utilizando consultas parametrizadas:

- **Conductor (`driver`):** busca el conductor y une su registro con el de su permiso. Usa la fuente `hr`, la referencia `record:driver:<id>` y la clave de hecho `driver.<id>.licence`.
- **Ubicación (`location`):** busca la ubicación y une su registro con el de su cliente. Usa la fuente `erp`, la referencia `record:location:<id>` y la clave de hecho `location.<id>.window_minutes`.
- **Vehículo (`vehicle`):** busca su registro técnico. Usa la fuente `fleet-register`, la referencia `record:vehicle:<id>` y la clave de hecho `vehicle.<id>.licence`.

Sustituye `<id>` por el identificador solicitado. Por ejemplo, para el conductor `D-101`, la referencia es `record:driver:D-101`.

En cada resultado:

- Incluye una descripción legible con el ID y los datos encontrados, incluidos los obtenidos mediante la unión cuando corresponda.
- Conserva la fecha de observación almacenada y la fecha de recuperación proporcionada, junto con los metadatos de autoridad y una referencia de evidencia estable.
- Representa los valores numéricos de los hechos como cadenas de texto.

Si no existe un registro para el ID solicitado, devuelve un array vacío.

**Pruebas de este taller**, desde la raíz del proyecto:

```bash
bun --bun run vitest run --project integration apps/api/src/knowledge/knowledge.int.test.ts -t "retrieves joined driver, customer and vehicle records|rejects path/SQL input and unknown exact IDs"
```

Compara D-101 con la hoja de cálculo y LOC-SM1 con el acuerdo. No reescribas los datos de prueba para reconciliar sus discrepancias.

## Taller 2 — Evaluar las evidencias

Abre `packages/agent-tools/src/knowledge/policy.ts` e implementa `rejectionReason`. La función decide si una evidencia se puede utilizar o debe rechazarse.

**Comprueba estas condiciones en orden:**

1. **Autoridad:** rechaza las fuentes no verificadas.
2. **Fecha de observación:** rechaza las fechas inválidas y las situadas más de cinco segundos en el futuro.
3. **Antigüedad:** calcula cuánto tiempo ha pasado desde la observación y rechaza los datos que superen el límite de su tipo:
   - Documentos: **365 días**.
   - Registros: **7 días**.
   - FMS: **120 segundos**.

Usa el reloj proporcionado a la función. Un dato justo en el límite se admite. Devuelve un motivo útil cuando se rechaza y `null` cuando no hay motivo de rechazo.

**Comprueba también el recorrido de la evidencia:** la función ya se llama al recuperar datos y al enviar la respuesta. Explica por qué hacen falta las dos comprobaciones. El contenido rechazado no debe aparecer entre los elementos válidos entregados al agente, pero el informe debe conservar la referencia y el motivo del rechazo.

Los casos de búsqueda de la exportación antigua también dependen de esta política y están incluidos en el manifiesto del taller. La búsqueda documental ya está implementada.

**Pruebas de este taller**, desde la raíz del proyecto:

```bash
bun --bun run vitest run --project unit packages/agent-tools/src/knowledge/knowledge.test.ts -t "accepts exactly the age boundary|rejects stale observations|rejects unverified|keeps rejected content|rechecks freshness"
```

## Taller 3 — Conservar los conflictos

Implementa `detectKnowledgeConflicts` en el mismo archivo de política. Agrupa los hechos por clave, normaliza los valores eliminando espacios en los extremos, reduciendo espacios consecutivos y convirtiendo a minúsculas, y conserva sus referencias de evidencia. Emite únicamente claves con valores distintos respaldados por fuentes distintas. Ordena la salida de forma determinista y elimina referencias duplicadas. Las observaciones repetidas de una sola fuente no establecen por sí solas un conflicto entre fuentes.

Prueba las discrepancias sobre la confirmación de ruta, el permiso del conductor y la ventana de entrega. Las evidencias antiguas y no verificadas deben filtrarse antes de detectar conflictos. Explica por qué una exportación de 2023 se informa como rechazada en lugar de utilizarse para reforzar una afirmación actual de ERP.

**Pruebas de este taller**, desde la raíz del proyecto:

```bash
bun --bun run vitest run --project unit packages/agent-tools/src/knowledge/knowledge.test.ts -t "detects contradictions|attaches conflicts"
```

## Taller 4 — Conectar la herramienta externa

En `packages/agent-tools/src/knowledge/tools.ts`, registra la herramienta **`get_vehicle_status`** junto a las demás herramientas de recuperación. Su propósito es consultar el estado operativo actual de un vehículo.

Para conectarla, distingue estas piezas:

- **Herramienta `get_vehicle_status`:** es la que puede invocar el agente. Debes registrarla en este taller.
- **Contrato `VehicleLookup`:** define y valida la entrada, que contiene el identificador del vehículo. Ya está suministrado.
- **Adaptador con ID `fms`:** consulta el servicio HTTP simulado. Ya está suministrado; reutilízalo a través del mecanismo común de recuperación, que aplica la política.

No expongas una herramienta de URL arbitraria ni omitas la política. El servicio simulado y el adaptador HTTP ya están implementados.

**Pruebas de este taller**, desde la raíz del proyecto:

```bash
bun --bun run vitest run --project unit packages/agent-tools/src/knowledge/knowledge.test.ts -t "exposes the external tool"
```

Tras completar los cuatro bloques, ejecuta la evaluación determinista:

```bash
bun run eval:knowledge scripted
```

Deben pasar las diez filas. El informe se guarda en `.loom/knowledge-evaluation-scripted.json`. Utiliza un archivo independiente `_eval.sqlite` de forma predeterminada, vuelve a cargar sus datos y cambia el mock entre los modos normal, antiguo, fallido y lento. Con PostgreSQL explícito, crea otra base de evaluación; la cuenta debe tener permiso para crearla. El modo con guion no hace llamadas al modelo.

Para comprobar la selección real de fuentes, ejecuta:

```bash
bun run eval:knowledge live
```

Esto envía las preguntas y las evidencias ficticias recuperadas a GitHub Copilot mediante tu cuenta configurada. Inspecciona `.loom/knowledge-evaluation-live.json` y explica cada fallo antes de cambiar los prompts o las herramientas. El evaluador proporciona las etiquetas esperadas y las llamadas a herramientas únicamente al modo con guion; el modo en vivo recibe solo preguntas. Conserva ambos informes y distingue la corrección determinista del rendimiento del modelo.

## Inspeccionar el navegador

Para el uso habitual en vivo, ejecuta el mock en un terminal y la aplicación en otro:

```bash
bun run mock:fms normal
```

```bash
bun run dev
```

Haz una pregunta sobre cambios de ruta. Inspecciona las citas, los momentos de observación y recuperación, la autoridad, los conflictos y los informes de acceso a fuentes. Selecciona una consulta anterior después de reiniciar la API: su respuesta y sus informes de recuperación deben permanecer. La pantalla de workflows anterior sigue accesible mediante el botón de navegación.

Para una demostración repetible en el navegador sin modelo, detén la API normal. Configura `DATABASE_URL=sqlite:./.loom/session-03_demo.sqlite` (o una conexión PostgreSQL independiente terminada en `loom_session03_demo`), manteniendo el puerto de API del proxy web, y ejecuta:

```bash
bun run demo:knowledge
```

```bash
bun run --filter @loom/web dev
```

Pega una pregunta exacta de `examples/session-03/questions.json`. Este escenario de prueba elige las herramientas indicadas; la interfaz lo identifica como ejecución con guion. Su FMS siempre funciona en modo normal; utiliza el evaluador para los escenarios de antigüedad, fallo y tiempo de espera agotado. Restaura la configuración habitual de tu base de datos después de detener la demostración.

## Finalizar

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Envía tu implementación y tus evidencias de validación mediante el proceso habitual de revisión del equipo. Explica una selección correcta de fuente, una fuente rechazada, un conflicto visible y una respuesta sin resolver. Mantén los archivos de entorno local y los informes originales del runtime fuera del control de versiones.
