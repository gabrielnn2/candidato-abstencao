# 🗳️ E Se a Abstenção Fosse um Candidato? · Eleições 2026

Dashboard analítico e interativo de jornalismo de dados eleitorais baseado nas fontes públicas oficiais do **Tribunal Superior Eleitoral (TSE)**.

O projeto investiga a seguinte provocação cívica:  
> **"Se os eleitores ausentes (não-comparecimento) formassem um candidato único à Presidência da República, ao Governo do Estado ou ao Senado Federal em 2026, em que posição ficariam no Brasil, em cada Estado e no seu município?"**

Inspirado na precisão editorial e estética HUD escura de [seuimposto.com](https://seuimposto.com/) e na pegada ágil, provocativa e compartilhável de [Minha Cidade Tem Mais Boi Que Gente](https://minha-cidade-tem-mais-boi-que-gente.gabrielnn.com/).

---

## 🚀 Principais Funcionalidades

1. **Veredito Jornalístico Instantâneo**:
   - Manchete dinâmica com linguagem clara de data-journalism: indica colocação, percentual simulado, número de votos e se o "Candidato Abstenção (00)" venceria no 1º turno, iria para o 2º turno ou estaria eleito.
   - Pódio eleitoral interativo com barras proporcionais comparando os votos válidos nominais de cada candidato real com a abstenção.

2. **Alternância entre Cargos (HUD Switcher)**:
   - 🏛️ **Presidente da República** (Brasil consolidado, 27 UFs e municípios).
   - 🏢 **Governador do Estado** (Disputas estaduais em todas as 27 UFs).
   - ⚖️ **Senado Federal** (Cenário de renovação de 2/3 com 2 vagas por estado em 2026).

3. **Mapa Geográfico Autêntico do Brasil**:
   - Vetores cartográficos oficiais de alta precisão com o traçado geográfico real das 27 Unidades da Federação (costa litorânea, ilhas e fronteiras naturais).
   - Barra seletora rápida de 27 UFs inspirada no grid matricial de `seuimposto.com`.
   - Coloração dinâmica indicando liderança ou classificação para 2º turno da abstenção com tooltips flutuantes em tempo real.

4. **Raio-X dos Governadores Eleitos em 1º Turno (Teste dos 50%)**:
   - Avaliação constitucional (CF/88 Art. 77, § 2º c/c Art. 28): para vencer no 1º turno, o candidato deve obter mais de 50% dos votos.
   - **Resultado do Estudo**: Dos 15 governadores eleitos em 1º turno no Brasil, **12 (80%) perderiam a vitória imediata e seriam forçados ao 2º Turno** se as abstenções fossem votos válidos!
   - Apenas 3 governadores sobreviveriam acima da linha de 50%: Helder Barbalho (PA), Mauro Mendes (MT) e Ratinho Júnior (PR).
   - Em **6 estados (AC, GO, MA, RJ, RN, TO)**, a própria **Abstenção ficaria em 2º lugar e iria disputar o 2º Turno contra o governador!**
   - Gráficos de barras comparativas com demarcação visual da linha dos 50% e filtros interativos.

5. **Identificação Partidária Transparente**:
   - Todos os nomes de candidatos acompanham sua filiação partidária oficial entre parênteses: `Nome do Candidato (PARTIDO)`.

6. **Busca Rápida de Municípios (Spotlight / `Ctrl+K`)**:
   - Autocomplete instantâneo para buscar qualquer capital ou cidade brasileira do banco de dados com atalhos de teclado (`↑`, `↓`, `Enter`, `Esc`).

7. **Gerador de Cards e Compartilhamento Viral**:
   - Disparo direto para WhatsApp e X (Twitter) com texto contextualizado da sua cidade/estado.
   - Cópia do texto para área de transferência em um clique.

8. **Descobertas e Curiosidades Nacionais**:
   - Cidades onde a abstenção superou o candidato mais votado (venceu no 1º turno).
   - Impacto no Senado: em todas as 27 UFs a abstenção elegeria um Senador, formando a maior bancada do Congresso (27 senadores).
   - Recordes de maior e menor comparecimento eleitoral.

---

## 📁 Estrutura do Projeto

```text
├── index.html                  # Interface web semântica e responsiva (Dark HUD)
├── styles.css                  # Design System em Vanilla CSS (Faustina + Geist)
├── app.js                      # Lógica do dashboard, mapa SVG, busca e pódio
├── server.py                   # Servidor de desenvolvimento local (porta 8080/fallback)
├── assets/
│   └── abstencao.svg           # Ícone vetorial oficial do Candidato Abstenção
├── data/
│   ├── data.js                 # Dataset embutido para execução direta (dispensa servidor)
│   ├── brasil.json             # Consolidação nacional (Presidência e curiosidades)
│   ├── estados.json            # 27 UFs detalhadas para Presidente, Governador e Senado
│   └── municipios.json         # Base municipal com índices eleitorais
└── scripts/
    └── ingest_tse_abstencoes.py # Pipeline de processamento e consolidação de dados do TSE
```

---

## 🛠️ Como Executar

### Opção 1: Direto no Navegador (Sem Instalação)
Basta abrir o arquivo [`index.html`](file:///c:/Users/gabri/OneDrive/_PORTFOLIO/Eleições/index.html) dando duplo clique em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).  
*Graças ao carregamento automático via `data/data.js`, a aplicação funciona perfeitamente mesmo sem servidor HTTP ativo.*

### Opção 2: Com o Servidor Local
Para executar localmente via HTTP:
```bash
python server.py
```
O servidor inicializará em `http://localhost:8080` (com detecção automática de portas livres).

---

## 📊 Pipeline de Dados e Fontes do TSE

O script [`scripts/ingest_tse_abstencoes.py`](file:///c:/Users/gabri/OneDrive/_PORTFOLIO/Eleições/scripts/ingest_tse_abstencoes.py) é responsável por:
1. Estruturar a modelagem eleitoral segundo as regras do TSE:
   - `aptos`: eleitores registrados.
   - `comparecimento`: eleitores presentes na seção eleitoral.
   - `abstencao`: eleitores ausentes (`aptos - comparecimento`).
2. Inserir a entidade `Abstenção (Não Comparecimento) - Número 00` na contagem com os candidatos nominais.
3. Calcular os indicadores de 1º turno, 2º turno e eleição proporcional ao Senado.
4. Exportar os arquivos consolidados em formato JSON e JS em `data/`.

Para reprocessar os dados a qualquer momento:
```bash
python scripts/ingest_tse_abstencoes.py
```

---

## ⚖️ Metodologia e Contexto Jurídico

Conforme o **Art. 77, § 2º da Constituição Federal de 1988**, votos nulos, em branco e abstenções não integram o cálculo dos votos válidos para proclamação dos eleitos.

Esta ferramenta tem propósito analítico, educativo e jornalístico de demonstrar o impacto do desencanto e do distanciamento eleitoral, dimensionando matematicamente o peso que a abstenção teria caso se transformasse em uma manifestação política nominal coesa.
