# Sesión 2 — Empezar con el proyecto completo

Para el viernes 23 de octubre de 2026 entregamos un ZIP inicial completo de sesión 2, con las ayudas de arranque. La sesión 1 ya está resuelta; quedan cuatro tareas de sesión 2 agrupadas en tres bloques. Descomprime el ZIP en una carpeta nueva `session-02` y conserva el trabajo anterior.

## Preparación rápida

Abre un terminal en la carpeta que contiene `package.json`, `SESSION.json`, `scripts`, `apps` y `packages`. Elige una opción:

| Sistema | SQLite predeterminado | PostgreSQL 17 + Podman |
| --- | --- | --- |
| Mac | `bash scripts/setup.sh --storage sqlite` | `bash scripts/setup.sh --storage postgres` |
| Windows · PowerShell 5.1 o 7 | `powershell -File scripts/setup.ps1 --storage sqlite` | `powershell -File scripts/setup.ps1 --storage postgres` |

Añade `--login` si necesitas iniciar sesión en Copilot. Si ya está configurado, no hace falta. El setup instala las dependencias, configura almacenamiento separado para pruebas, migra, carga datos y ejecuta las comprobaciones. En el punto de partida están previstos **los 10 fallos de ejercicios** identificados en [workshop-tests.json](workshop-tests.json); las demás pruebas deben pasar. Los fallos de ejercicios no son errores de instalación.

Los scripts son una ayuda docente. Para opciones, requisitos del ordenador y cómo se conservan los ajustes, consulta [AYUDA-ARRANQUE.es.md](AYUDA-ARRANQUE.es.md). El procedimiento oficial sigue en [SESSION-START.es.md](../../../SESSION-START.es.md) y [QUICKSTART.es.md](../../../QUICKSTART.es.md).

En Windows, el setup de PostgreSQL instala Podman si falta e intenta instalar WSL cuando no está disponible, solicitando permisos de administrador. Si pide reiniciar Windows, reinicia y repite el mismo comando. La virtualización en BIOS/UEFI debe estar habilitada.

En Mac, el setup instala Podman si falta. Si necesita Homebrew y no está instalado, intenta prepararlo con su instalador oficial; puede pedir permisos de administrador y herramientas de desarrollo de Apple.

## Arrancar

En Mac: `bash scripts/start.sh`. En Windows: `powershell -File scripts/start.ps1`.

Abre la URL que aparece en el terminal. Ctrl+C detiene API y web. Los datos sobreviven. El proyecto inicial permite abrir la interfaz; la recuperación y las rutas de revisión seguirán incompletas hasta que resuelvas sus talleres.

## Continuar con los talleres

Sigue [WORKSHOP.es.md](WORKSHOP.es.md), [THEORY.es.md](THEORY.es.md) y [VALIDATION.es.md](VALIDATION.es.md). No necesitas un ZIP incremental ni importar el trabajo anterior para esta entrega. Los datos y mejoras de la sesión 1 no se transfieren automáticamente.

Si se acumulan workflows y quieres cancelarlos, sigue [Cancelar la cola](AYUDA-ARRANQUE.es.md#cancelar-la-cola-cuando-un-hold-bloquea-los-siguientes): `bash scripts/cancel-all.sh` o `.\scripts\cancel-all.ps1`. Añade `--demo` para cancelar únicamente la demo.
