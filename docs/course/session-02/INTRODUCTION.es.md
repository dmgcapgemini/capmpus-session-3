# Sesión 2 — Dar a Loom un proceso de trabajo fiable

Esta lectura explica por qué un agente necesita un proceso que rodee su trabajo, qué aporta la sesión 2 a Loom y cómo encajan los talleres. Léela antes de la sesión para situarte y vuelve a ella después para relacionar los ejercicios con el conjunto del proyecto. Los pasos prácticos están en la [guía de talleres](WORKSHOP.md).

## ¿Qué queremos conseguir?

El objetivo del campus es desarrollar un equipo capaz de **diseñar e implementar una aplicación agéntica**: software en el que la IA pueda interpretar una tarea, utilizar información y elegir entre las acciones que proporciona la aplicación.

Ese equipo necesita tomar decisiones sobre toda la organización del trabajo. ¿Qué puede hacer la IA? ¿Cómo se comprobará su trabajo? ¿Qué ocurre cuando algo falla? ¿Qué decisiones corresponden a una persona? Una aplicación útil debe responder a estas preguntas mediante un comportamiento que los compañeros puedan observar, explicar y mantener.

Practicamos estas habilidades construyendo **Loom**. Cada sesión aporta una parte del producto que funciona y una lección de diseño que puedes utilizar en otros proyectos. La sesión 2 se centra en mantener un trabajo comprensible y recuperable desde su inicio hasta una decisión humana.

## ¿Qué es Loom?

Loom es un espacio de trabajo de ingeniería que ayuda a un equipo a transformar el material de origen en una comprensión compartida y revisada de una solución de software.

Un proyecto suele empezar con documentos, conversaciones, peticiones del negocio e información de sistemas existentes. La IA de Loom puede ayudar a interpretar este material, identificar información útil y proponer qué merece atención. Las personas examinan esas sugerencias y deciden qué acepta el equipo. A medida que Loom se desarrolla, esta comprensión revisada puede servir de base para el diseño, los documentos de ingeniería y el software, y ayudar al equipo a responder a los cambios.

Para que esto funcione, una sugerencia necesita algo más que una explicación convincente. El equipo necesita ver el material que la respalda, saber en qué punto del proceso se encuentra y comprender quién tomó la decisión sobre ella.

![Maqueta de diseño de Loom, con el material de origen a la izquierda, un modelo conectado de la solución en el centro y propuestas y evidencias a la derecha.](images/loom-workspace-mockup.png)

*Una maqueta de diseño del espacio de trabajo más amplio de Loom. Las sugerencias pendientes de revisión a la derecha ayudan a explicar por qué Loom necesita un proceso fiable alrededor del trabajo de un agente. Esta imagen ilustra la dirección del producto; no es una captura de pantalla de la aplicación de la sesión 2.*

### ¿Dónde encaja FruitTrucks?

FruitTrucks es el negocio ficticio que utilizamos a lo largo del campus. Distribuye productos frescos y quiere coordinar mejor las entregas. Su brief describe problemas como los cambios de ruta que pasan desapercibidos y la necesidad de que atención al cliente llame a un conductor para obtener información sobre una entrega.

**Loom es la aplicación de ingeniería que construimos. La aplicación de entregas es la solución que Loom nos ayuda a comprender y diseñar.** En esta sesión, Loom sigue analizando el brief de FruitTrucks. Desarrollamos el proceso que lleva ese análisis a través de interrupciones, peticiones repetidas y revisión humana.

## ¿Qué aporta la sesión 2?

La sesión 1 estableció un análisis controlado: el agente podía leer un brief permitido, utilizar las herramientas proporcionadas y entregar un resultado comprobado. La sesión 2 sitúa ese trabajo dentro de un **workflow**: un proceso registrado con un estado actual claro, un historial y unas reglas sobre qué puede ocurrir a continuación.

Imagina que ha empezado un análisis y la aplicación se detiene inesperadamente. Cuando vuelva a iniciarse, el equipo debería poder encontrar el mismo trabajo, ver qué ocurrió y continuar dentro de sus límites. Si el agente falla, la aplicación puede volver a intentarlo un número limitado de veces. Si un resultado se entrega dos veces, debe seguir produciendo una sola propuesta. Cuando una propuesta está lista, una persona decide si la acepta o la rechaza.

La demostración terminada permite examinar un workflow, sus intentos y su historial registrado. Puedes ver un intento fallido seguido de otro, volver después de reiniciar la aplicación y revisar una propuesta guardada.

Al terminar la sesión 2, tu equipo debería disponer de un proceso que funcione alrededor del análisis y ser capaz de explicar cómo sobrevive a una interrupción, evita aplicar un resultado dos veces y mantiene explícita la aceptación humana.

## ¿Qué entendemos aquí por harness?

El **harness** es el software que rodea a la IA, le proporciona su tarea, información, acciones disponibles y reglas de funcionamiento, y gestiona lo que ocurre durante y después de su trabajo.

Piensa en pedir a un compañero que investigue una cuestión. La investigación es una parte del trabajo. Alguien también debe registrar la petición, gestionar una interrupción, decidir cuándo solicitar otro intento y enviar las conclusiones al revisor adecuado. El revisor necesita saber si ya se ha tomado una decisión.

Una aplicación de agentes necesita esa misma distinción. GitHub Copilot gestiona la interacción de la IA con el modelo y su elección de herramientas durante un intento. Loom gestiona el proceso más amplio: si debe empezar un intento, qué ocurre después de que falle, dónde se guarda un resultado y cuándo está listo para revisión.

A veces se denominan **bucle interno** y **bucle externo**. El bucle interno realiza una tarea del agente. El bucle externo lleva el trabajo de la aplicación a través de sus etapas. Mantenerlos separados ofrece a tu equipo una forma de razonar sobre los fallos sin confundir un mensaje del agente con el estado registrado por la aplicación.

## ¿Por qué estos tres bloques de taller?

El taller tiene tres bloques didácticos y cuatro partes que implementar. El bloque central reúne los envíos repetidos y la recuperación después de una interrupción. En conjunto, recorren el camino desde **un proceso válido**, pasando por **un progreso fiable**, hasta **una decisión humana**.

### Bloque 1: ¿Qué puede ocurrir a continuación?

El primer bloque completa las reglas para pasar de un estado del workflow a otro. Una petición nueva no puede saltar directamente a la aceptación y una decisión finalizada no puede simplemente revertirse. La aplicación también comprueba que una persona actúa sobre la versión que realmente vio.

Esto importa cuando dos personas miran la misma propuesta. Si una ya ha decidido, la pantalla antigua de la otra no debe sustituir esa decisión sin avisar. El historial registrado debe concordar con el estado registrado.

Para el futuro Loom, estas reglas proporcionan una base para la revisión de propuestas y otros procesos de ingeniería. Cada etapa necesita un significado que las personas puedan comprender y unos límites que el software haga cumplir.

### Bloque 2: ¿Cómo conservamos el progreso sin hacer el trabajo dos veces?

El segundo bloque aborda dos problemas cotidianos: un resultado vuelve a llegar o la aplicación se detiene antes de que termine el proceso.

Un envío repetido del mismo análisis debe devolver el resultado existente. Un análisis modificado que se presenta como ese mismo envío debe rechazarse. Así, la aplicación puede reconocer el trabajo que ya ha registrado.

La recuperación examina después el proceso guardado. Un análisis interrumpido puede necesitar un nuevo intento, sujeto a su límite original. Una propuesta que ya estaba guardada necesita avanzar hacia la revisión. Reiniciar no debe borrar el historial anterior ni asumir que todos los elementos pendientes necesitan el mismo tratamiento.

Para el futuro Loom, estas ideas serán importantes cuando una tarea de ingeniería tenga varios pasos o pueda interrumpirse. La aplicación necesita suficiente información registrada para decidir cómo continuar, con límites claros para los reintentos automáticos.

### Bloque 3: ¿Quién decide si se acepta la propuesta?

El tercer bloque completa las acciones humanas de aceptar y rechazar. El revisor examina la propuesta y sus evidencias, toma una decisión y aporta un motivo. La aplicación comprueba que la decisión sigue siendo válida y la registra.

El agente puede entregar un análisis para revisión. La aceptación y el rechazo corresponden a una persona y las herramientas proporcionadas al agente no incluyen esas acciones.

**Una propuesta comprobada y guardada y una propuesta aceptada son etapas distintas.** Las comprobaciones establecen que el envío cumple los requisitos de la aplicación. La revisión humana valora qué hacer con él. Incluso un análisis aceptado en la sesión 2 todavía no es el modelo conectado de la solución del producto Loom más amplio; esa representación compartida se desarrolla más adelante.

## Cómo encajan las piezas

Considera esta petición: «Analiza el brief de FruitTrucks e identifica las capacidades que necesita la nueva aplicación de entregas».

Loom registra un workflow e inicia un intento del agente. El agente lee el brief permitido e intenta entregar un análisis con citas que lo respaldan. Si el intento falla antes de producir una propuesta, Loom registra el fallo y puede iniciar otro intento dentro del límite acordado.

Si la aplicación se detiene después de guardar la propuesta, la recuperación encuentra ese trabajo guardado al volver a iniciarse. La propuesta puede llegar a revisión sin insertarse una segunda vez. Una persona la examina después y la acepta o rechaza. Una decisión concurrente basada en una versión antigua se rechaza en lugar de sustituir sin avisar la que ya está registrada.

El workflow ofrece al equipo un único trabajo que seguir, aunque hayan sido necesarios varios intentos del agente. Su historial persistente registra el proceso y los resultados guardados; la traza detallada del agente en la consola en directo es una vista distinta y puede no sobrevivir a un reinicio.

En el Loom más amplio, este proceso fiable servirá de base para cambios revisados en la comprensión que tiene el equipo de una solución. La sesión 2 proporciona un fundamento práctico para saber qué está pendiente, qué ha fallado, qué puede continuar y qué ha decidido una persona.

## Qué conviene llevarse de la sesión

Después de la sesión, explica a un compañero cómo responde la aplicación a tres preguntas: qué puede ocurrir a continuación, cómo continúa el trabajo después de una repetición o una interrupción y quién puede aceptar el resultado. Relaciona cada respuesta con uno de los bloques del taller.

Tu equipo está aprendiendo a construir aplicaciones agénticas; Loom es el producto con el que practica esas habilidades; y el harness incluye ahora un proceso persistente alrededor del agente. Ese proceso hace suficientemente visibles el progreso, los fallos y las decisiones humanas para poder examinarlos y comentarlos.

Para los ejercicios prácticos, continúa con [WORKSHOP.md](WORKSHOP.md). Para los conceptos y las comprobaciones más precisos, utiliza [THEORY.md](THEORY.md) y [VALIDATION.md](VALIDATION.md).

## Empezar la siguiente sesión

Cada sesión empieza con su ZIP inicial completo en una carpeta nueva. Incluye las implementaciones de referencia anteriores; conserva tu trabajo para compararlo. Las mejoras propias y el historial de datos no se transfieren automáticamente. Completa la preparación local antes de clase siguiendo [la guía breve de inicio](../../../SESSION-START.es.md) y [QUICKSTART](../../../QUICKSTART.es.md). Incorporar mejoras seleccionadas es opcional después de clase.
