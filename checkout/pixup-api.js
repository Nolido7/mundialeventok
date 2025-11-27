// Configuração da API Pixup (API customizada)
const PIXUP_CONFIG = {
    apiKey: 'bd520ec08b45a30b97049ce48fc0ac846b0ce11545549c072103426b550abacb',
    clientId: 'maxodilon_9697351527464745',
    baseUrl: 'https://api-checkoutinho.up.railway.app/api',
    // Usa proxy Netlify Function para evitar CORS
    proxyUrl: '/.netlify/functions/pixup-proxy'
};

// Cache do token
let cachedToken = null;
let tokenExpiry = null;

// Função para obter o token criptografado
async function getEncryptedToken() {
    try {
        if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedToken;
        }
        
        // Usa proxy para evitar CORS
        const response = await fetch(`${PIXUP_CONFIG.proxyUrl}/${PIXUP_CONFIG.apiKey}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            throw new Error(`Erro ao obter token: ${errorData.message || errorData.error || errorText}`);
        }
        
        let token;
        try {
            const data = await response.json();
            token = data.token || data.encryptedToken || data;
        } catch {
            token = await response.text();
        }
        
        token = String(token).trim();
        cachedToken = token;
        tokenExpiry = Date.now() + (60 * 60 * 1000);
        
        return token;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw error;
    }
}

// Função para gerar pagamento PIX (simplificado: apenas nome e telefone)
async function generatePixPayment(paymentData) {
    try {
        const encryptedToken = await getEncryptedToken();
        const amountInCents = Math.round(paymentData.amount * 100);
        
        // Separa nome e sobrenome
        const nameParts = paymentData.customer.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;
        
        // Prepara payload simplificado
        const payload = {
            amount: amountInCents,
            description: paymentData.description || 'Taxa de confirmação',
            customer: {
                name: paymentData.customer.name,
                phone: paymentData.customer.phone.replace(/\D/g, ''),
                document: paymentData.customer.document ? paymentData.customer.document.replace(/\D/g, '') : null
            },
            item: {
                title: 'Taxa de confirmação',
                price: amountInCents,
                quantity: 1
            }
        };

        // Usa proxy para evitar CORS
        const response = await fetch(PIXUP_CONFIG.proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: encryptedToken,
                ...payload
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            throw new Error(errorData.message || errorData.error || 'Erro ao gerar pagamento PIX');
        }

        const data = await response.json();
        console.log('Resposta da API Pixup:', data);
        return data;
    } catch (error) {
        console.error('Erro ao gerar pagamento PIX:', error);
        throw error;
    }
}

// Função para verificar status do pagamento
async function verifyPaymentStatus(paymentId) {
    try {
        const encryptedToken = await getEncryptedToken();
        
        // Usa proxy para evitar CORS
        const response = await fetch(PIXUP_CONFIG.proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: encryptedToken,
                action: 'verify',
                paymentId: paymentId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }
            throw new Error(errorData.message || errorData.error || 'Erro ao verificar status do pagamento');
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
    generatePixPayment,
    verifyPaymentStatus,
    getEncryptedToken
};
