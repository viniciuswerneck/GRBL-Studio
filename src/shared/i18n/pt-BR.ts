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

  // ------------------------------------------------------- desenho vetorial
  'design.title': 'Desenhar',
  'design.tool.select': 'Selecionar',
  'design.tool.rect': 'Retângulo',
  'design.tool.circle': 'Círculo',
  'design.tool.line': 'Linha',
  'design.tool.text': 'Texto',
  'design.delete': 'Excluir',
  'design.clear': 'Limpar',
  'design.maximize': 'Maximizar/Restaurar',
  'design.undo': 'Desfazer',
  'design.redo': 'Refazer',
  'design.snap': 'Snap',
  'design.objects': 'Objetos',
  'design.speed': 'Velocidade (mm/min)',
  'design.power': 'Potência (%)',
  'design.passes': 'Passadas',
  'design.mode': 'Modo',
  'design.font': 'Fonte',
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
  'design.zoom.in': 'Aproximar',
  'design.zoom.out': 'Afastar',
  'design.zoom.fit': 'Ajustar à página',
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
  'design.group': 'Agrupar',
  'design.ungroup': 'Desagrupar',
  'design.duplicate': 'Duplicar',
  'design.grid': 'Grade',
  'design.document': 'Documento',
  'design.doc.width': 'Largura',
  'design.doc.height': 'Altura',
  'design.engraving': 'Gravação',
  'design.cancel': 'Cancelar',
  'design.text.title': 'Texto',
  'design.text.content': 'Texto',
  'design.text.font': 'Fonte',
  'design.text.size': 'Tamanho (mm)',
  'design.text.mode': 'Modo',
  'design.text.mode.vector': 'Vetor (contorno)',
  'design.text.mode.stroke': 'Traço único',
  'design.text.bold': 'Negrito',
  'design.text.noContour': 'Módulo de contorno não carregado.',
  'design.sel.none': 'Nenhum objeto selecionado',
  'design.sel.count': '{n} objeto(s) selecionado(s)',
  'design.objects.empty': 'Nenhum objeto ainda.',
  'design.kind.rect': 'Retângulo',
  'design.kind.ellipse': 'Elipse',
  'design.kind.line': 'Linha',
  'design.kind.text': 'Texto',
  'design.status.hint':
    'Desenhe com as ferramentas à esquerda. Roda do mouse = zoom; botão do meio = mover a tela.',
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

  // -------------------------------------------------------------- preview
  'preview.hint.image':
    'Carregue uma imagem para preparar o arquivo de gravação',
  'preview.hint.empty': 'Abra um G-code ou inicie um job para ver o caminho.',
  'preview.hint.noMoves': 'Este G-code não tem movimentos para desenhar.',
  'preview.cut': 'Queima',
  'preview.pass': 'Passada {n}/{total}',
  'preview.rapid': 'Deslocamento',
  'preview.tip': 'roda: zoom · arrastar: mover · duplo clique: ajustar',
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
  'client.reset': 'Reset pelo usuário.',
  'client.writeFail': 'Falha ao escrever na serial: {msg}',
  'client.stall':
    'A máquina não respondeu em {ms} ms aguardando "ok". Envio pausado — verifique a conexão.',

  // -------------------------------------- diálogos nativos (main -> OS)
  'filter.macros': 'Macros (JSON)',
  'filter.all': 'Todos os arquivos',
  'dlg.openImage': 'Abrir imagem',
  'dlg.openGcode': 'Abrir G-code',
  'dlg.openSvg': 'Abrir SVG',
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
  'menu.quit': 'Sair',
  'menu.view': 'Exibir',
  'menu.tools': 'Ferramentas',
  'menu.materialTest': 'Grade de teste de material…',
  'menu.design': 'Desenhar…',
  'menu.theme': 'Tema',
  'menu.language': 'Idioma',
  'menu.appearance': 'Aparência e idioma…',
  'menu.help': 'Ajuda',
  'menu.about': 'Sobre o GRBL Studio',
  'menu.site': 'Site do WerneckLab',

  // -------------------------------------------- console (RF-CON-14/15)
  'console.pause': 'Pausar rolagem',
  'console.resume': 'Retomar rolagem',
  'console.clear': 'Limpar',
  'console.save': 'Salvar log…',
  'console.saved': 'Log salvo em {path}',
  'console.saveFail': 'Falha ao salvar o log: {msg}',
  'dlg.saveLog': 'Salvar log do console',
  'filter.log': 'Log (texto)',

  // ------------------------------------------------ status (RF-STA-2/4/7)
  'status.dtg': 'Para ir',
  'status.remaining': 'Restante',
  'status.alarmHint': 'Alarme ativo: use Unlock ($X) ou Reset antes de mover.',
  'status.history.title': 'Histórico de alarmes',
  'status.history.empty': 'Nenhum alarme registrado.',
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
} as const;

export type MessageKey = keyof typeof ptBR;
