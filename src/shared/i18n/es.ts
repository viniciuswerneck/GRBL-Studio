import type { ptBR } from './pt-BR';

/**
 * Catálogo i18n — espanhol (neutro).
 * Declarado com `satisfies Record<keyof typeof ptBR, string>`: o compilador
 * recusa chave faltando ou sobrando — a paridade com pt-BR é garantida por
 * type-check (ver `tests/i18n.test.ts`).
 */
export const es = {
  // ------------------------------------------------------- navegación/común
  'nav.back': 'Atrás',
  'nav.next': 'Siguiente',
  'nav.close': 'Cerrar',
  'nav.cancel': 'Cancelar',
  'nav.import': 'Importar…',
  'nav.export': 'Exportar…',

  // -------------------------------------------------------------- modos UI
  'assistant.open': 'Asistente',
  'assistant.close': 'Cerrar asistente',
  'assistant.title': 'Asistente — guía para principiantes',
  'mode.M4': 'M4 (dinámico)',
  'mode.M3': 'M3 (constante)',

  // ------------------------------------------------------ perfil de máquina
  'profile.label': 'Perfil de máquina',
  'profile.title': 'Ajustes optimizados para la máquina',
  'profile.generic': 'Genérica (GRBL)',
  // Perfil de máquina: import `.lbdev` (P2.5) y conexión inteligente.
  'profile.import': 'Importar .lbdev…',
  'profile.importHint':
    'Importa el perfil de máquina de un archivo de LightBurn (.lbdev)',
  'profile.importError': 'No se pudo importar el perfil: {error}',
  'profile.importError.invalid-json': 'el archivo no es un .lbdev válido',
  'profile.importError.no-device': 'el archivo no tiene dispositivos',
  'profile.imported': 'Perfil importado: {name} ({area} mm)',
  'profile.suggestion': 'Sugerencia: {name} — aplicar',
  'profile.reason.area': 'misma área de trabajo',
  'profile.reason.smax': 'mismo tope de S',
  'profile.reason.homing': 'mismo homing',
  'profile.applyTitle': 'Aplicar perfil de máquina',
  'profile.applyIntro': 'El perfil {name} escribe estos valores en la máquina:',
  'profile.before': '{value} (actual)',
  'profile.unknown': 'no informado',
  'profile.change': '{code}: {before} → {after}',
  'profile.apply': 'Aplicar',
  'profile.applied': 'Perfil {name} aplicado.',
  'profile.module': 'Módulo',
  'profile.action': 'Acción',
  'profile.material.title': 'Perfil de material (RF-IMG-8)',
  'profile.material.hint':
    'Sugerencias del manual de la COMGO Z1 (§9). Aplicar el perfil rellena la Velocidad y la S-max más abajo — compruebe el resultado antes de grabar.',
  'profile.material.placeholder': '— elegir material —',
  'profile.material.choose':
    'Elija un material para ver la recomendación del manual.',
  'profile.material.applied':
    '{power}% de potencia (S-max {smax}) · {speed} mm/min · {notes}',
  'profile.material.unavailable':
    'Perfiles no disponibles: ejecute `npm run build`.',
  'action.engrave': 'Grabado',
  'action.cut': 'Corte',

  // -------------------------------------------------------- guía (básico)
  'guide.close': 'Cerrar asistente',
  'assistant.guideTitle': 'Asistente — guía para principiantes',
  'guide.type.photo': 'Foto',
  'guide.type.bw': 'B/N',
  'guide.type.vector': 'Contorno',
  'wizard.startHint': 'Conecte el grabador para empezar.',
  'wizard.title': 'Paso {n} de {total} — {title}',
  'wizard.paramsTitle': 'Tamaño, tipo y material',
  'wizard.connected': 'Conectado. Haga clic en Siguiente.',
  'wizard.connect': 'Conecte el grabador.',
  'wizard.imageLoaded': '{name} cargada. Haga clic en Siguiente.',
  'wizard.chooseImage': 'Elija una imagen.',
  'wizard.size': 'Tamaño (mm)',
  'wizard.defineParams': 'Defina el tamaño, el tipo y el material.',
  'wizard.gcodeReady': 'G-code listo. Haga clic en Siguiente.',
  'wizard.clickGenerate': 'Haga clic en Generar G-code.',
  'wizard.positionHint':
    'Posicione el láser y use el contorno tenue (no quema).',
  'wizard.check': 'Compruebe todo y haga clic en Grabar.',
  'wizard.next': 'Siguiente',
  'wizard.finish': 'Finalizar',

  // ----------------------------------------------------------- pestañas
  'tab.machine': 'Grabadora',
  'tab.image': 'Imagen',
  'tab.run': 'Ejecución',
  'tab.macros': 'Macros',

  // ------------------------------------------------------------- conexión
  'conn.title': 'Conexión',
  'conn.transport': 'Transporte',
  'conn.transport.title': 'Serial (USB) o WiFi/TCP (RF-CON-7)',
  'conn.transport.serial': 'Serial (USB)',
  'conn.transport.tcp': 'WiFi (TCP)',
  'conn.refresh': 'Actualizar',
  'conn.portHint':
    'No se detectó ninguna placa USB. Conecte el grabador y haga clic en Actualizar.',
  'conn.host': 'Host',
  'conn.port': 'Puerto',
  'conn.tcpHint':
    'Ej.: ESP8266/ESP32 con firmware serial-over-TCP (Telnet 23). El GRBL 1.1 no cambia.',
  'conn.connect': 'Conectar',
  'conn.disconnect': 'Desconectar',
  'conn.disconnected': 'Desconectado',
  'conn.connecting': 'Conectando…',
  'conn.connected': 'Conectado',
  'conn.error': 'Error de conexión',
  'conn.selectPort': 'Seleccione un puerto serie.',
  'conn.notConnected': 'No conectado.',
  'conn.connectFirst': 'Conecte la máquina para enviar',
  'conn.settings': 'Ajustes de la máquina ($$)',
  'port.none': 'Ningún puerto',

  // ------------------------------------------------------------------ jog
  'jog.title': 'Movimiento',
  'jog.home.title': 'Homing de la máquina (requiere fin de carrera)',
  'jog.home.noHoming': '{name}: sin homing de fábrica — use Definir origen',
  'jog.setOrigin': 'Origen aquí',
  'jog.gotoZero': 'Ir a cero',
  'jog.unlock': 'Unlock ($X)',
  'jog.reset': 'Reset',

  // ------------------------------------------------------------- overrides
  'ovr.title': 'Overrides (tiempo real)',
  'ovr.hint':
    'Ajustan la máquina en movimiento. El valor activo proviene del estado (`Ov:`).',
  'ovr.feed': 'Feed',
  'ovr.rapid': 'Rápido',
  'ovr.spindle': 'Potencia',
  'ovr.reset': 'Volver al 100%',

  // ------------------------------------------------------- imagen → g-code
  'img.title': 'Imagen → G-code',
  'img.steps.hint':
    'Paso 1: elija la imagen · Paso 2: genere el G-code · Paso 3: conecte y envíe.',
  'img.choose': 'Elegir imagen',
  'img.chooseEllipsis': 'Elegir imagen…',
  'img.replace': 'Cambiar imagen…',
  'img.none': 'Ninguna imagen cargada',
  'img.dimension': 'Dimensionar (mm)',
  'img.width': 'Ancho',
  'img.height': 'Alto',
  'img.offsetX': 'Offset X',
  'img.offsetY': 'Offset Y',
  'img.keepAspect': 'Mantener proporción',
  'img.aspect.locked': 'Proporción bloqueada: el alto sigue al ancho.',
  'img.aspect.free': 'Proporción libre: ancho y alto son independientes.',
  'img.convert': 'Conversión',
  'img.algorithm': 'Algoritmo',
  'img.type': 'Tipo',
  'img.material': 'Material',
  'algo.vector': 'Vectorizar (contorno/recorte)',
  'img.lines': 'Líneas/mm',
  'img.direction': 'Dirección',
  'img.dot': 'Punto (mm)',
  'img.simplify': 'Suavizado (px)',
  'img.algoHint':
    'Vectorizar genera solo el contorno (recorte): el Umbral B/N define lo que se recorta, y el dibujo se convierte en líneas cerradas a potencia máxima (S-max).',
  'img.brightness': 'Brillo',
  'img.contrast': 'Contraste',
  'img.threshold': 'Umbral B/N',
  'img.invert': 'Invertir blanco y negro',
  'img.bw': 'Blanco y negro (umbral)',
  'img.engrave': 'Grabado',
  'img.speed': 'Velocidad',
  'img.passes': 'Pasadas',
  'img.mode': 'Modo',
  'img.adaptive': 'Velocidad en zonas claras (×)',
  'img.adaptive.title':
    'Acelera los tramos claros hasta N× la velocidad de grabado. Las zonas ' +
    'claras salen más claras (dosis = S ÷ velocidad); compense con S-max/white ' +
    'clip. Por encima de la velocidad máxima de los ejes ($110/$111) el grabado ' +
    'se debilita. 1 = desactivado.',
  'img.bidirectional': 'Bidireccional (zigzag)',
  'img.bidirectional.title':
    'Graba cada línea de izquierda a derecha y la siguiente de derecha a ' +
    'izquierda, sin el G0 de retorno. Casi duplica la velocidad en imágenes ' +
    'anchas. Desactívelo si su máquina deja la ida y la vuelta diferentes.',
  'img.speed.limits':
    'Velocidad máxima de los ejes ($110/$111): {x} / {y} mm/min.',
  'img.speed.over':
    'Pico de {peak} mm/min por encima del límite del eje ({max} mm/min): GRBL ' +
    'limita la velocidad y el grabado se debilita. Reduzca la velocidad o la ' +
    'velocidad en zonas claras.',
  'img.speed.unknown':
    'Conecte la grabadora para comparar con el límite de los ejes ($110/$111).',
  'img.generate': 'Generar G-code',
  'img.generate.disabled': 'Elija primero una imagen',
  'img.generate.title': 'Convierte la imagen en G-code',
  'img.generating': 'Generando…',
  'img.save': 'Guardar .gcode',
  'img.save.disabled': 'Genere primero el G-code',
  'img.save.title': 'Guarda el G-code en disco',
  'img.previewTag': '(vista previa)',
  'img.reduced': ' (reducida de {w}×{h})',
  'img.statsFail': 'Fallo: {msg}',
  'img.error.open': 'Fallo al abrir la imagen',
  'img.error.invalid': 'Imagen no válida',
  'img.error.invalidDetail': '{name} no indica ancho/alto.',
  'img.error.format': 'Formato no admitido',
  'img.error.formatDetail':
    '{name} no pudo decodificarse. Use PNG, JPG, BMP, GIF, WebP o AVIF.',

  // ------------------------------------------------------- posicionamiento
  'frame.title': 'Posicionar la grabadora',
  'frame.group.move': 'Mover el cabezal',
  'frame.group.check': 'Verificar el área',
  'frame.group.job': 'Grabado',
  'frame.home.title': 'Home (referenciar los ejes)',
  'frame.hint':
    'Use las flechas para acercar el láser al área. “Dibujar contorno” recorre el área con láser muy débil y “Marcar centro” lleva el láser al centro de la imagen (láser débil por un instante).',
  'frame.setOrigin': 'Definir origen aquí',
  'frame.origin': 'Ir al origen (0,0)',
  'frame.outline': 'Dibujar contorno',
  'frame.center': 'Marcar centro',
  'frame.center.title':
    'Lleva el láser al centro de la imagen (láser débil por un instante)',
  'frame.center.done': 'Láser en el centro de la imagen (láser débil).',
  'frame.start': '▶ Grabar',
  'frame.power': 'Potencia del grabado (%)',
  'frame.speed': 'Velocidad de grabado (mm/min)',
  'frame.position': 'Posicionar',
  'frame.engrave': 'Grabar',
  'frame.status.connected':
    'Máquina conectada. Posicione y dibuje el contorno para comprobar.',
  'frame.status.disconnected':
    'Conecte la máquina para posicionar y dibujar el contorno.',
  'frame.outline.done': 'Contorno enviado (láser muy débil).',
  'frame.generating': 'Generando G-code con los parámetros del modal…',
  'frame.connect': 'Conectar máquina',
  'frame.connect.noPort':
    'No se encontró ningún puerto serie. Revisa el cable y pulsa «Conectar máquina».',

  // ------------------------------------------------------- rejilla de prueba de material
  'matTest.title': 'Cuadrícula de prueba de material',
  'matTest.hint':
    'Graba una cuadrícula de cuadrados, cada uno con una combinación distinta de ' +
    'velocidad y potencia. Úsala para descubrir los parámetros ideales de un material.',
  'matTest.cols': 'Columnas (pasos de velocidad)',
  'matTest.rows': 'Filas (pasos de potencia)',
  'matTest.speedMin': 'Velocidad mínima (mm/min)',
  'matTest.speedMax': 'Velocidad máxima (mm/min)',
  'matTest.powerMin': 'Potencia mínima (%)',
  'matTest.powerMax': 'Potencia máxima (%)',
  'matTest.cellSize': 'Lado de la celda (mm)',
  'matTest.spacing': 'Espacio entre celdas (mm)',
  'matTest.passes': 'Pasadas',
  'matTest.mode': 'Modo del láser',
  'matTest.generate': 'Generar y previsualizar',
  'matTest.save': 'Guardar .gcode…',
  'matTest.status.generating': 'Generando la cuadrícula de prueba…',
  'matTest.status.done':
    'Cuadrícula generada. Revisa la vista previa y envía o guarda.',
  // ------------------------------------------- prueba de foco (RF-IMG-13)
  'focus.title': 'Prueba de foco (spot)',
  'focus.hint':
    'Graba una escalera de líneas con el Z cambiando en cada par: la línea más fina indica el mejor foco. El Z es relativo al Z actual — el programa baja, sube y vuelve al inicio. Deja holgura y el Cancelar a mano.',
  'focus.steps': 'Pasos de Z',
  'focus.zStep': 'Paso de Z (mm)',
  'focus.zSign': 'Sentido del Z',
  'focus.zSignUp': 'Z+ aleja del material',
  'focus.zSignDown': 'Z+ acerca al material',
  'focus.length': 'Largo de la línea (mm)',
  'focus.spacing': 'Espacio entre líneas (mm)',
  'focus.feed': 'Avance (mm/min)',
  'focus.powerLow': 'Potencia baja (%)',
  'focus.powerHigh': 'Potencia alta (%)',
  'focus.mode': 'Modo del láser',
  'focus.generate': 'Generar y visualizar',
  'focus.save': 'Guardar .gcode…',
  'focus.preview':
    '{lines} líneas en {steps} pasos de Z: {zMin} a {zMax} mm (desde el Z actual).',
  'focus.warn.samePower':
    'Las dos potencias son iguales — usa valores distintos para comparar el foco en la marca y en el corte.',
  'focus.status.done':
    'Prueba de foco generada ({steps} pasos). Revisa la vista previa y envía o guarda.',
  'focus.err.moduleMissing': 'Módulo de la prueba de foco no cargado.',
  // ------------------------------- presets de material (P2.12/RF-IMG-8)
  'preset.title': 'Presets de material',
  'preset.hint':
    'Recetas que funcionaron: potencia, velocidad, pasadas y notas. Exporta para compartir; importa para repetir sin rehacer la cuadrícula de pruebas.',
  'preset.new': 'Nuevo preset',
  'preset.name': 'Nombre',
  'preset.notes': 'Notas (opcional)',
  'preset.fromCurrent':
    'Origen: {module} · {action} · {power}% · {speed} mm/min · {passes} pasada(s).',
  'preset.defaultName': 'Receta {n}',
  'preset.create': 'Guardar ajustes actuales',
  'preset.saveCurrent': 'Guardar como preset…',
  'preset.manage': 'Mis presets…',
  'preset.empty':
    'Todavía no hay presets. Ajusta la potencia y la velocidad, ponle un nombre y guarda los ajustes actuales.',
  'preset.apply': 'Aplicar',
  'preset.convert': 'Adaptar a la máquina',
  'preset.remove': 'Eliminar',
  'preset.meta': '{module} · {action} · {power}% · {speed} mm/min · {passes}×',
  'preset.dose': 'Dosis {dose} J/mm',
  'preset.doseHint':
    'Dosis = energía por milímetro (aproximada, sin el punto del láser): sirve para comparar recetas y transferirlas entre módulos.',
  'preset.hint.applied':
    'Preset “{name}”: {power}% · {speed} mm/min · {passes} pasada(s).',
  'preset.import': 'Importar…',
  'preset.export': 'Exportar…',
  'preset.status.created': 'Preset “{name}” guardado.',
  'preset.status.applied':
    'Preset “{name}” aplicado: {power}% · {speed} mm/min · {passes} pasada(s).',
  'preset.status.converted':
    'Dosis conservada: {from}% ({fromModule}) → {to}% ({toModule}).',
  'preset.status.convertLimited':
    'El módulo {toModule} de la máquina no alcanza la dosis de la receta ({fromModule}) — quedó en 100%. Baja la velocidad para mantener la dosis.',
  'preset.status.removed': 'Preset eliminado.',
  'preset.status.imported': '{n} preset(s) importado(s).',
  'preset.status.importedSkipped': ' {n} inválido(s) ignorado(s).',
  'preset.status.exported': 'Presets exportados a {path}.',
  'preset.err.name': 'Ponle un nombre al preset.',
  'preset.err.moduleMissing': 'Módulo de presets no cargado.',
  'preset.err.import': 'No se pudo leer el archivo: {msg}',
  'preset.err.empty': 'El archivo no tiene presets válidos.',

  // ------------------------------------------------ Código QR (v0.6, RF-SYM-1)
  'menu.qrCode': 'Código 2D (QR / Data Matrix)…',
  // Cuadrícula de símbolos (RF-SYM-9): común a los modales 2D y 1D.
  'sym.grid': 'Cuadrícula: una lista, 1 símbolo por línea',
  'sym.gridHint':
    'Con la cuadrícula activada, cada línea del contenido se convierte en un símbolo, dispuesto en columnas y filas.',
  'sym.gridColumns': 'Columnas (vacío = automático)',
  'sym.gridGap': 'Espaciado (mm)',
  'sym.status.grid':
    'Cuadrícula generada: {count} símbolo(s) · {cols} × {rows} · {w} × {h} mm. Revisa la vista previa y envía o guarda.',
  'qr.title': 'Código 2D',
  'qr.hint':
    'Genera un código QR, un Data Matrix, un PDF417 o un Aztec como G-code de ' +
    'barrido: ' +
    'elige el símbolo, el contenido y el tamaño en mm (o el lado del módulo) y ' +
    'graba. El origen del arte es la esquina inferior izquierda (X0 Y0).',
  'qr.content': 'Contenido',
  'qr.contentPlaceholder': 'https://ejemplo.com o un texto',
  'qr.symbology': 'Símbolo',
  'qr.sym.qr': 'QR Code',
  'qr.sym.datamatrix': 'Data Matrix',
  'qr.sym.pdf417': 'PDF417',
  'qr.sym.aztec': 'Aztec',
  'qr.ecc': 'Corrección de errores',
  'qr.ecc.L': 'L — 7%',
  'qr.ecc.M': 'M — 15%',
  'qr.ecc.Q': 'Q — 25%',
  'qr.ecc.H': 'H — 30%',
  'qr.version': 'Versión',
  'qr.versionAuto': 'Automática',
  'qr.size': 'Tamaño (mm)',
  'qr.width': 'Ancho (mm)',
  'qr.height': 'Alto (mm)',
  'qr.keepAspect': 'Cuadrado',
  'qr.keepAspectHint':
    'Mantiene el ancho igual al alto (el símbolo es cuadrado).',
  'qr.sizeHint':
    'En blanco usa el lado del módulo. Ancho ≠ alto deforma el símbolo y ' +
    'puede dificultar la lectura.',
  'qr.module': 'Lado del módulo (mm)',
  'qr.quietZone': 'Zona silenciosa (módulos)',
  'qr.linesPerMm': 'Líneas de barrido por mm',
  'qr.power': 'Potencia (%)',
  'qr.feed': 'Velocidad (mm/min)',
  'qr.passes': 'Pasadas',
  'qr.mode': 'Modo del láser',
  'qr.mode.m4': 'M4 (dinámico)',
  'qr.mode.m3': 'M3 (constante)',
  'qr.overscan': 'Sobrebarrido (mm)',
  'qr.invert': 'Polaridad invertida (grabar el fondo)',
  'qr.generate': 'Generar y previsualizar',
  'qr.save': 'Guardar .gcode…',
  'qr.status.generating': 'Generando el código QR…',
  'qr.moduleMissing': 'Generador de código QR no cargado.',
  'qr.status.done':
    'QR generado: {version} · {size}×{size} módulos · {w} × {h} mm · ' +
    'módulo {module} mm. Revisa la vista previa y envía o guarda.',
  'qr.err.empty': 'Indica un contenido para generar el código QR.',
  'qr.err.too-long':
    'El contenido es demasiado largo para un código QR en el nivel {ecc}.',
  'qr.err.bad-version': 'Versión de la información de formato no válida.',
  'qr.err.unknown': 'No se pudo generar el código QR con estos parámetros.',
  'qr.warn.module-small':
    'Módulo menor que 2× el punto del láser: el código puede salir ilegible.',
  'qr.warn.module-tiny':
    'Módulo por debajo de 0,3 mm: demasiado pequeño para la mayoría de lectores.',
  'qr.warn.quiet-zone-small':
    'Zona silenciosa menor que la norma (4 módulos): dificulta la lectura.',
  'qr.warn.lines-too-few':
    'Menos de 3 líneas de barrido por módulo: el relleno puede salir con fallas.',
  'qr.warn.outside-work-area':
    'El símbolo no cabe en el área de trabajo desde este origen.',
  'qr.warn.stretched':
    'El ancho es distinto del alto: el símbolo sale deformado y la lectura puede fallar.',

  // ------------------------------------------- código de barras 1D (v0.6)
  'menu.barCode': 'Código de barras…',
  'dm.title': 'Data Matrix',
  'dm.size': 'Tamaño del símbolo',
  'dm.sizeAuto': 'Automático (el menor que quepa)',
  'dm.status.done':
    'Data Matrix generado: {size}×{size} módulos · {w} × {h} mm · módulo ' +
    '{module} mm. Revisa la vista previa y envía o guarda.',
  'dm.err.empty': 'Indica un contenido para generar el Data Matrix.',
  'dm.err.too-long': 'Contenido demasiado largo para un Data Matrix.',
  'dm.err.bad-chars':
    'El Data Matrix ECC200 solo acepta Latin-1 (sin emoji ni otro UTF-8).',
  'dm.err.bad-size': 'Tamaño de Data Matrix no válido.',
  'dm.err.unknown': 'No se pudo generar el Data Matrix con estos parámetros.',

  // ---------------------------------------- PDF417 (v0.8, RF-SYM-7)
  'pdf.title': 'Código PDF417',
  'qr.pdf.ecc': 'Corrección de errores',
  'qr.pdf.eccOption': 'Nivel {level} — {ec} codewords',
  'qr.pdf.cols': 'Columnas de datos (vacío = automático)',
  'qr.pdf.rowHeight': 'Altura de la fila (mm)',
  'pdf.status.done':
    'PDF417 generado: {rows} × {cols} codewords · EC nivel {ecc} · {w} × {h} mm · ' +
    'módulo {module} mm · fila {row} mm. Revisa la vista previa y envía o guarda.',
  'pdf.err.empty': 'Introduce un contenido para generar el PDF417.',
  'pdf.err.too-long':
    'Contenido demasiado largo para un PDF417 con estos parámetros.',
  'pdf.err.bad-options':
    'Parámetros de PDF417 inválidos (columnas de datos fuera de 1…30).',
  'pdf.err.bad-chars':
    'El PDF417 solo admite Latin-1 (sin emoji ni otro UTF-8).',
  'pdf.err.unknown': 'No se pudo generar el PDF417 con estos parámetros.',

  // ---------------------------------------- Aztec (RF-SYM-7)
  'aztec.title': 'Código Aztec',
  'qr.aztec.ecc': 'Corrección de errores (%)',
  'qr.aztec.eccHint':
    'La norma ISO/IEC 24778 pide al menos 23 %. Más corrección = símbolo más grande.',
  'aztec.status.done':
    'Aztec generado: {size}×{size} módulos · {layers} capas · {w} × {h} mm · ' +
    'módulo {module} mm. Revisa la vista previa y envía o guarda.',
  'aztec.err.empty': 'Informa un contenido para generar el Aztec.',
  'aztec.err.too-long':
    'Contenido demasiado largo para un Aztec (el máximo es 32 capas).',
  'aztec.err.bad-chars':
    'El Aztec acepta solo Latin-1 (sin emoji ni otro UTF-8).',
  'aztec.err.layers': 'Número de capas inválido para este contenido.',
  'aztec.err.unknown': 'No se pudo generar el Aztec con estos parámetros.',

  'bar.title': 'Código de barras',
  'bar.hint':
    'Genera un código de barras 1D como G-code: elige la simbología, el ' +
    'contenido y el tamaño. Las barras se rellenan en vertical (a lo largo de ' +
    'ellas) y el texto legible (HRI) se dibuja con la fuente de trazo único. ' +
    'El origen es la esquina inferior izquierda (X0 Y0).',
  'bar.symbology': 'Simbología',
  'bar.sym.code128': 'Code 128 — texto libre',
  'bar.sym.ean13': 'EAN-13 — 12 dígitos (+ verificador)',
  'bar.sym.ean8': 'EAN-8 — 7 dígitos (+ verificador)',
  'bar.sym.upca': 'UPC-A — 11 dígitos (+ verificador)',
  'bar.sym.code39': 'Code 39 — A–Z, 0–9 y -.$/+%',
  'bar.sym.itf14': 'ITF-14 — 13 dígitos (+ dígito de control GS1)',
  'bar.sym.codabar': 'Codabar — A–D, 0–9 y -$:/.+',
  'bar.sym.code93': 'Code 93 — A–Z, 0–9 y -.$/+%',
  'bar.sym.gs1-128': 'GS1-128 — Code 128 con FNC1 (^ separa campos)',
  'bar.hint.itf14':
    'Introduce 13 dígitos (el dígito de control mod 10 se calcula) o 14 (se ' +
    'comprueba).',
  'bar.hint.codabar':
    'Empieza y termina con A–D (ej.: A1234B); sin guards usa A…A.',
  'bar.hint.code93':
    'Alfabeto básico (47 símbolos). Los verificadores C y K son automáticos.',
  'bar.hint.gs1':
    'En GS1-128, ^ marca el fin de un campo (FNC1). La validación de AI es ' +
    'por tu cuenta.',
  'bar.content': 'Contenido',
  'bar.contentPlaceholder': 'GRBL-STUDIO-001',
  'bar.checksum': 'Verificación mod 43 (Code 39)',
  'bar.ratio': 'Relación ancho:estrecho',
  'bar.ratio.2': '2:1 (más estrecho)',
  'bar.ratio.3': '3:1 (recomendado)',
  'bar.width': 'Ancho final (mm)',
  'bar.widthHint':
    'En blanco usa la X-dimension. El ancho incluye la zona silenciosa.',
  'bar.xDim': 'X-dimension (mm)',
  'bar.barHeight': 'Altura de las barras (mm)',
  'bar.quietZone': 'Zona silenciosa (módulos)',
  'bar.linesPerMm': 'Líneas de barrido por mm',
  'bar.hri': 'Mostrar el texto (HRI) bajo las barras',
  'bar.power': 'Potencia (%)',
  'bar.feed': 'Velocidad (mm/min)',
  'bar.passes': 'Pasadas',
  'bar.mode': 'Modo del láser',
  'bar.mode.m4': 'M4 (dinámico)',
  'bar.mode.m3': 'M3 (constante)',
  'bar.overscan': 'Overscan (mm)',
  'bar.invert': 'Polaridad invertida (quemar el fondo)',
  'bar.generate': 'Generar y visualizar',
  'bar.save': 'Guardar .gcode…',
  'bar.status.generating': 'Generando el código de barras…',
  'bar.moduleMissing': 'Generador de código de barras no cargado.',
  'bar.status.done':
    '{sym} generado: {modules} módulos · {w} × {h} mm · X-dim {xdim} mm. ' +
    'Revisa la vista previa y envía o guarda.',
  'bar.err.empty': 'Introduce un contenido para generar el código de barras.',
  'bar.err.bad-chars':
    'Esta simbología no acepta uno de los caracteres (ver el registro).',
  'bar.err.bad-length':
    'La longitud del contenido no sirve para esta simbología (ver el registro).',
  'bar.err.bad-option':
    'Combinación de opciones no válida para esta simbología.',
  'bar.err.check-digit':
    'Dígito verificador no válido: se esperaba {expected}, se informó {given}.',
  'bar.warn.module-small':
    'X-dimension menor que 2× el punto del láser: el código puede salir ilegible.',
  'bar.warn.module-tiny':
    'X-dimension por debajo de 0,3 mm: demasiado pequeño para la mayoría de lectores.',
  'bar.warn.quiet-zone-small':
    'Zona silenciosa menor que la norma: dificulta la lectura.',
  'bar.warn.lines-too-few':
    'Menos de 3 líneas de barrido por módulo: el relleno puede salir con fallos.',
  'bar.warn.outside-work-area':
    'El símbolo no cabe en el área de trabajo desde este origen.',
  'bar.warn.x-dim-small':
    'X-dimension por debajo del mínimo de la norma: el lector puede fallar.',
  'bar.warn.bar-height-small':
    'Barras más bajas que el mínimo recomendado: dificulta la lectura.',
  'bar.warn.hri-chars':
    'El HRI tiene caracteres sin glifo en la fuente: salen como “?”.',
  'bar.warn.uppercased':
    'El Code 39 solo graba mayúsculas — el contenido se convirtió, y el lector lo devolverá en mayúsculas.',

  // -------------------------- lote / datos variables (v0.8, RF-SYM-10)
  'menu.batch': 'Lote de datos variables…',
  'batch.title': 'Lote — datos variables',
  'batch.hint':
    'Cada fila de la hoja es una pieza. La app graba una, pausa para que cambies la pieza y sigue con la siguiente. La geometría usa los ajustes del símbolo (Herramientas → Código 2D / código de barras).',
  'batch.kind': 'Tipo de pieza',
  'batch.kind2d': 'Código 2D (QR, Data Matrix, PDF417, Aztec)',
  'batch.kind1d': 'Código de barras (1D)',
  'batch.file': 'Hoja',
  'batch.openFile': 'Abrir CSV…',
  'batch.csv': 'Pega la hoja (CSV/TSV)',
  'batch.csvPlaceholder': 'nombre,puesto\nAna,Dev',
  'batch.hasHeader': 'La primera fila es el encabezado',
  'batch.delimiter': 'Separador',
  'batch.delimiterAuto': 'Automático',
  'batch.delimiterComma': 'Coma (,)',
  'batch.delimiterSemicolon': 'Punto y coma (;)',
  'batch.delimiterTab': 'Tabulación',
  'batch.delimiterPipe': 'Barra vertical (|)',
  'batch.template': 'Plantilla de cada pieza',
  'batch.from': 'Empezar en la pieza',
  'batch.fields': 'Campos disponibles',
  'batch.templateHint':
    '{1}, {2}… usan la columna por posición; { nombre } por el encabezado; {i} es el contador de piezas (con ceros a la izquierda: {i:03}); {total} es el tamaño del lote. {{ y }} escriben una llave.',
  'batch.refresh': 'Actualizar vista previa',
  'batch.forget': 'Olvidar lote',
  'batch.start': 'Iniciar lote',
  'batch.startFrom': 'Iniciar en la pieza {index}',
  'batch.open': 'Lote (CSV)…',
  'batch.openHint':
    'Graba una pieza por fila de una hoja (QR/código de barras con datos variables).',
  'batch.resume': '▶ Retomar lote',
  'batch.stop': 'Terminar lote',
  'batch.next': '▶ Siguiente pieza',
  'batch.nextHint':
    'Después de cambiar la pieza en la mesa, envía la siguiente del lote.',
  'batch.colPiece': 'Pieza',
  'batch.colContent': 'Contenido',
  'batch.info': '{pieces} piezas · {columns} columnas',
  'batch.infoHeader': 'con encabezado',
  'batch.warnDropped':
    '{count} filas quedaron fuera (límite de 2 000 piezas por lote).',
  'batch.warnTruncated': '{count} celdas se cortaron en 200 caracteres.',
  'batch.previewEmpty':
    'Pega o abre una hoja para ver la vista previa de las piezas.',
  'batch.err.empty':
    'La plantilla está vacía: indica qué debe contener cada pieza.',
  'batch.err.unclosed': 'Falta cerrar la llave en «{token}».',
  'batch.err.badColumn': 'La columna de «{token}» no existe en esta hoja.',
  'batch.err.unknownField':
    'El campo «{token}» no está en el encabezado de la hoja.',
  'batch.err.badCounter':
    'Contador inválido en «{token}»: usa {i} o {i:03} (1 a 12 dígitos).',
  'batch.err.connect': 'Conecta la máquina para iniciar el lote.',
  'batch.err.noPieces':
    'La hoja no tiene ninguna pieza (solo el encabezado o filas vacías).',
  'batch.err.moduleMissing': 'Módulo del lote no cargado.',
  'batch.loaded': 'Hoja «{name}» cargada: {pieces} piezas.',
  'batch.warnTooBigToSave':
    'Hoja demasiado grande para guardar: el lote no se retomará después de cerrar la app (abre el CSV de nuevo).',
  'batch.state.running': 'Grabando la pieza {index} de {total}.',
  'batch.state.waiting':
    'Pieza {index} de {total} lista. Cambia la pieza y envía la siguiente.',
  'batch.state.failed':
    'Pieza {index} de {total} interrumpida: {reason}. Cambia o reposiciona y usa «Empezar en la pieza».',
  'batch.state.done': 'Lote terminado: {total} piezas.',
  'batch.bar.running': 'Pieza {index} de {total} · {done} terminadas',
  'batch.bar.waiting': 'Pieza {index} de {total} lista — cambia la pieza',
  'batch.bar.failed': 'Pieza {index} de {total} interrumpida',
  'batch.hintRunning': 'Lote: pieza {index} de {total} en grabación.',
  'batch.hintWaiting':
    'Lote: pieza {index} de {total} lista. Cambia la pieza y pulsa «Siguiente pieza».',
  'batch.hintStored': 'Lote guardado: siguiente pieza {index} de {total}.',
  'batch.pieceStart': 'Lote: enviando la pieza {index} de {total}.',
  'batch.pieceDone': 'Lote: pieza {index} de {total} terminada.',
  'batch.pieceFailed': 'Lote detenido en la pieza {index} de {total}: {reason}',
  'batch.pieceAborted':
    'Lote detenido en la pieza {index}: {reason}. Cambia o reposiciona y usa «Empezar en la pieza».',
  'batch.done': 'Lote terminado: {total} piezas grabadas.',
  'batch.stopped':
    'Lote terminado en la pieza {index} de {total}. Usa «Retomar lote» para continuar.',
  'batch.resuming': 'Retomando el lote en la pieza {index} de {total}.',
  'batch.err.production':
    'Hay un modo producción en curso: termine la serie antes de iniciar el lote.',

  // ------------------------------------------- modo producción (RF-GC-12)
  'prod.title': 'Modo producción',
  'prod.copies': 'Copias',
  'prod.start': '▶ Producción',
  'prod.startN': '▶ Producción ({total}×)',
  'prod.hint':
    'Repite el programa actual N veces, pausando para cambiar la pieza. El pre-vuelo corre una vez y el programa no cambia a mitad de la serie.',
  'prod.next': '▶ Pieza siguiente',
  'prod.retry': '▶ Repetir pieza',
  'prod.nextHint':
    'Después de cambiar la pieza en la mesa, envía la siguiente.',
  'prod.retryHint':
    'La pieza se interrumpió: vuelve a posicionar y repite la misma.',
  'prod.stop': 'Terminar',
  'prod.stopHint': 'Termina el modo producción (la pieza en curso se cancela).',
  'prod.state.running': 'Producción: grabando la pieza {copy} de {total}.',
  'prod.state.waiting':
    'Pieza {copy} de {total} lista. Cambia la pieza y envía la siguiente.',
  'prod.state.failed':
    'Pieza {copy} de {total} interrumpida: {reason}. Vuelve a posicionar y repite la pieza.',
  'prod.state.done': 'Producción terminada: {total} piezas.',
  'prod.bar.running': 'Pieza {copy} de {total} · {done} terminadas',
  'prod.bar.waiting': 'Pieza {copy} de {total} lista — cambia la pieza',
  'prod.bar.failed': 'Pieza {copy} de {total} interrumpida',
  'prod.pieceStart': 'Producción: enviando la pieza {copy} de {total}.',
  'prod.pieceDone': 'Producción: pieza {copy} de {total} terminada.',
  'prod.done': 'Producción terminada: {total} piezas grabadas.',
  'prod.failed': 'Producción detenida en la pieza {copy} de {total}: {reason}.',
  'prod.stopped': 'Producción terminada en la pieza {copy} de {total}.',
  'prod.endedByProgram':
    'Producción terminada: el programa cambió en la pieza {copy} de {total}.',
  'prod.err.connect': 'Conecta la máquina para iniciar la producción.',
  'prod.err.noFile': 'Carga un G-code antes de iniciar la producción.',
  'prod.err.alarm': 'Sal del alarma antes de iniciar la producción.',
  'prod.err.batch':
    'Hay un lote en curso: termina el lote antes de iniciar la producción.',
  'prod.err.moduleMissing': 'Módulo del modo producción no cargado.',

  // -------------------------------------------- bienvenida / onboarding
  'tour.title': 'Bienvenido a GRBL Studio',
  'tour.step': 'Paso {n} de {total}',
  'tour.next': 'Siguiente',
  'tour.finish': 'Finalizar',
  'tour.skip': 'Omitir',
  'tour.dontShow': 'No mostrar en la próxima apertura',
  'tour.step1.title': 'Conecta la grabadora',
  'tour.step1.text':
    'Enciende la máquina, elige el puerto USB y pulsa Conectar. Sin conexión ' +
    'puedes abrir archivos y ver la vista previa, pero no grabar.',
  'tour.step1.where': 'Dónde: panel izquierdo → Conexión.',
  'tour.step2.title': 'Revisa el perfil de la máquina',
  'tour.step2.text':
    'Elige tu modelo (o Genérico GRBL). El perfil trae el área de trabajo, el ' +
    'límite de potencia y el módulo láser — de él sale la conversión de % a S.',
  'tour.step2.where': 'Dónde: panel izquierdo → Perfil de máquina.',
  'tour.step3.title': 'Abre el diseño',
  'tour.step3.text':
    'Imagen (PNG/JPG), SVG o G-code: usa Abrir o Importar SVG. Ajusta tamaño ' +
    'y posición — la esquina inferior izquierda del diseño es el origen (X0 Y0).',
  'tour.step3.where': 'Dónde: barra superior → Abrir / Importar SVG.',
  'tour.step4.title': 'Previsualiza antes de quemar',
  'tour.step4.text':
    'La vista previa muestra el recorrido y el tiempo estimado. Usa Marco ' +
    'para dibujar el contorno con el láser muy débil y comprobar el lugar.',
  'tour.step4.where': 'Dónde: vista previa → Marco / Contorno.',
  'tour.step5.title': 'Graba con seguridad',
  'tour.step5.text':
    'Ajusta potencia y velocidad, comprueba el modo (M4/M3) y pulsa Play. ' +
    'Pausa mantiene la posición; Parar cancela el trabajo. Nunca lo dejes solo.',
  'tour.step5.where': 'Dónde: barra del trabajo → Play / Pausa / Parar.',
  // ------------------------------------------------------- dibujo vectorial
  'design.title': 'Dibujar',
  'design.tool.select': 'Seleccionar (V)',
  'design.tool.rect': 'Rectángulo (R)',
  'design.tool.circle': 'Elipse (E)',
  'design.tool.line': 'Línea (L)',
  'design.tool.pen': 'Pluma (P)',
  'design.tool.node': 'Editar nodos (N)',
  'design.tool.text': 'Texto (T)',
  'design.delete': 'Eliminar (Supr)',
  'design.clear': 'Limpiar',
  'design.maximize': 'Maximizar/Restaurar',
  'design.undo': 'Deshacer (Ctrl+Z)',
  'design.redo': 'Rehacer (Ctrl+Y)',
  'design.snap': 'Ajuste',
  'design.objects': 'Objetos',
  'design.speed': 'Velocidad (mm/min)',
  'design.power': 'Potencia (%)',
  'design.passes': 'Pasadas',
  'design.mode': 'Modo',
  'design.text.placeholder': 'Texto…',
  'design.text.add': 'Añadir',
  'design.generate': 'Generar y previsualizar',
  'design.save': 'Guardar .gcode…',
  'design.status.generating': 'Generando el dibujo…',
  'design.status.done':
    'Dibujo generado. Revisa la vista previa y envía o guarda.',
  'design.prop.w': 'A',
  'design.prop.h': 'Al',
  'design.prop.rot': 'R',
  'design.lockAspect': 'Bloquear proporción',
  'design.zoom.in': 'Acercar (+)',
  'design.zoom.out': 'Alejar (-)',
  'design.zoom.fit': 'Ajustar a la página (F)',
  'design.align.left': 'Alinear a la izquierda',
  'design.align.center': 'Centrar horizontalmente',
  'design.align.right': 'Alinear a la derecha',
  'design.align.top': 'Alinear arriba',
  'design.align.middle': 'Centrar verticalmente',
  'design.align.bottom': 'Alinear abajo',
  'design.order.front': 'Traer al frente',
  'design.order.forward': 'Traer adelante',
  'design.order.backward': 'Enviar atrás',
  'design.order.back': 'Enviar al fondo',
  'design.group': 'Agrupar (Ctrl+G)',
  'design.ungroup': 'Desagrupar (Ctrl+Shift+G)',
  'design.duplicate': 'Duplicar (Ctrl+D)',
  'design.grid': 'Cuadrícula',
  'design.document': 'Documento',
  'design.doc.width': 'Ancho',
  'design.doc.height': 'Alto',
  'design.engraving': 'Grabado',
  'design.layers': 'Capas',
  'design.layer.defaultName': 'Capa {n}',
  'design.layer.name': 'Nombre de la capa',
  'design.layer.add': 'Nueva capa',
  'design.layer.delete': 'Eliminar capa',
  'design.layer.up': 'Subir capa',
  'design.layer.down': 'Bajar capa',
  'design.layer.mode': 'Modo de la capa',
  'design.layer.inherit': 'Heredar',
  'design.layer.power.hint':
    'Potencia de la capa (%) — vacío usa el valor de grabado',
  'design.layer.speed.hint':
    'Velocidad de la capa (mm/min) — vacío usa el valor de grabado',
  'design.layer.passes.hint':
    'Pasadas de la capa — vacío usa el valor de grabado',
  'design.layer.kerf.hint':
    'Holgura de corte (kerf) en mm: los contornos externos crecen y los agujeros se reducen a la mitad — la línea discontinua naranja muestra el recorrido real; vacío = sin compensación',
  'design.layer.cut': 'Corte: pestañas y sobrecorte',
  'design.layer.tabs.hint':
    'Pestañas de retención: cuántas “lengüetas” sujetan la pieza (0 = corte completo)',
  'design.layer.tabWidth.hint': 'Ancho de cada pestaña en mm (por defecto 2)',
  'design.layer.lead.hint':
    'Sobrecorte (lead-in/out) en mm: sigue más allá del origen para que la unión no quede con pico; se ignora cuando hay pestañas',
  'design.layer.assign': 'Mover selección',
  'design.layer.assigned': '{n} objeto(s) movido(s) a {name}.',
  'design.layer.needSelection': 'Selecciona al menos un objeto para mover.',
  'design.layer.deleted': 'Capa {name} eliminada.',
  'design.cancel': 'Cancelar',
  'design.text.title': 'Texto',
  'design.text.content': 'Texto',
  'design.text.font': 'Fuente',
  'design.text.size': 'Tamaño (mm)',
  'design.text.mode': 'Modo',
  'design.text.mode.vector': 'Vector (contorno)',
  'design.text.mode.stroke': 'Trazo único',
  'design.text.mode.fill': 'Relleno (sólido)',
  'design.text.spacing': 'Relleno (líneas/mm)',
  'design.text.unsupported':
    'Fuera de la fuente de trazo único (se vuelven "?"): {chars} — use el modo Vector para acentos.',
  'design.text.noFill': 'Módulo de relleno no cargado.',
  'design.text.bold': 'Negrita',
  'design.text.noContour': 'Módulo de contorno no cargado.',
  'design.sel.none': 'Ningún objeto seleccionado',
  'design.sel.one': '1 objeto seleccionado',
  'design.sel.blocks': '{n} objetos seleccionados',
  'design.sel.all': 'Los {n} objetos seleccionados',
  'design.obj.power': 'P',
  'design.obj.power.hint':
    'Potencia del objeto (%) — vacío usa el valor de grabado',
  'design.obj.speed': 'V',
  'design.obj.speed.hint':
    'Velocidad del objeto (mm/min) — vacío usa el valor de grabado',
  'design.obj.passes': 'N',
  'design.obj.kerf': 'K',
  'design.obj.tabs': 'Pestañas',
  'design.obj.tabWidth': 'Ancho',
  'design.obj.lead': 'Sobrecorte',
  'design.obj.passes.hint':
    'Pasadas del objeto — vacío usa el valor de grabado',
  'design.obj.width': 'E',
  'design.obj.width.hint':
    'Grosor del trazo (mm) — graba una banda centrada en el camino; vacío = trazo simple',
  'design.obj.widthPx': 'px',
  'design.obj.widthPx.hint':
    'Grosor del trazo en píxeles (1 px = 0,25 mm) — misma medida que el campo en mm',
  'design.style.copy': 'Copiar estilo (Ctrl+Shift+C)',
  'design.style.paste': 'Pegar estilo (Ctrl+Shift+V)',
  'design.style.copied': 'Estilo copiado.',
  'design.style.pasted': 'Estilo aplicado a la selección.',
  'design.style.none': 'Seleccione un objeto primero.',
  'design.style.empty': 'Ningún estilo copiado.',
  'design.mirror.h': 'Espejar en horizontal',
  'design.mirror.v': 'Espejar en vertical',
  'design.mirror.h.done': 'Selección espejada en horizontal.',
  'design.mirror.v.done': 'Selección espejada en vertical.',
  'design.distribute.h': 'Distribuir en horizontal',
  'design.distribute.v': 'Distribuir en vertical',
  'design.distribute.need3': 'Seleccione 3 o más objetos para distribuir.',
  'design.distribute.h.done': 'Espaciado igualado en horizontal.',
  'design.distribute.v.done': 'Espaciado igualado en vertical.',
  'design.array': 'Matriz de copias…',
  'design.array.title': 'Matriz de copias',
  'design.array.hint':
    'Repite la selección en columnas y filas, desplazando cada copia según el paso indicado.',
  'design.array.cols': 'Columnas',
  'design.array.rows': 'Filas',
  'design.array.stepX': 'Paso X (mm)',
  'design.array.stepY': 'Paso Y (mm)',
  'design.array.note':
    'El paso es la distancia entre la esquina de la pieza original y la de la copia. Use el tamaño del objeto (o un poco más) para que las copias queden lado a lado.',
  'design.array.create': 'Crear copias',
  'design.array.need2':
    'Indique más de una copia (columnas × filas mayor que 1).',
  'design.array.tooMany':
    'Demasiadas copias (máx. 1000). Reduzca columnas/filas.',
  'design.array.done': '{n} copia(s) creada(s).',
  'design.nest': 'Encajar en la chapa…',
  'design.nest.title': 'Encaje en la chapa',
  'design.nest.hint':
    'Distribuye las piezas en la chapa aprovechando el espacio. Sin selección, encaja todos los objetos del dibujo.',
  'design.nest.count': '{n} pieza(s) para encajar.',
  'design.nest.sheetW': 'Chapa — ancho (mm)',
  'design.nest.sheetH': 'Chapa — alto (mm)',
  'design.nest.margin': 'Margen (mm)',
  'design.nest.gap': 'Separación (mm)',
  'design.nest.rotate': 'Girar 90° cuando quepa mejor',
  'design.nest.note':
    'Las piezas se mueven a la chapa (esquina superior izquierda en el margen). Las que no quepan se quedan donde están y se avisan.',
  'design.nest.run': 'Encajar',
  'design.nest.none': 'No hay piezas para encajar.',
  'design.nest.tooBig':
    'Ninguna pieza cupo en la chapa. Aumente la chapa o reduzca margen/separación.',
  'design.nest.done': '{n} pieza(s) encajada(s) · aprovechamiento {pct} %.',
  'design.nest.unplaced': '{n} pieza(s) no cupieron en la chapa.',
  'design.doc.open.hint': 'Abrir un dibujo guardado (.gstudio) — Ctrl+O',
  'design.doc.save.hint':
    'Guardar el dibujo para abrirlo después (.gstudio) — Ctrl+S',
  'design.doc.untitled': 'Sin título',
  'design.doc.dirty': 'sin guardar',
  'design.doc.opened': 'Dibujo abierto: {name}.',
  'design.doc.saved': 'Dibujo guardado: {name}.',
  'design.doc.error.json': 'El archivo no es un JSON válido.',
  'design.doc.error.format': 'El archivo no es un dibujo de GRBL Studio.',
  'design.doc.error.version':
    'Este dibujo se guardó con una versión más nueva de la app. Actualice para abrirlo.',
  'design.doc.error.toobig': 'El archivo es demasiado grande para abrirlo.',
  'design.doc.replace.title': '¿Sustituir el dibujo?',
  'design.doc.replace.hint':
    'El dibujo actual tiene cambios sin guardar. Abrir otro documento los descarta.',
  'design.doc.replace.ok': 'Descartar y abrir',
  'design.bool.menu': 'Booleanas y contorno paralelo',
  'design.bool.union': 'Unir',
  'design.bool.subtract': 'Restar',
  'design.bool.difference': 'Sustracción',
  'design.bool.intersect': 'Intersección',
  'design.bool.intersection': 'Intersección',
  'design.bool.xor': 'Exclusión',
  'design.bool.unavailable':
    'Función de booleanas no disponible. Recompile la aplicación.',
  'design.bool.need2':
    'Seleccione 2 o más objetos cerrados (rectángulo, elipse o contorno de texto).',
  'design.bool.empty': 'La operación no dejó ninguna área. No se cambió nada.',
  'design.bool.failed': 'Falló la operación: {msg}',
  'design.bool.done': '{n} objeto(s) en el resultado.',
  'design.offset': 'Contorno paralelo…',
  'design.offset.hint':
    'Crea contornos paralelos a la forma seleccionada. La distancia positiva agranda la forma; la negativa la reduce.',
  'design.offset.dist': 'Distancia (mm)',
  'design.offset.passes': 'Pasadas',
  'design.offset.join': 'Esquinas',
  'design.offset.join.miter': 'En punta',
  'design.offset.join.round': 'Redondeadas',
  'design.offset.join.bevel': 'Achaflanadas',
  'design.offset.keep': 'Mantener la forma original',
  'design.offset.note':
    'Con más de una pasada salen anillos concéntricos: la segunda a dos distancias, la tercera a tres, y así sucesivamente.',
  'design.offset.need1':
    'Seleccione un objeto cerrado (rectángulo, elipse o contorno de texto).',
  'design.offset.zero': 'Indique una distancia distinta de cero.',
  'design.offset.empty':
    'Ningún contorno cabía en esa distancia. Agrande la forma o reduzca la distancia.',
  'design.offset.done': '{n} contorno(s) creado(s).',
  'design.offset.create': 'Crear contornos',
  'design.objects.empty': 'Aún no hay objetos.',
  'design.kind.rect': 'Rectángulo',
  'design.kind.ellipse': 'Elipse',
  'design.kind.line': 'Línea',
  'design.kind.polygon': 'Forma',
  'design.kind.text': 'Texto',
  'design.kind.symbol': 'Símbolo',
  'design.tool.symbol': 'Símbolo (Q)',
  'design.symbol.title': 'Símbolo',
  'design.symbol.type': 'Tipo',
  'design.symbol.barcode': 'Código de barras',
  'design.symbol.symbology': 'Simbología',
  'design.symbol.ecc': 'Corrección (QR)',
  'design.symbol.content': 'Contenido',
  'design.symbol.contentPlaceholder': 'Texto, URL, clave…',
  'design.symbol.size': 'Tamaño (mm)',
  'design.symbol.width': 'Ancho (mm)',
  'design.symbol.lines': 'Líneas de barrido por mm',
  'design.symbol.hri': 'Texto legible (HRI)',
  'design.symbol.add': 'Añadir',
  'design.symbol.update': 'Aplicar',
  'design.status.symbolEmpty': 'Escribe el contenido del símbolo.',
  'design.status.symbolFail': 'No se pudo generar el símbolo: {msg}',
  'design.status.symbolAdd': '{name} añadido ({w} × {h} mm).',
  'design.status.symbolUpdate': '{name} actualizado ({w} × {h} mm).',
  'design.status.hint':
    'Dibuja con las herramientas de la izquierda. Rueda del ratón = zoom; botón central = mover la vista. El grabado empieza en X0 Y0 (esquina inferior izquierda del dibujo): posiciona el láser y define el origen donde va a quemar.',
  'design.status.needShape': 'Dibuja al menos una forma.',
  'design.status.textEmpty': 'Escribe el texto.',
  'design.status.textFail': 'No se pudo generar el texto.',
  'design.status.copied': '{n} objeto(s) copiado(s).',
  'design.status.grouped': 'Objetos agrupados.',
  'design.status.ungrouped': 'Objetos desagrupados.',
  'design.status.undo': 'Deshecho.',
  'design.status.redo': 'Rehecho.',
  'design.size.title': 'Tamaño de la obra',
  'design.size.width': 'Ancho (mm)',
  'design.size.height': 'Alto (mm)',
  'design.size.current': 'Tamaño actual: {w} × {h} mm',
  'design.size.note':
    'Rellena un lado y el otro se ajusta a la misma proporción. Desbloquea el candado para redimensionar libremente.',
  'design.cost.title': 'Coste de la pieza',
  'design.cost.currencyHint': 'Moneda usada en el coste',
  'design.cost.rate': 'Máquina / hora',
  'design.cost.material': 'Material / m²',
  'design.cost.result':
    '≈ {time} · {total} (máquina {machine} + material {material})',
  'design.cost.resultTimeOnly':
    '≈ {time} · indica la tarifa de la máquina y el precio del material',
  'design.cost.noTime': 'Sin tiempo estimado para este tamaño.',
  'design.tiles': 'Dividir en tiles…',
  'design.tiles.title': 'Dividir en tiles',
  'design.tiles.w': 'Ancho del tile (mm)',
  'design.tiles.h': 'Alto del tile (mm)',
  'design.tiles.overlap': 'Solape (mm)',
  'design.tiles.note':
    'Cada programa empieza en la esquina inferior izquierda de su ventana: recoloca el material y el cero antes de cada tile.',
  'design.tiles.summary':
    '{cols} × {rows} = {n} tiles · ventana {w} × {h} mm · solape {ov} mm',
  'design.tiles.fits': 'La obra cabe en una ventana: 1 tile.',
  'design.tiles.tooMany':
    'Demasiados tiles ({max} como máximo): aumenta la ventana o reduce el solape.',
  'design.tiles.save': 'Guardar tiles…',
  'design.tiles.saved': '{n} archivo(s) de tile guardados en {dir}',
  'design.tiles.empty': 'Ningún tile tiene corte.',
  'design.size.invalid': 'Indica ancho y alto mayores que cero.',

  // ------------------------------------------------- ejecución y archivo
  'run.title': 'Ejecución',
  'file.open': 'Abrir G-code…',
  'file.none': 'Ningún archivo cargado',
  'file.loaded': 'Archivo cargado: {name} ({lines} líneas)',
  'file.info': '{name} — {lines} líneas · {size}',
  'file.infoTime': '{name} — {lines} líneas · {size} · ~{time}',
  'file.infoGenerated':
    '{file} — {lines} líneas · {size} (generado de {image})',
  'file.infoGeneratedTime':
    '{file} — {lines} líneas · {size} · ~{time} (generado de {image})',
  'file.saved': 'G-code guardado en {path}',

  // ------------------------------------------------ editor de G-code (P1.10)
  'ged.open': 'Editar…',
  'ged.openHint': 'Ver, validar y reenviar un tramo del G-code',
  'ged.title': 'Editor de G-code',
  'ged.validate': 'Validar',
  'ged.validating': 'Validando…',
  'ged.undo': 'Deshacer',
  'ged.save': 'Guardar .gcode…',
  'ged.editLine': 'Editar línea',
  'ged.insertLine': 'Insertar debajo',
  'ged.removeLine': 'Quitar',
  'ged.sendFrom': '▶ Enviar desde aquí',
  'ged.sendSel': '▶ Enviar tramo',
  'ged.line': 'Línea {n} de {total}',
  'ged.selection': 'líneas {from}–{to} ({count} seleccionadas)',
  'ged.summary':
    '{lines} líneas · {commands} comandos · {moves} movimientos · {comments} comentarios',
  'ged.summaryMaxS':
    '{lines} líneas · {commands} comandos · {moves} movimientos · {comments} comentarios · S máx. {smax}',
  'ged.locked':
    'Grabación en curso: edición y reenvío bloqueados hasta terminar.',
  'ged.empty': 'Ningún G-code cargado para editar.',
  'ged.edited': 'editado',
  'ged.saved': 'G-code guardado en {path}',
  'ged.saveFail': 'No se pudo guardar: {msg}',
  'ged.validOk': 'Pre-vuelo: sin hallazgos.',
  'ged.validIssues':
    'Pre-vuelo: {block} bloqueo(s) · {warn} aviso(s) · {info} información(es).',
  'ged.sendFromLog': 'Enviando desde la línea {line}…',
  'ged.sendSelLog': 'Enviando las líneas {from}–{to}…',
  'ged.noConn': 'Conecte la máquina para enviar.',

  // ----------------------------------------------- biblioteca de jobs (P2.9)
  'joblib.title': 'Biblioteca de jobs',
  'joblib.open': 'Biblioteca…',
  'joblib.openHint': 'Últimos programas ejecutados — reejecutar o duplicar',
  'joblib.empty':
    'Ningún job todavía. Los últimos 50 programas ejecutados aparecen aquí, con miniatura.',
  'joblib.count': '{count} de {max} jobs',
  'joblib.clear': 'Borrar todo',
  'joblib.confirm': 'Confirmar',
  'joblib.clearConfirm': '¿Quitar los {count} jobs de la biblioteca?',
  'joblib.run': 'Reejecutar',
  'joblib.duplicate': 'Duplicar',
  'joblib.duplicateHint':
    'Carga una copia como programa actual (ajústala antes de grabar)',
  'joblib.remove': 'Quitar',
  'joblib.removeConfirm': '¿Quitar “{name}” de la biblioteca?',
  'joblib.removed': 'Job quitado de la biblioteca.',
  'joblib.cleared': 'Biblioteca de jobs vaciada.',
  'joblib.loaded': 'Copia cargada: {name} ({lines} líneas).',
  'joblib.unavailable': 'El programa de este job no está guardado.',
  'joblib.error': 'Biblioteca de jobs: {msg}',
  'joblib.meta': '{date} · {lines} líneas · {size}',
  'joblib.metaTime': '{date} · {lines} líneas · {size} · ~{time}',
  'joblib.noProgram': 'sin programa guardado',
  'joblib.source.file': 'Archivo',
  'joblib.source.image': 'Imagen',
  'joblib.source.design': 'Diseño',
  'joblib.source.library': 'Biblioteca',
  'joblib.offline': 'Conecte la máquina para reejecutar.',
  'joblib.recording':
    'Este job entra en la biblioteca al terminar la grabación.',
  'dxf.loaded':
    'DXF importado: {contours} contorno(s), {width} × {height} mm (unidad de origen: {unit})',
  'dxf.hidden': 'DXF: {n} entidad(es) en capas ocultas ignorada(s).',
  'dxf.ignored': 'DXF: {n} entidad(es) no soportada(s) ignorada(s): {types}.',
  'dxf.empty':
    'Ninguna geometría reconocida en el DXF (texto, hatch y dimensiones no se convierten).',
  'dxf.binary':
    'El DXF binario no es compatible. Exporte el archivo como DXF ASCII.',
  'dxf.moduleMissing': 'Módulo de importación DXF no cargado.',
  'pdf.loaded':
    'PDF importado: {contours} contorno(s), {width} × {height} mm ({pages} página(s)).',
  'pdf.pages': 'El PDF tiene {pages} páginas; importé solo la primera.',
  'pdf.text':
    'PDF con texto: las fuentes no se convierten en curvas, así que el texto no se importó.',
  'pdf.images':
    'PDF: {n} imagen(es) de mapa de bits ignorada(s) — solo se convierten vectores.',
  'pdf.empty': 'No se encontró ningún trazado vectorial en el PDF.',
  'pdf.encrypted': 'El PDF protegido (cifrado) no es compatible.',
  'pdf.damaged': 'No se pudo leer el PDF (archivo dañado o no compatible).',
  'pdf.moduleMissing': 'Función de importación de PDF no disponible.',
  'pdf.unsupported': 'PDF: {types} no compatible(s) — sección ignorada.',
  'gcode.summary':
    'G-code generado: {lines} líneas, {size}, {rows}×{cols} muestras, ~{time}',
  'run.play': '▶ Iniciar',
  'run.pause': '⏸ Pausar',
  'run.resume': '▶ Reanudar',
  'run.cancel': '⏹ Cancelar',
  'run.cancel.title':
    'Cancela el trabajo y detiene la máquina ahora (Esc / Ctrl+X)',
  'run.jobbar.label': 'Controles del grabado',
  'run.state.engraving': 'Grabando…',
  'run.state.paused': 'Pausado',
  'run.hint.noFileNoConn':
    'Genere el G-code (Imagen → G-code) o abra un .gcode y conecte la máquina para enviar.',
  'run.hint.noFile':
    'Ningún G-code cargado: genere uno en «Imagen → G-code» o abra un archivo .gcode.',
  'run.hint.readyNoConn':
    'G-code listo ({lines} líneas). Conecte la máquina en «Serial» para enviar.',
  'run.hint.sending': 'Enviando a la máquina…',
  'run.hint.ready':
    'Listo para enviar ({lines} líneas). Haga clic en ▶ Iniciar.',
  'run.noGcode': 'Ningún G-code cargado',
  'job.finished': 'Trabajo terminado.',
  'job.aborted': 'Trabajo abortado: {reason}',

  // ------------------------------------------------------------- reanudación
  'resume.title': 'Reanudación (RF-GC-7)',
  'resume.hint':
    'Interrumpa un trabajo para ver el punto de reanudación. Al continuar, la app reafirma las unidades, la distancia, los offsets y el láser antes de la línea.',
  'resume.line': 'Línea',
  'resume.back': 'Atrás',
  'resume.suggest': 'Sugerir (N antes)',
  'resume.suggestTitle': 'Sugiere done − retroceso',
  'resume.start': '▶ Reanudar desde aquí',
  'resume.interrupted':
    'Interrumpido en la línea {done} de {total}. Sugerencia: {suggestion}.',
  'resume.done': 'Trabajo terminado ({lines} líneas).',
  'resume.idle': 'Interrumpa un trabajo para ver el punto de reanudación.',
  'resume.resuming': 'Reanudando desde la línea {line}…',

  // --------------------------------------------------------------- macros
  'macro.title': 'Macros (RF-MAC-1)',
  'macro.hint':
    'Conéctese para usar las macros. Los comandos se encolan uno a uno.',
  'macro.manage': 'Gestionar macros (importar/exportar)',
  'macro.add': 'Añadir',
  'macro.reset': 'Restaurar predeterminados',
  'macro.new': 'Nueva macro',
  'macro.run': 'Macro: {label}',
  'macro.notConnected': 'Conéctese a la máquina para ejecutar la macro.',
  'macro.labelPlaceholder': 'Etiqueta',
  'macro.remove': 'Eliminar macro',
  'macro.gcodePlaceholder': 'G-code (una línea por comando)',
  'macro.exported': 'Macros exportadas: {path}',
  'macro.imported': 'Macros importadas ({count}).',
  'macro.invalid': 'Macros no válidas: {msg}',
  'macro.openFail': 'Fallo al abrir macros: {msg}',
  'macro.exportFail': 'Fallo al exportar macros: {msg}',
  'macro.def.unlock': 'Desbloquear ($X)',
  'macro.def.home': 'Home ($H)',
  'macro.def.report': 'Informar estado ($G)',
  'macro.def.goto-zero': 'Ir a cero (X0 Y0)',
  'macro.def.set-zero': 'Definir cero aquí',
  'macro.def.laser-off': 'Láser apagado',
  'macro.def.abs-mm': 'Absoluto en mm',
  'macrogroup.preparacao': 'Preparación',
  'macrogroup.origem': 'Origen',
  'macrogroup.laser': 'Láser',
  'macrogroup.controle': 'Control',
  'macrogroup.outros': 'Otros',

  // ------------------------------------------------------------ status/un.
  'status.feed': 'Feed',
  'status.units': 'Unidad',
  'status.unitsTitle': 'Unidades de visualización (RF-APP-3)',
  'status.error': 'Error',
  'status.idle': 'Inactivo',
  'status.run': 'Ejecutando',
  'status.jog': 'Manual',
  'status.hold': 'Pausado',
  'status.alarm': 'Alarma',
  'status.door': 'Puerta',
  'status.check': 'Verificación',
  'status.home': 'Home',
  'status.sleep': 'Reposo',
  'status.pins': 'Pines',
  'status.pinsHint': 'Pines activos informados por la máquina (Pn).',
  'status.pinsUnknown':
    'La máquina no informa pines en este firmware (máscara de estado $10). Ver el panel Máquina.',

  // -------------------------------------------------------------- preview
  'preview.hint.image': 'Cargue una imagen para preparar el archivo de grabado',
  'preview.hint.empty':
    'Abra un G-code o inicie un trabajo para ver el recorrido.',
  'preview.hint.noMoves': 'Este G-code no tiene movimientos que dibujar.',
  'preview.cut': 'Quemado',
  'preview.pass': 'Pasada {n}/{total}',
  'preview.rapid': 'Desplazamiento',
  'preview.workArea': 'Área de trabajo', // referencia, no forma parte del job
  'preview.tip':
    'rueda: zoom · arrastrar: mover · clic: mover · doble clic: ajustar',

  'preview.moveTitle': '¿Mover hasta aquí?',
  'preview.moveCoords': 'X {x} · Y {y}',
  'preview.moveNote': 'en el sistema de coordenadas activo',
  'preview.moveGo': 'Mover (G0)',
  'preview.moveCancel': 'Cancelar',
  'preview.moveBlocked': 'No se puede mover: {why}.',
  'preview.moveWhy.offline': 'conecte la máquina',
  'preview.moveWhy.alarm': 'la máquina está en alarma o con la puerta abierta',
  'preview.moveWhy.job': 'hay un job en curso',
  'preview.simulate': 'Simular',
  'preview.warning.area':
    '⚠ El recorrido excede el área configurada ({width}×{height} mm): {problems}.',
  'preview.area.negative': 'coordenadas negativas',
  'preview.area.xMax': 'X hasta {value} > $130',
  'preview.area.yMax': 'Y hasta {value} > $131',

  // -------------------------------------------------------------- consola
  'console.placeholder':
    'Escriba un comando GRBL y pulse Intro (ej.: $$, $G, G0 X0 Y0)',

  // ------------------------------------------------- ajustes ($$)
  'settings.open': 'Ajustes de la máquina ($$)',
  'settings.title': 'Ajustes de la máquina',
  'settings.read': 'Leer $$',
  'settings.filter': 'Filtrar por nombre o clave…',
  'settings.connectFirst': 'Conéctese a la máquina para leer los ajustes.',
  'settings.connectQuery': 'Conéctese a la máquina para consultar.',
  'settings.querying': 'Consultando…',
  'settings.noResponse': 'Sin respuesta.',
  'settings.fail': 'Fallo: {msg}',
  'settings.reading': 'Leyendo $$…',
  'settings.count': '{count} parámetros leídos.',
  'settings.empty': 'La máquina no devolvió ajustes.',
  'settings.readFail': 'Fallo al leer $$: {msg}',
  'settings.filterEmpty': 'Ningún parámetro coincide con el filtro.',
  'settings.groupOther': 'Otros',
  'settings.applying': 'Aplicando {key}…',
  'settings.updated': '{key} actualizado.',
  'settings.applyFail': 'Fallo al aplicar {key}: {msg}',
  'settings.value': 'Valor de {key}',
  'settings.fallbackName': 'Ajuste {key}',
  'settings.fallbackHelp':
    'Parámetro del firmware sin descripción en esta app.',
  'settings.invalid': 'Ajuste no válido.',
  'settings.unknownQuery': 'Consulta desconocida.',

  // ---------------------------------------------------------- validación
  'validate.empty': 'Indique un valor.',
  'validate.nan': 'Se esperaba un valor numérico.',
  'validate.int': 'Use un número entero.',
  'validate.min': 'Valor mínimo: {min}.',
  'validate.max': 'Valor máximo: {max}.',

  // --------------------------------------- grupos de los ajustes $$
  'setgroup.passo-e-direcao': 'Paso y dirección',
  'setgroup.relatorio': 'Informe',
  'setgroup.limites': 'Límites',
  'setgroup.homming': 'Homming',
  'setgroup.spindle-laser': 'Spindle/Laser',
  'setgroup.eixo-x': 'Eje X',
  'setgroup.eixo-y': 'Eje Y',
  'setgroup.eixo-z': 'Eje Z',
  'setgroup.outros': 'Otros',

  // ------------------------------------- nombres/ayuda de los ajustes $$
  'set.0.name': 'Ancho del pulso de paso',
  'set.0.help':
    'Duración del pulso STEP (µs). Ajuste para drivers lentos; el predeterminado (10 µs) cubre la mayoría.',
  'set.1.name': 'Retardo ocioso del paso',
  'set.1.help':
    'Tiempo (ms) que el motor permanece energizado tras detenerse. 255 = siempre activo; 0 = se apaga de inmediato.',
  'set.2.name': 'Invertir pulso de paso',
  'set.2.help':
    'Máscara (bits) que invierte la señal del pulso. Use 0 si el eje no se mueve.',
  'set.3.name': 'Invertir dirección',
  'set.3.help': 'Máscara para invertir el sentido del eje (X=1, Y=2, Z=4).',
  'set.4.name': 'Invertir enable del driver',
  'set.4.help': 'Invierte el pin de habilitación del driver de paso.',
  'set.5.name': 'Invertir pines de límite',
  'set.5.help': 'Invierte la lectura de los finales de carrera.',
  'set.6.name': 'Invertir pin de sonda',
  'set.6.help': 'Invierte la lectura de la sonda (probe).',
  'set.10.name': 'Máscara del informe de estado',
  'set.10.help':
    'Elige lo que informa el `?`. Predeterminado 3 (posición de máquina y de trabajo).',
  'set.11.name': 'Desviación de unión',
  'set.11.help':
    'Controla el suavizado entre segmentos. Mayor = esquinas más anchas; predeterminado 0.010 mm.',
  'set.12.name': 'Tolerancia de arco',
  'set.12.help':
    'Error máximo al aproximar arcos por segmentos. Menor = más preciso y más G-code. 0.002 mm.',
  'set.13.name': 'Informar en pulgadas',
  'set.13.help':
    'Si está activo, el estado y los valores se informan en pulgadas (no cambia el G-code).',
  'set.20.name': 'Soft limits',
  'set.20.help':
    'Bloquea movimientos que excederían el recorrido ($130/$131). Requiere homing previo.',
  'set.21.name': 'Hard limits',
  'set.21.help': 'Se detiene al activar los finales de carrera físicos.',
  'set.22.name': 'Ciclo de homing',
  'set.22.help':
    'Habilita la rutina de origen (`$H`). Desactívelo si no hay finales de carrera.',
  'set.23.name': 'Inversión de la dirección de homing',
  'set.23.help':
    'Invierte la dirección en que la máquina busca el final de carrera de home.',
  'set.24.name': 'Feed del homing',
  'set.24.help': 'Velocidad final de aproximación del homing.',
  'set.25.name': 'Búsqueda lenta del homing',
  'set.25.help':
    'Velocidad de búsqueda rápida hasta la primera detección del final de carrera.',
  'set.26.name': 'Debounce del final de carrera',
  'set.26.help':
    'Tiempo de estabilización del fin de carrera. Predeterminado 250 ms.',
  'set.27.name': 'Retracción del homing',
  'set.27.help':
    'Distancia que retrocede tras tocar el fin de carrera del homing.',
  'set.30.name': 'RPM máximas del spindle',
  'set.30.help':
    'Escala el S máximo. Use 1000 para láser en lugar de RPM; el S va de 0 a este valor.',
  'set.31.name': 'RPM mínimas del spindle',
  'set.31.help':
    'Valor mínimo en que el spindle/relé se activa. En láser suele ser 0.',
  'set.32.name': 'Modo láser',
  'set.32.help':
    '1 = M4 dinámico (potencia con la velocidad) y permite mover sin quemar. 0 = spindle.',
  'set.100.name': 'Pasos/mm del eje X',
  'set.100.help':
    'Calibración: cuántos pasos hacen 1 mm. Motor de 200 pasos, 16 micro, 2 mm/paso → 1600.',
  'set.101.name': 'Pasos/mm del eje Y',
  'set.101.help': 'Calibración: cuántos pasos hacen 1 mm.',
  'set.102.name': 'Pasos/mm del eje Z',
  'set.102.help': 'Calibración: cuántos pasos hacen 1 mm.',
  'set.110.name': 'Velocidad máxima X',
  'set.110.help':
    'Rate (mm/min) que el eje X alcanza en camino de reposo. No es el uso; es la capacidad.',
  'set.111.name': 'Velocidad máxima Y',
  'set.111.help': 'Rate máximo del eje Y.',
  'set.112.name': 'Velocidad máxima Z',
  'set.112.help': 'Rate máximo del eje Z.',
  'set.120.name': 'Aceleración X',
  'set.120.help':
    'Aceleración en mm/s². Demasiado alta pierde pasos; demasiado baja deja el trabajo lento.',
  'set.121.name': 'Aceleración Y',
  'set.121.help': 'Aceleración en mm/s².',
  'set.122.name': 'Aceleración Z',
  'set.122.help': 'Aceleración en mm/s².',
  'set.130.name': 'Recorrido máximo X',
  'set.130.help':
    'Longitud útil del eje X. Se usa en los límites suaves y en el aviso de área de trabajo.',
  'set.131.name': 'Recorrido máximo Y',
  'set.131.help':
    'Longitud útil del eje Y. Se usa en los límites suaves y en el aviso de área de trabajo.',
  'set.132.name': 'Recorrido máximo Z',
  'set.132.help': 'Longitud útil del eje Z.',

  // ------------------------------------------------ estadísticas y tiempo
  'stats.format':
    '{rows} líneas × {cols} muestras · {segments} segmentos · {size} · ~{time}',
  'stats.contours': ' · {count} contornos',
  'time.sec': '{s} s',
  'time.minSec': '{m} min {r} s',
  'time.min': '{m} min',

  // --------------------------------------------------------- errores (UI)
  'err.listPorts': 'Fallo al listar puertos: {msg}',
  'err.connect': 'Error al conectar: {msg}',
  'err.openFile': 'Fallo al abrir el archivo: {msg}',
  'err.worker': 'Worker de imagen no disponible: {msg}',
  'err.workerUnknown': 'Error en el worker de imagen: {msg}',
  'err.generate': 'Fallo al generar G-code: {msg}',
  'err.save': 'Fallo al guardar: {msg}',
  'err.areaExceeded':
    'Aviso: el recorrido excede el área de trabajo ({problems}).',
  'err.connectForFrame': 'Conecte la máquina para usar el posicionamiento.',
  'err.noSerialPort':
    'No se encontró ningún puerto serie. Conecte el grabador e inténtelo de nuevo.',
  'err.prefix': 'Error: {msg}',
  'err.unknown': 'desconocido',

  // ---------------------------------- mensajes del proceso main (cliente)
  'client.connClosed': 'Conexión cerrada.',
  'client.connClosedWith': 'Conexión cerrada: {msg}',
  'client.queryClosed': 'La conexión se cerró antes de la respuesta.',
  'client.queryNotConnected': 'Conéctese a la máquina para consultar.',
  'client.queryBusy': 'Ya hay una consulta en curso.',
  'client.queryTimeout': 'La máquina no respondió a "{line}" en {ms} ms.',
  'client.notConnected': 'No conectado.',
  'client.jobRunning': 'Ya hay un trabajo en ejecución.',
  'client.stopped': 'Detenido por el usuario.',
  'client.queryJobStarted':
    'Consulta cancelada: un job comenzó mientras seguía en la cola.',
  'client.jogDollarUnsupported':
    'Este firmware no implementa el jog dedicado ($J=). Se rechazó "{line}"; se moverá con G91/G0/G90.',
  'client.queryRetry':
    'La máquina rechazó la primera lectura tras conectar ("{line}") — reintentando una vez.',
  'client.linkLost':
    'La máquina dejó de responder (sin estado durante {ms} ms) — el puerto probablemente se cayó. Reconecte para continuar.',
  'client.lineTooLong':
    'Línea demasiado larga ({bytes} B) para el búfer de la máquina ({max} B) — envío detenido para no corromper el G-code. Extracto: {line}',
  'client.reset': 'Reset por el usuario.',
  'client.writeFail': 'Fallo al escribir en la serie: {msg}',
  'client.stall':
    'La máquina no respondió en {ms} ms esperando "ok". Envío en pausa — compruebe la conexión.',

  // -------------------------------------- diálogos nativos (main -> SO)
  'filter.macros': 'Macros (JSON)',
  'filter.all': 'Todos los archivos',
  'dlg.openImage': 'Abrir imagen',
  'dlg.openGcode': 'Abrir G-code',
  'dlg.openLbdev': 'Abrir perfil de LightBurn (.lbdev)',
  'dlg.openCsv': 'Abrir hoja del lote (CSV/TSV)',
  'dlg.openSvg': 'Abrir SVG',
  'dlg.openDxf': 'Abrir DXF',
  'dlg.openPdf': 'Abrir PDF',
  'dlg.saveTiles': 'Guardar tiles',
  'dlg.tooManyFiles': 'Demasiados archivos a la vez (máximo {max})',
  'dlg.saveGcode': 'Guardar G-code',
  'dlg.importMacros': 'Importar macros',
  'dlg.exportMacros': 'Exportar macros',
  'dlg.open': 'Abrir',
  'dlg.import': 'Importar',
  'dlg.notFile': 'La ruta elegida no es un archivo.',
  'dlg.imageTooBig': 'Imagen demasiado grande ({size}). Límite: {limit}.',
  'dlg.fileTooBig': 'Archivo demasiado grande ({size}). Límite: {limit}.',
  'dlg.tooBig': 'Archivo demasiado grande ({size}).',
  'dlg.missingContent': 'Falta el contenido del G-code.',
  'dlg.missingMacros': 'Falta el contenido de las macros.',
  'dlg.openDesign': 'Abrir dibujo',
  'dlg.saveDesign': 'Guardar dibujo',
  'dlg.importPresets': 'Importar presets de material',
  'dlg.exportPresets': 'Exportar presets de material',
  'dlg.missingPresets': 'Falta el contenido de los presets.',

  // ----------------------------------------- alarmas del GRBL 1.1 (ALARM:n)
  'alarm.1':
    'Hard limit activado. Posición probablemente perdida — se recomienda re-homing.',
  'alarm.2':
    'Soft limit: el destino del movimiento excede el recorrido de la máquina. Puede desbloquearse con seguridad.',
  'alarm.3':
    'Reset durante el movimiento. Posición probablemente perdida — se recomienda re-homing.',
  'alarm.4':
    'Fallo de sonda: estado inicial inesperado antes del ciclo de sondeo.',
  'alarm.5':
    'Fallo de sonda: la sonda no tocó la pieza dentro del recorrido programado.',
  'alarm.6': 'Fallo de homing: reset durante el ciclo de homing.',
  'alarm.7': 'Fallo de homing: puerta de seguridad abierta durante el homing.',
  'alarm.8':
    'Fallo de homing: el final de carrera no se liberó al retroceder (aumente el pull-off/compruebe el cableado).',
  'alarm.9':
    'Fallo de homing: final de carrera no encontrado en la distancia de búsqueda.',

  // ------------------------------------------- erros do GRBL 1.1 (error:n)
  'error.1': 'Palabra G-code no válida: letra no encontrada.',
  'error.2': 'Formato numérico no válido o valor ausente.',
  'error.3': 'Comando de sistema "$" no reconocido o no admitido.',
  'error.4': 'Valor negativo recibido donde se esperaba uno positivo.',
  'error.5': 'El ciclo de homing no está habilitado en los ajustes ($22).',
  'error.6': 'El tiempo mínimo del pulso de paso debe ser mayor que 3 µs.',
  'error.7':
    'Fallo de lectura de la EEPROM. Reset a los valores predeterminados.',
  'error.8': 'El comando "$" solo puede usarse en estado IDLE.',
  'error.9': 'G-code bloqueado durante estado de alarma o jog.',
  'error.10': 'Los soft limits no pueden habilitarse sin homing habilitado.',
  'error.11': 'Máximo de caracteres por línea excedido; la línea fue ignorada.',
  'error.12': 'El valor de ajuste "$" excede la tasa de paso máxima admitida.',
  'error.13': 'Puerta de seguridad abierta; estado de door iniciado.',
  'error.14': 'Build info/startup excedió el límite de línea de la EEPROM.',
  'error.15':
    'El destino del jog excede el recorrido de la máquina; comando ignorado.',
  'error.16': 'Comando de jog sin "=" o que contiene g-code prohibido.',
  'error.17': 'El modo láser requiere salida PWM ($32=1).',
  'error.20': 'Comando G-code no admitido o no válido.',
  'error.21': 'Más de un comando del mismo grupo modal en la línea.',
  'error.22': 'Feed rate no definido.',
  'error.23': 'El comando G-code requiere un valor entero.',
  'error.24':
    'Dos comandos que requieren las mismas palabras de eje en la línea.',
  'error.25': 'Palabra G-code repetida en la línea.',
  'error.26':
    'No se encontró ninguna palabra de eje para el comando/estado modal.',
  'error.27': 'Número de línea (N) fuera del rango válido.',
  'error.28': 'Faltan valores obligatorios (P/L) para el comando.',
  'error.29': 'Sistema de coordenadas de trabajo no admitido.',
  'error.30': 'G53 requiere un modo de movimiento (G0/G1) activo.',
  'error.31': 'Comando enviado sin un valor P o L obligatorio.',
  'error.32': 'Comando no admitido en esta configuración de firmware.',
  'error.unknown': 'Error {code} (código no catalogado).',
  'alarm.unknown': 'Alarma {code} (código no catalogado).',

  // ------------------------------------------------- materiales (RF-IMG-8)
  'mat.papel-kraft': 'Papel kraft',
  'mat.compensado': 'Contrachapado',
  'mat.madeira-solida': 'Madera maciza',
  'mat.bambu': 'Bambú',
  'mat.folha-de-aluminio': 'Lámina de aluminio',
  'mat.cortica': 'Corcho',
  'mat.couro': 'Cuero',
  'mat.silicagel': 'Silicagel',
  'mat.feltro-escuro': 'Fieltro oscuro',
  'mat.lata-tin-plate': 'Lata (hojalata)',
  'mat.tabua-de-madeira': 'Tabla de madera',
  'mat.madeira-macica': 'Madera maciza',
  'mat.vidro': 'Vidrio',
  'mat.ceramica': 'Cerámica',
  'mat.acrilico': 'Acrílico',
  'mat.aco-inoxidavel': 'Acero inoxidable',
  'mat.metal-anodizado': 'Metal anodizado',
  'mat.tecido': 'Tela',
  'mat.tabua-2-mm': 'Tabla 2 mm',
  'mat.tabua-3-mm': 'Tabla 3 mm',
  'mat.tabua-4-mm': 'Tabla 4 mm',
  'mat.papelao': 'Cartón',
  'mat.tabua-7-mm': 'Tabla 7 mm',
  'mnote.passadas-1-m4': 'Pasadas: 1. M4.',
  'mnote.ajustes-padrao': 'Ajustes predeterminados.',
  'mnote.garanta-o-material-bem-plano-e-fixado':
    'Asegúrese de que el material esté bien plano y sujeto.',
  'mnote.a-superficie-deve-ser-pintada-de-preto-ou-coberta-com-papel-de-transferencia-termica':
    'La superficie DEBE estar pintada de negro o cubierta con papel de transferencia térmica.',
  'mnote.a-superficie-deve-receber-papel-de-transferencia-termica':
    'La superficie DEBE llevar papel de transferencia térmica.',
  'mnote.acrilico-transparente-exige-pintar-de-preto-a-face-inferior-superior':
    'El acrílico transparente requiere pintar de negro la cara inferior/superior.',
  'mnote.acrilico-transparente-exige-pintar-a-superficie-de-preto':
    'El acrílico transparente requiere pintar la superficie de negro.',
  'mnote.marcacao-direta': 'Marcado directo.',
  'mnote.marcacao-direta-sobre-a-superficie-bruta':
    'Marcado directo sobre la superficie en bruto.',
  'mnote.remocao-direta-do-revestimento-anodizado':
    'Eliminación directa del recubrimiento anodizado.',
  'mnote.potencia-menor-evita-queimar-e-desfiar-as-bordas':
    'Una potencia menor evita quemar y deshilachar los bordes.',
  'mnote.passadas-1': 'Pasadas: 1.',
  'mnote.reduza-um-pouco-a-distancia-focal-para-dentro-do-material':
    'Reduzca un poco la distancia focal hacia el interior del material.',
  'mnote.processamento-em-alta-velocidade': 'Procesamiento a alta velocidad.',
  'mnote.potencia-muito-baixa-para-tecidos-leves':
    'Potencia demasiado baja para telas ligeras.',
  'mnote.ajuste-a-distancia-focal-para-dentro-do-nucleo-do-material':
    'Ajuste la distancia focal hacia el interior del núcleo del material.',
  'mnote.corte-limpo-em-alta-velocidade': 'Corte limpio a alta velocidad.',

  // --------------------------------------------------------------- temas
  'theme.light': 'Claro',
  'theme.solarized-light': 'Solarized claro',
  'theme.sand': 'Arena',
  'theme.arctic': 'Ártico',
  'theme.silver': 'Plata',
  'theme.dark': 'Oscuro',
  'theme.midnight': 'Medianoche',
  'theme.solarized-dark': 'Solarized oscuro',
  'theme.oled': 'OLED (negro puro)',
  'theme.hc-black': 'Alto contraste · Negro',
  'theme.hc-white': 'Alto contraste · Blanco',
  'theme.group.light': 'Claros',
  'theme.group.dark': 'Oscuros',
  'theme.group.hc': 'Alto contraste',

  // ------------------------------------------------- apariencia e idioma
  'appearance.title': 'Apariencia e idioma',
  'appearance.language': 'Idioma',
  'appearance.theme': 'Tema',
  'appearance.hint': 'El tema y el idioma se guardan en las preferencias.',
  'lang.pt-BR': 'Português (Brasil)',
  'lang.en': 'English',
  'lang.es': 'Español',

  // ------------------------------------------------------- acerca de / pie
  'about.title': 'Acerca de GRBL Studio',
  'about.description':
    'Alternativa nativa de Linux a LaserGRBL para controlar grabadoras y cortadoras láser con firmware GRBL.',
  'about.version': 'Versión',
  'about.license': 'Licencia',
  'about.author': 'Autor',
  'about.developedBy': 'Desarrollado por',
  'about.repository': 'Repositorio',
  'about.visit': 'Visitar lab.werneck.dev.br',
  'footer.by': 'Desarrollado por',
  'footer.about': 'Acerca de',

  // --------------------------------------------------------- menú nativo
  'menu.file': 'Archivo',
  'menu.openGcode': 'Abrir G-code…',
  'menu.openSvg': 'Importar SVG…',
  'menu.openDxf': 'Importar DXF…',
  'menu.openPdf': 'Importar PDF…',
  'menu.editGcode': 'Editar G-code…',
  'menu.jobLibrary': 'Biblioteca de jobs…',
  'menu.quit': 'Salir',
  'menu.view': 'Ver',
  'menu.tools': 'Herramientas',
  'menu.materialTest': 'Cuadrícula de prueba de material…',
  'menu.focusTest': 'Prueba de foco (spot)…',
  'menu.presets': 'Presets de material…',
  'menu.design': 'Dibujar…',
  'menu.theme': 'Tema',
  'menu.language': 'Idioma',
  'menu.appearance': 'Apariencia e idioma…',
  'menu.help': 'Ayuda',
  'menu.about': 'Acerca de GRBL Studio',
  'menu.site': 'Sitio web de WerneckLab',
  'menu.tour': 'Tour de bienvenida',

  // -------------------------------------------- consola (RF-CON-14/15)
  'console.pause': 'Pausar desplazamiento',
  'console.resume': 'Reanudar desplazamiento',
  'console.clear': 'Limpiar',
  'console.save': 'Guardar registro…',
  'console.saved': 'Registro guardado en {path}',
  'console.saveFail': 'Fallo al guardar el registro: {msg}',
  'dlg.saveLog': 'Guardar registro de consola',
  'filter.log': 'Registro (texto)',
  'filter.design': 'Dibujo de GRBL Studio',
  'filter.presets': 'Presets (JSON)',

  // ------------------------------------------------ estado (RF-STA-2/4/7)
  'status.dtg': 'Por recorrer',
  'status.remaining': 'Restante',
  'status.alarmHint': 'Alarma activa: use Unlock ($X) o Reset antes de mover.',
  'status.history.title': 'Historial de alarmas',
  'status.history.empty': 'Ninguna alarma registrada.',
  'status.history.command': 'Comando rechazado:',
  'status.history.clear': 'Limpiar historial',
  'alarmfix.1':
    'Revise el final de carrera y haga homing ($H) o envíe Unlock ($X).',
  'alarmfix.2':
    'Envíe Unlock ($X); para proteger la máquina, active soft limits ($20) con homing ($22).',
  'alarmfix.3':
    'Haga homing ($H) para restablecer el origen antes de continuar.',
  'alarmfix.4':
    'Revise el cableado de la sonda y el estado inicial del pin antes de sondar.',
  'alarmfix.5':
    'Acerque la sonda al material o aumente el recorrido de sondeo.',
  'alarmfix.6': 'Repita el homing ($H); evite reiniciar durante el ciclo.',
  'alarmfix.7': 'Cierre la puerta de seguridad y repita el homing ($H).',
  'alarmfix.8':
    'Aumente el pull-off ($27) y revise el cableado del final de carrera.',
  'alarmfix.9':
    'Aumente la búsqueda del homing ($25) y revise el final de carrera del eje.',

  // ------------------------------------------------ conexión (RF-CON-5)
  'conn.firmware': 'Firmware: {value}',
  'conn.stateReport': 'Estado modal: {value}',

  // ------------------------------------------------------ jog (RF-JOG-2/6)
  'jog.hold.title':
    'Mantenga pulsado para mover continuamente; suelte para parar',
  'jog.keys.title': 'Flechas: X/Y · PageUp/PageDown: Z · Home: homing ($H)',

  // ------------------------------------ perfiles de configuración (RF-CFG-4)
  'settings.profile.title': 'Perfiles de configuración',
  'settings.profile.hint':
    'Guarde el conjunto actual de $$ y reaplíquelo después.',
  'settings.profile.name': 'Nombre del perfil',
  'settings.profile.save': 'Guardar perfil',
  'settings.profile.saveHint': 'Guarda los valores actuales de $$',
  'settings.profile.apply': 'Aplicar',
  'settings.profile.applyHint':
    'Reescribe los valores del perfil en la máquina',
  'settings.profile.delete': 'Eliminar',
  'settings.profile.none': 'Ningún perfil guardado',
  'settings.profile.saved': 'Perfil «{name}» guardado.',
  'settings.profile.applied': 'Perfil «{name}» aplicado.',
  'settings.profile.deleted': 'Perfil «{name}» eliminado.',
  'settings.profile.needName': 'Indique un nombre para el perfil.',
  'settings.profile.applyFail': 'Fallo al aplicar el perfil: {msg}',

  // ---------------------------------------------- preferencias (RF-CFG-5)
  'prefs.fileDir': 'Carpeta de archivos',
  'prefs.fileDir.hint':
    'Dónde abrir y guardar archivos de forma predeterminada.',
  'prefs.fileDir.choose': 'Elegir carpeta…',
  'prefs.fileDir.default': 'Carpeta predeterminada del sistema',
  'prefs.fileDir.changed': 'Carpeta de archivos: {path}',
  'dlg.pickDir': 'Elegir carpeta de archivos',

  // --------------------------------------------- registros de sesión (RNF-9)
  'menu.logs': 'Abrir carpeta de registros',
  'logs.none': 'Todavía no hay registros.',

  // ------------------------------------------ panel "Máquina" (P0.7)
  'machine.open': 'Máquina y diagnóstico',
  'machine.title': 'Máquina',
  'machine.read': 'Leer de la máquina',
  'machine.reading': 'Leyendo…',
  'machine.copy': 'Copiar diagnóstico',
  'machine.copied': 'Diagnóstico copiado.',
  'machine.copyFail': 'No se pudo copiar: {msg}',
  'machine.connectFirst': 'Conecte la máquina para leer los datos.',
  'machine.noData': 'La máquina no devolvió datos.',
  'machine.fail': 'Error al leer: {msg}',
  'machine.notInformed': 'no informado',
  'machine.report': 'Diagnóstico',
  'machine.reportHint': 'Texto técnico para soporte — sin datos personales.',
  'machine.reportEmpty': 'Lea la máquina para generar el diagnóstico.',
  'machine.section.firmware': 'Firmware',
  'machine.section.travel': 'Recorrido y límites',
  'machine.section.laser': 'Láser',
  'machine.section.motion': 'Movimiento',
  'machine.section.modal': 'Estado actual',
  'machine.section.offsets': 'Offsets',
  'machine.section.startup': 'Bloques de inicio',
  'machine.firmware.version': 'Versión',
  'machine.firmware.build': 'Build',
  'machine.firmware.platform': 'Plataforma',
  'machine.firmware.options': 'Opciones',
  'machine.firmware.planner': 'Planner',
  'machine.firmware.buffer': 'Búfer RX',
  'machine.travel.x': 'Recorrido X',
  'machine.travel.y': 'Recorrido Y',
  'machine.travel.z': 'Recorrido Z',
  'machine.opt.V': 'PWM variable',
  'machine.opt.C': 'CoreXY',
  'machine.opt.M': 'Mist',
  'machine.laser.mode': 'Modo láser ($32)',
  'machine.laser.smax': 'Tope de S ($30)',
  'machine.laser.smin': 'Piso de S ($31)',
  'machine.laser.pwm': 'PWM ($33)',
  'machine.limits.soft': 'Soft limits ($20)',
  'machine.limits.hard': 'Hard limits ($21)',
  'machine.limits.homing': 'Homing ($22)',
  'machine.motion.maxRate': 'Velocidad máxima',
  'machine.motion.accel': 'Aceleración',
  'machine.motion.steps': 'Pasos/mm',
  'machine.modal.motion': 'Movimiento',
  'machine.modal.wcs': 'Sistema',
  'machine.modal.units': 'Unidades',
  'machine.modal.distance': 'Distancia',
  'machine.modal.spindle': 'Láser/spindle',
  'machine.modal.feed': 'Avance',
  'machine.modal.speed': 'Potencia (S)',
  'machine.status': 'Estado',
  'machine.offsets.work': 'Trabajo (G54–G59)',
  'machine.offsets.refs': 'Referencias (G28/G30)',
  'machine.offsets.tlo': 'TLO',
  'machine.offsets.prb': 'Sonda (PRB)',
  'machine.startup.none': 'Ningún bloque de inicio.',
  'machine.startup.warn': 'Estos comandos se ejecutan en cada reset.',
  'machine.pins': 'Pines',
  'machine.pins.none': 'ninguno',
  'machine.on': 'sí',
  'machine.off': 'não',
  'machine.unit.mm': 'mm',
  'machine.unit.mmmin': 'mm/min',
  'machine.unit.hz': 'Hz',
  'machine.unit.bytes': 'B',
  'machine.unit.blocks': 'bloques',

  // -------------------------------------------- pre-vuelo MX-1…MX-15
  'preflight.title': 'Pre-vuelo',
  'preflight.chip': '{n} aviso(s)',
  'preflight.chipHint': 'Ver las comprobaciones de pre-vuelo',
  'preflight.intro':
    'Comprobaciones antes de grabar. No se envió nada a la máquina.',
  'preflight.startAnyway': 'Grabar de todos modos',
  'preflight.blocked':
    'Hay {n} impedimento(s). Grabar así puede quemar mal o ser rechazado por GRBL.',
  'preflight.sev.block': 'impide',
  'preflight.sev.warn': 'atención',
  'preflight.sev.info': 'información',
  'preflight.fix.setting':
    'Sugerencia: ajustar {code} a {value} (con confirmación).',
  'preflight.fix.action': 'Sugerencia: {action}.',
  'preflight.action.open-machine': 'abrir el panel Máquina',
  'preflight.action.fit-preview': 'revisar tamaño/origen en la vista previa',
  'preflight.action.reduce-power': 'reducir la potencia al tope de la máquina',
  'preflight.action.change-route': 'ajustar el G-code antes de grabar',
  'preflight.action.park': 'aparcar unos mm fuera del cero',
  'preflight.MX-1.title': 'Potencia por encima del tope',
  'preflight.MX-1.detail':
    'El trabajo pide S={s}, pero la máquina limita en $30={smax}. La potencia efectiva será menor.',
  'preflight.MX-2.title': 'Sin modo láser',
  'preflight.MX-2.detail':
    'El trabajo usa M3/M4 y la máquina tiene $32=0 — GRBL responde error:17.',
  'preflight.MX-3.title': 'Trabajo mayor que el recorrido',
  'preflight.MX-3.detail':
    'La caja del trabajo excede el recorrido en {x} mm en X y {y} mm en Y.',
  'preflight.MX-4.title': 'Soft limits sin homing',
  'preflight.MX-4.detail':
    '$20=1 con $22=0 — GRBL responde error:10. Active el homing o desactive los soft limits.',
  'preflight.MX-5.title': 'G28/G30 sin home',
  'preflight.MX-5.detail':
    'La máquina tiene $22=0 y el trabajo usa G28/G30 — la posición puede no ser la esperada.',
  'preflight.MX-6.title': 'Movimiento sin velocidad',
  'preflight.MX-6.detail':
    'La línea {line} usa G1 sin F y sin avance previo — GRBL responde error:22.',
  'preflight.MX-7.title': 'Entrada de seguridad activa',
  'preflight.MX-7.detail':
    'Pines activos: {pin}. Libere la puerta/final de carrera antes de grabar.',
  'preflight.MX-8.title': 'Sin refrigeración',
  'preflight.MX-8.detail':
    'El trabajo usa {codes}, pero este firmware no tiene salida mist (sin M en [OPT]).',
  'preflight.MX-9.title': 'Trabajo en pulgadas',
  'preflight.MX-9.detail':
    'El trabajo usa G20 y la máquina informa en mm ($13=0) — revise las medidas.',
  'preflight.MX-10.title': 'Bloques de inicio',
  'preflight.MX-10.detail':
    'Hay {n} bloque(s) $N que se ejecutan en cada reset y pueden cambiar el estado antes del trabajo.',
  'preflight.MX-11.title': 'Jog fuera del límite',
  'preflight.MX-11.detail':
    'El jog pide {step} mm / {feed} mm/min, por encima del recorrido ({area} mm) o de la velocidad máxima ({maxRate} mm/min).',
  'preflight.MX-12.title': 'Primer corte sin S',
  'preflight.MX-12.detail':
    'La línea {line} enciende el láser sin definir S; GRBL mantiene el S anterior y puede quemar con la potencia vieja.',
  'preflight.MX-13.title': 'S-max del perfil difiere de $30',
  'preflight.MX-13.detail':
    'La app usa 100 % = {profile}, la máquina usa $30={machine}. La potencia efectiva sale distinta.',
  'preflight.MX-14.title': 'Búfer no informado',
  'preflight.MX-14.detail':
    'El firmware no informa el búfer RX en [OPT]; la ventana de envío usa 128 B por defecto.',
  'preflight.MX-15.title': 'Retorno al cero con hard limits',
  'preflight.MX-15.detail':
    'El trabajo aparca en X0 Y0 con $21=1 — el interruptor puede disparar ALARM:1 y reiniciar el controlador.',
} satisfies Record<keyof typeof ptBR, string>;
