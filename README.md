# Sistema de Checkout TikTok Evento

Sistema de checkout integrado com API Pixup para geração de pagamentos PIX copia e cola.

## 📋 Estrutura do Projeto

```
.
├── checkout/              # Página de checkout
│   ├── index.html        # Página principal do checkout
│   ├── styles.css        # Estilos do checkout
│   ├── checkout.js       # Lógica do checkout
│   └── pixup-api.js      # Integração com API Pixup
├── tik tok evento/       # Landing page do evento
├── checkount/            # Checkout antigo (backup)
├── netlify.toml          # Configuração Netlify
├── vercel.json           # Configuração Vercel
├── .htaccess            # Configuração Apache (host pago)
└── web.config           # Configuração IIS (host pago Windows)
```

## 🚀 Deploy

### Netlify

1. Conecte seu repositório ao Netlify
2. Configure o diretório de publicação como `.` (raiz)
3. O arquivo `netlify.toml` já está configurado
4. Deploy automático!

### Vercel

1. Conecte seu repositório ao Vercel
2. O arquivo `vercel.json` já está configurado
3. Deploy automático!

### Host Pago

#### Apache (Linux)
- O arquivo `.htaccess` já está configurado
- Certifique-se de que o módulo `mod_rewrite` está habilitado

#### IIS (Windows)
- O arquivo `web.config` já está configurado
- Certifique-se de que o URL Rewrite está instalado

## ⚙️ Configuração

### API Pixup

As credenciais da API Pixup estão configuradas em `checkout/pixup-api.js`:

```javascript
const PIXUP_CONFIG = {
    apiKey: 'bd520ec08b45a30b97049ce48fc0ac846b0ce11545549c072103426b550abacb',
    clientId: 'maxodilon_9697351527464745',
    baseUrl: 'https://api-checkoutinho.up.railway.app/api'
};
```

### Valor do Checkout

O valor do checkout pode ser passado via URL:

```
/checkout/index.html?valor=21.67
```

Ou será usado o valor padrão de R$ 21,67.

## 🔄 Fluxo de Pagamento

1. Usuário preenche o formulário no checkout
2. Sistema gera código PIX via API Pixup
3. Código PIX é exibido (QR Code + Copia e Cola)
4. Sistema verifica status do pagamento a cada 5 segundos
5. Após confirmação, redireciona para página de sucesso

## 📱 Funcionalidades

- ✅ Formulário de checkout responsivo
- ✅ Integração com API Pixup
- ✅ Geração de código PIX copia e cola
- ✅ QR Code para pagamento
- ✅ Verificação automática de status
- ✅ Timer de expiração
- ✅ Suporte a parâmetros UTM
- ✅ Redirecionamento após pagamento

## 🔒 Segurança

- Headers de segurança configurados
- Validação de dados no frontend
- Comunicação segura com API (HTTPS)

## 📝 Notas

- O valor do PIX é gerado dinamicamente baseado no valor do checkout
- Os parâmetros UTM são preservados durante o redirecionamento
- O sistema funciona perfeitamente em Netlify, Vercel e hosts pagos

