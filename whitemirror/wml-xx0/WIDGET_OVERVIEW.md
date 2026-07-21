# WML X.X.0 - Explicacion del widget

## Que es

WML X.X.0 es un widget de escritorio hecho con Electron, React y TypeScript. Su funcion principal es acompanar al usuario con una mascota flotante que vive encima del escritorio, muestra estado basico, gana puntos con la actividad y ofrece ayuda practica cuando detecta situaciones concretas.

El widget esta pensado para ser discreto: no debe saturar al usuario con recomendaciones constantes, no ejecuta acciones sin permiso y mantiene el analisis principal en local.

## Elementos principales

- Mascota flotante: aparece en una ventana transparente y siempre visible.
- Panel de ajustes: permite cambiar idioma, apariencia, mascota, colores, accesorios, IA local, sugerencias y modelo de OpenAI.
- Asistente de chat: permite hablar con una IA para pedir acciones practicas o recomendaciones.
- Sistema de sugerencias: muestra una unica recomendacion cuando hay una accion util que proponer.
- Tienda visual: el usuario gana puntos usando el ordenador y puede comprar especies, colores y accesorios.

## Comportamiento de la mascota

La mascota puede estar en varios estados:

- Activa: estado normal.
- Sentada: reduce la frecuencia de sugerencias.
- Dormida: aparece tras inactividad prolongada.
- Bateria baja o critica: depende del estado real de bateria cuando el sistema lo permite.
- Apagada por bateria: visualmente mantiene la animacion de dormida hasta que el usuario la revive.

La mascota reacciona a actividad local como clics y escritura. Esa actividad se usa como senal simple, no como contenido: el widget no lee lo que el usuario escribe.

La mascota no puede ocultarse desde el widget ni desde el menu contextual. Si se apaga por bateria, no recoge puntos mientras esta apagada.

## IA local

La IA local funciona con reglas dentro de la aplicacion. No necesita API externa y esta preparada para seguir funcionando aunque no haya conexion, no haya API key o falle el modelo de OpenAI.

La IA local puede:

- Detectar ritmo de actividad.
- Observar nivel de bateria.
- Ver si la mascota esta sentada, dormida, activa u oculta.
- Detectar aplicaciones habituales por procesos conocidos.
- Detectar algunas senales de seguridad, como procesos con nombres sospechosos o proteccion en tiempo real de Microsoft Defender desactivada en Windows.
- Generar sugerencias practicas y accionables.

La IA local no es un antivirus completo. Solo anade una capa de aviso y respuesta prudente dentro del widget.

## Modelo de OpenAI

El widget puede conectarse a un modelo de OpenAI desde el panel de IA. El usuario solo tiene que introducir su API key y activar el uso del modelo.

Por defecto se configura un modelo oficial documentado (`gpt-5-nano`). En la interfaz se recomienda Luna si el usuario lo tiene disponible, por su baja latencia.

La llamada al modelo esta optimizada para gastar pocos tokens:

- Envia solo estado local resumido y anonimizado.
- Limita la respuesta con `max_output_tokens`.
- Usa `store: false`.
- Pide una salida JSON estricta.
- Solo permite que el modelo proponga acciones de un catalogo cerrado.

Si la API no esta configurada, si el modelo no existe para esa cuenta, si no hay red o si OpenAI devuelve error, el widget cae automaticamente a la IA local.

## Privacidad

El widget evita enviar datos innecesarios fuera del dispositivo.

El estado enviado al modelo externo, si se activa, se reduce a datos como:

- Idioma.
- Bateria aproximada.
- Estado de la mascota.
- Puntos.
- Si privacidad, IA local o sugerencias estan activadas.
- Senales locales resumidas.
- Sugerencia activa, si existe.

No envia el texto que el usuario escribe en otras aplicaciones, archivos personales ni contenido de ventanas.

El modo privado pausa el seguimiento local de actividad para sugerencias normales.

## Sugerencias

El widget esta disenado para no abrumar.

Reglas de frecuencia:

- Solo muestra una sugerencia a la vez.
- Como maximo una sugerencia normal cada 5 minutos.
- Si la mascota esta sentada, como maximo una sugerencia normal cada 10 minutos.
- Si la mascota esta dormida o apagada por bateria, no genera sugerencias nuevas, salvo alertas criticas de seguridad o si ya habia una sugerencia abierta.
- Las alertas criticas de seguridad pueden aparecer inmediatamente, aunque hubiera aparecido otra sugerencia hace poco.
- Una alerta critica puede reemplazar una sugerencia anterior.

Las sugerencias normales respetan los ajustes de IA local, sugerencias y modo privado. Las alertas criticas de seguridad pueden mostrarse aunque las sugerencias normales esten pausadas.

## Acciones que puede sugerir

El widget solo puede sugerir acciones que sabe ejecutar. Al aceptar, no se queda en texto: ejecuta la accion asociada.

Acciones disponibles:

- Abrir o enfocar aplicaciones habituales detectadas localmente.
- Cerrar aplicaciones no criticas en segundo plano para ahorrar bateria.
- Limpiar archivos temporales antiguos.
- Ejecutar un analisis rapido de seguridad cuando esta disponible.

Cuando una accion puede afectar al usuario, la sugerencia lo advierte antes. Por ejemplo, al cerrar apps en segundo plano indica que podria perderse trabajo no guardado.

## Acciones que no hace automaticamente

El widget no debe:

- Cambiar sus propios ajustes de configuracion desde una sugerencia o desde el asistente.
- Activar o desactivar por si mismo la IA local, las sugerencias o el modo privado.
- Cerrar WML X.X.0 o recomendar cerrar su propia ventana.
- Ejecutar texto libre generado por el modelo como comando.
- Borrar documentos personales.
- Tomar decisiones sensibles sin confirmacion.

Si el usuario pide cambiar configuracion del propio widget, el asistente puede recomendar que lo haga desde ajustes, pero no aplica ese cambio automaticamente.

## Seguridad

El widget incluye comprobaciones locales simples:

- Busca procesos con nombres asociados a herramientas sospechosas conocidas.
- En Windows, puede comprobar si Microsoft Defender tiene la proteccion en tiempo real desactivada.
- Ante una senal critica, prioriza una alerta y propone ejecutar un analisis rapido de Microsoft Defender.

Limitacion importante: esto no sustituye a Microsoft Defender, un EDR o un antivirus profesional. Sirve como aviso adicional y como acceso rapido a una accion segura.

## Empaquetado

El proyecto tiene scripts de empaquetado por plataforma:

- `npm run build:win`: genera instalador Windows `.exe` con NSIS.
- `npm run build:linux`: genera `AppImage` y `.deb`.
- `npm run build:mac`: genera `.dmg` y `.zip`.

Antes de empaquetar, cada script limpia los artefactos previos de su plataforma para evitar errores como carpetas temporales bloqueadas.

Nota: el build de macOS debe ejecutarse en macOS para generar correctamente los artefactos de Mac. Linux puede requerir herramientas del sistema segun el entorno.

## Tecnologias usadas

- Electron para la aplicacion de escritorio.
- React para la interfaz.
- TypeScript para tipado.
- electron-store para persistencia local.
- systeminformation para bateria y datos del sistema.
- ps-list para detectar procesos.
- uiohook-napi para senales locales de actividad.
- electron-builder para generar instaladores.

## Resumen rapido

WML X.X.0 es una mascota de escritorio con IA local y asistente opcional de OpenAI. Observa senales basicas del dispositivo, protege la privacidad por defecto, sugiere pocas acciones y siempre pide confirmacion antes de actuar. Su objetivo es ahorrar tiempo, cuidar la bateria, ayudar con pequenas optimizaciones y alertar ante posibles riesgos de seguridad sin convertirse en una herramienta invasiva.
