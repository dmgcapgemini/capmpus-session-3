# Sesión 2 — Trabajo autónomo

Reserva cuatro horas después de completar [el taller](WORKSHOP.md). Trabaja en el repositorio de tu equipo y conserva las pruebas incluidas.


Explica la diferencia entre la versión de un workflow y la de un contexto semántico. Esboza cómo una futura operación de revisión parcial conservaría su contexto base y las comprobaciones de dependencias sin cambiar el ejercicio de revisión del resultado completo de esta sesión.
## 1. Dibuja el límite de responsabilidad — 40 minutos

Dibuja un diagrama de estados de la aplicación y marca cada checkpoint duradero. Anota los pasos controlados por Copilot, Loom y una persona. Explica por qué reintentar una invocación no significa aceptar su salida anterior.

## 2. Añade una regla de escalado o de tiempo límite — 70 minutos

Elige un plazo para la espera de revisión o un escalado tras fallos repetidos. Persiste el plazo o la decisión de escalado para que un reinicio no los restablezca. Decide quién puede actuar y añade una prueba que demuestre que el agente no puede aceptar una propuesta de forma silenciosa. Documenta cualquier estado nuevo y sus transiciones legales antes de cambiar el código.

## 3. Amplía la política de reintentos — 70 minutos

Introduce una demora que aumente con los reintentos o clasifica un fallo como no reintentable. Persiste cualquier marca de tiempo del siguiente intento. Prueba la política con tiempo controlado en lugar de esperar en una prueba larga. Asegúrate de que una API reiniciada respeta el mismo presupuesto de intentos y la misma demora.

## 4. Revisa y demuestra — 60 minutos

Añade una prueba para una transición inválida introducida por tu ampliación. Demuestra la recuperación, los reintentos acotados y la protección frente a duplicados sin cambios. Pide a otro miembro del equipo que explique el historial sin leer la conversación del agente. Registra una contrapartida y una limitación en tu solicitud de revisión.

## Evidencias esperadas

Proporciona el diagrama de estados, la justificación de la política, los resultados de las pruebas y una breve demostración grabada o escrita. Utiliza [la lista de validación](VALIDATION.md) como base; las ampliaciones no deben eludir la revisión humana ni convertir las trazas sin procesar en la fuente del estado del workflow.

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.
