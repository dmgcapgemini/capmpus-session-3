# Guía super rápida · Sesión 3

Descomprime el ZIP completo en una carpeta nueva y ábrela en VS Code. Ejecuta los comandos desde esa carpeta, donde está `package.json`.

## 1. Preparar una vez

**Windows · PowerShell 5.1 o 7**

```powershell
.\scripts\setup.ps1 --storage sqlite
```

**Mac · Terminal**

```bash
bash scripts/setup.sh --storage sqlite
```

Usamos **SQLite**, una base de datos local en esta carpeta: no necesitas Podman ni WSL. El script prepara Bun 1.4.0 y Copilot CLI, instala dependencias y comprueba el proyecto. No cambia la política corporativa de PowerShell. Consulta [INSTALLATION.es.md](INSTALLATION.es.md) si falta un requisito. También se puede elegir PostgreSQL con `--storage postgres`.

Si necesitas iniciar sesión en Copilot, añade `--login` al comando. La cuenta necesita permiso de Copilot. La preparación no ejecuta preguntas al modelo.

## 2. Arrancar

Windows:

```powershell
.\scripts\start.ps1
```

Mac:

```bash
bash scripts/start.sh
```

Abre la URL impresa. Se inician juntos **API, web y el simulador de flota**. Mantén el terminal abierto. Una consulta a la vez; el modo normal usa tu cuenta y cuota de Copilot.

Para una demostración sin modelo, usa `start.ps1 --demo` o `bash scripts/start.sh --demo`. Las preguntas de la demo deben coincidir exactamente con `examples/session-03/questions.json`; su elección de herramientas está programada. La demo usa otra base y un FMS simulado normal. En el proyecto inicial aún faltan las cuatro soluciones: la demo completa se muestra en el proyecto docente.

## 3. Parar

Ctrl+C detiene todos los procesos del lanzador y conserva datos e historial. También puedes usar otro terminal en esta misma carpeta:

```powershell
.\scripts\stop.ps1
```

```bash
bash scripts/stop.sh
```

Repetir start sustituye el arranque anterior de esta carpeta después de verificarlo. Detén la aplicación antes de cambiar de estado en el repositorio docente.

## 4. Probar un taller

Sustituye `1` por `2`, `3` o `4`:

```powershell
.\scripts\check.ps1 --workshop 1
```

```bash
bash scripts/check.sh --workshop 1
```

Antes del cambio correspondiente, las pruebas del ejercicio deben fallar; después deben pasar. Para comprobar todo, utiliza `--workshop all`. El punto inicial tiene **14 fallos previstos**, identificados en `docs/course/session-03/workshop-tests.json`. Un error de conexión o instalación no es un fallo previsto del taller.

## 5. Evaluación final sin modelo

Con los cuatro talleres terminados:

```powershell
.\scripts\evaluate.ps1
```

```bash
bash scripts/evaluate.sh
```

Deben pasar los diez casos. El informe queda en `.loom/knowledge-evaluation-scripted.json`. Esta evaluación comprueba el circuito de herramientas y validaciones; no mide cómo elige herramientas el modelo. La evaluación con modelo se solicita expresamente con `--mode live` y utiliza Copilot.

Más ayuda: [AYUDA-ARRANQUE.es.md](AYUDA-ARRANQUE.es.md). Talleres: [WORKSHOP.es.md](docs/course/session-03/WORKSHOP.es.md). Arquitectura y evolución desde la sesión 2: [ARQUITECTURA-SESION-03.es.md](ARQUITECTURA-SESION-03.es.md). Datos y documentos en español: [FUENTES-DE-DATOS.es.md](FUENTES-DE-DATOS.es.md).
