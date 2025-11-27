exports.handler = async (event, context) => {
    // Permite CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Responde a requisições OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const PIXUP_BASE_URL = 'https://api-checkoutinho.up.railway.app/api';
        const API_KEY = 'bd520ec08b45a30b97049ce48fc0ac846b0ce11545549c072103426b550abacb';

        // Parse do path
        const path = event.path.replace('/.netlify/functions/pixup-proxy', '');
        
        // Se for GET, é para obter token
        if (event.httpMethod === 'GET') {
            const tokenPath = path.replace('/', '') || API_KEY;
            const url = `${PIXUP_BASE_URL}/${tokenPath}`;
            
            const response = await fetch(url);
            const data = await response.text();
            
            // Tenta parsear como JSON, se não conseguir, retorna como texto
            let result;
            try {
                result = JSON.parse(data);
            } catch {
                result = data.trim();
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ token: result })
            };
        }

        // Se for POST, é para gerar pagamento
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { token, ...payload } = body;
            
            // Se não tiver token no body, tenta obter do path
            let encryptedToken = token;
            if (!encryptedToken) {
                const tokenPath = path.replace('/', '') || API_KEY;
                const tokenResponse = await fetch(`${PIXUP_BASE_URL}/${tokenPath}`);
                encryptedToken = await tokenResponse.text();
                encryptedToken = encryptedToken.trim();
            }
            
            const url = `${PIXUP_BASE_URL}/${encryptedToken}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    statusCode: response.status,
                    headers,
                    body: JSON.stringify({ 
                        error: errorText,
                        message: 'Erro ao gerar pagamento PIX'
                    })
                };
            }

            const data = await response.json();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Erro no proxy:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                message: 'Erro interno do servidor'
            })
        };
    }
};

