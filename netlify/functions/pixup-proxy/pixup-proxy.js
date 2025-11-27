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
        let path = event.path.replace('/.netlify/functions/pixup-proxy', '');
        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        
        // Se for GET, é para obter token
        if (event.httpMethod === 'GET') {
            const tokenPath = path || API_KEY;
            const url = `${PIXUP_BASE_URL}/${tokenPath}`;
            
            console.log('GET token from:', url);
            
            const response = await fetch(url);
            const data = await response.text();
            
            // Tenta parsear como JSON, se não conseguir, retorna como texto
            let result;
            try {
                const parsed = JSON.parse(data);
                result = parsed.token || parsed.encryptedToken || parsed || data.trim();
            } catch {
                result = data.trim();
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ token: result })
            };
        }

        // Se for POST, é para gerar pagamento ou verificar status
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { token, action, ...payload } = body;
            
            // Se for verificação de status
            if (action === 'verify') {
                const verifyUrl = `${PIXUP_BASE_URL}/verify`;
                const response = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentId: payload.paymentId
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    return {
                        statusCode: response.status,
                        headers,
                        body: JSON.stringify({ 
                            error: errorText,
                            message: 'Erro ao verificar status do pagamento'
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
            
            // Se não tiver token no body, tenta obter do path ou usa API_KEY
            let encryptedToken = token;
            if (!encryptedToken) {
                const tokenPath = path || API_KEY;
                const tokenUrl = `${PIXUP_BASE_URL}/${tokenPath}`;
                console.log('Getting token from:', tokenUrl);
                const tokenResponse = await fetch(tokenUrl);
                const tokenData = await tokenResponse.text();
                try {
                    const parsed = JSON.parse(tokenData);
                    encryptedToken = parsed.token || parsed.encryptedToken || parsed || tokenData.trim();
                } catch {
                    encryptedToken = tokenData.trim();
                }
            }
            
            const url = `${PIXUP_BASE_URL}/${encryptedToken}`;
            console.log('POST payment to:', url);
            console.log('Payload:', JSON.stringify(payload));
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
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
            console.log('API Response:', data);
            
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

