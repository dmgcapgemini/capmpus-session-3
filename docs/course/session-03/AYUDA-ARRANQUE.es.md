# Preparación y arranque · Sesión 3

Empieza por [guia super rapida.md](../../../guia%20super%20rapida.md). Los scripts funcionan desde la fuente docente y desde el ZIP independiente. La opción predeterminada es SQLite, con datos locales y búsqueda textual. PostgreSQL está disponible con `--storage postgres`.

## Qué prepara setup

1. Bun 1.4.0 privado si falta, dependencias con lockfile congelado y Copilot CLI.
2. Con SQLite, no hace falta Podman ni WSL. Se crean archivos independientes para aplicación, pruebas, demo y evaluación bajo `.loom`.
3. Si eliges PostgreSQL, prepara Podman y un contenedor propio de esta carpeta o conserva la conexión ya configurada. En Windows puede requerir WSL y reinicio.
4. `.env.local` privado, bases separadas, migraciones, seed, tipos, lint, compilación y pruebas. Los catorce fallos del manifiesto inicial son ejercicios pendientes; cualquier otro fallo detiene setup. No borra el historial de la app; seed actualiza los datos ficticios del taller.
5. Preflight de toolchain, almacenamiento y Copilot. No hace llamadas al modelo. El entorno de cada alumno debe quedar preparado antes de clase.

## Elegir puertos

Si no se fijan, busca puertos libres. Ejemplo para convivir con otras sesiones:

```bash
bash scripts/setup.sh --api-port 13300 --web-port 15373 --fms-port 13310
```

En Windows usa las mismas opciones con `.\scripts\setup.ps1`. La aplicación y las pruebas utilizan archivos separados; PostgreSQL requiere también una base de pruebas diferente terminada en `_test`.

## Arranque normal y demo

`start` inicia API, web y simulador FMS normal. `start --demo` inicia la demo con guion, su FMS interno y la web, usando una base SQLite terminada en `_demo.sqlite` (o PostgreSQL terminada en `_demo`). Ambos lanzadores comparten puertos, por lo que sustituir uno detiene antes el anterior de esta carpeta. `stop` o Ctrl+C conservan datos y cierran los procesos hijos. Si un puerto pertenece a otro proceso, el lanzador se niega a iniciarse; no lo mata.

La demo requiere preguntas exactas de `examples/session-03/questions.json`. Para los escenarios FMS antiguo, fallo y timeout utiliza `evaluate` en modo scripted: el navegador de demostración siempre usa FMS normal. No cambies una pregunta para forzar esos modos.

## Windows

Los PS1 admiten Windows PowerShell 5.1 y PowerShell 7. Setup instala Bun privado y corrige rutas y ejecución nativa de Copilot. Se mantienen los controles de entrada y de acceso a fuentes; las pruebas de rutas utilizan las convenciones del sistema operativo. No cambia la política de ejecución de PowerShell. Si una política bloquea scripts o WSL, sigue el canal corporativo y [INSTALLATION.es.md](../../../INSTALLATION.es.md).

Las pruebas de sintaxis PowerShell y la ejecución del lanzador desde PowerShell en Mac no sustituyen una prueba en Windows real. El informe de entrega distingue esas comprobaciones.

## Soluciones y continuidad

El ZIP inicial incluye resueltas las sesiones anteriores y deja pendientes únicamente `structured-lookup`, `knowledge-policy`, `knowledge-conflicts` y `connect-fms`. La consulta de conocimiento no acepta ni rechaza workflows. Sus respuestas e informes se guardan; la traza detallada del agente es temporal. Conserva la carpeta y `.env.local` para retomar tus consultas. El historial de la sesión 2 no se importa automáticamente.
