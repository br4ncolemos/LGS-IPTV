<div align="center">

# 📺 LGS IPTV
**O futuro do streaming na sua TV, celular e PC.**

[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-success?style=for-the-badge)](https://github.com/)
[![Plataformas](https://img.shields.io/badge/Plataformas-Web%20%7C%20Android%20%7C%20iOS%20%7C%20Smart%20TV-blue?style=for-the-badge)]()
[![Feito com](https://img.shields.io/badge/Feito%20com-HTML5%20%7C%20CSS3%20%7C%20JS-yellow?style=for-the-badge)]()

*Uma interface premium, rápida e imersiva construída do zero para provedores de IPTV.*

</div>

---

## 🚀 Sobre o Projeto

O **LGS IPTV** não é apenas mais um player na web. Ele foi arquitetado para ser um **Super App** multiplataforma. Seja no navegador do seu computador, no celular ou empacotado dentro de uma Smart TV (Android TV, Tizen, WebOS), a experiência é idêntica e profissional.

Esqueça as interfaces feias e travadas de antigamente. Aqui, usamos o que há de mais moderno no desenvolvimento web (Glassmorphism, animações fluidas e SVG) aliado a um sistema proprietário de navegação por controle remoto.

## ✨ Funcionalidades Principais

- 📡 **Conexões Múltiplas:** Suporte nativo a Xtream Codes API e arquivos M3U/M3U8.
- 🎮 **D-Pad Navigation:** Navegação espacial milimetricamente calculada para funcionar perfeitamente com o controle remoto da TV.
- 🎬 **Player de Cinema:** Interface estilo Netflix com auto-hide de controles, pular 10 segundos e barra de progresso interativa.
- ⏱️ **Continuar Assistindo:** O app salva o exato segundo em que você pausou um filme (LocalStorage) e pergunta se você quer continuar de onde parou ao voltar.
- 🔐 **Sistema de MAC Address:** Gera um ID único para o dispositivo, permitindo que provedores gerenciem o acesso.
- 🍿 **Hub Central:** Separação intuitiva entre Ao Vivo, Filmes e Séries, com carregamento infinito (Lazy Load).
- 🎨 **Design Premium:** Construído com Poppins, paleta de cores escura e toques de Ciano (Neon).

---

## 🛠️ Tecnologias Utilizadas

Aqui não há frameworks pesados (como React ou Vue). Tudo foi feito de forma cirúrgica com o que há de melhor no Vanilla:

| Tecnologia | Uso no Projeto |
| :--- | :--- |
| **HTML5** | Estrutura semântica e acessível. |
| **CSS3** | Grid, Flexbox, Variáveis e animações com `@keyframes`. |
| **JavaScript (ES6)** | Módulos, Promises, Async/Await e manipulação de DOM. |
| **HLS.js** | Decodificação de streams `.m3u8` para navegadores. |
| **Uiverse.io** | Inspiração para os botões e loaders animados. |
| **LocalStorage** | Banco de dados local para sessões, MAC e histórico. |

---

## 📂 Estrutura de Pastas

```text
LGS IPTV/
├── public/                  # Arquivos PWA (manifest, ícones, service worker)
├── src/
│   ├── css/                 # Estilos separados (base, player, foco para TV)
│   ├── js/
│   │   ├── api/             # Integração com Xtream, M3U e Storage
│   │   ├── player/          # PlayerManager e Setup do HLS
│   │   ├── tv/              # Sistema de navegação D-Pad (spatialNav)
│   │   ├── ui/              # Componentes e renderização de telas
│   │   └── app.js           # Cérebro da aplicação
│   └── vendor/              # Bibliotecas de terceiros (hls.min.js)
├── index.html               # Interface raiz do app
└── package.json             # Dependências para servir o projeto localmente
```

## 🚀 Como Rodar Localmente

Para testar o LGS IPTV no seu computador, você só precisa de um servidor local (para evitar erros de CORS ao puxar as listas).

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/lgs-iptv.git
   ```
2. **Acesse a pasta:**
   ```bash
   cd "LGS IPTV"
   ```
3. **Inicie o servidor (usando NPX):**
   ```bash
   npx serve .
   ```
4. **Abra no navegador:** Acesse `http://localhost:3000`.

> 💡 **Dica de Ouro:** Para testar no celular, conecte o celular no mesmo Wi-Fi do PC e acesse o IP da sua máquina (ex: `http://192.168.1.15:3000`).

## 🎮 Atalhos do Controle Remoto (D-Pad)

O app foi moldado para as TVs. Se você estiver testando no teclado do PC, use os seguintes comandos:

| Tecla | Ação no App |
| :--- | :--- |
| `Setas (⬆️ ⬇️ ⬅️ ➡️)` | Navegar entre cards, menus e categorias |
| `Enter` | Selecionar item / Dar Play / Confirmar |
| `Espaço` | Play / Pause no player |
| `Backspace` ou `Escape` | Pular direto para a barra de pesquisa ou voltar tela |
| `Setas Laterais (no player)` | Avançar ou retroceder 10 segundos |

## 📱 Empacotamento para TV e Celular

Este projeto está com a arquitetura 100% pronta para ser embrulhado como app nativo:

- **Android e Android TV:** Utilize o [Capacitor](https://capacitorjs.com/). Ele pega esta pasta web e gera um APK que pode ser instalado no Fire Stick ou TV Box.
- **iOS / Apple TV:** Use o Capacitor com o Xcode para gerar o `.ipa`.
- **LG (WebOS) / Samsung (Tizen):** Os arquivos já estão preparados. Basta usar o SDK oficial de cada fabricante para empacotar a pasta como um app de TV.

## 👨‍💻 Desenvolvedor

**Juan Lemos** 
*"Transformando código em entretenimento."*

Sinta-se livre para abrir Issues com sugestões de melhorias, reportar bugs ou mandar um Pull Request!

<div align="center">
  <br>
  <i>Se este projeto foi útil para você, deixe uma ⭐ no repositório!</i>
</div>
