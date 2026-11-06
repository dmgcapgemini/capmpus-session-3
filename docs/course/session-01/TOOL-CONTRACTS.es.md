# Sesión 1 — Guía rápida de contratos de herramientas

## Límites de las herramientas

| Herramienta | Entrada | Resultado | Efecto secundario |
|---|---|---|---|
| `list_sources` | Objeto vacío | Identificadores, nombres, tipos de medio y tamaños de las fuentes declaradas | Ninguno |
| `read_source` | Cadena `sourceId` | Contenido y metadatos de una fuente declarada | Registra la lectura correcta en la memoria de esta ejecución |
| `submit_analysis_result` | Análisis estructurado con evidencias | `accepted: true` y `analysisResultId` tras validar | Guarda un análisis para la ejecución |

## Contrato de análisis

Los campos son `actors`, `capabilities`, `externalSystems`, `constraints`, `openQuestions` y `evidence`. Los cinco primeros son arrays de hasta 30 cadenas no vacías, cada una de un máximo de 300 caracteres. Las evidencias contienen entre 1 y 20 entradas con `sourceId` y una cita de 10 a 500 caracteres.

Cada cita debe aparecer en una fuente leída durante esta ejecución. Los espacios en blanco se normalizan antes de comparar. La información que falta corresponde a preguntas abiertas. No inventes requisitos para rellenar un array.

## Contratos de fallo

| Situación | Comportamiento esperado |
|---|---|
| Identificador desconocido o valor que parece una ruta | Fallo con información para corregirlo; sin acceso arbitrario a archivos |
| Esquema inválido o cita sin respaldo | Fallo con información para corregirlo; sin almacenamiento |
| Segundo envío aceptado | Fallo; se conserva el resultado original |
| Error de almacenamiento inesperado | Fallo genérico para el agente; detalles en el log de la aplicación |
| Envío antes de leer una fuente | Denegación de política registrada en la traza |
| Herramienta no registrada o presupuesto de llamadas agotado | Denegación de política |
| Solicitud de permiso ajena a las herramientas de Loom | Rechazo del permiso |

## Dónde consultar

Los contratos están en `packages/contracts/src/`. Los handlers están en `packages/agent-tools/src/tools/`. La configuración de sesión, las instrucciones y la política están en `packages/agent-runtime/src/`. La API los compone en `apps/api/src/runs/`.
