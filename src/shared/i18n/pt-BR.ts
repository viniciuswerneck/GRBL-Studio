/**
 * Catálogo i18n — português (Brasil). FONTE DA VERDADE DAS CHAVES.
 *
 * `en.ts` e `es.ts` declaram `satisfies Record<keyof typeof ptBR, string>`,
 * ou seja: o compilador **recusa** chave faltando ou sobrando — a paridade
 * entre idiomas é garantida por type-check (ver `tests/i18n.test.ts`).
 *
 * Placeholders usam `{chave}` e são interpolados por `t()` (ex.:
 * `t('file.loaded', { name, lines })`).
 *
 * Prefixos por área: `nav/conn/jog/ovr/img/frame/run/file/resume/macro/
 * status/preview/console/settings/validate/set./setgroup./stats/time/err/
 * client/dlg/alarm./error./mat./mnote./theme./appearance/about/footer/menu/
 * wizard/guide/mode/profile/action/tab`.
 */
export const ptBR = {
  // ------------------------------------------------------- navegação/comum
  'nav.back': 'Voltar',
  'nav.next': 'Próximo',
  'nav.close': 'Fechar',
  'nav.cancel': 'Cancelar',
  'nav.import': 'Importar…',
  'nav.export': 'Exportar…',

  // -------------------------------------------------------------- modos UI
  'assistant.open': 'Assistente',
  'assistant.close': 'Fechar assistente',
  'assistant.title': 'Assistente — guia iniciante',
  'mode.M4': 'M4 (dinâmico)',
  'mode.M3': 'M3 (constante)',

  // ------------------------------------------------------ perfil de máquina
  'profile.label': 'Perfil de máquina',
  'profile.title': 'Ajustes otimizados para a máquina',
  'profile.generic': 'Genérica (GRBL)',
  // Perfil de máquina: import `.lbdev` (P2.5) e smart connect.
  'profile.import': 'Importar .lbdev…',
  'profile.importHint':
    'Importa o perfil de máquina de um arquivo do LightBurn (.lbdev)',
  'profile.importError': 'Não foi possível importar o perfil: {error}',
  'profile.importError.invalid-json': 'o arquivo não é um .lbdev válido',
  'profile.importError.no-device': 'o arquivo não tem dispositivos',
  'profile.imported': 'Perfil importado: {name} ({area} mm)',
  'profile.suggestion': 'Sugestão: {name} — aplicar',
  'profile.reason.area': 'mesmo curso',
  'profile.reason.smax': 'mesmo teto de S',
  'profile.reason.homing': 'mesmo homing',
  'profile.applyTitle': 'Aplicar perfil de máquina',
  'profile.applyIntro': 'O perfil {name} escreve estes valores na máquina:',
  'profile.before': '{value} (atual)',
  'profile.unknown': 'não informado',
  'profile.change': '{code}: {before} → {after}',
  'profile.apply': 'Aplicar',
  'profile.applied': 'Perfil {name} aplicado.',
  'profile.module': 'Módulo',
  'profile.action': 'Ação',
  'profile.material.title': 'Perfil de material (RF-IMG-8)',
  'profile.material.hint':
    'Sugestões do manual da COMGO Z1 (§9). Aplicar o perfil preenche a ' +
    'Velocidade e a S-max lá embaixo — confira o resultado antes de gravar.',
  'profile.material.placeholder': '— escolher material —',
  'profile.material.choose':
    'Escolha um material para ver a recomendação do manual.',
  'profile.material.applied':
    '{power}% de potência (S-max {smax}) · {speed} mm/min · {notes}',
  'profile.material.unavailable': 'Perfis indisponíveis: rode `npm run build`.',
  'action.engrave': 'Gravação',
  'action.cut': 'Corte',

  // -------------------------------------------------------- guia (básico)
  'guide.close': 'Fechar assistente',
  'assistant.guideTitle': 'Assistente — guia iniciante',
  'guide.type.photo': 'Foto',
  'guide.type.bw': 'P&B',
  'guide.type.vector': 'Contorno',
  'wizard.startHint': 'Conecte a gravadora para começar.',
  'wizard.title': 'Passo {n} de {total} — {title}',
  'wizard.paramsTitle': 'Tamanho, tipo e material',
  'wizard.connected': 'Conectado. Clique em Próximo.',
  'wizard.connect': 'Conecte a gravadora.',
  'wizard.imageLoaded': '{name} carregada. Clique em Próximo.',
  'wizard.chooseImage': 'Escolha uma imagem.',
  'wizard.size': 'Tamanho (mm)',
  'wizard.defineParams': 'Defina o tamanho, o tipo e o material.',
  'wizard.gcodeReady': 'G-code pronto. Clique em Próximo.',
  'wizard.clickGenerate': 'Clique em Gerar G-code.',
  'wizard.positionHint':
    'Posicione o laser e use o contorno fraco (não queima).',
  'wizard.check': 'Confira tudo e clique em Gravar.',
  'wizard.next': 'Próximo',
  'wizard.finish': 'Concluir',

  // ----------------------------------------------------------- abas do app
  'tab.machine': 'Gravadora',
  'tab.image': 'Imagem',
  'tab.run': 'Execução',
  'tab.macros': 'Macros',

  // ------------------------------------------------------------- conexão
  'conn.title': 'Conexão',
  'conn.transport': 'Transporte',
  'conn.transport.title': 'Serial (USB) ou WiFi/TCP (RF-CON-7)',
  'conn.transport.serial': 'Serial (USB)',
  'conn.transport.tcp': 'WiFi (TCP)',
  'conn.refresh': 'Atualizar',
  'conn.portHint':
    'Nenhuma placa USB detectada. Conecte a gravadora e clique em Atualizar.',
  'conn.host': 'Host',
  'conn.port': 'Porta',
  'conn.tcpHint':
    'Ex.: ESP8266/ESP32 com firmware serial-over-TCP (Telnet 23). O GRBL 1.1 não muda.',
  'conn.connect': 'Conectar',
  'conn.disconnect': 'Desconectar',
  'conn.disconnected': 'Desconectado',
  'conn.connecting': 'Conectando…',
  'conn.connected': 'Conectado',
  'conn.error': 'Erro de conexão',
  'conn.selectPort': 'Selecione uma porta serial.',
  'conn.notConnected': 'Não conectado.',
  'conn.connectFirst': 'Conecte a máquina para enviar',
  'conn.settings': 'Configurações da máquina ($$)',
  'port.none': 'Nenhuma porta',

  // ------------------------------------------------------------------ jog
  'jog.title': 'Movimento',
  'jog.home.title': 'Homing da máquina (requer fim de curso)',
  'jog.home.noHoming': '{name}: sem homing de fábrica — use Definir origem',
  'jog.setOrigin': 'Origem aqui',
  'jog.gotoZero': 'Ir p/ zero',
  'jog.unlock': 'Unlock ($X)',
  'jog.reset': 'Reset',

  // ------------------------------------------------------------- overrides
  'ovr.title': 'Overrides (tempo real)',
  'ovr.hint':
    'Ajustam a máquina em movimento. O valor ativo vem do status (`Ov:`).',
  'ovr.feed': 'Feed',
  'ovr.rapid': 'Rápido',
  'ovr.spindle': 'Potência',
  'ovr.reset': 'Voltar a 100%',

  // ------------------------------------------------------- imagem → g-code
  'img.title': 'Imagem → G-code',
  'img.steps.hint':
    'Passo 1: escolha a imagem · Passo 2: gere o G-code · Passo 3: conecte e envie.',
  'img.choose': 'Escolher imagem',
  'img.chooseEllipsis': 'Escolher imagem…',
  'img.replace': 'Trocar imagem…',
  'img.none': 'Nenhuma imagem carregada',
  'img.dimension': 'Dimensionar (mm)',
  'img.width': 'Largura',
  'img.height': 'Altura',
  'img.offsetX': 'Offset X',
  'img.offsetY': 'Offset Y',
  'img.keepAspect': 'Manter proporção',
  'img.aspect.locked': 'Proporção travada: a altura acompanha a largura.',
  'img.aspect.free': 'Proporção livre: largura e altura são independentes.',
  'img.convert': 'Conversão',
  'img.algorithm': 'Algoritmo',
  'img.type': 'Tipo',
  'img.material': 'Material',
  'algo.vector': 'Vetorizar (contorno / recorte)',
  'img.lines': 'Linhas/mm',
  'img.direction': 'Direção',
  'img.dot': 'Ponto (mm)',
  'img.simplify': 'Suavização (px)',
  'img.algoHint':
    'Vetorizar gera só o contorno (recorte): o Limiar B&W define o que é ' +
    'recortado, e o desenho vira linhas fechadas a potência máxima (S-max).',
  'img.brightness': 'Brilho',
  'img.contrast': 'Contraste',
  'img.threshold': 'Limiar B&W',
  'img.invert': 'Inverter preto/branco',
  'img.bw': 'Preto e branco (limiar)',
  'img.engrave': 'Gravação',
  'img.speed': 'Velocidade',
  'img.passes': 'Passadas',
  'img.mode': 'Modo',
  'img.adaptive': 'Velocidade no claro (×)',
  'img.adaptive.title':
    'Acelera os trechos claros até N× a velocidade de gravação. O claro sai ' +
    'mais claro (dose = S ÷ velocidade); compense com S-max/white clip. Acima ' +
    'da velocidade máxima dos eixos ($110/$111) a queima enfraquece. 1 = ' +
    'desligado.',
  'img.bidirectional': 'Bidirecional (zigue-zague)',
  'img.bidirectional.title':
    'Grava a linha da esquerda para a direita e a seguinte da direita para a ' +
    'esquerda, sem o G0 de retorno. Quase dobra a velocidade em imagens largas. ' +
    'Desligue se a sua máquina deixar a ida e a volta com aparência diferente.',
  'img.speed.limits':
    'Velocidade máxima dos eixos ($110/$111): {x} / {y} mm/min.',
  'img.speed.over':
    'Pico de {peak} mm/min acima do limite do eixo ({max} mm/min): o GRBL ' +
    'corta a velocidade e a queima enfraquece. Reduza a velocidade ou a ' +
    'velocidade no claro.',
  'img.speed.unknown':
    'Conecte a gravadora para comparar com o limite dos eixos ($110/$111).',
  'img.generate': 'Gerar G-code',
  'img.generate.disabled': 'Escolha uma imagem primeiro',
  'img.generate.title': 'Converte a imagem em G-code',
  'img.generating': 'Gerando…',
  'img.save': 'Salvar .gcode',
  'img.save.disabled': 'Gere o G-code primeiro',
  'img.save.title': 'Salva o G-code em disco',
  'img.previewTag': '(prévia)',
  'img.reduced': ' (reduzida de {w}×{h})',
  'img.statsFail': 'Falha: {msg}',
  'img.error.open': 'Falha ao abrir a imagem',
  'img.error.invalid': 'Imagem inválida',
  'img.error.invalidDetail': '{name} não informa largura/altura.',
  'img.error.format': 'Formato não suportado',
  'img.error.formatDetail':
    '{name} não pôde ser decodificada. Use PNG, JPG, BMP, GIF, WebP ou AVIF.',

  // ------------------------------------------------------- posicionamento
  'frame.title': 'Posicionar a gravadora',
  'frame.group.move': 'Mover a cabeça',
  'frame.group.check': 'Conferir a área',
  'frame.group.job': 'Gravação',
  'frame.home.title': 'Home (referenciar os eixos)',
  'frame.hint':
    'Use as setas para aproximar o laser da área. “Desenhar contorno” ' +
    'contorna a área com laser bem fraco e “Marcar centro” leva o laser ' +
    'até o centro da imagem (laser fraco por um instante).',
  'frame.setOrigin': 'Definir origem aqui',
  'frame.origin': 'Ir para origem (0,0)',
  'frame.outline': 'Desenhar contorno',
  'frame.center': 'Marcar centro',
  'frame.center.title':
    'Leva o laser até o centro da imagem (laser fraco por um instante)',
  'frame.center.done': 'Laser no centro da imagem (laser fraco).',
  'frame.start': '▶ Gravar',
  'frame.power': 'Potência da gravação (%)',
  'frame.speed': 'Velocidade de gravação (mm/min)',
  'frame.position': 'Posicionar',
  'frame.engrave': 'Gravar',
  'frame.status.connected':
    'Máquina conectada. Posicione e desenhe o contorno para conferir.',
  'frame.status.disconnected':
    'Conecte a máquina para posicionar e desenhar o contorno.',
  'frame.outline.done': 'Contorno enviado (laser bem fraco).',
  'frame.generating': 'Gerando G-code com os parâmetros do modal…',
  'frame.connect': 'Conectar máquina',
  'frame.connect.noPort':
    'Nenhuma porta serial encontrada. Verifique o cabo e clique em “Conectar máquina”.',

  // ------------------------------------------------------- teste de material
  'matTest.title': 'Grade de teste de material',
  'matTest.hint':
    'Grava uma grade de quadrados, cada um com uma combinação de velocidade e ' +
    'potência. Use-a para descobrir os parâmetros ideais para um material.',
  'matTest.cols': 'Colunas (passos de velocidade)',
  'matTest.rows': 'Linhas (passos de potência)',
  'matTest.speedMin': 'Velocidade mínima (mm/min)',
  'matTest.speedMax': 'Velocidade máxima (mm/min)',
  'matTest.powerMin': 'Potência mínima (%)',
  'matTest.powerMax': 'Potência máxima (%)',
  'matTest.cellSize': 'Lado da célula (mm)',
  'matTest.spacing': 'Espaço entre células (mm)',
  'matTest.passes': 'Passadas',
  'matTest.mode': 'Modo do laser',
  'matTest.generate': 'Gerar e visualizar',
  'matTest.save': 'Salvar .gcode…',
  'matTest.status.generating': 'Gerando a grade de teste…',
  'matTest.status.done': 'Grade gerada. Confira no preview e envie ou salve.',
  // --------------------------------------- teste de foco (RF-IMG-13)
  'focus.title': 'Teste de foco (spot)',
  'focus.hint':
    'Grava uma escada de linhas, com o Z variando a cada par: a linha mais fina indica o melhor foco. O Z é relativo ao Z atual — o programa desce, sobe e volta ao início. Deixe folga e o Cancelar à mão.',
  'focus.steps': 'Passos de Z',
  'focus.zStep': 'Passo de Z (mm)',
  'focus.zSign': 'Sentido do Z',
  'focus.zSignUp': 'Z+ afasta do material',
  'focus.zSignDown': 'Z+ aproxima do material',
  'focus.length': 'Comprimento da linha (mm)',
  'focus.spacing': 'Espaço entre linhas (mm)',
  'focus.feed': 'Avanço (mm/min)',
  'focus.powerLow': 'Potência baixa (%)',
  'focus.powerHigh': 'Potência alta (%)',
  'focus.mode': 'Modo do laser',
  'focus.generate': 'Gerar e visualizar',
  'focus.save': 'Salvar .gcode…',
  'focus.preview':
    '{lines} linhas em {steps} passos de Z: {zMin} a {zMax} mm (a partir do Z atual).',
  'focus.warn.samePower':
    'As duas potências são iguais — use valores diferentes para comparar o foco na marcação e no corte.',
  'focus.status.done':
    'Teste de foco gerado ({steps} passos). Confira no preview e envie ou salve.',
  'focus.err.moduleMissing': 'Módulo do teste de foco não carregado.',
  // ------------------------------------ presets de material (P2.12/RF-IMG-8)
  'preset.title': 'Presets de material',
  'preset.hint':
    'Receitas que deram certo: potência, velocidade, passadas e notas. Exporte para compartilhar; importe para repetir sem refazer a grade de testes.',
  'preset.new': 'Novo preset',
  'preset.name': 'Nome',
  'preset.notes': 'Notas (opcional)',
  'preset.fromCurrent':
    'Fonte: {module} · {action} · {power}% · {speed} mm/min · {passes} passada(s).',
  'preset.defaultName': 'Receita {n}',
  'preset.create': 'Salvar ajustes atuais',
  'preset.saveCurrent': 'Salvar como preset…',
  'preset.manage': 'Meus presets…',
  'preset.empty':
    'Nenhum preset ainda. Ajuste a potência e a velocidade, dê um nome e salve os ajustes atuais.',
  'preset.apply': 'Aplicar',
  'preset.convert': 'Ajustar à máquina',
  'preset.remove': 'Excluir',
  'preset.meta': '{module} · {action} · {power}% · {speed} mm/min · {passes}×',
  'preset.dose': 'Dose {dose} J/mm',
  'preset.doseHint':
    'Dose = energia por milímetro (aproximada, sem o ponto do laser): serve para comparar receitas e transferir entre módulos.',
  'preset.hint.applied':
    'Preset “{name}”: {power}% · {speed} mm/min · {passes} passada(s).',
  'preset.import': 'Importar…',
  'preset.export': 'Exportar…',
  'preset.status.created': 'Preset “{name}” salvo.',
  'preset.status.applied':
    'Preset “{name}” aplicado: {power}% · {speed} mm/min · {passes} passada(s).',
  'preset.status.converted':
    'Dose preservada: {from}% ({fromModule}) → {to}% ({toModule}).',
  'preset.status.convertLimited':
    'O módulo {toModule} da máquina não alcança a dose da receita ({fromModule}) — ficou em 100%. Reduza a velocidade para manter a dose.',
  'preset.status.removed': 'Preset removido.',
  'preset.status.imported': '{n} preset(s) importado(s).',
  'preset.status.importedSkipped': ' {n} inválido(s) ignorado(s).',
  'preset.status.exported': 'Presets exportados para {path}.',
  'preset.err.name': 'Dê um nome ao preset.',
  'preset.err.moduleMissing': 'Módulo de presets não carregado.',
  'preset.err.import': 'Não foi possível ler o arquivo: {msg}',
  'preset.err.empty': 'O arquivo não tem presets válidos.',

  // ------------------------------------------------ QR Code (v0.6, RF-SYM-1)
  'menu.qrCode': 'Código 2D (QR / Data Matrix)…',
  // Grade de símbolos (RF-SYM-9): comum aos modais 2D e 1D.
  'sym.grid': 'Grade: uma lista, 1 símbolo por linha',
  'sym.gridHint':
    'Com a grade ligada, cada linha do conteúdo vira um símbolo, disposto em colunas e linhas.',
  'sym.gridColumns': 'Colunas (vazio = automático)',
  'sym.gridGap': 'Espaçamento (mm)',
  'sym.status.grid':
    'Grade gerada: {count} símbolo(s) · {cols} × {rows} · {w} × {h} mm. Confira no preview e envie ou salve.',
  'qr.title': 'Código 2D',
  'qr.hint':
    'Gera um QR Code, um Data Matrix, um PDF417 ou um Aztec como G-code de ' +
    'varredura: ' +
    'escolha o símbolo, o conteúdo e o tamanho (mm ou lado do módulo) e grave. A ' +
    'origem da arte é o canto inferior esquerdo (X0 Y0).',
  'qr.content': 'Conteúdo',
  'qr.contentPlaceholder': 'https://exemplo.com ou um texto',
  'qr.symbology': 'Símbolo',
  'qr.sym.qr': 'QR Code',
  'qr.sym.datamatrix': 'Data Matrix',
  'qr.sym.pdf417': 'PDF417',
  'qr.sym.aztec': 'Aztec',
  'qr.ecc': 'Correção de erro',
  'qr.ecc.L': 'L — 7%',
  'qr.ecc.M': 'M — 15%',
  'qr.ecc.Q': 'Q — 25%',
  'qr.ecc.H': 'H — 30%',
  'qr.version': 'Versão',
  'qr.versionAuto': 'Automática',
  'qr.size': 'Tamanho (mm)',
  'qr.width': 'Largura (mm)',
  'qr.height': 'Altura (mm)',
  'qr.keepAspect': 'Quadrado',
  'qr.keepAspectHint':
    'Mantém a largura igual à altura (o símbolo é quadrado).',
  'qr.sizeHint':
    'Em branco usa o lado do módulo. Largura ≠ altura estica o símbolo e ' +
    'pode atrapalhar a leitura.',
  'qr.module': 'Lado do módulo (mm)',
  'qr.quietZone': 'Quiet zone (módulos)',
  'qr.linesPerMm': 'Linhas de varredura por mm',
  'qr.power': 'Potência (%)',
  'qr.feed': 'Velocidade (mm/min)',
  'qr.passes': 'Passadas',
  'qr.mode': 'Modo do laser',
  'qr.mode.m4': 'M4 (dinâmico)',
  'qr.mode.m3': 'M3 (constante)',
  'qr.overscan': 'Overscan (mm)',
  'qr.invert': 'Polaridade invertida (queimar o fundo)',
  'qr.generate': 'Gerar e visualizar',
  'qr.save': 'Salvar .gcode…',
  'qr.status.generating': 'Gerando o QR Code…',
  'qr.moduleMissing': 'Gerador de QR Code não carregado.',
  'qr.status.done':
    'QR gerado: {version} · {size}×{size} módulos · {w} × {h} mm · ' +
    'módulo {module} mm. Confira no preview e envie ou salve.',
  'qr.err.empty': 'Informe um conteúdo para gerar o QR Code.',
  'qr.err.too-long':
    'O conteúdo é longo demais para um QR Code no nível {ecc}.',
  'qr.err.bad-version': 'Versão da informação de formato inválida.',
  'qr.err.unknown': 'Não foi possível gerar o QR Code com esses parâmetros.',
  'qr.warn.module-small':
    'Módulo menor que 2× o ponto do laser: o código pode sair ilegível.',
  'qr.warn.module-tiny':
    'Módulo abaixo de 0,3 mm: pequeno demais para a maioria dos leitores.',
  'qr.warn.quiet-zone-small':
    'Quiet zone menor que a norma (4 módulos): dificulta a leitura.',
  'qr.warn.lines-too-few':
    'Menos de 3 linhas de varredura por módulo: o preenchimento pode sair com falhas.',
  'qr.warn.outside-work-area':
    'O símbolo não cabe na área de trabalho a partir desta origem.',
  'qr.warn.stretched':
    'Largura diferente da altura: o símbolo sai esticado e a leitura pode falhar.',

  // ------------------------------- Código de barras 1D (v0.6, RF-SYM-2)
  'menu.barCode': 'Código de barras…',
  'dm.title': 'Data Matrix',
  'dm.size': 'Tamanho do símbolo',
  'dm.sizeAuto': 'Automático (o menor que couber)',
  'dm.status.done':
    'Data Matrix gerado: {size}×{size} módulos · {w} × {h} mm · módulo ' +
    '{module} mm. Confira no preview e envie ou salve.',
  'dm.err.empty': 'Informe um conteúdo para gerar o Data Matrix.',
  'dm.err.too-long': 'Conteúdo longo demais para um Data Matrix.',
  'dm.err.bad-chars':
    'O Data Matrix ECC200 aceita só Latin-1 (sem emoji ou outro UTF-8).',
  'dm.err.bad-size': 'Tamanho de Data Matrix inválido.',
  'dm.err.unknown':
    'Não foi possível gerar o Data Matrix com esses parâmetros.',

  // ----------------------------------------- PDF417 (v0.8, RF-SYM-7)
  'pdf.title': 'Código PDF417',
  'qr.pdf.ecc': 'Correção de erro',
  'qr.pdf.eccOption': 'Nível {level} — {ec} codewords',
  'qr.pdf.cols': 'Colunas de dados (vazio = automático)',
  'qr.pdf.rowHeight': 'Altura da linha (mm)',
  'pdf.status.done':
    'PDF417 gerado: {rows} × {cols} codewords · EC nível {ecc} · {w} × {h} mm · ' +
    'módulo {module} mm · linha {row} mm. Confira no preview e envie ou salve.',
  'pdf.err.empty': 'Informe um conteúdo para gerar o PDF417.',
  'pdf.err.too-long':
    'Conteúdo longo demais para um PDF417 com esses parâmetros.',
  'pdf.err.bad-options':
    'Parâmetros de PDF417 inválidos (colunas de dados fora de 1…30).',
  'pdf.err.bad-chars': 'O PDF417 aceita só Latin-1 (sem emoji ou outro UTF-8).',
  'pdf.err.unknown': 'Não foi possível gerar o PDF417 com esses parâmetros.',

  // ----------------------------------------- Aztec (RF-SYM-7)
  'aztec.title': 'Código Aztec',
  'qr.aztec.ecc': 'Correção de erro (%)',
  'qr.aztec.eccHint':
    'A norma ISO/IEC 24778 pede no mínimo 23 %. Mais correção = símbolo maior.',
  'aztec.status.done':
    'Aztec gerado: {size}×{size} módulos · {layers} camadas · {w} × {h} mm · ' +
    'módulo {module} mm. Confira no preview e envie ou salve.',
  'aztec.err.empty': 'Informe um conteúdo para gerar o Aztec.',
  'aztec.err.too-long':
    'Conteúdo longo demais para um Aztec (o máximo é 32 camadas).',
  'aztec.err.bad-chars':
    'O Aztec aceita só Latin-1 (sem emoji ou outro UTF-8).',
  'aztec.err.layers': 'Camadas inválidas para esse conteúdo.',
  'aztec.err.unknown': 'Não foi possível gerar o Aztec com esses parâmetros.',

  'bar.title': 'Código de barras',
  'bar.hint':
    'Gera um código de barras 1D como G-code: escolha a simbologia, o conteúdo ' +
    'e o tamanho. As barras são preenchidas na vertical (ao longo delas) e o ' +
    'texto legível (HRI) sai com a fonte de traço único. A origem é o canto ' +
    'inferior esquerdo (X0 Y0).',
  'bar.symbology': 'Simbologia',
  'bar.sym.code128': 'Code 128 — texto livre',
  'bar.sym.ean13': 'EAN-13 — 12 dígitos (+ verificador)',
  'bar.sym.ean8': 'EAN-8 — 7 dígitos (+ verificador)',
  'bar.sym.upca': 'UPC-A — 11 dígitos (+ verificador)',
  'bar.sym.code39': 'Code 39 — A–Z, 0–9 e -.$/+%',
  'bar.sym.itf14': 'ITF-14 — 13 dígitos (+ verificador GS1)',
  'bar.sym.codabar': 'Codabar — A–D, 0–9 e -$:/.+',
  'bar.sym.code93': 'Code 93 — A–Z, 0–9 e -.$/+%',
  'bar.sym.gs1-128': 'GS1-128 — Code 128 com FNC1 (^ separa campos)',
  'bar.hint.itf14':
    'Informe 13 dígitos (o verificador mod 10 é calculado) ou 14 (conferido).',
  'bar.hint.codabar':
    'Comece e termine com A–D (ex.: A1234B); sem guards, usa A…A.',
  'bar.hint.code93':
    'Alfabeto básico (47 símbolos). Os verificadores C e K são automáticos.',
  'bar.hint.gs1':
    'No GS1-128, ^ marca o fim de um campo (FNC1). A validação de AI fica ' +
    'por sua conta.',
  'bar.content': 'Conteúdo',
  'bar.contentPlaceholder': 'GRBL-STUDIO-001',
  'bar.checksum': 'Verificação mod 43 (Code 39)',
  'bar.ratio': 'Razão largo:estreito',
  'bar.ratio.2': '2:1 (mais estreito)',
  'bar.ratio.3': '3:1 (recomendado)',
  'bar.width': 'Largura final (mm)',
  'bar.widthHint':
    'Em branco usa o X-dimension. A largura inclui a quiet zone.',
  'bar.xDim': 'X-dimension (mm)',
  'bar.barHeight': 'Altura das barras (mm)',
  'bar.quietZone': 'Quiet zone (módulos)',
  'bar.linesPerMm': 'Linhas de varredura por mm',
  'bar.hri': 'Mostrar o texto (HRI) sob as barras',
  'bar.power': 'Potência (%)',
  'bar.feed': 'Velocidade (mm/min)',
  'bar.passes': 'Passadas',
  'bar.mode': 'Modo do laser',
  'bar.mode.m4': 'M4 (dinâmico)',
  'bar.mode.m3': 'M3 (constante)',
  'bar.overscan': 'Overscan (mm)',
  'bar.invert': 'Polaridade invertida (queimar o fundo)',
  'bar.generate': 'Gerar e visualizar',
  'bar.save': 'Salvar .gcode…',
  'bar.status.generating': 'Gerando o código de barras…',
  'bar.moduleMissing': 'Gerador de código de barras não carregado.',
  'bar.status.done':
    '{sym} gerado: {modules} módulos · {w} × {h} mm · X-dim {xdim} mm. ' +
    'Confira no preview e envie ou salve.',
  'bar.err.empty': 'Informe um conteúdo para gerar o código de barras.',
  'bar.err.bad-chars':
    'Há um caractere que esta simbologia não aceita (veja o log).',
  'bar.err.bad-length':
    'O comprimento do conteúdo não serve para esta simbologia (veja o log).',
  'bar.err.bad-option': 'Combinação de opções inválida para esta simbologia.',
  'bar.err.check-digit':
    'Dígito verificador inválido: esperado {expected}, informado {given}.',
  'bar.warn.module-small':
    'X-dimension menor que 2× o ponto do laser: o código pode sair ilegível.',
  'bar.warn.module-tiny':
    'X-dimension abaixo de 0,3 mm: pequeno demais para a maioria dos leitores.',
  'bar.warn.quiet-zone-small':
    'Quiet zone menor que a norma: dificulta a leitura.',
  'bar.warn.lines-too-few':
    'Menos de 3 linhas de varredura por módulo: o preenchimento pode sair com falhas.',
  'bar.warn.outside-work-area':
    'O símbolo não cabe na área de trabalho a partir desta origem.',
  'bar.warn.x-dim-small':
    'X-dimension abaixo do mínimo da norma: risco de o leitor não ler.',
  'bar.warn.bar-height-small':
    'Barras mais baixas que o mínimo recomendado: dificulta a leitura.',
  'bar.warn.hri-chars':
    'O HRI tem caracteres sem glifo na fonte: saem como “?”.',
  'bar.warn.uppercased':
    'O Code 39 só grava maiúsculas — o conteúdo foi convertido, e o leitor vai devolver em maiúsculas.',

  // ---------------------------- lote / dados variáveis (v0.8, RF-SYM-10)
  'menu.batch': 'Lote de dados variáveis…',
  'batch.title': 'Lote — dados variáveis',
  'batch.hint':
    'Cada linha da planilha é uma peça. O app grava uma, pausa para você trocar a peça e segue para a próxima. A geometria usa os ajustes do símbolo (Ferramentas → Código 2D / código de barras).',
  'batch.kind': 'Tipo de peça',
  'batch.kind2d': 'Código 2D (QR, Data Matrix, PDF417, Aztec)',
  'batch.kind1d': 'Código de barras (1D)',
  'batch.file': 'Planilha',
  'batch.openFile': 'Abrir CSV…',
  'batch.csv': 'Cole a planilha (CSV/TSV)',
  'batch.csvPlaceholder': 'nome,cargo\nAna,Dev',
  'batch.hasHeader': 'A primeira linha é o cabeçalho',
  'batch.delimiter': 'Separador',
  'batch.delimiterAuto': 'Automático',
  'batch.delimiterComma': 'Vírgula (,)',
  'batch.delimiterSemicolon': 'Ponto e vírgula (;)',
  'batch.delimiterTab': 'Tabulação',
  'batch.delimiterPipe': 'Barra vertical (|)',
  'batch.template': 'Modelo de cada peça',
  'batch.from': 'Começar na peça',
  'batch.fields': 'Campos disponíveis',
  'batch.templateHint':
    '{1}, {2}… usam a coluna pela posição; { nome } pelo cabeçalho; {i} é o contador de peças (com zeros à esquerda: {i:03}); {total} é o tamanho do lote. {{ e }} escrevem uma chave.',
  'batch.refresh': 'Atualizar prévia',
  'batch.forget': 'Esquecer lote',
  'batch.start': 'Iniciar lote',
  'batch.startFrom': 'Iniciar na peça {index}',
  'batch.open': 'Lote (CSV)…',
  'batch.openHint':
    'Grava uma peça por linha de uma planilha (QR/código de barras com dados variáveis).',
  'batch.resume': '▶ Retomar lote',
  'batch.stop': 'Encerrar lote',
  'batch.next': '▶ Próxima peça',
  'batch.nextHint': 'Depois de trocar a peça na mesa, envie a próxima do lote.',
  'batch.colPiece': 'Peça',
  'batch.colContent': 'Conteúdo',
  'batch.info': '{pieces} peças · {columns} colunas',
  'batch.infoHeader': 'com cabeçalho',
  'batch.warnDropped':
    '{count} linhas ficaram de fora (limite de 2 000 peças por lote).',
  'batch.warnTruncated': '{count} células foram cortadas em 200 caracteres.',
  'batch.previewEmpty':
    'Cole ou abra uma planilha para ver a prévia das peças.',
  'batch.err.empty':
    'O modelo está vazio: informe o que cada peça deve conter.',
  'batch.err.unclosed': 'Falta fechar a chave em “{token}”.',
  'batch.err.badColumn': 'A coluna de “{token}” não existe nesta planilha.',
  'batch.err.unknownField':
    'O campo “{token}” não está no cabeçalho da planilha.',
  'batch.err.badCounter':
    'Contador inválido em “{token}”: use {i} ou {i:03} (1 a 12 dígitos).',
  'batch.err.connect': 'Conecte a máquina para iniciar o lote.',
  'batch.err.noPieces':
    'A planilha não tem nenhuma peça (só o cabeçalho ou linhas vazias).',
  'batch.err.moduleMissing': 'Módulo do lote não carregado.',
  'batch.loaded': 'Planilha “{name}” carregada: {pieces} peças.',
  'batch.warnTooBigToSave':
    'Planilha grande demais para guardar: o lote não será retomado depois de fechar o app (abra o CSV de novo).',
  'batch.state.running': 'Gravando a peça {index} de {total}.',
  'batch.state.waiting':
    'Peça {index} de {total} pronta. Troque a peça e envie a próxima.',
  'batch.state.failed':
    'Peça {index} de {total} interrompida: {reason}. Troque ou reposicione e use “Começar na peça”.',
  'batch.state.done': 'Lote concluído: {total} peças.',
  'batch.bar.running': 'Peça {index} de {total} · {done} concluídas',
  'batch.bar.waiting': 'Peça {index} de {total} pronta — troque a peça',
  'batch.bar.failed': 'Peça {index} de {total} interrompida',
  'batch.hintRunning': 'Lote: peça {index} de {total} em gravação.',
  'batch.hintWaiting':
    'Lote: peça {index} de {total} pronta. Troque a peça e clique em “Próxima peça”.',
  'batch.hintStored': 'Lote guardado: próxima peça {index} de {total}.',
  'batch.pieceStart': 'Lote: enviando a peça {index} de {total}.',
  'batch.pieceDone': 'Lote: peça {index} de {total} concluída.',
  'batch.pieceFailed': 'Lote parado na peça {index} de {total}: {reason}',
  'batch.pieceAborted':
    'Lote parado na peça {index}: {reason}. Troque ou reposicione e use “Começar na peça”.',
  'batch.done': 'Lote concluído: {total} peças gravadas.',
  'batch.stopped':
    'Lote encerrado na peça {index} de {total}. Use “Retomar lote” para continuar.',
  'batch.resuming': 'Retomando o lote na peça {index} de {total}.',
  'batch.err.production':
    'Há um modo produção em andamento: encerre a série antes de iniciar o lote.',

  // ------------------------------------------- modo produção (RF-GC-12)
  'prod.title': 'Modo produção',
  'prod.copies': 'Cópias',
  'prod.start': '▶ Produção',
  'prod.startN': '▶ Produção ({total}×)',
  'prod.hint':
    'Repete o programa atual N vezes, pausando para trocar a peça. O pré-voo roda uma vez e o programa não muda no meio da série.',
  'prod.next': '▶ Próxima peça',
  'prod.retry': '▶ Repetir peça',
  'prod.nextHint': 'Depois de trocar a peça na mesa, envie a próxima da série.',
  'prod.retryHint':
    'A peça foi interrompida: reposicione e repita a mesma peça.',
  'prod.stop': 'Encerrar',
  'prod.stopHint': 'Encerra o modo produção (a peça em execução é cancelada).',
  'prod.state.running': 'Produção: gravando a peça {copy} de {total}.',
  'prod.state.waiting':
    'Peça {copy} de {total} pronta. Troque a peça e envie a próxima.',
  'prod.state.failed':
    'Peça {copy} de {total} interrompida: {reason}. Reposicione e repita a peça.',
  'prod.state.done': 'Produção concluída: {total} peças.',
  'prod.bar.running': 'Peça {copy} de {total} · {done} concluídas',
  'prod.bar.waiting': 'Peça {copy} de {total} pronta — troque a peça',
  'prod.bar.failed': 'Peça {copy} de {total} interrompida',
  'prod.pieceStart': 'Produção: enviando a peça {copy} de {total}.',
  'prod.pieceDone': 'Produção: peça {copy} de {total} concluída.',
  'prod.done': 'Produção concluída: {total} peças gravadas.',
  'prod.failed': 'Produção parada na peça {copy} de {total}: {reason}.',
  'prod.stopped': 'Produção encerrada na peça {copy} de {total}.',
  'prod.endedByProgram':
    'Produção encerrada: o programa foi trocado na peça {copy} de {total}.',
  'prod.err.connect': 'Conecte a máquina para iniciar a produção.',
  'prod.err.noFile': 'Carregue um G-code antes de iniciar a produção.',
  'prod.err.alarm': 'Saia do alarme antes de iniciar a produção.',
  'prod.err.batch':
    'Há um lote em andamento: encerre o lote antes de iniciar a produção.',
  'prod.err.moduleMissing': 'Módulo do modo produção não carregado.',

  // ---------------------------------------------- boas-vindas / onboarding
  'tour.title': 'Boas-vindas ao GRBL Studio',
  'tour.step': 'Passo {n} de {total}',
  'tour.next': 'Próximo',
  'tour.finish': 'Concluir',
  'tour.skip': 'Pular',
  'tour.dontShow': 'Não mostrar na próxima abertura',
  'tour.step1.title': 'Conecte a gravadora',
  'tour.step1.text':
    'Ligue a máquina, escolha a porta USB e clique em Conectar. Sem conexão ' +
    'você pode abrir arquivos e pré-visualizar, mas não gravar.',
  'tour.step1.where': 'Onde fica: painel esquerdo → Conexão.',
  'tour.step2.title': 'Confira o perfil da máquina',
  'tour.step2.text':
    'Escolha o seu modelo (ou Genérico GRBL). O perfil traz o curso, o teto ' +
    'de potência e o módulo do laser — é dele que sai a conversão de % para S.',
  'tour.step2.where': 'Onde fica: painel esquerdo → Perfil da máquina.',
  'tour.step3.title': 'Abra a arte',
  'tour.step3.text':
    'Imagem (PNG/JPG), SVG ou G-code: use Abrir ou Importar SVG. Ajuste ' +
    'tamanho e posição — o canto inferior esquerdo da arte é a origem (X0 Y0).',
  'tour.step3.where': 'Onde fica: barra superior → Abrir / Importar SVG.',
  'tour.step4.title': 'Pré-visualize antes de queimar',
  'tour.step4.text':
    'O preview mostra o caminho e o tempo estimado. Use Moldura para desenhar ' +
    'o contorno com o laser bem fraco e conferir o lugar na peça.',
  'tour.step4.where': 'Onde fica: preview → Moldura / Contorno.',
  'tour.step5.title': 'Grave com segurança',
  'tour.step5.text':
    'Ajuste potência e velocidade, confira o modo (M4/M3) e dê Play. Pausa ' +
    'mantém a posição; Parar cancela o job. Nunca deixe o laser sozinho.',
  'tour.step5.where': 'Onde fica: barra do job → Play / Pausa / Parar.',
  // ------------------------------------------------------- desenho vetorial
  'design.title': 'Desenhar',
  'design.tool.select': 'Selecionar (V)',
  'design.tool.rect': 'Retângulo (R)',
  'design.tool.circle': 'Elipse (E)',
  'design.tool.line': 'Linha (L)',
  'design.tool.pen': 'Caneta (P)',
  'design.tool.node': 'Editar nós (N)',
  'design.tool.text': 'Texto (T)',
  'design.delete': 'Excluir (Del)',
  'design.clear': 'Limpar',
  'design.restore': 'Restaurar',
  'design.maximize': 'Maximizar',
  'design.undo': 'Desfazer (Ctrl+Z)',
  'design.redo': 'Refazer (Ctrl+Y)',
  'design.snap': 'Snap',
  'design.objects': 'Objetos',
  'design.speed': 'Velocidade (mm/min)',
  'design.power': 'Potência (%)',
  'design.passes': 'Passadas',
  'design.mode': 'Modo',
  'design.text.placeholder': 'Texto…',
  'design.text.add': 'Adicionar',
  'design.generate': 'Gerar e visualizar',
  'design.save': 'Salvar .gcode…',
  'design.status.generating': 'Gerando o desenho…',
  'design.status.done': 'Desenho gerado. Confira no preview e envie ou salve.',
  'design.prop.w': 'L',
  'design.prop.h': 'A',
  'design.prop.rot': 'R',
  'design.lockAspect': 'Travar proporção',
  'design.zoom.in': 'Aproximar (+)',
  'design.zoom.out': 'Afastar (-)',
  'design.zoom.fit': 'Ajustar à página (F)',
  'design.align.left': 'Alinhar à esquerda',
  'design.align.center': 'Centralizar',
  'design.align.right': 'Alinhar à direita',
  'design.align.top': 'Alinhar ao topo',
  'design.align.middle': 'Centralizar na vertical',
  'design.align.bottom': 'Alinhar à base',
  'design.order.front': 'Trazer para frente',
  'design.order.forward': 'Avançar',
  'design.order.backward': 'Recuar',
  'design.order.back': 'Enviar para trás',
  'design.group': 'Agrupar (Ctrl+G)',
  'design.ungroup': 'Desagrupar (Ctrl+Shift+G)',
  'design.duplicate': 'Duplicar (Ctrl+D)',
  'design.grid': 'Grade',
  'design.document': 'Documento',
  'design.doc.width': 'Largura',
  'design.doc.height': 'Altura',
  'design.engraving': 'Gravação',
  'design.layers': 'Camadas',
  'design.layer.defaultName': 'Camada {n}',
  'design.layer.name': 'Nome da camada',
  'design.layer.add': 'Nova camada',
  'design.layer.delete': 'Excluir camada',
  'design.layer.up': 'Mover camada para cima',
  'design.layer.down': 'Mover camada para baixo',
  'design.layer.mode': 'Modo da camada',
  'design.layer.inherit': 'Herdar',
  'design.layer.power.hint':
    'Potência da camada (%) — vazio usa o padrão de gravação',
  'design.layer.speed.hint':
    'Velocidade da camada (mm/min) — vazio usa o padrão de gravação',
  'design.layer.passes.hint':
    'Passadas da camada — vazio usa o padrão de gravação',
  'design.layer.kerf.hint':
    'Folga de corte (kerf) em mm: externos crescem e furos encolhem pela metade — o tracejado laranja na prancheta mostra o caminho real; vazio = sem compensação',
  'design.layer.cut': 'Corte: abas e sobre-corte',
  'design.layer.tabs.hint':
    'Abas de retenção: quantas “pestanhas” seguram a peça (0 = corte inteiro)',
  'design.layer.tabWidth.hint': 'Largura de cada aba em mm (padrão 2)',
  'design.layer.lead.hint':
    'Sobre-corte (lead-in/out) em mm: continua além da origem para a emenda não ficar com bico; ignorado quando há abas',
  'design.layer.assign': 'Mover seleção',
  'design.layer.assigned': '{n} objeto(s) movido(s) para {name}.',
  'design.layer.needSelection': 'Selecione ao menos um objeto para mover.',
  'design.layer.deleted': 'Camada {name} excluída.',
  'design.cancel': 'Cancelar',
  'design.text.title': 'Texto',
  'design.text.content': 'Texto',
  'design.text.font': 'Fonte',
  'design.text.size': 'Tamanho (mm)',
  'design.text.mode': 'Modo',
  'design.text.mode.vector': 'Vetor (contorno)',
  'design.text.mode.stroke': 'Traço único',
  'design.text.mode.fill': 'Preenchido (cheio)',
  'design.text.spacing': 'Preenchimento (linhas/mm)',
  'design.text.unsupported':
    'Fora da fonte de traço único (viram "?"): {chars} — use o modo Vetor p/ acentos.',
  'design.text.noFill': 'Módulo de preenchimento não carregado.',
  'design.text.bold': 'Negrito',
  'design.text.noContour': 'Módulo de contorno não carregado.',
  'design.sel.none': 'Nenhum objeto selecionado',
  'design.sel.one': '1 objeto selecionado',
  'design.sel.blocks': '{n} objetos selecionados',
  'design.sel.all': 'Todos os {n} objetos selecionados',
  'design.obj.power': 'P',
  'design.obj.power.hint':
    'Potência do objeto (%) — vazio usa o padrão de gravação',
  'design.obj.speed': 'V',
  'design.obj.speed.hint':
    'Velocidade do objeto (mm/min) — vazio usa o padrão de gravação',
  'design.obj.passes': 'N',
  'design.obj.kerf': 'K',
  'design.obj.tabs': 'Abas',
  'design.obj.tabWidth': 'Larg.',
  'design.obj.lead': 'Sobre-corte',
  'design.obj.passes.hint':
    'Passadas do objeto — vazio usa o padrão de gravação',
  'design.obj.width': 'E',
  'design.obj.width.hint':
    'Espessura do traço (mm) — grava uma faixa centrada no caminho; vazio = traço simples',
  'design.obj.widthPx': 'px',
  'design.obj.widthPx.hint':
    'Espessura do traço em pixels (1 px = 0,25 mm) — mesma medida do campo em mm',
  'design.style.copy': 'Copiar estilo (Ctrl+Shift+C)',
  'design.style.paste': 'Colar estilo (Ctrl+Shift+V)',
  'design.style.copied': 'Estilo copiado.',
  'design.style.pasted': 'Estilo aplicado à seleção.',
  'design.style.none': 'Selecione um objeto primeiro.',
  'design.style.empty': 'Nenhum estilo copiado.',
  'design.mirror.h': 'Espelhar na horizontal',
  'design.mirror.v': 'Espelhar na vertical',
  'design.mirror.h.done': 'Seleção espelhada na horizontal.',
  'design.mirror.v.done': 'Seleção espelhada na vertical.',
  'design.distribute.h': 'Distribuir na horizontal',
  'design.distribute.v': 'Distribuir na vertical',
  'design.distribute.need3': 'Selecione 3 ou mais objetos para distribuir.',
  'design.distribute.h.done': 'Espaçamento igualado na horizontal.',
  'design.distribute.v.done': 'Espaçamento igualado na vertical.',
  'design.array': 'Matriz de cópias…',
  'design.array.title': 'Matriz de cópias',
  'design.array.hint':
    'Repete a seleção em colunas e linhas, deslocando cada cópia pelo passo informado.',
  'design.array.cols': 'Colunas',
  'design.array.rows': 'Linhas',
  'design.array.stepX': 'Passo X (mm)',
  'design.array.stepY': 'Passo Y (mm)',
  'design.array.note':
    'O passo é a distância entre o canto da peça original e o da cópia. Use o tamanho do objeto (ou um pouco mais) para as cópias saírem lado a lado.',
  'design.array.create': 'Criar cópias',
  'design.array.need2':
    'Informe mais de uma cópia (colunas × linhas maior que 1).',
  'design.array.tooMany': 'Muitas cópias (máx. 1000). Reduza colunas/linhas.',
  'design.array.done': '{n} cópia(s) criada(s).',
  'design.nest': 'Encaixar na chapa…',
  'design.nest.title': 'Encaixe na chapa',
  'design.nest.hint':
    'Distribui as peças na chapa aproveitando o espaço. Sem seleção, encaixa todos os objetos do desenho.',
  'design.nest.count': '{n} peça(s) para encaixar.',
  'design.nest.sheetW': 'Chapa — largura (mm)',
  'design.nest.sheetH': 'Chapa — altura (mm)',
  'design.nest.margin': 'Margem (mm)',
  'design.nest.gap': 'Espaçamento (mm)',
  'design.nest.rotate': 'Girar 90° quando couber melhor',
  'design.nest.note':
    'As peças são movidas para a chapa (canto superior esquerdo na margem). Peças que não couberem ficam onde estão e são avisadas.',
  'design.nest.run': 'Encaixar',
  'design.nest.none': 'Não há peças para encaixar.',
  'design.nest.tooBig':
    'Nenhuma peça coube na chapa. Aumente a chapa ou reduza margem/espaçamento.',
  'design.nest.done': '{n} peça(s) encaixada(s) · aproveitamento {pct} %.',
  'design.nest.unplaced': '{n} peça(s) não coube(ram) na chapa.',
  'design.doc.open.hint': 'Abrir um desenho salvo (.gstudio) — Ctrl+O',
  'design.doc.save.hint':
    'Salvar o desenho para reabrir depois (.gstudio) — Ctrl+S',
  'design.doc.untitled': 'Sem título',
  'design.doc.dirty': 'não salvo',
  'design.doc.opened': 'Desenho aberto: {name}.',
  'design.doc.saved': 'Desenho salvo: {name}.',
  'design.doc.error.json': 'O arquivo não é um JSON válido.',
  'design.doc.error.format': 'O arquivo não é um desenho do GRBL Studio.',
  'design.doc.error.version':
    'Este desenho foi salvo por uma versão mais nova do app. Atualize para abrir.',
  'design.doc.error.toobig': 'O arquivo é grande demais para abrir.',
  'design.doc.replace.title': 'Substituir o desenho?',
  'design.doc.replace.hint':
    'O desenho atual tem alterações não salvas. Abrir outro documento descarta essas alterações.',
  'design.doc.replace.ok': 'Descartar e abrir',
  'design.bool.menu': 'Booleanas e contorno paralelo',
  'design.bool.union': 'Unir',
  'design.bool.subtract': 'Subtrair',
  'design.bool.difference': 'Subtração',
  'design.bool.intersect': 'Intersecção',
  'design.bool.intersection': 'Intersecção',
  'design.bool.xor': 'Exclusão',
  'design.bool.unavailable':
    'Recurso de booleanas indisponível. Recompile o app.',
  'design.bool.need2':
    'Selecione 2 ou mais objetos fechados (retângulo, elipse ou contorno de texto).',
  'design.bool.empty': 'A operação não deixou nenhuma área. Nada foi alterado.',
  'design.bool.failed': 'Falha na operação: {msg}',
  'design.bool.done': '{n} objeto(s) no resultado.',
  'design.offset': 'Contorno paralelo…',
  'design.offset.hint':
    'Cria contornos paralelos à forma selecionada. A distância positiva cresce a forma; a negativa encolhe.',
  'design.offset.dist': 'Distância (mm)',
  'design.offset.passes': 'Passadas',
  'design.offset.join': 'Cantos',
  'design.offset.join.miter': 'Em bico',
  'design.offset.join.round': 'Arredondados',
  'design.offset.join.bevel': 'Chanfrados',
  'design.offset.keep': 'Manter a forma original',
  'design.offset.note':
    'Com mais de uma passada saem anéis concêntricos: a segunda a duas distâncias, a terceira a três, e assim por diante.',
  'design.offset.need1':
    'Selecione um objeto fechado (retângulo, elipse ou contorno de texto).',
  'design.offset.zero': 'Informe uma distância diferente de zero.',
  'design.offset.empty':
    'Nenhum contorno coube nessa distância. Aumente a forma ou reduza a distância.',
  'design.offset.done': '{n} contorno(s) criado(s).',
  'design.offset.create': 'Criar contornos',
  'design.objects.empty': 'Nenhum objeto ainda.',
  'design.kind.rect': 'Retângulo',
  'design.kind.ellipse': 'Elipse',
  'design.kind.line': 'Linha',
  'design.kind.polygon': 'Forma',
  'design.kind.text': 'Texto',
  'design.kind.symbol': 'Símbolo',
  'design.tool.symbol': 'Símbolo (Q)',
  'design.symbol.title': 'Símbolo',
  'design.symbol.type': 'Tipo',
  'design.symbol.barcode': 'Código de barras',
  'design.symbol.symbology': 'Simbologia',
  'design.symbol.ecc': 'Correção (QR)',
  'design.symbol.content': 'Conteúdo',
  'design.symbol.contentPlaceholder': 'Texto, URL, chave…',
  'design.symbol.size': 'Tamanho (mm)',
  'design.symbol.width': 'Largura (mm)',
  'design.symbol.lines': 'Linhas de varredura por mm',
  'design.symbol.hri': 'Texto legível (HRI)',
  'design.symbol.add': 'Adicionar',
  'design.symbol.update': 'Aplicar',
  'design.status.symbolEmpty': 'Digite o conteúdo do símbolo.',
  'design.status.symbolFail': 'Falha ao gerar o símbolo: {msg}',
  'design.status.symbolAdd': '{name} adicionado ({w} × {h} mm).',
  'design.status.symbolUpdate': '{name} atualizado ({w} × {h} mm).',
  'design.status.hint':
    'Desenhe com as ferramentas à esquerda. Roda do mouse = zoom; botão do meio = mover a tela. A gravação começa em X0 Y0 (canto inferior esquerdo do desenho): posicione o laser e defina a origem onde vai queimar.',
  'design.status.needShape': 'Desenhe ao menos uma forma.',
  'design.status.textEmpty': 'Digite o texto.',
  'design.status.textFail': 'Não foi possível gerar o texto.',
  'design.status.copied': '{n} objeto(s) copiado(s).',
  'design.status.grouped': 'Objetos agrupados.',
  'design.status.ungrouped': 'Objetos desagrupados.',
  'design.status.undo': 'Desfeito.',
  'design.status.redo': 'Refeito.',
  'design.size.title': 'Tamanho da arte',
  'design.size.width': 'Largura (mm)',
  'design.size.height': 'Altura (mm)',
  'design.size.current': 'Tamanho atual: {w} × {h} mm',
  'design.size.note':
    'Preencha um lado e o outro é ajustado na mesma proporção. Destrave o cadeado para redimensionar livremente.',
  'design.cost.title': 'Custo da peça',
  'design.cost.currencyHint': 'Moeda usada no custo',
  'design.cost.rate': 'Máquina / hora',
  'design.cost.material': 'Material / m²',
  'design.cost.result':
    '≈ {time} · {total} (máquina {machine} + material {material})',
  'design.cost.resultTimeOnly':
    '≈ {time} · informe a tarifa da máquina e o preço do material',
  'design.cost.noTime': 'Sem tempo estimado para este tamanho.',
  'design.jig': 'Gabarito…',
  'design.jig.title': 'Gabarito (molde)',
  'design.jig.hint':
    'Cria um molde em volta da peça selecionada (ou da arte inteira) com folga para encaixar. Só contornos fechados viram molde; furos e linhas abertas ficam de fora.',
  'design.jig.clearance': 'Folga em volta da peça (mm)',
  'design.jig.markOffset': 'Distância das marcas (mm)',
  'design.jig.marks': 'Incluir marcas de registro (L)',
  'design.jig.insert': 'Inserir gabarito',
  'design.jig.name': 'Gabarito',
  'design.jig.none': 'Não há contorno fechado para fazer o molde.',
  'design.jig.done': '{name} inserido no desenho.',
  'design.jig.skipped': '{n} forma(s) aberta(s) ignorada(s).',
  'design.text.arc': 'Arco (raio, mm)',
  'design.text.arcHint':
    '0 = reto · positivo curva para cima · negativo para baixo',
  'design.text.arcSmall': 'Aumente o raio para pelo menos {min} mm.',
  'design.generators': 'Geradores…',
  'design.gen.title': 'Geradores',
  'design.gen.box': 'Caixa',
  'design.gen.gear': 'Engrenagem',
  'design.gen.boxHint':
    'Caixa com encaixe (dedos) a partir das medidas externas e da espessura do material. As peças saem deitadas na chapa, com folga nas fendas.',
  'design.gen.gearHint':
    'Engrenagem de dentes retos com perfil evolvente, centrada na origem. O furo central é opcional e vai junto no mesmo grupo.',
  'design.gen.width': 'Largura (X, mm)',
  'design.gen.depth': 'Profundidade (Y, mm)',
  'design.gen.height': 'Altura (Z, mm)',
  'design.gen.thickness': 'Espessura do material (mm)',
  'design.gen.finger': 'Largura do dedo (mm)',
  'design.gen.clearance': 'Folga da fenda (mm)',
  'design.gen.top': 'Incluir tampa',
  'design.gen.module': 'Módulo (mm)',
  'design.gen.teeth': 'Dentes',
  'design.gen.angle': 'Ângulo de pressão (°)',
  'design.gen.bore': 'Furo central (mm)',
  'design.gen.boxSummary': '{panels} peças · chapa {w} × {h} mm',
  'design.gen.gearSummary':
    'Ø externo {od} mm · Ø primitivo {pd} mm · {teeth} dentes',
  'design.gen.small': 'Medidas pequenas demais para essa espessura.',
  'design.gen.insert': 'Inserir no desenho',
  'design.gen.done': '{name} inserida no desenho.',
  'design.gen.boxName': 'Caixa',
  'design.gen.gearName': 'Engrenagem',
  'design.gen.panel.front': 'Frente',
  'design.gen.panel.back': 'Fundo',
  'design.gen.panel.left': 'Esquerda',
  'design.gen.panel.right': 'Direita',
  'design.gen.panel.bottom': 'Base',
  'design.gen.panel.top': 'Tampa',
  'design.double': 'Gravar dos dois lados…',
  'design.double.title': 'Gravar dos dois lados',
  'design.double.hint':
    'Gera dois programas: o lado A como está e o lado B espelhado na horizontal em torno do centro da arte. As marcas de registro caem nas mesmas posições, então a peça virada se alinha pelos mesmos pontos.',
  'design.double.marks': 'Incluir marcas de registro (L)',
  'design.double.offset': 'Distância da arte (mm)',
  'design.double.size': 'Tamanho da marca (mm)',
  'design.double.note':
    'Corte o lado A, vire a peça na horizontal e rode o lado B. As marcas do lado A são refeitas no lado B: se estiverem alinhadas, o laser passa exatamente por cima.',
  'design.double.save': 'Salvar os dois .gcode…',
  'design.double.saved': 'Lado A e lado B salvos em {dir}',
  'design.fiducial': 'Marcas de registro…',
  'design.fiducial.title': 'Marcas de registro',
  'design.fiducial.hint':
    'Marca os cantos ou o meio dos lados da arte para alinhar a peça na mesa (jogue o laser até a marca e zere o eixo). Use a seleção como referência ou a arte inteira.',
  'design.fiducial.kind': 'Tipo de marca',
  'design.fiducial.corners': 'Cantos (L)',
  'design.fiducial.crosses': 'Cruzes',
  'design.fiducial.offset': 'Distância da arte (mm)',
  'design.fiducial.size': 'Tamanho da marca (mm)',
  'design.fiducial.note':
    'As marcas são linhas abertas (gravação) e ficam fora da arte — não entram na compensação de kerf nem fecham a peça.',
  'design.fiducial.create': 'Inserir marcas',
  'design.fiducial.done': '{n} marcas de registro inseridas',
  'design.fiducial.none': 'Não há espaço para as marcas com esse tamanho.',
  'design.kind.marks': 'Marcas',
  'design.tiles.preview': 'Prévia dos tiles',
  'design.tiles': 'Dividir em tiles…',
  'design.tiles.title': 'Dividir em tiles',
  'design.tiles.w': 'Largura do tile (mm)',
  'design.tiles.h': 'Altura do tile (mm)',
  'design.tiles.overlap': 'Sobreposição (mm)',
  'design.tiles.note':
    'Cada programa sai com a origem no canto inferior esquerdo da janela: reposicione o material e o zero antes de cada tile.',
  'design.tiles.summary':
    '{cols} × {rows} = {n} tiles · janela {w} × {h} mm · sobreposição {ov} mm',
  'design.tiles.fits': 'A arte cabe em uma janela: 1 tile.',
  'design.tiles.tooMany':
    'Tiles demais ({max} no máximo): aumente a janela ou reduza a sobreposição.',
  'design.tiles.save': 'Salvar tiles…',
  'design.tiles.saved': '{n} arquivo(s) de tile salvos em {dir}',
  'design.tiles.empty': 'Nenhum tile tem corte.',
  'design.size.invalid': 'Informe largura e altura maiores que zero.',

  // ------------------------------------------------- execução e arquivo
  'run.title': 'Execução',
  'file.open': 'Abrir G-code…',
  'file.none': 'Nenhum arquivo carregado',
  'file.loaded': 'Arquivo carregado: {name} ({lines} linhas)',
  'file.info': '{name} — {lines} linhas · {size}',
  'file.infoTime': '{name} — {lines} linhas · {size} · ~{time}',
  'file.infoGenerated': '{file} — {lines} linhas · {size} (gerado de {image})',
  'file.infoGeneratedTime':
    '{file} — {lines} linhas · {size} · ~{time} (gerado de {image})',
  'file.saved': 'G-code salvo em {path}',

  // ------------------------------------------------ editor de G-code (P1.10)
  'ged.open': 'Editar…',
  'ged.openHint': 'Ver, validar e reenviar um trecho do G-code',
  'ged.title': 'Editor de G-code',
  'ged.validate': 'Validar',
  'ged.validating': 'Validando…',
  'ged.undo': 'Desfazer',
  'ged.save': 'Salvar .gcode…',
  'ged.editLine': 'Editar linha',
  'ged.insertLine': 'Inserir abaixo',
  'ged.removeLine': 'Remover',
  'ged.sendFrom': '▶ Enviar daqui',
  'ged.sendSel': '▶ Enviar trecho',
  'ged.line': 'Linha {n} de {total}',
  'ged.selection': 'linhas {from}–{to} ({count} selecionadas)',
  'ged.summary':
    '{lines} linhas · {commands} comandos · {moves} movimentos · {comments} comentários',
  'ged.summaryMaxS':
    '{lines} linhas · {commands} comandos · {moves} movimentos · {comments} comentários · S máx. {smax}',
  'ged.locked':
    'Gravação em andamento: edição e reenvio bloqueados até terminar.',
  'ged.empty': 'Nenhum G-code carregado para editar.',
  'ged.edited': 'editado',
  'ged.saved': 'G-code salvo em {path}',
  'ged.saveFail': 'Não foi possível salvar: {msg}',
  'ged.validOk': 'Pré-voo: nenhum achado.',
  'ged.validIssues':
    'Pré-voo: {block} bloqueio(s) · {warn} aviso(s) · {info} informação(ões).',
  'ged.sendFromLog': 'Enviando a partir da linha {line}…',
  'ged.sendSelLog': 'Enviando as linhas {from}–{to}…',
  'ged.noConn': 'Conecte a máquina para enviar.',

  // -------------------------------------------- biblioteca de jobs (P2.9)
  'joblib.title': 'Biblioteca de jobs',
  'joblib.open': 'Biblioteca…',
  'joblib.openHint': 'Últimos programas executados — reexecutar ou duplicar',
  'joblib.empty':
    'Nenhum job ainda. Os últimos 50 programas executados aparecem aqui, com miniatura.',
  'joblib.count': '{count} de {max} jobs',
  'joblib.clear': 'Limpar tudo',
  'joblib.confirm': 'Confirmar',
  'joblib.clearConfirm': 'Remover todos os {count} jobs da biblioteca?',
  'joblib.run': 'Re-executar',
  'joblib.duplicate': 'Duplicar',
  'joblib.duplicateHint':
    'Carrega uma cópia como programa atual (para ajustar antes de gravar)',
  'joblib.remove': 'Remover',
  'joblib.removeConfirm': 'Remover “{name}” da biblioteca?',
  'joblib.removed': 'Job removido da biblioteca.',
  'joblib.cleared': 'Biblioteca de jobs esvaziada.',
  'joblib.loaded': 'Cópia carregada: {name} ({lines} linhas).',
  'joblib.unavailable': 'O programa deste job não está guardado.',
  'joblib.error': 'Biblioteca de jobs: {msg}',
  'joblib.meta': '{date} · {lines} linhas · {size}',
  'joblib.metaTime': '{date} · {lines} linhas · {size} · ~{time}',
  'joblib.noProgram': 'sem programa guardado',
  'joblib.source.file': 'Arquivo',
  'joblib.source.image': 'Imagem',
  'joblib.source.design': 'Desenho',
  'joblib.source.library': 'Biblioteca',
  'joblib.offline': 'Conecte a máquina para reexecutar.',
  'joblib.recording': 'Este job entra na biblioteca ao terminar a gravação.',
  'dxf.loaded':
    'DXF importado: {contours} contorno(s), {width} × {height} mm (unidade de origem: {unit})',
  'dxf.hidden': 'DXF: {n} entidade(s) em camadas ocultas ignorada(s).',
  'dxf.ignored': 'DXF: {n} entidade(s) sem suporte ignorada(s): {types}.',
  'dxf.empty':
    'Nenhuma geometria reconhecida no DXF (texto, hatch e dimensões não são convertidos).',
  'dxf.binary':
    'DXF binário não é suportado. Exporte o arquivo como DXF ASCII.',
  'dxf.moduleMissing': 'Módulo de importação DXF não carregado.',
  'pdf.loaded':
    'PDF importado: {contours} contorno(s), {width} × {height} mm ({pages} página(s)).',
  'pdf.pages': 'PDF com {pages} páginas; importei apenas a primeira.',
  'pdf.text':
    'PDF com texto: fontes não viram curvas, então o texto não foi importado.',
  'pdf.images':
    'PDF: {n} imagem(ns) bitmap ignorada(s) — só vetores são convertidos.',
  'pdf.empty': 'Nenhum caminho vetorial encontrado no PDF.',
  'pdf.encrypted': 'PDF protegido (criptografado) não é suportado.',
  'pdf.damaged':
    'Não foi possível ler o PDF (arquivo corrompido ou não suportado).',
  'pdf.moduleMissing': 'Função de importação de PDF indisponível.',
  'pdf.unsupported': 'PDF: {types} não suportado(s) — trecho ignorado.',
  'gcode.summary':
    'G-code gerado: {lines} linhas, {size}, {rows}×{cols} amostras, ~{time}',
  'run.play': '▶ Iniciar',
  'run.pause': '⏸ Pausar',
  'run.resume': '▶ Retomar',
  'run.cancel': '⏹ Cancelar',
  'run.cancel.title':
    'Cancela a gravação e para a máquina agora (Esc / Ctrl+X)',
  'run.jobbar.label': 'Controles da gravação',
  'run.state.engraving': 'Gravando…',
  'run.state.paused': 'Pausado',
  'run.hint.noFileNoConn':
    'Gere o G-code (Imagem → G-code) ou abra um .gcode e conecte a máquina para enviar.',
  'run.hint.noFile':
    'Nenhum G-code carregado: gere um em “Imagem → G-code” ou abra um arquivo .gcode.',
  'run.hint.readyNoConn':
    'G-code pronto ({lines} linhas). Conecte a máquina em “Serial” para enviar.',
  'run.hint.sending': 'Enviando para a máquina…',
  'run.hint.ready': 'Pronto para enviar ({lines} linhas). Clique em ▶ Iniciar.',
  'run.noGcode': 'Nenhum G-code carregado',
  'job.finished': 'Job concluído.',
  'job.aborted': 'Job abortado: {reason}',

  // ------------------------------------------------------------- retomada
  'resume.title': 'Retomada (RF-GC-7)',
  'resume.hint':
    'Interrompa um job para ver o ponto de retomada. Ao continuar, o app ' +
    'reafirma as unidades, distância, offsets e o laser antes da linha.',
  'resume.line': 'Linha',
  'resume.back': 'Voltar',
  'resume.suggest': 'Sugerir (N antes)',
  'resume.suggestTitle': 'Sugere done − Voltar',
  'resume.start': '▶ Retomar daqui',
  'resume.interrupted':
    'Interrompido na linha {done} de {total}. Sugestão: {suggestion}.',
  'resume.done': 'Job concluído ({lines} linhas).',
  'resume.idle': 'Interrompa um job para ver o ponto de retomada.',
  'resume.resuming': 'Retomando a partir da linha {line}…',

  // --------------------------------------------------------------- macros
  'macro.title': 'Macros (RF-MAC-1)',
  'macro.hint':
    'Conecte-se para usar as macros. Os comandos são enfileirados um a um.',
  'macro.manage': 'Gerenciar macros (importar/exportar)',
  'macro.add': 'Adicionar',
  'macro.reset': 'Restaurar padrão',
  'macro.new': 'Nova macro',
  'macro.run': 'Macro: {label}',
  'macro.notConnected': 'Conecte-se à máquina para executar a macro.',
  'macro.labelPlaceholder': 'Rótulo',
  'macro.remove': 'Remover macro',
  'macro.gcodePlaceholder': 'G-code (uma linha por comando)',
  'macro.exported': 'Macros exportadas: {path}',
  'macro.imported': 'Macros importadas ({count}).',
  'macro.invalid': 'Macros inválidas: {msg}',
  'macro.openFail': 'Falha ao abrir macros: {msg}',
  'macro.exportFail': 'Falha ao exportar macros: {msg}',
  'macro.def.unlock': 'Desbloquear ($X)',
  'macro.def.home': 'Home ($H)',
  'macro.def.report': 'Relatar estado ($G)',
  'macro.def.goto-zero': 'Ir para zero (X0 Y0)',
  'macro.def.set-zero': 'Definir zero aqui',
  'macro.def.laser-off': 'Laser desligado',
  'macro.def.abs-mm': 'Absoluto em mm',
  'macrogroup.preparacao': 'Preparação',
  'macrogroup.origem': 'Origem',
  'macrogroup.laser': 'Laser',
  'macrogroup.controle': 'Controle',
  'macrogroup.outros': 'Outros',

  // ------------------------------------------------------------ status/un.
  'status.feed': 'Feed',
  'status.units': 'Unidade',
  'status.unitsTitle': 'Unidade de exibição (RF-APP-3)',
  'status.error': 'Erro',
  'status.idle': 'Ocioso',
  'status.run': 'Executando',
  'status.jog': 'Manual',
  'status.hold': 'Pausado',
  'status.alarm': 'Alarme',
  'status.door': 'Porta',
  'status.check': 'Verificação',
  'status.home': 'Home',
  'status.sleep': 'Dormindo',
  'status.pins': 'Pinos',
  'status.pinsHint': 'Pinos ativos reportados pela máquina (Pn).',
  'status.pinsUnknown':
    'A máquina não reporta pinos neste firmware (máscara de status $10). Veja o painel Máquina.',

  // -------------------------------------------------------------- preview
  'preview.hint.image':
    'Carregue uma imagem para preparar o arquivo de gravação',
  'preview.hint.empty': 'Abra um G-code ou inicie um job para ver o caminho.',
  'preview.hint.noMoves': 'Este G-code não tem movimentos para desenhar.',
  'preview.cut': 'Queima',
  'preview.pass': 'Passada {n}/{total}',
  'preview.rapid': 'Deslocamento',
  'preview.workArea': 'Área de trabalho', // referência, não faz parte do job
  'preview.tip':
    'roda: zoom · arrastar: mover · clique: mover · duplo clique: ajustar',
  'preview.moveTitle': 'Mover até aqui?',
  'preview.moveCoords': 'X {x} · Y {y}',
  'preview.moveNote': 'no sistema de coordenadas ativo',
  'preview.moveGo': 'Mover (G0)',
  'preview.moveCancel': 'Cancelar',
  'preview.moveBlocked': 'Não dá para mover: {why}.',
  'preview.moveWhy.offline': 'conecte a máquina',
  'preview.moveWhy.alarm': 'a máquina está em alarme ou com a porta aberta',
  'preview.moveWhy.job': 'há um job em andamento',

  'preview.simulate': 'Simular',
  'preview.warning.area':
    '⚠ O caminho excede a área configurada ({width}×{height} mm): {problems}.',
  'preview.area.negative': 'coordenadas negativas',
  'preview.area.xMax': 'X até {value} > $130',
  'preview.area.yMax': 'Y até {value} > $131',

  // -------------------------------------------------------------- console
  'console.placeholder':
    'Digite um comando GRBL e pressione Enter (ex.: $$, $G, G0 X0 Y0)',

  // ------------------------------------------------- configurações ($$)
  'settings.open': 'Configurações da máquina ($$)',
  'settings.title': 'Configurações da máquina',
  'settings.read': 'Ler $$',
  'settings.filter': 'Filtrar por nome ou chave…',
  'settings.connectFirst': 'Conecte-se à máquina para ler as configurações.',
  'settings.connectQuery': 'Conecte-se à máquina para consultar.',
  'settings.querying': 'Consultando…',
  'settings.noResponse': 'Sem resposta.',
  'settings.fail': 'Falha: {msg}',
  'settings.reading': 'Lendo $$…',
  'settings.count': '{count} parâmetros lidos.',
  'settings.empty': 'A máquina não devolveu configurações.',
  'settings.readFail': 'Falha ao ler $$: {msg}',
  'settings.filterEmpty': 'Nenhum parâmetro corresponde ao filtro.',
  'settings.groupOther': 'Outros',
  'settings.applying': 'Aplicando {key}…',
  'settings.updated': '{key} atualizado.',
  'settings.applyFail': 'Falha ao aplicar {key}: {msg}',
  'settings.value': 'Valor de {key}',
  'settings.fallbackName': 'Configuração {key}',
  'settings.fallbackHelp': 'Parâmetro do firmware sem descrição neste app.',
  'settings.invalid': 'Configuração inválida.',
  'settings.unknownQuery': 'Consulta desconhecida.',

  // ---------------------------------------------------------- validação
  'validate.empty': 'Informe um valor.',
  'validate.nan': 'Valor numérico esperado.',
  'validate.int': 'Use um número inteiro.',
  'validate.min': 'Valor mínimo: {min}.',
  'validate.max': 'Valor máximo: {max}.',

  // --------------------------------------- grupos das configurações $$
  'setgroup.passo-e-direcao': 'Passo e direção',
  'setgroup.relatorio': 'Relatório',
  'setgroup.limites': 'Limites',
  'setgroup.homming': 'Homming',
  'setgroup.spindle-laser': 'Spindle/Laser',
  'setgroup.eixo-x': 'Eixo X',
  'setgroup.eixo-y': 'Eixo Y',
  'setgroup.eixo-z': 'Eixo Z',
  'setgroup.outros': 'Outros',

  // ------------------------------------- nomes/ajuda das configurações $$
  'set.0.name': 'Largura do pulso de passo',
  'set.0.help':
    'Duração do pulso STEP (µs). Ajuste para drivers lentos; o padrão (10 µs) cobre a maioria.',
  'set.1.name': 'Atraso ocioso do passo',
  'set.1.help':
    'Tempo (ms) que o motor permanece energizado após parar. 255 = sempre ligado; 0 = desliga imediatamente.',
  'set.2.name': 'Inverter pulso de passo',
  'set.2.help':
    'Máscara (bits) que inverte o sinal do pulso. Use 0 se o eixo não anda.',
  'set.3.name': 'Inverter direção',
  'set.3.help': 'Máscara para inverter o sentido do eixo (X=1, Y=2, Z=4).',
  'set.4.name': 'Inverter habilitar do driver',
  'set.4.help': 'Inverte o pino de habilitação do driver de passo.',
  'set.5.name': 'Inverter pinos de limite',
  'set.5.help': 'Inverte a leitura dos chaves de fim de curso.',
  'set.6.name': 'Inverter pino de apalpador',
  'set.6.help': 'Inverte a leitura do probe (apalpador).',
  'set.10.name': 'Máscara do relatório de status',
  'set.10.help':
    'Escolhe o que o `?` informa. Padrão 3 (posição de máquina e de trabalho).',
  'set.11.name': 'Desvio de junção',
  'set.11.help':
    'Controla a suavização entre segmentos. Maior = cantos mais largos; padrão 0.010 mm.',
  'set.12.name': 'Tolerância de arco',
  'set.12.help':
    'Erro máximo ao aproximar arcos por segmentos. Menor = mais preciso e mais G-code. 0.002 mm.',
  'set.13.name': 'Relatar em polegadas',
  'set.13.help':
    'Se ligado, o status e os valores são reportados em polegadas (não muda o G-code).',
  'set.20.name': 'Soft limits',
  'set.20.help':
    'Bloqueia movimentos que excederiam o curso ($130/$131). Requer homing antes.',
  'set.21.name': 'Hard limits',
  'set.21.help': 'Interrompe ao acionar as chaves físicas de fim de curso.',
  'set.22.name': 'Ciclo de homing',
  'set.22.help':
    'Habilita a rotina de origem (`$H`). Desligue se não houver chaves.',
  'set.23.name': 'Inversão da direção de homing',
  'set.23.help': 'Inverte a direção em que a máquina procura a chave de home.',
  'set.24.name': 'Feed do homing',
  'set.24.help': 'Velocidade final de aproximação do homing.',
  'set.25.name': 'Busca lenta do homming',
  'set.25.help':
    'Velocidade de busca rápida até a primeira detecção do fim de curso.',
  'set.26.name': 'Debounce do fim de curso',
  'set.26.help': 'Tempo de estabilização da chave. Padrão 250 ms.',
  'set.27.name': 'Recuo do homing',
  'set.27.help': 'Distância que recua após tocar a chave de homing.',
  'set.30.name': 'RPM máximo do spindle',
  'set.30.help':
    'Escala o S máximo. Use 1000 para laser em vez de RPM; o S vai de 0 a este valor.',
  'set.31.name': 'RPM mínimo do spindle',
  'set.31.help': 'Valor mínimo onde o spindle/relé liga. Laser costuma ser 0.',
  'set.32.name': 'Modo laser',
  'set.32.help':
    '1 = M4 dinâmico (potência com a velocidade) e permite mover sem queimar. 0 = spindle.',
  'set.100.name': 'Passos/mm do eixo X',
  'set.100.help':
    'Calibração: quantos passos fazem 1 mm. Motor de 200 passos, 16 micro, 2 mm/passo → 1600.',
  'set.101.name': 'Passos/mm do eixo Y',
  'set.101.help': 'Calibração: quantos passos fazem 1 mm.',
  'set.102.name': 'Passos/mm do eixo Z',
  'set.102.help': 'Calibração: quantos passos fazem 1 mm.',
  'set.110.name': 'Velocidade máxima X',
  'set.110.help':
    'Rate (mm/min) que o eixo X alcança a caminho do repouso. Não é o uso; é a capacidade.',
  'set.111.name': 'Velocidade máxima Y',
  'set.111.help': 'Rate máximo do eixo Y.',
  'set.112.name': 'Velocidade máxima Z',
  'set.112.help': 'Rate máximo do eixo Z.',
  'set.120.name': 'Aceleração X',
  'set.120.help':
    'Aceleração em mm/s². Alta demais perde passo; baixa deixa o trabalho devagar.',
  'set.121.name': 'Aceleração Y',
  'set.121.help': 'Aceleração em mm/s².',
  'set.122.name': 'Aceleração Z',
  'set.122.help': 'Aceleração em mm/s².',
  'set.130.name': 'Curso máximo X',
  'set.130.help':
    'Comprimento útil do eixo X. Usado nos limites suaves e no aviso de área de trabalho.',
  'set.131.name': 'Curso máximo Y',
  'set.131.help':
    'Comprimento útil do eixo Y. Usado nos limites suaves e no aviso de área de trabalho.',
  'set.132.name': 'Curso máximo Z',
  'set.132.help': 'Comprimento útil do eixo Z.',

  // ------------------------------------------------ estatísticas e tempo
  'stats.format':
    '{rows} linhas × {cols} amostras · {segments} segmentos · {size} · ~{time}',
  'stats.contours': ' · {count} contornos',
  'time.sec': '{s} s',
  'time.minSec': '{m} min {r} s',
  'time.min': '{m} min',

  // --------------------------------------------------------- erros (UI)
  'err.listPorts': 'Falha ao listar portas: {msg}',
  'err.connect': 'Erro ao conectar: {msg}',
  'err.openFile': 'Falha ao abrir o arquivo: {msg}',
  'err.worker': 'Worker de imagem indisponível: {msg}',
  'err.workerUnknown': 'Erro no worker de imagem: {msg}',
  'err.generate': 'Falha ao gerar G-code: {msg}',
  'err.save': 'Falha ao salvar: {msg}',
  'err.areaExceeded':
    'Aviso: o caminho excede a área de trabalho ({problems}).',
  'err.connectForFrame': 'Conecte a máquina para usar o posicionamento.',
  'err.noSerialPort':
    'Nenhuma porta serial encontrada. Conecte a gravadora e tente novamente.',
  'err.prefix': 'Erro: {msg}',
  'err.unknown': 'desconhecido',

  // ---------------------------------- mensagens do processo main (cliente)
  'client.connClosed': 'Conexão encerrada.',
  'client.connClosedWith': 'Conexão encerrada: {msg}',
  'client.queryClosed': 'Conexão encerrada antes da resposta.',
  'client.queryNotConnected': 'Conecte-se à máquina para consultar.',
  'client.queryBusy': 'Já existe uma consulta em andamento.',
  'client.queryTimeout': 'A máquina não respondeu a "{line}" em {ms} ms.',
  'client.notConnected': 'Não conectado.',
  'client.jobRunning': 'Já existe um job em execução.',
  'client.stopped': 'Interrompido pelo usuário.',
  'client.queryJobStarted':
    'Consulta cancelada: um job começou enquanto ela ainda estava na fila.',
  'client.jogDollarUnsupported':
    'Este firmware não implementa o jog dedicado ($J=). "{line}" foi recusada; passando a mover com G91/G0/G90.',
  'client.queryRetry':
    'A máquina recusou a primeira leitura após conectar ("{line}") — repetindo uma vez.',
  'client.linkLost':
    'A máquina parou de responder (sem status há {ms} ms) — a porta provavelmente caiu. Reconecte para continuar.',
  'client.lineTooLong':
    'Linha longa demais ({bytes} B) para o buffer da máquina ({max} B) — envio interrompido para não corromper o G-code. Trecho: {line}',
  'client.reset': 'Reset pelo usuário.',
  'client.writeFail': 'Falha ao escrever na serial: {msg}',
  'client.stall':
    'A máquina não respondeu em {ms} ms aguardando "ok". Envio pausado — verifique a conexão.',

  // -------------------------------------- diálogos nativos (main -> OS)
  'filter.macros': 'Macros (JSON)',
  'filter.all': 'Todos os arquivos',
  'dlg.openImage': 'Abrir imagem',
  'dlg.openGcode': 'Abrir G-code',
  'dlg.openLbdev': 'Abrir perfil do LightBurn (.lbdev)',
  'dlg.openCsv': 'Abrir planilha do lote (CSV/TSV)',
  'dlg.openSvg': 'Abrir SVG',
  'dlg.openDxf': 'Abrir DXF',
  'dlg.openPdf': 'Abrir PDF',
  'dlg.saveTiles': 'Salvar tiles',
  'dlg.tooManyFiles': 'Arquivos demais de uma vez (máximo {max})',
  'dlg.saveGcode': 'Salvar G-code',
  'dlg.importMacros': 'Importar macros',
  'dlg.exportMacros': 'Exportar macros',
  'dlg.open': 'Abrir',
  'dlg.import': 'Importar',
  'dlg.notFile': 'O caminho escolhido não é um arquivo.',
  'dlg.imageTooBig': 'Imagem muito grande ({size}). Limite: {limit}.',
  'dlg.fileTooBig': 'Arquivo muito grande ({size}). Limite: {limit}.',
  'dlg.tooBig': 'Arquivo grande demais ({size}).',
  'dlg.missingContent': 'Conteúdo de G-code ausente.',
  'dlg.missingMacros': 'Conteúdo de macros ausente.',
  'dlg.openDesign': 'Abrir desenho',
  'dlg.saveDesign': 'Salvar desenho',
  'dlg.importPresets': 'Importar presets de material',
  'dlg.exportPresets': 'Exportar presets de material',
  'dlg.missingPresets': 'Conteúdo dos presets ausente.',

  // ----------------------------------------- alarmes do GRBL 1.1 (ALARM:n)
  'alarm.1':
    'Hard limit acionado. Posição provavelmente perdida — re-home recomendado.',
  'alarm.2':
    'Soft limit: o alvo do movimento excede o curso da máquina. Pode destravar com segurança.',
  'alarm.3':
    'Reset durante movimento. Posição provavelmente perdida — re-home recomendado.',
  'alarm.4':
    'Falha de sonda: estado inicial inesperado antes do ciclo de sondagem.',
  'alarm.5':
    'Falha de sonda: a sonda não tocou a peça dentro do curso programado.',
  'alarm.6': 'Falha de homing: reset durante o ciclo de homing.',
  'alarm.7': 'Falha de homing: porta de segurança aberta durante o homing.',
  'alarm.8':
    'Falha de homing: o fim de curso não liberou ao recuar (aumente o pull-off/verifique a fiação).',
  'alarm.9':
    'Falha de homing: fim de curso não encontrado na distância de busca.',

  // ------------------------------------------- erros do GRBL 1.1 (error:n)
  'error.1': 'Palavra G-code inválida: letra não encontrada.',
  'error.2': 'Formato numérico inválido ou valor ausente.',
  'error.3': 'Comando de sistema "$" não reconhecido ou não suportado.',
  'error.4': 'Valor negativo recebido onde se esperava positivo.',
  'error.5': 'Ciclo de homing não está habilitado nas configurações ($22).',
  'error.6': 'Tempo mínimo de pulso de passo deve ser maior que 3 µs.',
  'error.7': 'Falha de leitura da EEPROM. Reset para os valores padrão.',
  'error.8': 'Comando "$" só pode ser usado em estado IDLE.',
  'error.9': 'G-code bloqueado durante estado de alarme ou jog.',
  'error.10': 'Soft limits não podem ser habilitados sem homing habilitado.',
  'error.11': 'Máximo de caracteres por linha excedido; a linha foi ignorada.',
  'error.12':
    'Valor de configuração "$" excede a taxa de passo máxima suportada.',
  'error.13': 'Porta de segurança aberta; estado de door iniciado.',
  'error.14': 'Build info/startup excedeu o limite de linha da EEPROM.',
  'error.15': 'Alvo do jog excede o curso da máquina; comando ignorado.',
  'error.16': 'Comando de jog sem "=" ou contendo g-code proibido.',
  'error.17': 'Modo laser requer saída PWM ($32=1).',
  'error.20': 'Comando G-code não suportado ou inválido.',
  'error.21': 'Mais de um comando do mesmo grupo modal na linha.',
  'error.22': 'Feed rate não definido.',
  'error.23': 'Comando G-code exige um valor inteiro.',
  'error.24': 'Dois comandos que exigem as mesmas palavras de eixo na linha.',
  'error.25': 'Palavra G-code repetida na linha.',
  'error.26': 'Nenhuma palavra de eixo encontrada para o comando/estado modal.',
  'error.27': 'Número de linha (N) fora da faixa válida.',
  'error.28': 'Faltam valores obrigatórios (P/L) para o comando.',
  'error.29': 'Sistema de coordenadas de trabalho não suportado.',
  'error.30': 'G53 requer um modo de movimento (G0/G1) ativo.',
  'error.31': 'Comando enviado sem um valor P ou L obrigatório.',
  'error.32': 'Comando não suportado nesta configuração de firmware.',
  'error.unknown': 'Erro {code} (código não catalogado).',
  'alarm.unknown': 'Alarme {code} (código não catalogado).',

  // ------------------------------------------------- materiais (RF-IMG-8)
  'mat.papel-kraft': 'Papel kraft',
  'mat.compensado': 'Compensado',
  'mat.madeira-solida': 'Madeira sólida',
  'mat.bambu': 'Bambu',
  'mat.folha-de-aluminio': 'Folha de alumínio',
  'mat.cortica': 'Cortiça',
  'mat.couro': 'Couro',
  'mat.silicagel': 'Silicagel',
  'mat.feltro-escuro': 'Feltro escuro',
  'mat.lata-tin-plate': 'Lata (tin plate)',
  'mat.tabua-de-madeira': 'Tábua de madeira',
  'mat.madeira-macica': 'Madeira maciça',
  'mat.vidro': 'Vidro',
  'mat.ceramica': 'Cerâmica',
  'mat.acrilico': 'Acrílico',
  'mat.aco-inoxidavel': 'Aço inoxidável',
  'mat.metal-anodizado': 'Metal anodizado',
  'mat.tecido': 'Tecido',
  'mat.tabua-2-mm': 'Tábua 2 mm',
  'mat.tabua-3-mm': 'Tábua 3 mm',
  'mat.tabua-4-mm': 'Tábua 4 mm',
  'mat.papelao': 'Papelão',
  'mat.tabua-7-mm': 'Tábua 7 mm',
  'mnote.passadas-1-m4': 'Passadas: 1. M4.',
  'mnote.ajustes-padrao': 'Ajustes padrão.',
  'mnote.garanta-o-material-bem-plano-e-fixado':
    'Garanta o material bem plano e fixado.',
  'mnote.a-superficie-deve-ser-pintada-de-preto-ou-coberta-com-papel-de-transferencia-termica':
    'A superfície DEVE ser pintada de preto ou coberta com papel de transferência térmica.',
  'mnote.a-superficie-deve-receber-papel-de-transferencia-termica':
    'A superfície DEVE receber papel de transferência térmica.',
  'mnote.acrilico-transparente-exige-pintar-de-preto-a-face-inferior-superior':
    'Acrílico transparente exige pintar de preto a face inferior/superior.',
  'mnote.acrilico-transparente-exige-pintar-a-superficie-de-preto':
    'Acrílico transparente exige pintar a superfície de preto.',
  'mnote.marcacao-direta': 'Marcação direta.',
  'mnote.marcacao-direta-sobre-a-superficie-bruta':
    'Marcação direta sobre a superfície bruta.',
  'mnote.remocao-direta-do-revestimento-anodizado':
    'Remoção direta do revestimento anodizado.',
  'mnote.potencia-menor-evita-queimar-e-desfiar-as-bordas':
    'Potência menor evita queimar e desfiar as bordas.',
  'mnote.passadas-1': 'Passadas: 1.',
  'mnote.reduza-um-pouco-a-distancia-focal-para-dentro-do-material':
    'Reduza um pouco a distância focal para dentro do material.',
  'mnote.processamento-em-alta-velocidade': 'Processamento em alta velocidade.',
  'mnote.potencia-muito-baixa-para-tecidos-leves':
    'Potência muito baixa para tecidos leves.',
  'mnote.ajuste-a-distancia-focal-para-dentro-do-nucleo-do-material':
    'Ajuste a distância focal para dentro do núcleo do material.',
  'mnote.corte-limpo-em-alta-velocidade': 'Corte limpo em alta velocidade.',

  // --------------------------------------------------------------- temas
  'theme.light': 'Claro',
  'theme.solarized-light': 'Solarized claro',
  'theme.sand': 'Areia',
  'theme.arctic': 'Ártico',
  'theme.silver': 'Prata',
  'theme.dark': 'Escuro',
  'theme.midnight': 'Meia-noite',
  'theme.solarized-dark': 'Solarized escuro',
  'theme.oled': 'OLED (preto puro)',
  'theme.hc-black': 'Alto contraste · Preto',
  'theme.hc-white': 'Alto contraste · Branco',
  'theme.group.light': 'Claros',
  'theme.group.dark': 'Escuros',
  'theme.group.hc': 'Alto contraste',

  // ------------------------------------------------- aparência e idioma
  'appearance.title': 'Aparência e idioma',
  'appearance.language': 'Idioma',
  'appearance.theme': 'Tema',
  'appearance.hint': 'Tema e idioma são salvos nas preferências.',
  'lang.pt-BR': 'Português (Brasil)',
  'lang.en': 'English',
  'lang.es': 'Español',

  // ------------------------------------------------------- sobre / rodapé
  'about.title': 'Sobre o GRBL Studio',
  'about.description':
    'Alternativa nativa Linux ao LaserGRBL para controlar gravadoras e ' +
    'cortadoras laser com firmware GRBL.',
  'about.version': 'Versão',
  'about.license': 'Licença',
  'about.author': 'Autor',
  'about.developedBy': 'Desenvolvido por',
  'about.repository': 'Repositório',
  'about.visit': 'Visitar lab.werneck.dev.br',
  'footer.by': 'Desenvolvido por',
  'footer.about': 'Sobre',

  // --------------------------------------------------------- menu nativo
  'menu.file': 'Arquivo',
  'menu.openGcode': 'Abrir G-code…',
  'menu.openSvg': 'Importar SVG…',
  'menu.openDxf': 'Importar DXF…',
  'menu.openPdf': 'Importar PDF…',
  'menu.editGcode': 'Editar G-code…',
  'menu.jobLibrary': 'Biblioteca de jobs…',
  'menu.quit': 'Sair',
  'menu.view': 'Exibir',
  'menu.tools': 'Ferramentas',
  'menu.materialTest': 'Grade de teste de material…',
  'menu.focusTest': 'Teste de foco (spot)…',
  'menu.presets': 'Presets de material…',
  'menu.design': 'Desenhar…',
  'menu.theme': 'Tema',
  'menu.language': 'Idioma',
  'menu.appearance': 'Aparência e idioma…',
  'menu.help': 'Ajuda',
  'menu.about': 'Sobre o GRBL Studio',
  'menu.site': 'Site do WerneckLab',
  'menu.tour': 'Tour de boas-vindas',

  // -------------------------------------------- console (RF-CON-14/15)
  'console.pause': 'Pausar rolagem',
  'console.resume': 'Retomar rolagem',
  'console.clear': 'Limpar',
  'console.save': 'Salvar log…',
  'console.saved': 'Log salvo em {path}',
  'console.saveFail': 'Falha ao salvar o log: {msg}',
  'dlg.saveLog': 'Salvar log do console',
  'filter.log': 'Log (texto)',
  'filter.design': 'Desenho do GRBL Studio',
  'filter.presets': 'Presets (JSON)',

  // ------------------------------------------------ status (RF-STA-2/4/7)
  'status.dtg': 'Para ir',
  'status.remaining': 'Restante',
  'status.alarmHint': 'Alarme ativo: use Unlock ($X) ou Reset antes de mover.',
  'status.history.title': 'Histórico de alarmes',
  'status.history.empty': 'Nenhum alarme registrado.',
  'status.history.command': 'Comando recusado:',
  'status.history.clear': 'Limpar histórico',
  'alarmfix.1':
    'Verifique a chave de fim de curso e faça homing ($H) ou envie Unlock ($X).',
  'alarmfix.2':
    'Envie Unlock ($X); para proteger a máquina, habilite soft limits ($20) com homing ($22).',
  'alarmfix.3':
    'Faça homing ($H) para restabelecer a origem antes de continuar.',
  'alarmfix.4':
    'Confira a fiação da sonda e o estado inicial do pino antes de sondar.',
  'alarmfix.5': 'Aproxime a sonda do material ou aumente o curso de sondagem.',
  'alarmfix.6': 'Repita o homing ($H); evite resetar durante o ciclo.',
  'alarmfix.7': 'Feche a porta de segurança e repita o homing ($H).',
  'alarmfix.8':
    'Aumente o pull-off ($27) e verifique a fiação do fim de curso.',
  'alarmfix.9':
    'Aumente a busca do homing ($25) e confira o fim de curso do eixo.',

  // ------------------------------------------------ conexão (RF-CON-5)
  'conn.firmware': 'Firmware: {value}',
  'conn.stateReport': 'Estado modal: {value}',

  // ------------------------------------------------------ jog (RF-JOG-2/6)
  'jog.hold.title': 'Segure para mover continuamente; solte para parar',
  'jog.keys.title': 'Setas: X/Y · PageUp/PageDown: Z · Home: homing ($H)',

  // ------------------------------------ perfis de configuração (RF-CFG-4)
  'settings.profile.title': 'Perfis de configuração',
  'settings.profile.hint': 'Salve o conjunto atual de $$ e reaplique depois.',
  'settings.profile.name': 'Nome do perfil',
  'settings.profile.save': 'Salvar perfil',
  'settings.profile.saveHint': 'Salva os valores atuais de $$',
  'settings.profile.apply': 'Aplicar',
  'settings.profile.applyHint': 'Reescreve os valores do perfil na máquina',
  'settings.profile.delete': 'Remover',
  'settings.profile.none': 'Nenhum perfil salvo',
  'settings.profile.saved': 'Perfil “{name}” salvo.',
  'settings.profile.applied': 'Perfil “{name}” aplicado.',
  'settings.profile.deleted': 'Perfil “{name}” removido.',
  'settings.profile.needName': 'Informe um nome para o perfil.',
  'settings.profile.applyFail': 'Falha ao aplicar o perfil: {msg}',

  // ---------------------------------------------- preferências (RF-CFG-5)
  'prefs.fileDir': 'Pasta de arquivos',
  'prefs.fileDir.hint': 'Onde abrir e salvar arquivos por padrão.',
  'prefs.fileDir.choose': 'Escolher pasta…',
  'prefs.fileDir.default': 'Pasta padrão do sistema',
  'prefs.fileDir.changed': 'Pasta de arquivos: {path}',
  'dlg.pickDir': 'Escolher pasta de arquivos',

  // --------------------------------------------- logs de sessão (RNF-9)
  'menu.logs': 'Abrir pasta de logs',
  'logs.none': 'Ainda não há logs.',

  // --------------------------------------- painel "Máquina" (P0.7/RF-MAQ)
  'machine.open': 'Máquina e diagnóstico',
  'machine.title': 'Máquina',
  'machine.read': 'Ler da máquina',
  'machine.reading': 'Lendo…',
  'machine.copy': 'Copiar diagnóstico',
  'machine.copied': 'Diagnóstico copiado.',
  'machine.copyFail': 'Não foi possível copiar: {msg}',
  'machine.connectFirst': 'Conecte-se à máquina para ler os dados.',
  'machine.noData': 'A máquina não devolveu dados.',
  'machine.fail': 'Falha ao ler: {msg}',
  'machine.notInformed': 'não informado',
  'machine.report': 'Diagnóstico',
  'machine.reportHint': 'Texto técnico para suporte — sem dados pessoais.',
  'machine.reportEmpty': 'Leia a máquina para gerar o diagnóstico.',
  'machine.section.firmware': 'Firmware',
  'machine.section.travel': 'Curso e limites',
  'machine.section.laser': 'Laser',
  'machine.section.motion': 'Movimento',
  'machine.section.modal': 'Estado atual',
  'machine.section.offsets': 'Offsets',
  'machine.section.startup': 'Blocos de inicialização',
  'machine.firmware.version': 'Versão',
  'machine.firmware.build': 'Build',
  'machine.firmware.platform': 'Plataforma',
  'machine.firmware.options': 'Opções',
  'machine.firmware.planner': 'Planner',
  'machine.firmware.buffer': 'Buffer RX',
  'machine.travel.x': 'Curso X',
  'machine.travel.y': 'Curso Y',
  'machine.travel.z': 'Curso Z',
  'machine.opt.V': 'PWM variável',
  'machine.opt.C': 'CoreXY',
  'machine.opt.M': 'Mist',
  'machine.laser.mode': 'Modo laser ($32)',
  'machine.laser.smax': 'Teto de S ($30)',
  'machine.laser.smin': 'Piso de S ($31)',
  'machine.laser.pwm': 'PWM ($33)',
  'machine.limits.soft': 'Soft limits ($20)',
  'machine.limits.hard': 'Hard limits ($21)',
  'machine.limits.homing': 'Homing ($22)',
  'machine.motion.maxRate': 'Velocidade máxima',
  'machine.motion.accel': 'Aceleração',
  'machine.motion.steps': 'Passos/mm',
  'machine.modal.motion': 'Movimento',
  'machine.modal.wcs': 'Sistema',
  'machine.modal.units': 'Unidades',
  'machine.modal.distance': 'Distância',
  'machine.modal.spindle': 'Laser/spindle',
  'machine.modal.feed': 'Avanço',
  'machine.modal.speed': 'Potência (S)',
  'machine.status': 'Estado',
  'machine.offsets.work': 'Trabalho (G54–G59)',
  'machine.offsets.refs': 'Referências (G28/G30)',
  'machine.offsets.tlo': 'TLO',
  'machine.offsets.prb': 'Sonda (PRB)',
  'machine.startup.none': 'Nenhum bloco de inicialização.',
  'machine.startup.warn': 'Estes comandos rodam a cada reset.',
  'machine.pins': 'Pinos',
  'machine.pins.none': 'nenhum',
  'machine.on': 'sim',
  'machine.off': 'não',
  'machine.unit.mm': 'mm',
  'machine.unit.mmmin': 'mm/min',
  'machine.unit.hz': 'Hz',
  'machine.unit.bytes': 'B',
  'machine.unit.blocks': 'blocos',

  // ------------------------------------------ pré-voo MX-1…MX-15 (P0.8)
  'preflight.title': 'Pré-voo',
  'preflight.chip': '{n} aviso(s)',
  'preflight.chipHint': 'Ver as checagens de pré-voo',
  'preflight.intro': 'Checagens antes de gravar. Nada foi enviado à máquina.',
  'preflight.startAnyway': 'Gravar assim mesmo',
  'preflight.blocked':
    'Há {n} impedimento(s). Gravar assim pode queimar errado ou ser recusado pelo GRBL.',
  'preflight.sev.block': 'impede',
  'preflight.sev.warn': 'atenção',
  'preflight.sev.info': 'informação',
  'preflight.fix.setting':
    'Sugestão: ajustar {code} para {value} (com confirmação).',
  'preflight.fix.action': 'Sugestão: {action}.',
  'preflight.action.open-machine': 'abrir o painel Máquina',
  'preflight.action.fit-preview': 'rever o tamanho/origem no preview',
  'preflight.action.reduce-power': 'reduzir a potência para o teto da máquina',
  'preflight.action.change-route': 'ajustar o G-code antes de gravar',
  'preflight.action.park': 'parquear alguns mm fora do zero',
  'preflight.MX-1.title': 'Potência acima do teto da máquina',
  'preflight.MX-1.detail':
    'O job pede S={s}, mas a máquina limita em $30={smax}. A potência efetiva será menor que a pedida.',
  'preflight.MX-2.title': 'Sem modo laser',
  'preflight.MX-2.detail':
    'O job usa M3/M4 e a máquina está com $32=0 — o GRBL responde error:17.',
  'preflight.MX-3.title': 'Job maior que o curso',
  'preflight.MX-3.detail':
    'A caixa do job excede o curso em {x} mm em X e {y} mm em Y.',
  'preflight.MX-4.title': 'Soft limits sem homing',
  'preflight.MX-4.detail':
    '$20=1 com $22=0 — o GRBL responde error:10. Ative o homing ou desative os soft limits.',
  'preflight.MX-5.title': 'G28/G30 sem home',
  'preflight.MX-5.detail':
    'A máquina está com $22=0 e o job usa G28/G30 — a posição pode não ser a esperada.',
  'preflight.MX-6.title': 'Movimento sem velocidade',
  'preflight.MX-6.detail':
    'A linha {line} usa G1 sem F e sem feed anterior — o GRBL responde error:22.',
  'preflight.MX-7.title': 'Entrada de segurança ativa',
  'preflight.MX-7.detail':
    'Pinos ativos: {pin}. Libere a porta/fim de curso antes de gravar.',
  'preflight.MX-8.title': 'Sem refrigeração',
  'preflight.MX-8.detail':
    'O job usa {codes}, mas este firmware não tem saída de mist (sem M em [OPT]).',
  'preflight.MX-9.title': 'Job em polegadas',
  'preflight.MX-9.detail':
    'O job usa G20 e a máquina relata em mm ($13=0) — confira as medidas.',
  'preflight.MX-10.title': 'Blocos de inicialização',
  'preflight.MX-10.detail':
    'Há {n} bloco(s) $N que rodam a cada reset e podem mudar o estado antes do job.',
  'preflight.MX-11.title': 'Jog fora do limite',
  'preflight.MX-11.detail':
    'O jog pede {step} mm / {feed} mm/min, acima do curso ({area} mm) ou da velocidade máxima ({maxRate} mm/min).',
  'preflight.MX-12.title': 'Primeiro corte sem S',
  'preflight.MX-12.detail':
    'A linha {line} liga o laser sem definir S; o GRBL mantém o S do job anterior e pode queimar com a potência antiga.',
  'preflight.MX-13.title': 'S-max do perfil difere de $30',
  'preflight.MX-13.detail':
    'O app usa 100 % = {profile}, a máquina usa $30={machine}. A potência efetiva sai diferente da pedida.',
  'preflight.MX-14.title': 'Buffer não informado',
  'preflight.MX-14.detail':
    'O firmware não informa o buffer RX em [OPT]; a janela de envio usa o padrão de 128 B.',
  'preflight.MX-15.title': 'Retorno ao zero com hard limits',
  'preflight.MX-15.detail':
    'O job parqueia em X0 Y0 com $21=1 — a chave pode disparar ALARM:1 e reiniciar o controlador.',
} as const;

export type MessageKey = keyof typeof ptBR;
