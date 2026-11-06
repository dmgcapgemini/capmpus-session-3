# Sesión 1 — Autoestudio y continuación

Reserva aproximadamente cuatro horas de trabajo individual o en equipo.


Registra la versión de Bun junto a las evidencias de las pruebas y explica por qué sigue siendo necesario superar `tsc` cuando Bun ejecuta TypeScript directamente.
## 1. Completar y explicar la base — 60 minutos

Termina los ejercicios pendientes y vuelve a ejecutar las comprobaciones de [WORKSHOP.md](WORKSHOP.md). Dibuja el recorrido desde la tarea hasta la llamada a la herramienta, la validación, el almacenamiento y el resultado mostrado. Indica qué controla Copilot y qué controla Loom.

## 2. Añadir una capacidad acotada — 90 minutos

Diseña una segunda herramienta de inspección de fuentes, por ejemplo para devolver los encabezados de un documento declarado. Dale una entrada tipada, un resultado de solo lectura, un límite de permisos y un fallo controlado. Regístrala explícitamente y actualiza a la vez sus pruebas y los nombres de herramientas expuestos. Mantén el acceso a fuentes detrás del registro.

Si todavía es pronto para ampliar la implementación, escribe el contrato y las pruebas como ejercicio de diseño. Explica en qué se diferenciarían unas instrucciones reutilizables para elegir la herramienta de la propia herramienta.

## 3. Recopilar evidencias — 60 minutos

Documenta una interacción correcta, un fallo y un caso en el que sería preferible una llamada estructurada directa al modelo. Incluye la fuente utilizada, el resultado visible de la herramienta y la acción correctiva. Utiliza únicamente material ficticio del taller en las evidencias que compartas.

## 4. Revisar — 30 minutos

Explica los límites de la implementación actual: una ejecución activa por proceso de API, retención de trazas local al proceso y ausencia de un workflow duradero de revisión. Registra qué cambiarías para recuperarte de un reinicio en la sesión 2.

## Niveles de resultado

- Mínimo: una interacción con el modelo y una herramienta controlada, con su límite explicado.
- Esperado: varias herramientas, salida estructurada validada, eventos visibles y un análisis guardado.
- Ampliado: una herramienta acotada adicional, pruebas de política más sólidas o una comparación justificada con una llamada directa al modelo.

## Almacenamiento local

Conserva la vía de almacenamiento elegida durante la sesión. Con SQLite, mantén los datos de la aplicación separados de los archivos de pruebas y demuestra que el análisis guardado sigue disponible al reiniciar la API. La siguiente sesión proporciona un ZIP completo en una carpeta nueva y admite SQLite de forma predeterminada, con PostgreSQL opcional. Conserva los archivos SQLite de esta sesión; sus registros no se transfieren automáticamente.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.
