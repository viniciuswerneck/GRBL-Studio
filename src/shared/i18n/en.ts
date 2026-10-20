import type { ptBR } from './pt-BR';

/**
 * Catálogo i18n — inglês. Paridade de chaves garantida por
 * `satisfies Record<keyof typeof ptBR, string>` (ver `tests/i18n.test.ts`).
 */
export const en = {
  // ------------------------------------------------------- navegação/comum
  'nav.back': 'Back',
  'nav.next': 'Next',
  'nav.close': 'Close',
  'nav.cancel': 'Cancel',
  'nav.import': 'Import…',
  'nav.export': 'Export…',

  // -------------------------------------------------------------- modos UI
  'assistant.open': 'Assistant',
  'assistant.close': 'Close assistant',
  'assistant.title': 'Assistant — beginner guide',
  'mode.M4': 'M4 (dynamic)',
  'mode.M3': 'M3 (constant)',

  // ------------------------------------------------------ perfil de máquina
  'profile.label': 'Machine profile',
  'profile.title': 'Optimized settings for your machine',
  'profile.generic': 'Generic (GRBL)',
  // Machine profile: `.lbdev` import (P2.5) and smart connect.
  'profile.import': 'Import .lbdev…',
  'profile.importHint':
    'Imports a machine profile from a LightBurn file (.lbdev)',
  'profile.importError': 'Could not import the profile: {error}',
  'profile.importError.invalid-json': 'the file is not a valid .lbdev',
  'profile.importError.no-device': 'the file has no devices',
  'profile.imported': 'Profile imported: {name} ({area} mm)',
  'profile.suggestion': 'Suggestion: {name} — apply',
  'profile.reason.area': 'same work area',
  'profile.reason.smax': 'same S limit',
  'profile.reason.homing': 'same homing',
  'profile.applyTitle': 'Apply machine profile',
  'profile.applyIntro':
    'The {name} profile writes these values to the machine:',
  'profile.before': '{value} (current)',
  'profile.unknown': 'not reported',
  'profile.change': '{code}: {before} → {after}',
  'profile.apply': 'Apply',
  'profile.applied': 'Profile {name} applied.',
  'profile.module': 'Module',
  'profile.action': 'Action',
  'profile.material.title': 'Material profile (RF-IMG-8)',
  'profile.material.hint':
    'Suggestions from the COMGO Z1 manual (§9). Applying a profile fills in the Speed and S-max below — check the result before engraving.',
  'profile.material.placeholder': '— choose material —',
  'profile.material.choose':
    'Choose a material to see the manual recommendation.',
  'profile.material.applied':
    '{power}% power (S-max {smax}) · {speed} mm/min · {notes}',
  'profile.material.unavailable': 'Profiles unavailable: run `npm run build`.',
  'action.engrave': 'Engrave',
  'action.cut': 'Cut',

  // -------------------------------------------------------- guia (básico)
  'guide.close': 'Close assistant',
  'assistant.guideTitle': 'Assistant — beginner guide',
  'guide.type.photo': 'Photo',
  'guide.type.bw': 'B&W',
  'guide.type.vector': 'Outline',
  'wizard.startHint': 'Connect the laser to get started.',
  'wizard.title': 'Step {n} of {total} — {title}',
  'wizard.paramsTitle': 'Size, type and material',
  'wizard.connected': 'Connected. Click Next.',
  'wizard.connect': 'Connect the laser.',
  'wizard.imageLoaded': '{name} loaded. Click Next.',
  'wizard.chooseImage': 'Choose an image.',
  'wizard.size': 'Size (mm)',
  'wizard.defineParams': 'Set the size, type and material.',
  'wizard.gcodeReady': 'G-code ready. Click Next.',
  'wizard.clickGenerate': 'Click Generate G-code.',
  'wizard.positionHint':
    'Position the laser and use the faint outline (it does not burn).',
  'wizard.check': 'Check everything and click Engrave.',
  'wizard.next': 'Next',
  'wizard.finish': 'Finish',

  // ----------------------------------------------------------- abas do app
  'tab.machine': 'Laser',
  'tab.image': 'Image',
  'tab.run': 'Run',
  'tab.macros': 'Macros',

  // ------------------------------------------------------------- conexão
  'conn.title': 'Connection',
  'conn.transport': 'Transport',
  'conn.transport.title': 'Serial (USB) or WiFi/TCP (RF-CON-7)',
  'conn.transport.serial': 'Serial (USB)',
  'conn.transport.tcp': 'WiFi (TCP)',
  'conn.refresh': 'Refresh',
  'conn.portHint':
    'No USB board detected. Connect the laser and click Refresh.',
  'conn.host': 'Host',
  'conn.port': 'Port',
  'conn.tcpHint':
    'E.g.: ESP8266/ESP32 with serial-over-TCP firmware (Telnet 23). GRBL 1.1 does not change.',
  'conn.connect': 'Connect',
  'conn.disconnect': 'Disconnect',
  'conn.disconnected': 'Disconnected',
  'conn.connecting': 'Connecting…',
  'conn.connected': 'Connected',
  'conn.error': 'Connection error',
  'conn.selectPort': 'Select a serial port.',
  'conn.notConnected': 'Not connected.',
  'conn.connectFirst': 'Connect the machine to send',
  'conn.settings': 'Machine settings ($$)',
  'port.none': 'No ports',

  // ------------------------------------------------------------------ jog
  'jog.title': 'Motion',
  'jog.home.title': 'Machine homing (requires limit switches)',
  'jog.home.noHoming': '{name}: no factory homing — use Set origin',
  'jog.setOrigin': 'Set origin here',
  'jog.gotoZero': 'Go to zero',
  'jog.unlock': 'Unlock ($X)',
  'jog.reset': 'Reset',

  // ------------------------------------------------------------- overrides
  'ovr.title': 'Overrides (real time)',
  'ovr.hint':
    'Adjust the machine while it runs. The active value comes from the status (`Ov:`).',
  'ovr.feed': 'Feed',
  'ovr.rapid': 'Rapid',
  'ovr.spindle': 'Power',
  'ovr.reset': 'Back to 100%',

  // ------------------------------------------------------- imagem → g-code
  'img.title': 'Image → G-code',
  'img.steps.hint':
    'Step 1: choose the image · Step 2: generate the G-code · Step 3: connect and send.',
  'img.choose': 'Choose image',
  'img.chooseEllipsis': 'Choose image…',
  'img.replace': 'Replace image…',
  'img.none': 'No image loaded',
  'img.dimension': 'Size (mm)',
  'img.width': 'Width',
  'img.height': 'Height',
  'img.offsetX': 'Offset X',
  'img.offsetY': 'Offset Y',
  'img.keepAspect': 'Keep aspect ratio',
  'img.aspect.locked': 'Aspect locked: height follows width.',
  'img.aspect.free': 'Free aspect: width and height are independent.',
  'img.convert': 'Conversion',
  'img.algorithm': 'Algorithm',
  'img.type': 'Type',
  'img.material': 'Material',
  'algo.vector': 'Vectorize (outline / cut)',
  'img.lines': 'Lines/mm',
  'img.direction': 'Direction',
  'img.dot': 'Dot (mm)',
  'img.simplify': 'Smoothing (px)',
  'img.algoHint':
    'Vectorize generates only the outline (cut): the B&W Threshold defines what gets cut, and the drawing becomes closed lines at full power (S-max).',
  'img.brightness': 'Brightness',
  'img.contrast': 'Contrast',
  'img.threshold': 'B&W Threshold',
  'img.invert': 'Invert black/white',
  'img.bw': 'Black and white (threshold)',
  'img.engrave': 'Engraving',
  'img.speed': 'Speed',
  'img.passes': 'Passes',
  'img.mode': 'Mode',
  'img.adaptive': 'Speed in light areas (×)',
  'img.adaptive.title':
    'Speeds up light runs up to N× the engraving speed. Light areas come out ' +
    'lighter (dose = S ÷ speed); compensate with S-max/white clip. Above the ' +
    'axis max rate ($110/$111) the burn weakens. 1 = off.',
  'img.bidirectional': 'Bidirectional (zig-zag)',
  'img.bidirectional.title':
    'Engraves each line left-to-right and the next right-to-left, without the ' +
    'return G0. Nearly doubles the speed on wide images. Turn it off if your ' +
    'machine makes the two directions look different.',
  'img.speed.limits': 'Axis max rate ($110/$111): {x} / {y} mm/min.',
  'img.speed.over':
    'Peak of {peak} mm/min above the axis limit ({max} mm/min): GRBL caps the ' +
    'speed and the burn weakens. Lower the speed or the light-area speed.',
  'img.speed.unknown':
    'Connect the engraver to compare with the axis limit ($110/$111).',
  'img.generate': 'Generate G-code',
  'img.generate.disabled': 'Choose an image first',
  'img.generate.title': 'Converts the image to G-code',
  'img.generating': 'Generating…',
  'img.save': 'Save .gcode',
  'img.save.disabled': 'Generate the G-code first',
  'img.save.title': 'Saves the G-code to disk',
  'img.previewTag': '(preview)',
  'img.reduced': ' (resized from {w}×{h})',
  'img.statsFail': 'Failed: {msg}',
  'img.error.open': 'Failed to open the image',
  'img.error.invalid': 'Invalid image',
  'img.error.invalidDetail': '{name} does not report width/height.',
  'img.error.format': 'Unsupported format',
  'img.error.formatDetail':
    '{name} could not be decoded. Use PNG, JPG, BMP, GIF, WebP or AVIF.',

  // ------------------------------------------------------- posicionamento
  'frame.title': 'Position the laser',
  'frame.group.move': 'Move the head',
  'frame.group.check': 'Check the area',
  'frame.group.job': 'Engraving',
  'frame.home.title': 'Home (reference the axes)',
  'frame.hint':
    'Use the arrows to bring the laser near the area. “Draw outline” traces the area with a very weak laser and “Mark center” moves the laser to the image center (weak laser for a moment).',
  'frame.setOrigin': 'Set origin here',
  'frame.origin': 'Go to origin (0,0)',
  'frame.outline': 'Draw outline',
  'frame.center': 'Mark center',
  'frame.center.title':
    'Moves the laser to the image center (weak laser for a moment)',
  'frame.center.done': 'Laser at the image center (weak laser).',
  'frame.start': '▶ Engrave',
  'frame.power': 'Engraving power (%)',
  'frame.speed': 'Engraving speed (mm/min)',
  'frame.position': 'Position',
  'frame.engrave': 'Engrave',
  'frame.status.connected':
    'Machine connected. Position and draw the outline to check.',
  'frame.status.disconnected':
    'Connect the machine to position and draw the outline.',
  'frame.outline.done': 'Outline sent (very weak laser).',
  'frame.generating': 'Generating G-code with the dialog parameters…',
  'frame.connect': 'Connect machine',
  'frame.connect.noPort':
    'No serial port found. Check the cable and click “Connect machine”.',

  // ------------------------------------------------------- material test grid
  'matTest.title': 'Material test grid',
  'matTest.hint':
    'Engraves a grid of squares, each at a different speed/power combination. ' +
    'Use it to find the ideal parameters for a material.',
  'matTest.cols': 'Columns (speed steps)',
  'matTest.rows': 'Rows (power steps)',
  'matTest.speedMin': 'Minimum speed (mm/min)',
  'matTest.speedMax': 'Maximum speed (mm/min)',
  'matTest.powerMin': 'Minimum power (%)',
  'matTest.powerMax': 'Maximum power (%)',
  'matTest.cellSize': 'Cell side (mm)',
  'matTest.spacing': 'Cell spacing (mm)',
  'matTest.passes': 'Passes',
  'matTest.mode': 'Laser mode',
  'matTest.generate': 'Generate and preview',
  'matTest.save': 'Save .gcode…',
  'matTest.status.generating': 'Generating the test grid…',
  'matTest.status.done':
    'Grid generated. Check the preview, then send or save.',
  // ------------------------------------------- focus test (RF-IMG-13)
  'focus.title': 'Focus test (spot)',
  'focus.hint':
    'Engraves a ladder of lines with Z changing at each pair: the thinnest line shows the best focus. Z is relative to the current Z — the program steps down, up and back to the start. Leave clearance and keep Cancel at hand.',
  'focus.steps': 'Z steps',
  'focus.zStep': 'Z step (mm)',
  'focus.zSign': 'Z direction',
  'focus.zSignUp': 'Z+ moves away from the material',
  'focus.zSignDown': 'Z+ moves toward the material',
  'focus.length': 'Line length (mm)',
  'focus.spacing': 'Spacing between lines (mm)',
  'focus.feed': 'Feed rate (mm/min)',
  'focus.powerLow': 'Low power (%)',
  'focus.powerHigh': 'High power (%)',
  'focus.mode': 'Laser mode',
  'focus.generate': 'Generate and preview',
  'focus.save': 'Save .gcode…',
  'focus.preview':
    '{lines} lines in {steps} Z steps: {zMin} to {zMax} mm (from the current Z).',
  'focus.warn.samePower':
    'Both powers are the same — use different values to compare focus on marking and on cutting.',
  'focus.status.done':
    'Focus test generated ({steps} steps). Check the preview, then send or save it.',
  'focus.err.moduleMissing': 'Focus test module not loaded.',
  // ------------------------------- material presets (P2.12/RF-IMG-8)
  'preset.title': 'Material presets',
  'preset.hint':
    'Recipes that worked: power, speed, passes and notes. Export to share; import to repeat without redoing the test grid.',
  'preset.new': 'New preset',
  'preset.name': 'Name',
  'preset.notes': 'Notes (optional)',
  'preset.fromCurrent':
    'Source: {module} · {action} · {power}% · {speed} mm/min · {passes} pass(es).',
  'preset.defaultName': 'Recipe {n}',
  'preset.create': 'Save current settings',
  'preset.saveCurrent': 'Save as preset…',
  'preset.manage': 'My presets…',
  'preset.empty':
    'No presets yet. Set the power and the speed, give it a name and save the current settings.',
  'preset.apply': 'Apply',
  'preset.convert': 'Adapt to machine',
  'preset.remove': 'Delete',
  'preset.meta': '{module} · {action} · {power}% · {speed} mm/min · {passes}×',
  'preset.dose': 'Dose {dose} J/mm',
  'preset.doseHint':
    'Dose = energy per millimetre (approximate, ignoring beam spot): use it to compare recipes and transfer them between modules.',
  'preset.hint.applied':
    'Preset “{name}”: {power}% · {speed} mm/min · {passes} pass(es).',
  'preset.import': 'Import…',
  'preset.export': 'Export…',
  'preset.status.created': 'Preset “{name}” saved.',
  'preset.status.applied':
    'Preset “{name}” applied: {power}% · {speed} mm/min · {passes} pass(es).',
  'preset.status.converted':
    'Dose preserved: {from}% ({fromModule}) → {to}% ({toModule}).',
  'preset.status.convertLimited':
    "The machine's {toModule} module cannot reach the recipe dose ({fromModule}) — capped at 100%. Lower the speed to keep the dose.",
  'preset.status.removed': 'Preset deleted.',
  'preset.status.imported': '{n} preset(s) imported.',
  'preset.status.importedSkipped': ' {n} invalid one(s) ignored.',
  'preset.status.exported': 'Presets exported to {path}.',
  'preset.err.name': 'Give the preset a name.',
  'preset.err.moduleMissing': 'Presets module not loaded.',
  'preset.err.import': 'Could not read the file: {msg}',
  'preset.err.empty': 'The file has no valid presets.',

  // ------------------------------------------------ QR Code (v0.6, RF-SYM-1)
  'menu.qrCode': '2D code (QR / Data Matrix)…',
  // Symbol grid (RF-SYM-9): shared by the 2D and 1D modals.
  'sym.grid': 'Grid: one list, one symbol per line',
  'sym.gridHint':
    'With the grid on, each line of the content becomes a symbol, laid out in columns and rows.',
  'sym.gridColumns': 'Columns (empty = auto)',
  'sym.gridGap': 'Spacing (mm)',
  'sym.status.grid':
    'Grid generated: {count} symbol(s) · {cols} × {rows} · {w} × {h} mm. Check the preview and send or save.',
  'qr.title': '2D code',
  'qr.hint':
    'Generates a QR Code, a Data Matrix, a PDF417 or an Aztec code as raster ' +
    'G-code: pick the ' +
    'symbol, the content and the size in mm (or the module size) and engrave. ' +
    'The artwork origin is the bottom-left corner (X0 Y0).',
  'qr.content': 'Content',
  'qr.contentPlaceholder': 'https://example.com or some text',
  'qr.symbology': 'Symbol',
  'qr.sym.qr': 'QR Code',
  'qr.sym.datamatrix': 'Data Matrix',
  'qr.sym.pdf417': 'PDF417',
  'qr.sym.aztec': 'Aztec',
  'qr.ecc': 'Error correction',
  'qr.ecc.L': 'L — 7%',
  'qr.ecc.M': 'M — 15%',
  'qr.ecc.Q': 'Q — 25%',
  'qr.ecc.H': 'H — 30%',
  'qr.version': 'Version',
  'qr.versionAuto': 'Automatic',
  'qr.size': 'Size (mm)',
  'qr.width': 'Width (mm)',
  'qr.height': 'Height (mm)',
  'qr.keepAspect': 'Square',
  'qr.keepAspectHint': 'Keeps width equal to height (the symbol is square).',
  'qr.sizeHint':
    'Blank uses the module size. Width ≠ height stretches the symbol and may ' +
    'hurt readability.',
  'qr.module': 'Module size (mm)',
  'qr.quietZone': 'Quiet zone (modules)',
  'qr.linesPerMm': 'Scan lines per mm',
  'qr.power': 'Power (%)',
  'qr.feed': 'Speed (mm/min)',
  'qr.passes': 'Passes',
  'qr.mode': 'Laser mode',
  'qr.mode.m4': 'M4 (dynamic)',
  'qr.mode.m3': 'M3 (constant)',
  'qr.overscan': 'Overscan (mm)',
  'qr.invert': 'Inverted polarity (burn the background)',
  'qr.generate': 'Generate and preview',
  'qr.save': 'Save .gcode…',
  'qr.status.generating': 'Generating the QR Code…',
  'qr.moduleMissing': 'QR Code generator not loaded.',
  'qr.status.done':
    'QR generated: {version} · {size}×{size} modules · {w} × {h} mm · ' +
    'module {module} mm. Check the preview, then send or save.',
  'qr.err.empty': 'Enter some content to generate the QR Code.',
  'qr.err.too-long': 'The content is too long for a QR Code at level {ecc}.',
  'qr.err.bad-version': 'Invalid format information version.',
  'qr.err.unknown': 'Could not generate the QR Code with these settings.',
  'qr.warn.module-small':
    'Module smaller than 2× the laser spot: the code may be unreadable.',
  'qr.warn.module-tiny': 'Module below 0.3 mm: too small for most readers.',
  'qr.warn.quiet-zone-small':
    'Quiet zone below the standard (4 modules): harder to read.',
  'qr.warn.lines-too-few':
    'Fewer than 3 scan lines per module: the fill may come out patchy.',
  'qr.warn.outside-work-area':
    'The symbol does not fit the work area from this origin.',
  'qr.warn.stretched':
    'Width differs from height: the symbol is stretched and scanning may fail.',

  // ------------------------------------------- 1D barcode (v0.6, RF-SYM-2)
  'menu.barCode': 'Barcode…',
  'dm.title': 'Data Matrix',
  'dm.size': 'Symbol size',
  'dm.sizeAuto': 'Automatic (smallest that fits)',
  'dm.status.done':
    'Data Matrix generated: {size}×{size} modules · {w} × {h} mm · module ' +
    '{module} mm. Check the preview, then send or save.',
  'dm.err.empty': 'Enter content to generate the Data Matrix.',
  'dm.err.too-long': 'Content too long for a Data Matrix.',
  'dm.err.bad-chars':
    'The ECC200 Data Matrix accepts Latin-1 only (no emoji or other UTF-8).',
  'dm.err.bad-size': 'Invalid Data Matrix size.',
  'dm.err.unknown': 'Could not generate the Data Matrix with these settings.',

  // ---------------------------------------- PDF417 (v0.8, RF-SYM-7)
  'pdf.title': 'PDF417 code',
  'qr.pdf.ecc': 'Error correction',
  'qr.pdf.eccOption': 'Level {level} — {ec} codewords',
  'qr.pdf.cols': 'Data columns (blank = automatic)',
  'qr.pdf.rowHeight': 'Row height (mm)',
  'pdf.status.done':
    'PDF417 generated: {rows} × {cols} codewords · EC level {ecc} · {w} × {h} mm ' +
    '· module {module} mm · row {row} mm. Check the preview, then send or save.',
  'pdf.err.empty': 'Enter content to generate the PDF417.',
  'pdf.err.too-long': 'Content too long for a PDF417 with these settings.',
  'pdf.err.bad-options': 'Invalid PDF417 settings (data columns out of 1…30).',
  'pdf.err.bad-chars':
    'The PDF417 accepts Latin-1 only (no emoji or other UTF-8).',
  'pdf.err.unknown': 'Could not generate the PDF417 with these settings.',

  // ---------------------------------------- Aztec (RF-SYM-7)
  'aztec.title': 'Aztec code',
  'qr.aztec.ecc': 'Error correction (%)',
  'qr.aztec.eccHint':
    'ISO/IEC 24778 asks for at least 23%. More correction = bigger symbol.',
  'aztec.status.done':
    'Aztec generated: {size}×{size} modules · {layers} layers · {w} × {h} mm · ' +
    'module {module} mm. Check the preview, then send or save.',
  'aztec.err.empty': 'Enter content to generate the Aztec code.',
  'aztec.err.too-long':
    'Content too long for an Aztec code (32 layers is the maximum).',
  'aztec.err.bad-chars':
    'The Aztec code accepts Latin-1 only (no emoji or other UTF-8).',
  'aztec.err.layers': 'Invalid layer count for this content.',
  'aztec.err.unknown': 'Could not generate the Aztec code with these settings.',

  'bar.title': 'Barcode',
  'bar.hint':
    'Generates a 1D barcode as G-code: pick the symbology, the content and ' +
    'the size. Bars are filled vertically (along them) and the human-readable ' +
    'text (HRI) is drawn with the single-stroke font. The origin is the ' +
    'bottom-left corner (X0 Y0).',
  'bar.symbology': 'Symbology',
  'bar.sym.code128': 'Code 128 — free text',
  'bar.sym.ean13': 'EAN-13 — 12 digits (+ check digit)',
  'bar.sym.ean8': 'EAN-8 — 7 digits (+ check digit)',
  'bar.sym.upca': 'UPC-A — 11 digits (+ check digit)',
  'bar.sym.code39': 'Code 39 — A–Z, 0–9 and -.$/+%',
  'bar.sym.itf14': 'ITF-14 — 13 digits (+ GS1 check digit)',
  'bar.sym.codabar': 'Codabar — A–D, 0–9 and -$:/.+',
  'bar.sym.code93': 'Code 93 — A–Z, 0–9 and -.$/+%',
  'bar.sym.gs1-128': 'GS1-128 — Code 128 with FNC1 (^ separates fields)',
  'bar.hint.itf14':
    'Enter 13 digits (the mod 10 check digit is calculated) or 14 (checked).',
  'bar.hint.codabar':
    'Start and end with A–D (e.g. A1234B); without guards it uses A…A.',
  'bar.hint.code93':
    'Basic alphabet (47 symbols). The C and K check characters are automatic.',
  'bar.hint.gs1':
    'In GS1-128, ^ marks the end of a field (FNC1). AI validation is up to you.',
  'bar.content': 'Content',
  'bar.contentPlaceholder': 'GRBL-STUDIO-001',
  'bar.checksum': 'mod 43 check (Code 39)',
  'bar.ratio': 'Wide:narrow ratio',
  'bar.ratio.2': '2:1 (narrower)',
  'bar.ratio.3': '3:1 (recommended)',
  'bar.width': 'Final width (mm)',
  'bar.widthHint':
    'Blank uses the X-dimension. The width includes the quiet zone.',
  'bar.xDim': 'X-dimension (mm)',
  'bar.barHeight': 'Bar height (mm)',
  'bar.quietZone': 'Quiet zone (modules)',
  'bar.linesPerMm': 'Scan lines per mm',
  'bar.hri': 'Show the text (HRI) under the bars',
  'bar.power': 'Power (%)',
  'bar.feed': 'Speed (mm/min)',
  'bar.passes': 'Passes',
  'bar.mode': 'Laser mode',
  'bar.mode.m4': 'M4 (dynamic)',
  'bar.mode.m3': 'M3 (constant)',
  'bar.overscan': 'Overscan (mm)',
  'bar.invert': 'Inverted polarity (burn the background)',
  'bar.generate': 'Generate and preview',
  'bar.save': 'Save .gcode…',
  'bar.status.generating': 'Generating the barcode…',
  'bar.moduleMissing': 'Barcode generator not loaded.',
  'bar.status.done':
    '{sym} generated: {modules} modules · {w} × {h} mm · X-dim {xdim} mm. ' +
    'Check the preview, then send or save.',
  'bar.err.empty': 'Enter a content to generate the barcode.',
  'bar.err.bad-chars':
    'This symbology does not accept one of the characters (see the log).',
  'bar.err.bad-length':
    'The content length does not fit this symbology (see the log).',
  'bar.err.bad-option': 'Invalid option combination for this symbology.',
  'bar.err.check-digit':
    'Invalid check digit: expected {expected}, got {given}.',
  'bar.warn.module-small':
    'X-dimension smaller than 2× the laser spot: the code may be unreadable.',
  'bar.warn.module-tiny':
    'X-dimension below 0.3 mm: too small for most scanners.',
  'bar.warn.quiet-zone-small':
    'Quiet zone smaller than the standard: makes scanning harder.',
  'bar.warn.lines-too-few':
    'Fewer than 3 scan lines per module: the fill may come out with gaps.',
  'bar.warn.outside-work-area':
    'The symbol does not fit the work area from this origin.',
  'bar.warn.x-dim-small':
    'X-dimension below the standard minimum: the scanner may fail.',
  'bar.warn.bar-height-small':
    'Bars shorter than the recommended minimum: makes scanning harder.',
  'bar.warn.hri-chars':
    'The HRI has characters without a glyph in the font: they print as “?”.',
  'bar.warn.uppercased':
    'Code 39 is uppercase-only — the content was converted, and a scanner will return it in uppercase.',

  // --------------------------- batch / variable data (v0.8, RF-SYM-10)
  'menu.batch': 'Variable-data batch…',
  'batch.title': 'Batch — variable data',
  'batch.hint':
    'Each row of the sheet is one piece. The app engraves one, pauses so you can swap the piece, then moves on. The geometry uses the symbol settings (Tools → 2D code / barcode).',
  'batch.kind': 'Piece type',
  'batch.kind2d': '2D code (QR, Data Matrix, PDF417, Aztec)',
  'batch.kind1d': 'Barcode (1D)',
  'batch.file': 'Sheet',
  'batch.openFile': 'Open CSV…',
  'batch.csv': 'Paste the sheet (CSV/TSV)',
  'batch.csvPlaceholder': 'name,role\nAna,Dev',
  'batch.hasHeader': 'The first row is the header',
  'batch.delimiter': 'Separator',
  'batch.delimiterAuto': 'Automatic',
  'batch.delimiterComma': 'Comma (,)',
  'batch.delimiterSemicolon': 'Semicolon (;)',
  'batch.delimiterTab': 'Tab',
  'batch.delimiterPipe': 'Pipe (|)',
  'batch.template': 'Template for each piece',
  'batch.from': 'Start at piece',
  'batch.fields': 'Available fields',
  'batch.templateHint':
    '{1}, {2}… pick the column by position; { name } by header; {i} is the piece counter (zero-padded: {i:03}); {total} is the batch size. {{ and }} write a literal brace.',
  'batch.refresh': 'Refresh preview',
  'batch.forget': 'Forget batch',
  'batch.start': 'Start batch',
  'batch.startFrom': 'Start at piece {index}',
  'batch.open': 'Batch (CSV)…',
  'batch.openHint':
    'Engraves one piece per row of a sheet (QR/barcode with variable data).',
  'batch.resume': '▶ Resume batch',
  'batch.stop': 'End batch',
  'batch.next': '▶ Next piece',
  'batch.nextHint': 'After swapping the piece on the bed, send the next one.',
  'batch.colPiece': 'Piece',
  'batch.colContent': 'Content',
  'batch.info': '{pieces} pieces · {columns} columns',
  'batch.infoHeader': 'with header',
  'batch.warnDropped':
    '{count} rows were left out (limit of 2 000 pieces per batch).',
  'batch.warnTruncated': '{count} cells were cut at 200 characters.',
  'batch.previewEmpty': 'Paste or open a sheet to preview the pieces.',
  'batch.err.empty': 'The template is empty: say what each piece contains.',
  'batch.err.unclosed': 'Missing closing brace in “{token}”.',
  'batch.err.badColumn':
    'The column in “{token}” does not exist in this sheet.',
  'batch.err.unknownField': 'The field “{token}” is not in the sheet header.',
  'batch.err.badCounter':
    'Invalid counter in “{token}”: use {i} or {i:03} (1 to 12 digits).',
  'batch.err.connect': 'Connect the machine to start the batch.',
  'batch.err.noPieces':
    'The sheet has no pieces (only the header or empty rows).',
  'batch.err.moduleMissing': 'Batch module not loaded.',
  'batch.loaded': 'Sheet “{name}” loaded: {pieces} pieces.',
  'batch.warnTooBigToSave':
    'Sheet too large to save: the batch will not resume after closing the app (open the CSV again).',
  'batch.state.running': 'Engraving piece {index} of {total}.',
  'batch.state.waiting':
    'Piece {index} of {total} done. Swap the piece and send the next one.',
  'batch.state.failed':
    'Piece {index} of {total} interrupted: {reason}. Swap or reposition and use “Start at piece”.',
  'batch.state.done': 'Batch complete: {total} pieces.',
  'batch.bar.running': 'Piece {index} of {total} · {done} done',
  'batch.bar.waiting': 'Piece {index} of {total} done — swap the piece',
  'batch.bar.failed': 'Piece {index} of {total} interrupted',
  'batch.hintRunning': 'Batch: piece {index} of {total} engraving.',
  'batch.hintWaiting':
    'Batch: piece {index} of {total} done. Swap the piece and click “Next piece”.',
  'batch.hintStored': 'Saved batch: next piece {index} of {total}.',
  'batch.pieceStart': 'Batch: sending piece {index} of {total}.',
  'batch.pieceDone': 'Batch: piece {index} of {total} done.',
  'batch.pieceFailed': 'Batch stopped at piece {index} of {total}: {reason}',
  'batch.pieceAborted':
    'Batch stopped at piece {index}: {reason}. Swap or reposition and use “Start at piece”.',
  'batch.done': 'Batch complete: {total} pieces engraved.',
  'batch.stopped':
    'Batch ended at piece {index} of {total}. Use “Resume batch” to continue.',
  'batch.resuming': 'Resuming the batch at piece {index} of {total}.',
  'batch.err.production':
    'A production run is in progress: end the run before starting the batch.',

  // ------------------------------------------- production mode (RF-GC-12)
  'prod.title': 'Production mode',
  'prod.copies': 'Copies',
  'prod.start': '▶ Production',
  'prod.startN': '▶ Production ({total}×)',
  'prod.hint':
    'Repeats the current program N times, pausing to swap the piece. Preflight runs once and the program cannot change mid-run.',
  'prod.next': '▶ Next piece',
  'prod.retry': '▶ Repeat piece',
  'prod.nextHint': 'After swapping the piece on the bed, send the next one.',
  'prod.retryHint': 'The piece was interrupted: reposition and repeat it.',
  'prod.stop': 'End',
  'prod.stopHint': 'Ends production mode (the running piece is cancelled).',
  'prod.state.running': 'Production: engraving piece {copy} of {total}.',
  'prod.state.waiting':
    'Piece {copy} of {total} done. Swap the piece and send the next one.',
  'prod.state.failed':
    'Piece {copy} of {total} interrupted: {reason}. Reposition and repeat it.',
  'prod.state.done': 'Production finished: {total} pieces.',
  'prod.bar.running': 'Piece {copy} of {total} · {done} done',
  'prod.bar.waiting': 'Piece {copy} of {total} done — swap the piece',
  'prod.bar.failed': 'Piece {copy} of {total} interrupted',
  'prod.pieceStart': 'Production: sending piece {copy} of {total}.',
  'prod.pieceDone': 'Production: piece {copy} of {total} done.',
  'prod.done': 'Production finished: {total} pieces engraved.',
  'prod.failed': 'Production stopped at piece {copy} of {total}: {reason}.',
  'prod.stopped': 'Production ended at piece {copy} of {total}.',
  'prod.endedByProgram':
    'Production ended: the program was swapped at piece {copy} of {total}.',
  'prod.err.connect': 'Connect the machine to start production.',
  'prod.err.noFile': 'Load a G-code before starting production.',
  'prod.err.alarm': 'Clear the alarm before starting production.',
  'prod.err.batch':
    'A batch is in progress: end the batch before starting production.',
  'prod.err.moduleMissing': 'Production module not loaded.',

  // ------------------------------------------------ welcome / onboarding
  'tour.title': 'Welcome to GRBL Studio',
  'tour.step': 'Step {n} of {total}',
  'tour.next': 'Next',
  'tour.finish': 'Finish',
  'tour.skip': 'Skip',
  'tour.dontShow': "Don't show on next launch",
  'tour.step1.title': 'Connect the engraver',
  'tour.step1.text':
    'Power the machine on, pick the USB port and click Connect. Without a ' +
    'connection you can still open files and preview, but not engrave.',
  'tour.step1.where': 'Where: left panel → Connection.',
  'tour.step2.title': 'Check the machine profile',
  'tour.step2.text':
    'Pick your model (or Generic GRBL). The profile carries the work area, ' +
    'the power ceiling and the laser module — it drives the % to S conversion.',
  'tour.step2.where': 'Where: left panel → Machine profile.',
  'tour.step3.title': 'Open the artwork',
  'tour.step3.text':
    'Image (PNG/JPG), SVG or G-code: use Open or Import SVG. Set size and ' +
    'position — the artwork bottom-left corner is the origin (X0 Y0).',
  'tour.step3.where': 'Where: top bar → Open / Import SVG.',
  'tour.step4.title': 'Preview before burning',
  'tour.step4.text':
    'The preview shows the path and the estimated time. Use Frame to draw ' +
    'the outline with a very weak laser and check the spot on the workpiece.',
  'tour.step4.where': 'Where: preview → Frame / Outline.',
  'tour.step5.title': 'Engrave safely',
  'tour.step5.text':
    'Set power and speed, check the mode (M4/M3) and press Play. Pause keeps ' +
    'the position; Stop cancels the job. Never leave the laser unattended.',
  'tour.step5.where': 'Where: job bar → Play / Pause / Stop.',
  // ------------------------------------------------------- vector drawing
  'design.title': 'Design',
  'design.tool.select': 'Select (V)',
  'design.tool.rect': 'Rectangle (R)',
  'design.tool.circle': 'Ellipse (E)',
  'design.tool.line': 'Line (L)',
  'design.tool.pen': 'Pen (P)',
  'design.tool.node': 'Edit nodes (N)',
  'design.tool.text': 'Text (T)',
  'design.delete': 'Delete (Del)',
  'design.clear': 'Clear',
  'design.maximize': 'Maximize/Restore',
  'design.undo': 'Undo (Ctrl+Z)',
  'design.redo': 'Redo (Ctrl+Y)',
  'design.snap': 'Snap',
  'design.objects': 'Objects',
  'design.speed': 'Speed (mm/min)',
  'design.power': 'Power (%)',
  'design.passes': 'Passes',
  'design.mode': 'Mode',
  'design.text.placeholder': 'Text…',
  'design.text.add': 'Add',
  'design.generate': 'Generate and preview',
  'design.save': 'Save .gcode…',
  'design.status.generating': 'Generating the drawing…',
  'design.status.done':
    'Drawing generated. Check the preview, then send or save.',
  'design.prop.w': 'W',
  'design.prop.h': 'H',
  'design.prop.rot': 'R',
  'design.lockAspect': 'Lock aspect ratio',
  'design.zoom.in': 'Zoom in (+)',
  'design.zoom.out': 'Zoom out (-)',
  'design.zoom.fit': 'Fit to page (F)',
  'design.align.left': 'Align left',
  'design.align.center': 'Center horizontally',
  'design.align.right': 'Align right',
  'design.align.top': 'Align top',
  'design.align.middle': 'Center vertically',
  'design.align.bottom': 'Align bottom',
  'design.order.front': 'Bring to front',
  'design.order.forward': 'Bring forward',
  'design.order.backward': 'Send backward',
  'design.order.back': 'Send to back',
  'design.group': 'Group (Ctrl+G)',
  'design.ungroup': 'Ungroup (Ctrl+Shift+G)',
  'design.duplicate': 'Duplicate (Ctrl+D)',
  'design.grid': 'Grid',
  'design.document': 'Document',
  'design.doc.width': 'Width',
  'design.doc.height': 'Height',
  'design.engraving': 'Engraving',
  'design.layers': 'Layers',
  'design.layer.defaultName': 'Layer {n}',
  'design.layer.name': 'Layer name',
  'design.layer.add': 'New layer',
  'design.layer.delete': 'Delete layer',
  'design.layer.up': 'Move layer up',
  'design.layer.down': 'Move layer down',
  'design.layer.mode': 'Layer mode',
  'design.layer.inherit': 'Inherit',
  'design.layer.power.hint':
    'Layer power (%) — empty uses the engraving default',
  'design.layer.speed.hint':
    'Layer speed (mm/min) — empty uses the engraving default',
  'design.layer.passes.hint': 'Layer passes — empty uses the engraving default',
  'design.layer.assign': 'Move selection',
  'design.layer.assigned': '{n} object(s) moved to {name}.',
  'design.layer.needSelection': 'Select at least one object to move.',
  'design.layer.deleted': 'Layer {name} deleted.',
  'design.cancel': 'Cancel',
  'design.text.title': 'Text',
  'design.text.content': 'Text',
  'design.text.font': 'Font',
  'design.text.size': 'Size (mm)',
  'design.text.mode': 'Mode',
  'design.text.mode.vector': 'Vector (outline)',
  'design.text.mode.stroke': 'Single stroke',
  'design.text.mode.fill': 'Filled (solid)',
  'design.text.spacing': 'Fill (lines/mm)',
  'design.text.unsupported':
    'Not in the single-stroke font (they become "?"): {chars} — use Vector mode for accents.',
  'design.text.noFill': 'Fill module not loaded.',
  'design.text.bold': 'Bold',
  'design.text.noContour': 'Contour module not loaded.',
  'design.sel.none': 'No object selected',
  'design.sel.one': '1 object selected',
  'design.sel.blocks': '{n} objects selected',
  'design.sel.all': 'All {n} objects selected',
  'design.obj.power': 'P',
  'design.obj.power.hint':
    'Object power (%) — empty uses the engraving default',
  'design.obj.speed': 'F',
  'design.obj.speed.hint':
    'Object feed (mm/min) — empty uses the engraving default',
  'design.obj.passes': 'N',
  'design.obj.passes.hint': 'Object passes — empty uses the engraving default',
  'design.obj.width': 'W',
  'design.obj.width.hint':
    'Stroke width (mm) — engraves a band centred on the path; empty = single line',
  'design.obj.widthPx': 'px',
  'design.obj.widthPx.hint':
    'Stroke width in pixels (1 px = 0.25 mm) — same measure as the mm field',
  'design.style.copy': 'Copy style (Ctrl+Shift+C)',
  'design.style.paste': 'Paste style (Ctrl+Shift+V)',
  'design.style.copied': 'Style copied.',
  'design.style.pasted': 'Style applied to the selection.',
  'design.style.none': 'Select an object first.',
  'design.style.empty': 'No style copied.',
  'design.mirror.h': 'Mirror horizontally',
  'design.mirror.v': 'Mirror vertically',
  'design.mirror.h.done': 'Selection mirrored horizontally.',
  'design.mirror.v.done': 'Selection mirrored vertically.',
  'design.distribute.h': 'Distribute horizontally',
  'design.distribute.v': 'Distribute vertically',
  'design.distribute.need3': 'Select 3 or more objects to distribute.',
  'design.distribute.h.done': 'Spacing evened out horizontally.',
  'design.distribute.v.done': 'Spacing evened out vertically.',
  'design.array': 'Array of copies…',
  'design.array.title': 'Array of copies',
  'design.array.hint':
    'Repeats the selection in columns and rows, offsetting each copy by the given step.',
  'design.array.cols': 'Columns',
  'design.array.rows': 'Rows',
  'design.array.stepX': 'X step (mm)',
  'design.array.stepY': 'Y step (mm)',
  'design.array.note':
    'The step is the distance between the corner of the original piece and the copy. Use the object size (or a bit more) so the copies sit side by side.',
  'design.array.create': 'Create copies',
  'design.array.need2':
    'Ask for more than one copy (columns × rows greater than 1).',
  'design.array.tooMany': 'Too many copies (max 1000). Reduce columns/rows.',
  'design.array.done': '{n} copy(ies) created.',
  'design.bool.menu': 'Boolean and offset',
  'design.bool.union': 'Weld (union)',
  'design.bool.subtract': 'Subtract',
  'design.bool.difference': 'Subtraction',
  'design.bool.intersect': 'Intersect',
  'design.bool.intersection': 'Intersection',
  'design.bool.xor': 'Exclusion',
  'design.bool.unavailable': 'Boolean feature unavailable. Rebuild the app.',
  'design.bool.need2':
    'Select 2 or more closed objects (rectangle, ellipse or text outline).',
  'design.bool.empty': 'The operation left no area. Nothing was changed.',
  'design.bool.failed': 'Operation failed: {msg}',
  'design.bool.done': '{n} object(s) in the result.',
  'design.offset': 'Offset…',
  'design.offset.hint':
    'Creates contours parallel to the selected shape. A positive distance grows the shape; a negative one shrinks it.',
  'design.offset.dist': 'Distance (mm)',
  'design.offset.passes': 'Passes',
  'design.offset.join': 'Corners',
  'design.offset.join.miter': 'Mitered',
  'design.offset.join.round': 'Rounded',
  'design.offset.join.bevel': 'Beveled',
  'design.offset.keep': 'Keep the original shape',
  'design.offset.note':
    'More than one pass produces concentric rings: the second at twice the distance, the third at three times, and so on.',
  'design.offset.need1':
    'Select a closed object (rectangle, ellipse or text outline).',
  'design.offset.zero': 'Enter a distance other than zero.',
  'design.offset.empty':
    'No contour fitted at that distance. Grow the shape or reduce the distance.',
  'design.offset.done': '{n} contour(s) created.',
  'design.offset.create': 'Create contours',
  'design.objects.empty': 'No objects yet.',
  'design.kind.rect': 'Rectangle',
  'design.kind.ellipse': 'Ellipse',
  'design.kind.line': 'Line',
  'design.kind.polygon': 'Shape',
  'design.kind.text': 'Text',
  'design.status.hint':
    'Draw with the tools on the left. Mouse wheel = zoom; middle button = pan. Engraving starts at X0 Y0 (bottom-left of the drawing): position the laser and set the origin where it will burn.',
  'design.status.needShape': 'Draw at least one shape.',
  'design.status.textEmpty': 'Type the text.',
  'design.status.textFail': 'Could not generate the text.',
  'design.status.copied': '{n} object(s) copied.',
  'design.status.grouped': 'Objects grouped.',
  'design.status.ungrouped': 'Objects ungrouped.',
  'design.status.undo': 'Undone.',
  'design.status.redo': 'Redone.',
  'design.size.title': 'Artwork size',
  'design.size.width': 'Width (mm)',
  'design.size.height': 'Height (mm)',
  'design.size.current': 'Current size: {w} × {h} mm',
  'design.size.note':
    'Fill in one side and the other follows the same ratio. Unlock the padlock to resize freely.',
  'design.size.invalid': 'Enter width and height greater than zero.',

  // ------------------------------------------------- execução e arquivo
  'run.title': 'Run',
  'file.open': 'Open G-code…',
  'file.none': 'No file loaded',
  'file.loaded': 'File loaded: {name} ({lines} lines)',
  'file.info': '{name} — {lines} lines · {size}',
  'file.infoTime': '{name} — {lines} lines · {size} · ~{time}',
  'file.infoGenerated':
    '{file} — {lines} lines · {size} (generated from {image})',
  'file.infoGeneratedTime':
    '{file} — {lines} lines · {size} · ~{time} (generated from {image})',
  'file.saved': 'G-code saved to {path}',

  // ------------------------------------------------ G-code editor (P1.10)
  'ged.open': 'Edit…',
  'ged.openHint': 'View, validate and resend a G-code range',
  'ged.title': 'G-code editor',
  'ged.validate': 'Validate',
  'ged.validating': 'Validating…',
  'ged.undo': 'Undo',
  'ged.save': 'Save .gcode…',
  'ged.editLine': 'Edit line',
  'ged.insertLine': 'Insert below',
  'ged.removeLine': 'Remove',
  'ged.sendFrom': '▶ Send from here',
  'ged.sendSel': '▶ Send range',
  'ged.line': 'Line {n} of {total}',
  'ged.selection': 'lines {from}–{to} ({count} selected)',
  'ged.summary':
    '{lines} lines · {commands} commands · {moves} moves · {comments} comments',
  'ged.summaryMaxS':
    '{lines} lines · {commands} commands · {moves} moves · {comments} comments · max S {smax}',
  'ged.locked':
    'Engraving in progress: editing and resending are blocked until it finishes.',
  'ged.empty': 'No G-code loaded to edit.',
  'ged.edited': 'edited',
  'ged.saved': 'G-code saved to {path}',
  'ged.saveFail': 'Could not save: {msg}',
  'ged.validOk': 'Pre-flight: no findings.',
  'ged.validIssues':
    'Pre-flight: {block} blocking · {warn} warning(s) · {info} note(s).',
  'ged.sendFromLog': 'Sending from line {line}…',
  'ged.sendSelLog': 'Sending lines {from}–{to}…',
  'ged.noConn': 'Connect the machine to send.',

  // ----------------------------------------------- job library (P2.9)
  'joblib.title': 'Job library',
  'joblib.open': 'Library…',
  'joblib.openHint': 'Recently run programs — re-run or duplicate',
  'joblib.empty':
    'No jobs yet. The last 50 programs you run show up here, with a thumbnail.',
  'joblib.count': '{count} of {max} jobs',
  'joblib.clear': 'Clear all',
  'joblib.confirm': 'Confirm',
  'joblib.clearConfirm': 'Remove all {count} jobs from the library?',
  'joblib.run': 'Re-run',
  'joblib.duplicate': 'Duplicate',
  'joblib.duplicateHint':
    'Loads a copy as the current program (adjust it before engraving)',
  'joblib.remove': 'Remove',
  'joblib.removeConfirm': 'Remove “{name}” from the library?',
  'joblib.removed': 'Job removed from the library.',
  'joblib.cleared': 'Job library cleared.',
  'joblib.loaded': 'Copy loaded: {name} ({lines} lines).',
  'joblib.unavailable': 'This job has no stored program.',
  'joblib.error': 'Job library: {msg}',
  'joblib.meta': '{date} · {lines} lines · {size}',
  'joblib.metaTime': '{date} · {lines} lines · {size} · ~{time}',
  'joblib.noProgram': 'no stored program',
  'joblib.source.file': 'File',
  'joblib.source.image': 'Image',
  'joblib.source.design': 'Design',
  'joblib.source.library': 'Library',
  'joblib.offline': 'Connect the machine to re-run.',
  'joblib.recording': 'This job joins the library when the engraving finishes.',
  'dxf.loaded':
    'DXF imported: {contours} contour(s), {width} × {height} mm (source unit: {unit})',
  'dxf.hidden': 'DXF: {n} entit(ies) on hidden layers ignored.',
  'dxf.ignored': 'DXF: {n} unsupported entit(ies) ignored: {types}.',
  'dxf.empty':
    'No geometry recognized in the DXF (text, hatches and dimensions are not converted).',
  'dxf.binary': 'Binary DXF is not supported. Export the file as ASCII DXF.',
  'dxf.moduleMissing': 'DXF import module not loaded.',
  'pdf.loaded':
    'PDF imported: {contours} contour(s), {width} × {height} mm ({pages} page(s)).',
  'pdf.pages': 'PDF has {pages} pages; only the first was imported.',
  'pdf.text':
    'PDF contains text: fonts are not outlined, so the text was not imported.',
  'pdf.images':
    'PDF: {n} bitmap image(s) ignored — only vectors are converted.',
  'pdf.empty': 'No vector path found in the PDF.',
  'pdf.encrypted': 'Protected (encrypted) PDF is not supported.',
  'pdf.damaged': 'Could not read the PDF (damaged or unsupported file).',
  'pdf.moduleMissing': 'PDF import function unavailable.',
  'pdf.unsupported': 'PDF: {types} not supported — section ignored.',
  'gcode.summary':
    'G-code generated: {lines} lines, {size}, {rows}×{cols} samples, ~{time}',
  'run.play': '▶ Start',
  'run.pause': '⏸ Pause',
  'run.resume': '▶ Resume',
  'run.cancel': '⏹ Cancel',
  'run.cancel.title': 'Cancel the job and stop the machine now (Esc / Ctrl+X)',
  'run.jobbar.label': 'Engraving controls',
  'run.state.engraving': 'Engraving…',
  'run.state.paused': 'Paused',
  'run.hint.noFileNoConn':
    'Generate the G-code (Image → G-code) or open a .gcode file and connect the machine to send.',
  'run.hint.noFile':
    'No G-code loaded: generate one in “Image → G-code” or open a .gcode file.',
  'run.hint.readyNoConn':
    'G-code ready ({lines} lines). Connect the machine via “Serial” to send.',
  'run.hint.sending': 'Sending to the machine…',
  'run.hint.ready': 'Ready to send ({lines} lines). Click ▶ Start.',
  'run.noGcode': 'No G-code loaded',
  'job.finished': 'Job finished.',
  'job.aborted': 'Job aborted: {reason}',

  // ------------------------------------------------------------- retomada
  'resume.title': 'Resume (RF-GC-7)',
  'resume.hint':
    'Interrupt a job to see the resume point. When continuing, the app re-asserts units, distance, offsets and the laser before the line.',
  'resume.line': 'Line',
  'resume.back': 'Back',
  'resume.suggest': 'Suggest (N before)',
  'resume.suggestTitle': 'Suggests done − back',
  'resume.start': '▶ Resume from here',
  'resume.interrupted':
    'Interrupted at line {done} of {total}. Suggestion: {suggestion}.',
  'resume.done': 'Job finished ({lines} lines).',
  'resume.idle': 'Interrupt a job to see the resume point.',
  'resume.resuming': 'Resuming from line {line}…',

  // --------------------------------------------------------------- macros
  'macro.title': 'Macros (RF-MAC-1)',
  'macro.hint': 'Connect to use the macros. Commands are queued one by one.',
  'macro.manage': 'Manage macros (import/export)',
  'macro.add': 'Add',
  'macro.reset': 'Restore defaults',
  'macro.new': 'New macro',
  'macro.run': 'Macro: {label}',
  'macro.notConnected': 'Connect to the machine to run the macro.',
  'macro.labelPlaceholder': 'Label',
  'macro.remove': 'Remove macro',
  'macro.gcodePlaceholder': 'G-code (one line per command)',
  'macro.exported': 'Macros exported: {path}',
  'macro.imported': 'Macros imported ({count}).',
  'macro.invalid': 'Invalid macros: {msg}',
  'macro.openFail': 'Failed to open macros: {msg}',
  'macro.exportFail': 'Failed to export macros: {msg}',
  'macro.def.unlock': 'Unlock ($X)',
  'macro.def.home': 'Home ($H)',
  'macro.def.report': 'Report state ($G)',
  'macro.def.goto-zero': 'Go to zero (X0 Y0)',
  'macro.def.set-zero': 'Set zero here',
  'macro.def.laser-off': 'Laser off',
  'macro.def.abs-mm': 'Absolute in mm',
  'macrogroup.preparacao': 'Preparation',
  'macrogroup.origem': 'Origin',
  'macrogroup.laser': 'Laser',
  'macrogroup.controle': 'Control',
  'macrogroup.outros': 'Other',

  // ------------------------------------------------------------ status/un.
  'status.feed': 'Feed',
  'status.units': 'Units',
  'status.unitsTitle': 'Display units (RF-APP-3)',
  'status.error': 'Error',
  'status.idle': 'Idle',
  'status.run': 'Run',
  'status.jog': 'Jog',
  'status.hold': 'Hold',
  'status.alarm': 'Alarm',
  'status.door': 'Door',
  'status.check': 'Check',
  'status.home': 'Home',
  'status.sleep': 'Sleep',
  'status.pins': 'Pins',
  'status.pinsHint': 'Active pins reported by the machine (Pn).',
  'status.pinsUnknown':
    'The machine does not report pins in this firmware (status mask $10). See the Machine panel.',

  // -------------------------------------------------------------- preview
  'preview.hint.image': 'Load an image to prepare the engraving file',
  'preview.hint.empty': 'Open a G-code or start a job to see the path.',
  'preview.hint.noMoves': 'This G-code has no moves to draw.',
  'preview.cut': 'Burn',
  'preview.pass': 'Pass {n}/{total}',
  'preview.rapid': 'Travel',
  'preview.workArea': 'Work area', // reference only, not part of the job
  'preview.tip': 'wheel: zoom · drag: pan · click: move · double click: fit',
  'preview.moveTitle': 'Move here?',
  'preview.moveCoords': 'X {x} · Y {y}',
  'preview.moveNote': 'in the active coordinate system',
  'preview.moveGo': 'Move (G0)',
  'preview.moveCancel': 'Cancel',
  'preview.moveBlocked': 'Can’t move: {why}.',
  'preview.moveWhy.offline': 'connect the machine',
  'preview.moveWhy.alarm': 'the machine is in alarm or the door is open',
  'preview.moveWhy.job': 'a job is running',

  'preview.simulate': 'Simulate',
  'preview.warning.area':
    '⚠ The path exceeds the configured area ({width}×{height} mm): {problems}.',
  'preview.area.negative': 'negative coordinates',
  'preview.area.xMax': 'X up to {value} > $130',
  'preview.area.yMax': 'Y up to {value} > $131',

  // -------------------------------------------------------------- console
  'console.placeholder':
    'Type a GRBL command and press Enter (e.g.: $$, $G, G0 X0 Y0)',

  // ------------------------------------------------- configurações ($$)
  'settings.open': 'Machine settings ($$)',
  'settings.title': 'Machine settings',
  'settings.read': 'Read $$',
  'settings.filter': 'Filter by name or key…',
  'settings.connectFirst': 'Connect to the machine to read the settings.',
  'settings.connectQuery': 'Connect to the machine to query.',
  'settings.querying': 'Querying…',
  'settings.noResponse': 'No response.',
  'settings.fail': 'Failed: {msg}',
  'settings.reading': 'Reading $$…',
  'settings.count': '{count} parameters read.',
  'settings.empty': 'The machine returned no settings.',
  'settings.readFail': 'Failed to read $$: {msg}',
  'settings.filterEmpty': 'No parameter matches the filter.',
  'settings.groupOther': 'Other',
  'settings.applying': 'Applying {key}…',
  'settings.updated': '{key} updated.',
  'settings.applyFail': 'Failed to apply {key}: {msg}',
  'settings.value': 'Value of {key}',
  'settings.fallbackName': 'Setting {key}',
  'settings.fallbackHelp':
    'Firmware parameter with no description in this app.',
  'settings.invalid': 'Invalid setting.',
  'settings.unknownQuery': 'Unknown query.',

  // ---------------------------------------------------------- validação
  'validate.empty': 'Enter a value.',
  'validate.nan': 'Expected a numeric value.',
  'validate.int': 'Use an integer.',
  'validate.min': 'Minimum value: {min}.',
  'validate.max': 'Maximum value: {max}.',

  // --------------------------------------- grupos das configurações $$
  'setgroup.passo-e-direcao': 'Step and direction',
  'setgroup.relatorio': 'Reporting',
  'setgroup.limites': 'Limits',
  'setgroup.homming': 'Homing',
  'setgroup.spindle-laser': 'Spindle/Laser',
  'setgroup.eixo-x': 'X axis',
  'setgroup.eixo-y': 'Y axis',
  'setgroup.eixo-z': 'Z axis',
  'setgroup.outros': 'Other',

  // ------------------------------------- nomes/ajuda das configurações $$
  'set.0.name': 'Step pulse width',
  'set.0.help':
    'STEP pulse duration (µs). Adjust for slow drivers; the default (10 µs) covers most.',
  'set.1.name': 'Step idle delay',
  'set.1.help':
    'Time (ms) the motor stays energized after stopping. 255 = always on; 0 = disables immediately.',
  'set.2.name': 'Invert step pulse',
  'set.2.help':
    'Mask (bits) that inverts the pulse signal. Use 0 if the axis does not move.',
  'set.3.name': 'Invert direction',
  'set.3.help': 'Mask to invert the axis direction (X=1, Y=2, Z=4).',
  'set.4.name': 'Invert driver enable',
  'set.4.help': 'Inverts the stepper driver enable pin.',
  'set.5.name': 'Invert limit pins',
  'set.5.help': 'Inverts the limit switch reading.',
  'set.6.name': 'Invert probe pin',
  'set.6.help': 'Inverts the probe reading.',
  'set.10.name': 'Status report mask',
  'set.10.help':
    'Chooses what `?` reports. Default 3 (machine and work position).',
  'set.11.name': 'Junction deviation',
  'set.11.help':
    'Controls smoothing between segments. Higher = wider corners; default 0.010 mm.',
  'set.12.name': 'Arc tolerance',
  'set.12.help':
    'Maximum error when approximating arcs with segments. Lower = more accurate and more G-code. 0.002 mm.',
  'set.13.name': 'Report in inches',
  'set.13.help':
    'When on, status and values are reported in inches (does not change G-code).',
  'set.20.name': 'Soft limits',
  'set.20.help':
    'Blocks moves that would exceed the travel ($130/$131). Requires homing first.',
  'set.21.name': 'Hard limits',
  'set.21.help': 'Stops when the physical limit switches are triggered.',
  'set.22.name': 'Homing cycle',
  'set.22.help':
    'Enables the homing routine (`$H`). Turn off if there are no switches.',
  'set.23.name': 'Homing direction invert',
  'set.23.help':
    'Inverts the direction in which the machine seeks the home switch.',
  'set.24.name': 'Homing feed',
  'set.24.help': 'Final approach speed of the homing.',
  'set.25.name': 'Homing seek rate',
  'set.25.help': 'Seek speed until the first limit switch detection.',
  'set.26.name': 'Limit switch debounce',
  'set.26.help': 'Switch settling time. Default 250 ms.',
  'set.27.name': 'Homing pull-off',
  'set.27.help': 'Distance pulled back after touching the homing switch.',
  'set.30.name': 'Max spindle RPM',
  'set.30.help':
    'Scales the max S. Use 1000 for laser instead of RPM; S goes from 0 to this value.',
  'set.31.name': 'Min spindle RPM',
  'set.31.help':
    'Minimum value where the spindle/relay turns on. Laser is usually 0.',
  'set.32.name': 'Laser mode',
  'set.32.help':
    '1 = M4 dynamic (power scales with speed) and allows moving without burning. 0 = spindle.',
  'set.100.name': 'Steps/mm X axis',
  'set.100.help':
    'Calibration: how many steps make 1 mm. 200-step motor, 16 micro, 2 mm/step → 1600.',
  'set.101.name': 'Steps/mm Y axis',
  'set.101.help': 'Calibration: how many steps make 1 mm.',
  'set.102.name': 'Steps/mm Z axis',
  'set.102.help': 'Calibration: how many steps make 1 mm.',
  'set.110.name': 'Max rate X',
  'set.110.help':
    'Rate (mm/min) the X axis reaches at cruise. Not usage; it is capacity.',
  'set.111.name': 'Max rate Y',
  'set.111.help': 'Max rate of the Y axis.',
  'set.112.name': 'Max rate Z',
  'set.112.help': 'Max rate of the Z axis.',
  'set.120.name': 'Acceleration X',
  'set.120.help':
    'Acceleration in mm/s². Too high loses steps; too low makes the job slow.',
  'set.121.name': 'Acceleration Y',
  'set.121.help': 'Acceleration in mm/s².',
  'set.122.name': 'Acceleration Z',
  'set.122.help': 'Acceleration in mm/s².',
  'set.130.name': 'Max travel X',
  'set.130.help':
    'Useful length of the X axis. Used for soft limits and the work area warning.',
  'set.131.name': 'Max travel Y',
  'set.131.help':
    'Useful length of the Y axis. Used for soft limits and the work area warning.',
  'set.132.name': 'Max travel Z',
  'set.132.help': 'Useful length of the Z axis.',

  // ------------------------------------------------ estatísticas e tempo
  'stats.format':
    '{rows} lines × {cols} samples · {segments} segments · {size} · ~{time}',
  'stats.contours': ' · {count} contours',
  'time.sec': '{s} s',
  'time.minSec': '{m} min {r} s',
  'time.min': '{m} min',

  // --------------------------------------------------------- erros (UI)
  'err.listPorts': 'Failed to list ports: {msg}',
  'err.connect': 'Error connecting: {msg}',
  'err.openFile': 'Failed to open the file: {msg}',
  'err.worker': 'Image worker unavailable: {msg}',
  'err.workerUnknown': 'Error in the image worker: {msg}',
  'err.generate': 'Failed to generate G-code: {msg}',
  'err.save': 'Failed to save: {msg}',
  'err.areaExceeded': 'Warning: the path exceeds the work area ({problems}).',
  'err.connectForFrame': 'Connect the machine to use positioning.',
  'err.noSerialPort': 'No serial port found. Connect the laser and try again.',
  'err.prefix': 'Error: {msg}',
  'err.unknown': 'unknown',

  // ---------------------------------- mensagens do processo main (cliente)
  'client.connClosed': 'Connection closed.',
  'client.connClosedWith': 'Connection closed: {msg}',
  'client.queryClosed': 'Connection closed before the response.',
  'client.queryNotConnected': 'Connect to the machine to query.',
  'client.queryBusy': 'A query is already in progress.',
  'client.queryTimeout': 'The machine did not answer "{line}" in {ms} ms.',
  'client.notConnected': 'Not connected.',
  'client.jobRunning': 'A job is already running.',
  'client.stopped': 'Stopped by the user.',
  'client.queryJobStarted':
    'Query cancelled: a job started while it was still queued.',
  'client.jogDollarUnsupported':
    'This firmware does not implement dedicated jog ($J=). "{line}" was rejected; moving with G91/G0/G90 instead.',
  'client.queryRetry':
    'The machine refused the first read after connecting ("{line}") — retrying once.',
  'client.linkLost':
    'The machine stopped responding (no status for {ms} ms) — the port probably dropped. Reconnect to continue.',
  'client.lineTooLong':
    'Line too long ({bytes} B) for the machine buffer ({max} B) — sending stopped to avoid corrupting the G-code. Excerpt: {line}',
  'client.reset': 'Reset by the user.',
  'client.writeFail': 'Failed to write to the serial port: {msg}',
  'client.stall':
    'The machine did not respond in {ms} ms while waiting for "ok". Sending paused — check the connection.',

  // -------------------------------------- diálogos nativos (main -> OS)
  'filter.macros': 'Macros (JSON)',
  'filter.all': 'All files',
  'dlg.openImage': 'Open image',
  'dlg.openGcode': 'Open G-code',
  'dlg.openLbdev': 'Open LightBurn profile (.lbdev)',
  'dlg.openCsv': 'Open batch sheet (CSV/TSV)',
  'dlg.openSvg': 'Open SVG',
  'dlg.openDxf': 'Open DXF',
  'dlg.openPdf': 'Open PDF',
  'dlg.saveGcode': 'Save G-code',
  'dlg.importMacros': 'Import macros',
  'dlg.exportMacros': 'Export macros',
  'dlg.open': 'Open',
  'dlg.import': 'Import',
  'dlg.notFile': 'The chosen path is not a file.',
  'dlg.imageTooBig': 'Image too large ({size}). Limit: {limit}.',
  'dlg.fileTooBig': 'File too large ({size}). Limit: {limit}.',
  'dlg.tooBig': 'File too large ({size}).',
  'dlg.missingContent': 'G-code content missing.',
  'dlg.missingMacros': 'Macro content missing.',
  'dlg.importPresets': 'Import material presets',
  'dlg.exportPresets': 'Export material presets',
  'dlg.missingPresets': 'Preset content missing.',

  // ----------------------------------------- alarmes do GRBL 1.1 (ALARM:n)
  'alarm.1':
    'Hard limit triggered. Position probably lost — re-homing recommended.',
  'alarm.2':
    'Soft limit: the move target exceeds the machine travel. It is safe to unlock.',
  'alarm.3':
    'Reset during motion. Position probably lost — re-homing recommended.',
  'alarm.4': 'Probe failure: unexpected initial state before the probe cycle.',
  'alarm.5':
    'Probe failure: the probe did not touch the workpiece within the programmed travel.',
  'alarm.6': 'Homing failure: reset during the homing cycle.',
  'alarm.7': 'Homing failure: safety door open during homing.',
  'alarm.8':
    'Homing failure: the limit switch did not clear on pull-off (increase the pull-off/check the wiring).',
  'alarm.9': 'Homing failure: limit switch not found within the seek distance.',

  // ------------------------------------------- erros do GRBL 1.1 (error:n)
  'error.1': 'Invalid G-code word: letter not found.',
  'error.2': 'Invalid numeric format or missing value.',
  'error.3': 'System command "$" not recognized or not supported.',
  'error.4': 'Negative value received where a positive one was expected.',
  'error.5': 'Homing cycle is not enabled in the settings ($22).',
  'error.6': 'Minimum step pulse time must be greater than 3 µs.',
  'error.7': 'EEPROM read failure. Reset to default values.',
  'error.8': 'Command "$" can only be used in the IDLE state.',
  'error.9': 'G-code blocked during alarm or jog state.',
  'error.10': 'Soft limits cannot be enabled without homing enabled.',
  'error.11': 'Maximum characters per line exceeded; the line was ignored.',
  'error.12': 'Setting value "$" exceeds the maximum supported step rate.',
  'error.13': 'Safety door open; door state entered.',
  'error.14': 'Build info/startup exceeded the EEPROM line limit.',
  'error.15': 'Jog target exceeds the machine travel; command ignored.',
  'error.16': 'Jog command without "=" or containing forbidden G-code.',
  'error.17': 'Laser mode requires PWM output ($32=1).',
  'error.20': 'Unsupported or invalid G-code command.',
  'error.21': 'More than one command of the same modal group on the line.',
  'error.22': 'Feed rate not defined.',
  'error.23': 'G-code command requires an integer value.',
  'error.24': 'Two commands requiring the same axis words on the line.',
  'error.25': 'Repeated G-code word on the line.',
  'error.26': 'No axis word found for the command/modal state.',
  'error.27': 'Line number (N) out of valid range.',
  'error.28': 'Required values (P/L) missing for the command.',
  'error.29': 'Unsupported work coordinate system.',
  'error.30': 'G53 requires an active motion mode (G0/G1).',
  'error.31': 'Command sent without a required P or L value.',
  'error.32': 'Command not supported in this firmware configuration.',
  'error.unknown': 'Error {code} (uncatalogued code).',
  'alarm.unknown': 'Alarm {code} (uncatalogued code).',

  // ------------------------------------------------- materiais (RF-IMG-8)
  'mat.papel-kraft': 'Kraft paper',
  'mat.compensado': 'Plywood',
  'mat.madeira-solida': 'Solid wood',
  'mat.bambu': 'Bamboo',
  'mat.folha-de-aluminio': 'Aluminum sheet',
  'mat.cortica': 'Cork',
  'mat.couro': 'Leather',
  'mat.silicagel': 'Silica gel',
  'mat.feltro-escuro': 'Dark felt',
  'mat.lata-tin-plate': 'Tin plate',
  'mat.tabua-de-madeira': 'Wood board',
  'mat.madeira-macica': 'Solid wood',
  'mat.vidro': 'Glass',
  'mat.ceramica': 'Ceramic',
  'mat.acrilico': 'Acrylic',
  'mat.aco-inoxidavel': 'Stainless steel',
  'mat.metal-anodizado': 'Anodized metal',
  'mat.tecido': 'Fabric',
  'mat.tabua-2-mm': '2 mm board',
  'mat.tabua-3-mm': '3 mm board',
  'mat.tabua-4-mm': '4 mm board',
  'mat.papelao': 'Cardboard',
  'mat.tabua-7-mm': '7 mm board',
  'mnote.passadas-1-m4': 'Passes: 1. M4.',
  'mnote.ajustes-padrao': 'Default settings.',
  'mnote.garanta-o-material-bem-plano-e-fixado':
    'Make sure the material is flat and secured.',
  'mnote.a-superficie-deve-ser-pintada-de-preto-ou-coberta-com-papel-de-transferencia-termica':
    'The surface MUST be painted black or covered with thermal transfer paper.',
  'mnote.a-superficie-deve-receber-papel-de-transferencia-termica':
    'The surface MUST be covered with thermal transfer paper.',
  'mnote.acrilico-transparente-exige-pintar-de-preto-a-face-inferior-superior':
    'Transparent acrylic requires painting the bottom/top face black.',
  'mnote.acrilico-transparente-exige-pintar-a-superficie-de-preto':
    'Transparent acrylic requires painting the surface black.',
  'mnote.marcacao-direta': 'Direct marking.',
  'mnote.marcacao-direta-sobre-a-superficie-bruta':
    'Direct marking on the raw surface.',
  'mnote.remocao-direta-do-revestimento-anodizado':
    'Direct removal of the anodized coating.',
  'mnote.potencia-menor-evita-queimar-e-desfiar-as-bordas':
    'Lower power prevents burning and fraying at the edges.',
  'mnote.passadas-1': 'Passes: 1.',
  'mnote.reduza-um-pouco-a-distancia-focal-para-dentro-do-material':
    'Reduce the focal distance slightly into the material.',
  'mnote.processamento-em-alta-velocidade': 'High-speed processing.',
  'mnote.potencia-muito-baixa-para-tecidos-leves':
    'Power too low for light fabrics.',
  'mnote.ajuste-a-distancia-focal-para-dentro-do-nucleo-do-material':
    'Set the focal distance into the core of the material.',
  'mnote.corte-limpo-em-alta-velocidade': 'Clean cut at high speed.',

  // --------------------------------------------------------------- temas
  'theme.light': 'Light',
  'theme.solarized-light': 'Solarized Light',
  'theme.sand': 'Sand',
  'theme.arctic': 'Arctic',
  'theme.silver': 'Silver',
  'theme.dark': 'Dark',
  'theme.midnight': 'Midnight',
  'theme.solarized-dark': 'Solarized Dark',
  'theme.oled': 'OLED (pure black)',
  'theme.hc-black': 'High contrast · Black',
  'theme.hc-white': 'High contrast · White',
  'theme.group.light': 'Light',
  'theme.group.dark': 'Dark',
  'theme.group.hc': 'High contrast',

  // ------------------------------------------------- aparência e idioma
  'appearance.title': 'Appearance and language',
  'appearance.language': 'Language',
  'appearance.theme': 'Theme',
  'appearance.hint': 'Theme and language are saved in preferences.',
  'lang.pt-BR': 'Português (Brasil)',
  'lang.en': 'English',
  'lang.es': 'Español',

  // ------------------------------------------------------- sobre / rodapé
  'about.title': 'About GRBL Studio',
  'about.description':
    'Native Linux alternative to LaserGRBL for controlling laser engravers and cutters with GRBL firmware.',
  'about.version': 'Version',
  'about.license': 'License',
  'about.author': 'Author',
  'about.developedBy': 'Developed by',
  'about.repository': 'Repository',
  'about.visit': 'Visit lab.werneck.dev.br',
  'footer.by': 'Developed by',
  'footer.about': 'About',

  // --------------------------------------------------------- menu nativo
  'menu.file': 'File',
  'menu.openGcode': 'Open G-code…',
  'menu.openSvg': 'Import SVG…',
  'menu.openDxf': 'Import DXF…',
  'menu.openPdf': 'Import PDF…',
  'menu.editGcode': 'Edit G-code…',
  'menu.jobLibrary': 'Job library…',
  'menu.quit': 'Quit',
  'menu.view': 'View',
  'menu.tools': 'Tools',
  'menu.materialTest': 'Material test grid…',
  'menu.focusTest': 'Focus test (spot)…',
  'menu.presets': 'Material presets…',
  'menu.design': 'Design…',
  'menu.theme': 'Theme',
  'menu.language': 'Language',
  'menu.appearance': 'Appearance and language…',
  'menu.help': 'Help',
  'menu.about': 'About GRBL Studio',
  'menu.site': 'WerneckLab website',
  'menu.tour': 'Welcome tour',

  // -------------------------------------------- console (RF-CON-14/15)
  'console.pause': 'Pause scroll',
  'console.resume': 'Resume scroll',
  'console.clear': 'Clear',
  'console.save': 'Save log…',
  'console.saved': 'Log saved to {path}',
  'console.saveFail': 'Failed to save log: {msg}',
  'dlg.saveLog': 'Save console log',
  'filter.log': 'Log (text)',
  'filter.presets': 'Presets (JSON)',

  // ------------------------------------------------ status (RF-STA-2/4/7)
  'status.dtg': 'To go',
  'status.remaining': 'Remaining',
  'status.alarmHint': 'Alarm active: use Unlock ($X) or Reset before moving.',
  'status.history.title': 'Alarm history',
  'status.history.empty': 'No alarm recorded.',
  'status.history.command': 'Rejected command:',
  'status.history.clear': 'Clear history',
  'alarmfix.1': 'Check the limit switch and home ($H) or send Unlock ($X).',
  'alarmfix.2':
    'Send Unlock ($X); to protect the machine, enable soft limits ($20) with homing ($22).',
  'alarmfix.3': 'Home ($H) to restore the origin before continuing.',
  'alarmfix.4':
    'Check the probe wiring and the pin initial state before probing.',
  'alarmfix.5':
    'Move the probe closer to the material or increase the probing travel.',
  'alarmfix.6': 'Repeat homing ($H); avoid resetting during the cycle.',
  'alarmfix.7': 'Close the safety door and repeat homing ($H).',
  'alarmfix.8':
    'Increase the pull-off ($27) and check the limit switch wiring.',
  'alarmfix.9':
    'Increase the homing seek ($25) and check the axis limit switch.',

  // ------------------------------------------------ conexão (RF-CON-5)
  'conn.firmware': 'Firmware: {value}',
  'conn.stateReport': 'Modal state: {value}',

  // ------------------------------------------------------ jog (RF-JOG-2/6)
  'jog.hold.title': 'Hold to move continuously; release to stop',
  'jog.keys.title': 'Arrows: X/Y · PageUp/PageDown: Z · Home: homing ($H)',

  // ------------------------------------ perfis de configuração (RF-CFG-4)
  'settings.profile.title': 'Setting profiles',
  'settings.profile.hint': 'Save the current $$ set and reapply it later.',
  'settings.profile.name': 'Profile name',
  'settings.profile.save': 'Save profile',
  'settings.profile.saveHint': 'Saves the current $$ values',
  'settings.profile.apply': 'Apply',
  'settings.profile.applyHint': 'Writes the profile values to the machine',
  'settings.profile.delete': 'Remove',
  'settings.profile.none': 'No profile saved',
  'settings.profile.saved': 'Profile “{name}” saved.',
  'settings.profile.applied': 'Profile “{name}” applied.',
  'settings.profile.deleted': 'Profile “{name}” removed.',
  'settings.profile.needName': 'Enter a profile name.',
  'settings.profile.applyFail': 'Failed to apply the profile: {msg}',

  // ---------------------------------------------- preferências (RF-CFG-5)
  'prefs.fileDir': 'Files folder',
  'prefs.fileDir.hint': 'Where files are opened and saved by default.',
  'prefs.fileDir.choose': 'Choose folder…',
  'prefs.fileDir.default': 'System default folder',
  'prefs.fileDir.changed': 'Files folder: {path}',
  'dlg.pickDir': 'Choose files folder',

  // --------------------------------------------- logs de sessão (RNF-9)
  'menu.logs': 'Open logs folder',
  'logs.none': 'No logs yet.',

  // --------------------------------------------- "Machine" panel (P0.7)
  'machine.open': 'Machine and diagnostics',
  'machine.title': 'Machine',
  'machine.read': 'Read from machine',
  'machine.reading': 'Reading…',
  'machine.copy': 'Copy diagnostics',
  'machine.copied': 'Diagnostics copied.',
  'machine.copyFail': 'Could not copy: {msg}',
  'machine.connectFirst': 'Connect to the machine to read its data.',
  'machine.noData': 'The machine returned no data.',
  'machine.fail': 'Read failed: {msg}',
  'machine.notInformed': 'not reported',
  'machine.report': 'Diagnostics',
  'machine.reportHint': 'Technical text for support — no personal data.',
  'machine.reportEmpty': 'Read the machine to generate the diagnostics.',
  'machine.section.firmware': 'Firmware',
  'machine.section.travel': 'Travel and limits',
  'machine.section.laser': 'Laser',
  'machine.section.motion': 'Motion',
  'machine.section.modal': 'Current state',
  'machine.section.offsets': 'Offsets',
  'machine.section.startup': 'Startup blocks',
  'machine.firmware.version': 'Version',
  'machine.firmware.build': 'Build',
  'machine.firmware.platform': 'Platform',
  'machine.firmware.options': 'Options',
  'machine.firmware.planner': 'Planner',
  'machine.firmware.buffer': 'RX buffer',
  'machine.travel.x': 'X travel',
  'machine.travel.y': 'Y travel',
  'machine.travel.z': 'Z travel',
  'machine.opt.V': 'Variable PWM',
  'machine.opt.C': 'CoreXY',
  'machine.opt.M': 'Mist',
  'machine.laser.mode': 'Laser mode ($32)',
  'machine.laser.smax': 'S ceiling ($30)',
  'machine.laser.smin': 'S floor ($31)',
  'machine.laser.pwm': 'PWM ($33)',
  'machine.limits.soft': 'Soft limits ($20)',
  'machine.limits.hard': 'Hard limits ($21)',
  'machine.limits.homing': 'Homing ($22)',
  'machine.motion.maxRate': 'Max rate',
  'machine.motion.accel': 'Acceleration',
  'machine.motion.steps': 'Steps/mm',
  'machine.modal.motion': 'Motion',
  'machine.modal.wcs': 'Work system',
  'machine.modal.units': 'Units',
  'machine.modal.distance': 'Distance',
  'machine.modal.spindle': 'Laser/spindle',
  'machine.modal.feed': 'Feed',
  'machine.modal.speed': 'Power (S)',
  'machine.status': 'State',
  'machine.offsets.work': 'Work (G54–G59)',
  'machine.offsets.refs': 'References (G28/G30)',
  'machine.offsets.tlo': 'TLO',
  'machine.offsets.prb': 'Probe (PRB)',
  'machine.startup.none': 'No startup blocks.',
  'machine.startup.warn': 'These commands run on every reset.',
  'machine.pins': 'Pins',
  'machine.pins.none': 'none',
  'machine.on': 'yes',
  'machine.off': 'no',
  'machine.unit.mm': 'mm',
  'machine.unit.mmmin': 'mm/min',
  'machine.unit.hz': 'Hz',
  'machine.unit.bytes': 'B',
  'machine.unit.blocks': 'blocks',

  // ---------------------------------------------- preflight MX-1…MX-15
  'preflight.title': 'Preflight',
  'preflight.chip': '{n} warning(s)',
  'preflight.chipHint': 'See the preflight checks',
  'preflight.intro': 'Checks before burning. Nothing was sent to the machine.',
  'preflight.startAnyway': 'Burn anyway',
  'preflight.blocked':
    '{n} blocker(s). Burning anyway may cut wrong or be rejected by GRBL.',
  'preflight.sev.block': 'blocks',
  'preflight.sev.warn': 'warning',
  'preflight.sev.info': 'info',
  'preflight.fix.setting':
    'Suggestion: set {code} to {value} (with confirmation).',
  'preflight.fix.action': 'Suggestion: {action}.',
  'preflight.action.open-machine': 'open the Machine panel',
  'preflight.action.fit-preview': 'review size/origin in the preview',
  'preflight.action.reduce-power': 'reduce power to the machine ceiling',
  'preflight.action.change-route': 'adjust the G-code before burning',
  'preflight.action.park': 'park a few mm away from zero',
  'preflight.MX-1.title': 'Power above the machine ceiling',
  'preflight.MX-1.detail':
    'The job asks for S={s}, but the machine caps at $30={smax}. Effective power will be lower.',
  'preflight.MX-2.title': 'Laser mode off',
  'preflight.MX-2.detail':
    'The job uses M3/M4 while the machine has $32=0 — GRBL answers error:17.',
  'preflight.MX-3.title': 'Job larger than travel',
  'preflight.MX-3.detail':
    'The job box exceeds travel by {x} mm in X and {y} mm in Y.',
  'preflight.MX-4.title': 'Soft limits without homing',
  'preflight.MX-4.detail':
    '$20=1 with $22=0 — GRBL answers error:10. Enable homing or disable soft limits.',
  'preflight.MX-5.title': 'G28/G30 without homing',
  'preflight.MX-5.detail':
    'The machine has $22=0 and the job uses G28/G30 — the position may not be what you expect.',
  'preflight.MX-6.title': 'Move without feed',
  'preflight.MX-6.detail':
    'Line {line} uses G1 without F and with no previous feed — GRBL answers error:22.',
  'preflight.MX-7.title': 'Safety input active',
  'preflight.MX-7.detail':
    'Active pins: {pin}. Clear the door/limit switch before burning.',
  'preflight.MX-8.title': 'No coolant output',
  'preflight.MX-8.detail':
    'The job uses {codes}, but this firmware has no mist output (no M in [OPT]).',
  'preflight.MX-9.title': 'Job in inches',
  'preflight.MX-9.detail':
    'The job uses G20 while the machine reports in mm ($13=0) — double-check dimensions.',
  'preflight.MX-10.title': 'Startup blocks',
  'preflight.MX-10.detail':
    '{n} $N block(s) run on every reset and may change state before the job.',
  'preflight.MX-11.title': 'Jog out of range',
  'preflight.MX-11.detail':
    'The jog asks for {step} mm / {feed} mm/min, above travel ({area} mm) or max rate ({maxRate} mm/min).',
  'preflight.MX-12.title': 'First cut without S',
  'preflight.MX-12.detail':
    'Line {line} enables the laser without setting S; GRBL keeps the previous job S and may burn with the old power.',
  'preflight.MX-13.title': 'Profile S-max differs from $30',
  'preflight.MX-13.detail':
    'The app uses 100% = {profile}, the machine uses $30={machine}. Effective power differs from the request.',
  'preflight.MX-14.title': 'RX buffer not reported',
  'preflight.MX-14.detail':
    'The firmware does not report the RX buffer in [OPT]; the send window uses the 128 B default.',
  'preflight.MX-15.title': 'Return to zero with hard limits',
  'preflight.MX-15.detail':
    'The job parks at X0 Y0 with $21=1 — the switch may trigger ALARM:1 and reset the controller.',
} satisfies Record<keyof typeof ptBR, string>;
