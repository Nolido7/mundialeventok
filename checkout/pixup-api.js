// Configuração da API Pixup conforme documentação oficial
// https://pixup.readme.io/reference/come%C3%A7ando
const PIXUP_CONFIG = {
    clientId: 'maxodilon_9697351527464745',
    clientSecret: 'bd520ec08b45a30b97049ce48fc0ac846b0ce11545549c072103426b550abacb',
    baseUrl: 'https://api.pixup.com.br/v2'
};

// Cache do token
let cachedToken = null;
let tokenExpiry = null;

// Função para criar token de acesso conforme documentação Pixup
async function createAccessToken() {
    try {
        // Verifica se há token em cache ainda válido (válido por 1 hora)
        if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedToken;
        }

        // Cria credenciais básicas (Base64)
        const credentials = btoa(`${PIXUP_CONFIG.clientId}:${PIXUP_CONFIG.clientSecret}`);

        const response = await fetch(`${PIXUP_CONFIG.baseUrl}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`
            },
            body: JSON.stringify({
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao criar token: ${errorText}`);
        }

        const data = await response.json();
        const token = data.access_token || data.token;

        if (!token) {
            throw new Error('Token não retornado pela API');
        }

        // Cacheia o token
        cachedToken = token;
        tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000);

        return token;
    } catch (error) {
        console.error('Erro ao criar token:', error);
        throw error;
    }
}

// Função para gerar QR Code PIX
async function generatePixQRCode(paymentData) {
    try {
        const token = await createAccessToken();

        // Converte valor para centavos
        const amountInCents = Math.round(paymentData.amount * 100);

        // Prepara payload conforme documentação
        const payload = {
            amount: amountInCents,
            description: paymentData.description || 'Taxa de confirmação',
            payer: {
                name: paymentData.customer.name,
                document: paymentData.customer.document ? paymentData.customer.document.replace(/\D/g, '') : null,
                phone: paymentData.customer.phone ? paymentData.customer.phone.replace(/\D/g, '') : null
            }
        };

        const response = await fetch(`${PIXUP_CONFIG.baseUrl}/pix/qrcode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Erro ao gerar QR Code PIX');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao gerar QR Code PIX:', error);
        throw error;
    }
}

// Função para verificar status do pagamento
async function verifyPaymentStatus(transactionId) {
    try {
        const token = await createAccessToken();

        const response = await fetch(`${PIXUP_CONFIG.baseUrl}/pix/transaction/${transactionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao verificar status do pagamento');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        throw error;
    }
}

// Exporta as funções
window.PixupAPI = {
    generatePixQRCode,
    verifyPaymentStatus,
    createAccessToken
};
