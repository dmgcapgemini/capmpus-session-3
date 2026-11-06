# Sesión 2 · Preparar y arrancar sin repetir comandos

Ayuda añadida sobre la aplicación oficial. Los cuatro ejercicios y sus pruebas no cambian. Descomprime el ZIP completo en una carpeta nueva y abre un terminal en ella. No utilices una carpeta compartida de red para SQLite.

## 1. Preparar una vez

**SQLite es la opción predeterminada**, sin instalar un servidor de base de datos.

| Sistema                       | Comando desde la carpeta descomprimida                  |
| ----------------------------- | ------------------------------------------------------- |
| macOS · Terminal             | `bash scripts/setup.sh --storage sqlite`              |
| Windows · PowerShell 5.1 o 7 | `powershell -File scripts/setup.ps1 --storage sqlite` |

Desde una terminal PowerShell también puedes ejecutar directamente `.\scripts\setup.ps1 --storage sqlite` y `.\scripts\start.ps1`, sin instalar `pwsh`. La compatibilidad de estos lanzadores empieza en PowerShell 5.1; las herramientas externas conservan sus propios requisitos.

Para **PostgreSQL 17 con Podman**, cambia únicamente el almacenamiento:

| Sistema                       | Comando                                                   |
| ----------------------------- | --------------------------------------------------------- |
| macOS                         | `bash scripts/setup.sh --storage postgres`              |
| Windows · PowerShell 5.1 o 7 | `powershell -File scripts/setup.ps1 --storage postgres` |

El setup hace lo siguiente:

1. Utiliza Bun **1.4.0**. Si falta esa versión, descarga una copia privada oficial en `.loom/toolchain`, sin cambiar el Bun global ni el perfil del terminal.
2. Instala las dependencias con el lockfile congelado. Si falta Copilot CLI, intenta instalarlo con Homebrew en Mac o WinGet en Windows; una instalación existente no se actualiza.
3. Crea `.env.local`, con datos de aplicación y pruebas separados. Conserva los ajustes existentes; al cambiarlos guarda una copia privada en `.loom/setup-backups`.
4. En PostgreSQL, en Windows comprueba WSL y solicita su instalación si falta (con permisos de administrador y sin instalar una distribución de uso general). Instala Podman si falta, prepara/inicia su máquina y crea un contenedor y volumen propios de esta carpeta. Publica PostgreSQL solo en `127.0.0.1`, normalmente en el puerto **55432**, con contraseña local aleatoria. Si ya habías configurado PostgreSQL manualmente, conserva tu URL y utiliza tu servidor.
5. Crea la base si falta, migra, carga los datos iniciales y ejecuta tipos, lint, compilación y pruebas. No borra la base de la aplicación. Las pruebas usan únicamente el almacenamiento de pruebas configurado.
6. Ejecuta preflight y muestra la URL de la web. En el proyecto inicial son normales **los 10 fallos de los ejercicios pendientes; las demás pruebas deben pasar**; cualquier fallo ajeno a esos ejercicios detiene la preparación.

### Inicio de sesión y requisitos del ordenador

La cuenta y el permiso de Copilot los aporta cada persona. Para abrir el inicio de sesión durante el setup, añade `--login`, por ejemplo:

```bash
bash scripts/setup.sh --storage sqlite --login
```

```powershell
powershell -File scripts/setup.ps1 --storage sqlite --login
```

El navegador te pedirá autenticarte. El setup y preflight no hacen un análisis ni consumen cuota de modelo. Las ejecuciones reales que inicies en la aplicación sí utilizan Copilot.

En **Mac**, si faltan Podman/Copilot y no hay Homebrew, setup intenta instalar Homebrew con su instalador oficial y continúa con las herramientas ausentes. El instalador puede pedir permisos de administrador y las herramientas de desarrollo de Apple. Si el equipo lo bloquea, utiliza el canal corporativo y repite setup. En **Windows**, puedes usar Windows PowerShell 5.1 (incluido en Windows) o PowerShell 7, junto con WinGet; la vía PostgreSQL necesita virtualización y WSL 2. El setup intenta instalar WSL si no está disponible; si requiere reiniciar, se detiene con instrucciones para repetir el comando después. La virtualización de BIOS/UEFI y las restricciones corporativas requieren intervención manual. Sus instaladores pueden pedir permisos de administrador o reinicio: el script no puede completar un reinicio por ti. Sigue [INSTALLATION.es.md](../../../INSTALLATION.es.md). No modifica la política de ejecución de PowerShell. Si Windows bloquea los PS1 descargados, revisa los archivos y utiliza `Get-ChildItem .\scripts\*.ps1 | Unblock-File` si la política de tu organización lo permite.

### Puertos ocupados o volver a ejecutar

En la primera preparación elige puertos libres de API y web automáticamente. Para fijarlos:

```bash
bash scripts/setup.sh --storage sqlite --api-port 13000 --web-port 15173
bash scripts/setup.sh --storage postgres --postgres-port 55433 --api-port 13000 --web-port 15173
```

Las mismas opciones funcionan después de `powershell -File scripts/setup.ps1`. Usa `--postgres-port` al crear por primera vez ese contenedor. Una vez creado, conserva su puerto. Cada nueva extracción tiene un contenedor propio y necesitará otro puerto si el anterior está ejecutándose.

Repetir setup conserva los datos y reconoce los fallos que todavía queden de los ejercicios oficiales. Detén la app antes de repetirlo. Sin `--storage` conserva la opción actual. Si cambias de motor, los datos anteriores permanecen donde estaban: no se convierten al otro formato. Conserva la misma carpeta después del setup.

## 2. Arrancar cada día

| Sistema                       | Comando                                |
| ----------------------------- | -------------------------------------- |
| macOS                         | `bash scripts/start.sh`              |
| Windows · PowerShell 5.1 o 7 | `powershell -File scripts/start.ps1` |

Abre la dirección que imprime el script. API y web se ejecutan en ese mismo terminal. **Ctrl+C detiene ambos**; se conservan los datos y el contenedor PostgreSQL. Al repetir start, detiene el arranque anterior de esta carpeta (API y web) y lo sustituye por uno nuevo, tras verificar que el proceso pertenece al proyecto. El arranque vuelve a iniciar el contenedor propio si estaba detenido. No reinstala las dependencias, no modifica los ejercicios y rechaza puertos ocupados.

## 3. Demo repetible sin Copilot · instructor

Detén primero el arranque normal con Ctrl+C. El modo demo deriva un almacenamiento independiente de la base normal y admite los modos oficiales:

```bash
bash scripts/start.sh --demo fail-once
# Ctrl+C antes de cambiar de modo
bash scripts/start.sh --demo hold
# La demo de caída forzada usa SOLO el PID que imprime Workflow fixture.
bash scripts/start.sh --demo succeed
```

```powershell
powershell -File scripts/start.ps1 --demo fail-once
```

El modo de demostración no consume Copilot. Para terminar también la web, usa Ctrl+C en el terminal del lanzador. Si matas solo la API para el ensayo, el lanzador detiene su web; el siguiente comando vuelve a iniciar ambas con la misma base demo.

### Cancelar la cola cuando un `hold` bloquea los siguientes

`hold` espera indefinidamente y el worker procesa un solo workflow cada vez. Por eso un trabajo en `ANALYSING` puede dejar los nuevos en `CREATED`. Reiniciar con Ctrl+C conserva esa cola.

Desde otro terminal, en la misma carpeta, cancela la cola de la demo:

```bash
bash scripts/cancel-all.sh --demo
```

```powershell
powershell -File scripts/cancel-all.ps1 --demo
```

El comando verifica y detiene el lanzador de esta carpeta (API y web) antes de tocar la base. Si no puede verificarlo o hay procesos ocupando sus puertos, se detiene sin cancelar. Cierra los workflows en `CREATED`, `ANALYSING` y `PROPOSAL_READY` como `FAILED`, registra el motivo `Cancelled by human: classroom cancel-all` e incrementa la versión junto con el evento, en una transacción. Conserva datos y resultados; no cambia `AWAITING_REVIEW`, `ACCEPTED`, `REJECTED` ni `FAILED`. Repetirlo no crea nuevas cancelaciones.

Para la **app normal**, usa el comando **sin `--demo`**. Solo se cancela la base elegida, nunca ambas. PostgreSQL debe estar disponible; el comando no borra ni crea bases ni contenedores. Es una utilidad de mantenimiento fuera del ejercicio de transiciones, sin añadir un estado nuevo al taller.

Después vuelve a ejecutar `start` con el modo que quieras y crea un único trabajo. Para ensayar caída y recuperación, no canceles el workflow entre ambos pasos: la cancelación es definitiva para ese trabajo; Ctrl+C conserva su continuidad.

## Procedencia

Los scripts `.sh` y `.ps1` son entradas para la misma ayuda `tools/classroom.ts`. Automatizan los pasos de [QUICKSTART.es.md](../../../QUICKSTART.es.md), [SESSION-START.es.md](../../../SESSION-START.es.md) y el taller de sesión 2 incluido en `docs/course/session-02`. Los mensajes de error conservan las comprobaciones oficiales.

Instaladores y documentación de referencia: [Bun](https://bun.sh/docs/installation), [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli), [Podman](https://podman.io/docs/installation) y [Podman para Windows](https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md). Consulta del 22/10/2026.

La verificación del ZIP se entrega por separado. Ejecutar o analizar PS1 en PowerShell sobre Mac comprueba esos scripts, pero no certifica WSL, Podman ni el runtime completo en Windows.
