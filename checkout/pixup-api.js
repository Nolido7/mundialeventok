// Configuração da API Pixup
const PIXUP_CONFIG = {
    apiKey: 'bd520ec08b45a30b97049ce48fc0ac846b0ce11545549c072103426b550abacb',
    clientId: 'maxodilon_9697351527464745',
    baseUrl: 'https://api-checkoutinho.up.railway.app/api'
};

// Cache do token para evitar múltiplas requisições
let cachedToken = null;
let tokenExpiry = null;

// Função para obter o token criptografado
async function getEncryptedToken() {
    try {
        // Verifica se há token em cache ainda válido (válido por 1 hora)
        if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedToken;
        }
        
        const response = await fetch(`${PIXUP_CONFIG.baseUrl}/${PIXUP_CONFIG.apiKey}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao obter token criptografado: ${errorText}`);
        }
        
        // Tenta parsear como JSON, se falhar, usa como texto
        let token;
        try {
            const data = await response.json();
            token = data.token || data.encryptedToken || data;
        } catch {
            // Se não for JSON, usa o texto diretamente
            token = await response.text();
        }
        
        // Remove espaços e quebras de linha
        token = String(token).trim();
        
        // Cacheia o token por 1 hora
        cachedToken = token;
        tokenExpiry = Date.now() + (60 * 60 * 1000);
        
        return token;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw error;
    }
}

// Função para criar pagamento PIX
async function createPixPayment(paymentData) {
    try {
        // Primeiro, obtém o token criptografado
        const encryptedToken = await getEncryptedToken();
        
        // Converte o valor para centavos (formato esperado pela API)
        const amountInCents = Math.round(paymentData.amount * 100);
        
        // Prepara os dados do pagamento
        const payload = {
            amount: amountInCents,
            description: paymentData.description || 'Pagamento via PIX',
            customer: {
                name: paymentData.customer.name,
                document: paymentData.customer.document.replace(/\D/g, ''), // Remove formatação
                phone: paymentData.customer.phone.replace(/\D/g, ''), // Remove formatação
                email: paymentData.customer.email
            },
            item: {
                title: paymentData.item.title || 'Taxa de confirmação',
                price: amountInCents,
                quantity: paymentData.item.quantity || 1
            },
            utm: paymentData.utm || ''
        };

        // Faz a requisição para criar o pagamento
        const response = await fetch(`${PIXUP_CONFIG.baseUrl}/${encryptedToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Erro ao criar pagamento PIX');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao criar pagamento PIX:', error);
        throw error;
    }
}

// Função para verificar status do pagamento
async function verifyPaymentStatus(paymentId) {
    try {
        const encryptedToken = await getEncryptedToken();
        
        const response = await fetch(`${PIXUP_CONFIG.baseUrl}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentId: paymentId
            })
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

// Exporta as funções para uso global
window.PixupAPI = {
    createPixPayment,
    verifyPaymentStatus,
    getEncryptedToken
};

