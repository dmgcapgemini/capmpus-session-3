# AI Solution Engineering Campus — Guía de instalación

Prepara el ordenador que utilizarás en el campus antes de la primera sesión. Nuestro entorno de trabajo será **Visual Studio Code con GitHub Copilot**, junto con **GitHub Copilot CLI, Git y Bun**; Podman solo es necesario si eliges la vía PostgreSQL en esta sesión. También recomendamos probar la aplicación de escritorio de GitHub Copilot, de forma opcional.

Sigue el apartado correspondiente a tu sistema operativo y completa la comprobación final con la misma conexión de red que utilizarás durante las sesiones. Si ya tienes una aplicación instalada, comprueba que funciona antes de repetir su instalación.

## 1. Qué necesitas

| Aplicación | Uso durante el campus | Instalación |
|---|---|---|
| **Visual Studio Code** | Entorno principal para trabajar con el proyecto. | Obligatoria; será el entorno de las demostraciones. |
| **GitHub Copilot en VS Code** | Asistencia de IA dentro del editor. | Activar la integración oficial de GitHub. |
| **GitHub Copilot CLI** | Trabajar con Copilot desde la terminal y completar la configuración del campus. | Obligatoria; registra y verifica la versión antes de impartir la sesión. |
| **Git** | Descargar el trabajo del equipo y compartir cambios. | Obligatoria. |
| **Bun 1.4.0** | Ejecutar el proyecto y realizar las instalaciones que iremos necesitando. | Obligatoria; utiliza esta versión para el campus. |
| **Podman** | Ejecutar los servicios locales de las prácticas. | Opcional para PostgreSQL; no se necesita con SQLite en esta sesión. |
| **GitHub Copilot app** | Interfaz de escritorio para trabajar con agentes. | Opcional y recomendada. |

Necesitarás una cuenta de GitHub con la licencia de Copilot que utilizarás en el campus, un navegador actualizado y al menos 10 GB de espacio libre. Comprueba también que puedes acceder al repositorio y al canal de comunicación de tu equipo cuando la organización te los facilite.

## 2. Alternativa: instalación mediante los canales de Capgemini

Si prefieres utilizar los canales internos, consulta [C&CA — Instalar software](https://cca.capgemini.com/web/onboarding#software-install).

La página explica cómo acceder al catálogo de aplicaciones preaprobadas desde **Portal de empresa → Pre-Approved Catalogue**, además de otras opciones de instalación. Busca allí las aplicaciones de esta guía y sigue el procedimiento indicado para tu equipo. Su disponibilidad depende del catálogo vigente.

Si una instalación requiere permisos que no tienes o está bloqueada, utiliza el procedimiento de soporte descrito en esa página y avisa al equipo del campus con antelación.

## 3. Instalación en Windows

Estas instrucciones utilizan Windows 11 y PowerShell 7. Ejecuta los comandos uno a uno.

### 3.1. Preparar PowerShell

Abre una terminal y comprueba que WinGet está disponible:

```powershell
winget --version
```

Instala PowerShell 7 si todavía no lo tienes:

```powershell
winget install --id Microsoft.PowerShell --exact --source winget
```

Cierra la terminal y abre **PowerShell 7** desde Inicio. Utiliza esa aplicación para los siguientes pasos. Puedes comprobar su versión con:

```powershell
$PSVersionTable.PSVersion
```

Si WinGet no está disponible, consulta las instrucciones de [Microsoft para instalar PowerShell](https://learn.microsoft.com/es-es/powershell/scripting/install/install-powershell-on-windows) o utiliza el canal corporativo. Copilot CLI requiere PowerShell 6 o posterior; esta guía utiliza la versión 7. [Requisitos de Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli).

### 3.2. Instalar las aplicaciones

En PowerShell 7:

```powershell
winget install --id Microsoft.VisualStudioCode --exact --source winget
winget install --id Git.Git --exact --source winget
winget install --id GitHub.Copilot --exact --source winget
```

También puedes utilizar los instaladores oficiales de [Visual Studio Code](https://code.visualstudio.com/docs/setup/windows), [Git](https://git-scm.com/install/windows), [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli) y [Podman Desktop](https://podman-desktop.io/downloads/windows).

### 3.3. Instalar Bun

Ejecuta el instalador oficial para la versión del campus:

```powershell
iex "& {$(irm https://bun.com/install.ps1)} -Version 1.4.0"
```

Cierra y vuelve a abrir PowerShell. Comprueba:

```powershell
bun --version
```

El resultado debe ser **1.4.0**. [Instrucciones oficiales de Bun](https://bun.com/docs/installation#installing-older-versions).

### 3.4. Preparar Podman (solo PostgreSQL)

Para las sesiones 1, 2 y 3 con SQLite, omite este apartado. Para PostgreSQL, instala Podman Desktop:

```powershell
winget install --id RedHat.Podman-Desktop --exact --source winget
```

Podman utilizará **WSL 2** para ejecutar sus servicios locales. Comprueba si está disponible:

```powershell
wsl --status
```

Si falta WSL, abre PowerShell **como administrador** y ejecuta:

```powershell
wsl --install --no-distribution
```

Reinicia el ordenador cuando se solicite. Después, actualiza WSL y comprueba su estado:

```powershell
wsl --update
wsl --status
```

Abre **Podman Desktop** y completa su asistente inicial: instala el motor Podman si lo solicita, selecciona **WSL 2** y crea e inicia una máquina Podman. Si ya existe una máquina, utiliza esa.

Abre una nueva terminal y comprueba:

```powershell
podman --version
podman info
```

Ambos comandos deben finalizar sin errores de conexión. Si la virtualización o WSL están bloqueados en tu equipo, solicita ayuda a soporte. [Guía oficial de Podman para Windows](https://podman-desktop.io/docs/installation/windows-install).

Continúa con el apartado **6. Activar GitHub Copilot**.

## 4. Instalación en macOS

Utilizaremos **Homebrew** para las aplicaciones y el instalador oficial de Bun para fijar la versión del campus.

### 4.1. Preparar Homebrew

Abre **Terminal** y comprueba:

```bash
brew --version
```

Si todavía no tienes Homebrew, sigue la instalación de su [página oficial](https://brew.sh/). Completa también los pasos finales que muestre el instalador para que el comando `brew` esté disponible. Después, abre una nueva terminal.

### 4.2. Instalar las aplicaciones

Ejecuta:

```bash
brew update
brew install git
brew install --cask visual-studio-code copilot-cli
```

Puedes consultar las fichas de [Git](https://formulae.brew.sh/formula/git), [Visual Studio Code](https://formulae.brew.sh/cask/visual-studio-code) y [Copilot CLI](https://formulae.brew.sh/cask/copilot-cli). Podman documenta la instalación con Homebrew, aunque recomienda su instalador oficial como primera opción de soporte. [Instalación de Podman en macOS](https://podman.io/docs/installation#macos).

### 4.3. Instalar Bun

Comprueba primero si ya tienes la versión del campus:

```bash
bun --version
```

Si devuelve **1.4.0**, continúa con el siguiente apartado. Si Bun no está instalado, utiliza el instalador oficial con la versión fijada:

```bash
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.0"
```

Abre una nueva terminal para cargar el PATH y verifica que `bun --version` devuelve **1.4.0**.

Si ya utilizas otra versión de Bun para tus proyectos, pide al equipo del campus que te ayude a seleccionar la versión adecuada. [Instalación de versiones concretas de Bun](https://bun.com/docs/installation#installing-older-versions).

### 4.4. Preparar Podman (solo PostgreSQL)

Para las sesiones 1, 2 y 3 con SQLite, omite este apartado. Para PostgreSQL, instala Podman por el canal corporativo, el instalador oficial o Homebrew:

```bash
brew install podman
```

Consulta si ya tienes una máquina creada:

```bash
podman machine list
```

Si la lista está vacía, créala una sola vez:

```bash
podman machine init
```

Inicia la máquina si está detenida y comprueba la conexión:

```bash
podman machine start
podman info
```

Si tienes varias máquinas, indica el nombre de la que vayas a utilizar después de `podman machine start`. El comando `podman info` debe mostrar información del sistema sin errores de conexión. [Configuración inicial de Podman](https://podman.io/docs/installation#macos).

## 5. Instalación en Linux

La verificación automatizada cubre Ubuntu 24.04 x64. Otras distribuciones o arquitecturas requieren su propia comprobación en el equipo del curso. Las sesiones 1, 2 y 3 pueden utilizar SQLite sin instalar Podman ni PostgreSQL.

### 5.1. Herramientas básicas

En Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install git curl unzip tar
```

Instala VS Code mediante el paquete aprobado por tu organización o su [guía oficial de Linux](https://code.visualstudio.com/docs/setup/linux). En otras distribuciones, utiliza los paquetes equivalentes de Git, curl, unzip y tar.

### 5.2. Bun 1.4.0

Si `bun --version` ya devuelve `1.4.0`, conserva la instalación. En caso contrario:

```bash
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.0"
```

Abre una terminal nueva y comprueba `bun --version`. No actualices Bun durante el taller. [Instalador oficial con versión fijada](https://bun.com/docs/installation#installing-older-versions).

### 5.3. Copilot CLI

Utiliza el instalador aprobado por tu organización o la [guía oficial de Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli). Registra `copilot --version`. Las versiones documentadas para el paquete anterior son 1.0.83 y 1.0.84-5; otra versión necesita una comprobación de inicio de sesión y un análisis real en el equipo del curso. No actualices automáticamente una instalación existente.

Continúa con el apartado 6 para iniciar sesión. El comando del instructor `bun run campus doctor` detecta herramientas y versiones.

### 5.4. Almacenamiento de las sesiones 1, 2 y 3

Los participantes siguen `QUICKSTART-SQLITE.es.md` dentro de su ZIP. Cada persona usa un archivo de aplicación y otro de pruebas. Para la vía PostgreSQL, instala Podman con su [guía oficial de Linux](https://podman.io/docs/installation#linux) y sigue `QUICKSTART.md`.

Los instructores utilizan `course/INSTRUCTOR.md` desde el repositorio maestro: pueden preparar, ejecutar y empaquetar la sesión 1 de forma independiente, con configuración, datos y puertos separados por convocatoria y variante.

## 6. Activar GitHub Copilot

Estos pasos son comunes a Windows, macOS y Linux. Utiliza la misma cuenta de GitHub en VS Code, en la terminal y, si la instalas, en la aplicación de escritorio.

### En Visual Studio Code

1. Abre **Visual Studio Code**.
2. Pulsa el icono de Copilot y selecciona **Use AI Features** o la opción de iniciar sesión.
3. Completa la activación de la integración oficial de **GitHub Copilot**, publicada por GitHub, si VS Code te la solicita.
4. Inicia sesión con la cuenta que tiene tu licencia de Copilot.
5. Abre el chat y escribe: **«Responde únicamente con OK»**.

Comprueba que recibes una respuesta. [Configuración oficial de Copilot en VS Code](https://code.visualstudio.com/docs/setup/copilot).

### En la terminal

Abre PowerShell 7 en Windows o una terminal en macOS/Linux:

```text
copilot login
```

Completa el inicio de sesión en el navegador y prueba:

```text
copilot -p "Responde únicamente con OK"
```

Debe responder **OK**. Esta prueba utiliza una pequeña parte de tu cuota de Copilot. Si tu licencia es corporativa, la organización debe permitir el uso de Copilot CLI. [Inicio de sesión y uso de Copilot CLI](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference).

## 7. Aplicación de escritorio de GitHub Copilot — opcional

Puedes instalar **GitHub Copilot app** para trabajar desde su interfaz de escritorio. Las demostraciones del campus seguirán utilizando VS Code con Copilot; podrás usar la aplicación de escritorio si la prefieres.

Sigue la [guía oficial de instalación de GitHub Copilot app](https://docs.github.com/en/copilot/get-started/quickstart-copilot-app), descarga la versión para **Windows** o **macOS** e inicia sesión con tu cuenta de GitHub.

Con una licencia corporativa, el acceso a esta aplicación depende de una política distinta de la de Copilot CLI. Si no puedes acceder, compruébalo con la organización del campus.

## 8. Comprobación final

Abre una terminal nueva y ejecuta:

```text
git --version
bun --version
copilot --version
```

Solo para PostgreSQL:

```bash
podman --version
podman info
```

Antes de la primera sesión, confirma:

- [ ] Visual Studio Code abre correctamente y Copilot responde en el chat.
- [ ] Git está disponible en la terminal.
- [ ] Bun devuelve la versión **1.4.0**.
- [ ] La versión de Copilot CLI está registrada y la prueba de inicio de sesión/modelo funciona. Las versiones 1.0.83 y 1.0.84-5 tienen evidencia histórica; otras versiones requieren verificación antes de impartir la sesión.
- [ ] Ruta PostgreSQL: Podman funciona; en macOS/Windows tiene una máquina en ejecución. Para las sesiones 1, 2 y 3 con SQLite, este paso no es necesario.
- [ ] En Windows, utilizo PowerShell 7 y WSL 2 está disponible.
- [ ] He realizado estas comprobaciones desde la red que utilizaré durante el campus.

Si algo falla, comparte con el equipo del campus el sistema operativo, el paso que estabas realizando y el mensaje de error antes de la primera sesión.

Para las sesiones 1, 2 y 3 con SQLite, omite la preparación de Podman en cualquier plataforma. Migra y carga los datos antes de ejecutar preflight. Los instructores deben verificar el ZIP exacto en Mac y Linux; la prueba HTTP automatizada no sustituye la demostración real del modelo y del navegador.

## 9. Antes de cada sesión

Cada sesión llega como un ZIP inicial completo. Añádelo a una carpeta nueva `session-NN/`, conserva el trabajo anterior y abre la carpeta nueva de aplicación en el editor. El ZIP incluye las implementaciones de referencia anteriores; tus cambios y el historial de datos no se transfieren automáticamente.

Antes de clase, sigue QUICKSTART.es.md del ZIP: crea el `.env.local` propio de esa carpeta, prepara almacenamiento independiente de aplicación y pruebas, instala las dependencias congeladas, migra, carga los datos y ejecuta preflight, tipos, lint, pruebas y compilación. Las sesiones 1, 2 y 3 utilizan SQLite de forma predeterminada y admiten PostgreSQL como opción. La sesión 3 utiliza SQLite de forma predeterminada; PostgreSQL 17 es opcional. La preparación termina antes del taller de cuatro horas. Solo pueden fallar las pruebas de ejercicios indicadas: 13 / 10 / 14 en las sesiones 01 / 02 / 03. Consulta SESSION-START.es.md del ZIP para ver el esquema de entrega.
