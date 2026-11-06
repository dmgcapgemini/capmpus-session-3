# Sesión 1 — Resolución de problemas

## Diagnosticar el punto del fallo

Empieza con `bun run preflight`. Consulta la pestaña Errors, Tool calls y el log de la API. Distingue entre un fallo de entorno, una denegación de política, argumentos inválidos y una implementación pendiente del taller.

| Síntoma | Acción |
|---|---|
| Copilot no está autenticado | Sigue `PREREQUISITES.md`; inicia sesión con `copilot login` y repite la comprobación previa |
| La CLI de macOS funciona, pero el runtime incluido no tiene sesión iniciada | Configura `LOOM_COPILOT_CLI_PATH` como recomienda preflight |
| Conexión a la base de datos rechazada | Arranca el contenedor de PostgreSQL existente y comprueba el puerto de tu configuración local |
| No se puede abrir el archivo SQLite | Selecciona un directorio en el que puedas escribir en `DATABASE_URL`; sigue `QUICKSTART-SQLITE.es.md` y vuelve a ejecutar migración/preflight |
| Falta el esquema de base de datos | Ejecuta `bun run db:migrate` sobre la base de datos de tu sesión |
| Una segunda ejecución devuelve 409 | Detén o termina la ejecución activa; se admite una por proceso de API |
| El agente no puede utilizar las tres herramientas | Completa el registro de sesión; conserva las restricciones de herramientas y permisos |
| La lectura de fuentes indica un TODO | Completa el ejercicio de límite de acceso a fuentes |
| Un análisis válido no se guarda | Completa el ejercicio de persistencia; inspecciona la información devuelta por la herramienta |
| Se rechaza una evidencia | Lee primero la fuente y copia una cita real de esa fuente |
| Se deniega una llamada a herramienta | Lee la regla indicada; corrige la secuencia o detén la ejecución al agotar el presupuesto |
| La ejecución termina incompleta | El runtime quedó inactivo sin un resultado guardado; inspecciona fallos de herramientas e instrucciones |
| Error del proveedor o tiempo de espera agotado | Registra el fallo; comprueba autenticación y red antes de iniciar deliberadamente otra ejecución |
| No está disponible una traza antigua | Los resultados persisten, pero las trazas de la sesión 1 son limitadas y se pierden al reiniciar la API |
| Falla la instalación con el lockfile | Conserva las dependencias fijadas y comunica el fallo al facilitador |

## Evidencias para escalar el problema

Comparte el comando fallido, la categoría de error, el identificador de ejecución y el evento pertinente sin datos sensibles. No compartas tokens, contraseñas ni `.env.local`. Nunca desactives validaciones, permisos o pruebas para saltarte un fallo.
