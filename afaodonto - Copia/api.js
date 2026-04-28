/**
 * BACKEND API INTEGRADA AO MYSQL
 * Agora todas as funções (exceto o login/auth, como solicitado) salvam diretamente no banco de dados real.
 */

const Api = {
    // ---- BANCO DE DADOS (Inicialização) ----
    initDB: function () {
        // Agora o DB real está no Node! Apenas inicializando configurações locais, se necessário.
        if (!localStorage.getItem('settings')) {
            localStorage.setItem('settings', JSON.stringify({ taxRate: 0.15 })); 
        }
    },

    // ---- AUTENTICAÇÃO (MANTIDA NO LOCALSTORAGE COMO PEDIDO) ----
    login: async function (email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email === 'afaodontologia1@gmail.com' && password === 'admin123') {
                    localStorage.setItem('auth_token', 'token_seguro_da_dra');
                    resolve({ success: true, user: { name: 'AFA Odontologia', role: 'admin' } });
                } else {
                    resolve({ success: false, message: 'E-mail ou senha incorretos' });
                }
            }, 800);
        });
    },

    logout: function () {
        localStorage.removeItem('auth_token');
    },

    isAuthenticated: function () {
        return !!localStorage.getItem('auth_token');
    },

    // ---- AGENDAMENTOS ----
    getAppointments: async function () {
        return new Promise(async resolve => {
            try {
                const res = await fetch('http://localhost:3000/api/consultas');
                const mysqlData = await res.json();
                resolve(mysqlData);
            } catch (error) {
                console.warn('Banco MySQL Offline: Falha ao buscar consultas.');
                resolve([]);
            }
        });
    },

    addAppointment: async function (appointmentData) {
        return new Promise(async resolve => {
            try {
                const res = await fetch('http://localhost:3000/api/consultas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appointmentData)
                });
                const data = await res.json();
                resolve(data);
            } catch (error) {
                console.error('Erro ao salvar no banco:', error);
                resolve({ success: false, message: 'Erro de conexão com o Banco.' });
            }
        });
    },

    updateAppointmentStatus: async function (id, newStatus) {
        return new Promise(async resolve => {
            try {
                const res = await fetch(`http://localhost:3000/api/consultas/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                resolve(data);
            } catch (error) {
                resolve({ success: false, message: 'Erro de conexão.' });
            }
        });
    },

    deleteAppointment: async function (id) {
        return new Promise(async resolve => {
            try {
                const res = await fetch(`http://localhost:3000/api/consultas/${id}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                resolve(data);
            } catch (error) {
                resolve({ success: false, message: 'Erro de conexão.' });
            }
        });
    },

    // ---- HISTÓRICO DE PACIENTES ----
    getPatients: async function () {
        return new Promise(async resolve => {
            try {
                const res = await fetch('http://localhost:3000/api/pacientes');
                const bdData = await res.json();
                
                const mapped = bdData.map(p => ({
                    id: p.id,
                    name: p.nome,
                    phone: p.telefone,
                    email: p.email,
                    cpf: p.cpf,
                    registeredAt: p.criado_em || new Date().toISOString(),
                    status: p.status || 'pendente'
                }));
                resolve(mapped);
            } catch (err) {
                console.warn('Banco MySQL Offline.');
                resolve([]);
            }
        });
    },

    updatePatientStatus: async function (id, newStatus) {
        return new Promise(async resolve => {
            try {
                const res = await fetch(`http://localhost:3000/api/pacientes/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                resolve(data);
            } catch (error) {
                resolve({ success: false, message: 'Erro de conexão.' });
            }
        });
    },

    // ---- FINANCEIRO ----
    getFinancialReport: async function () {
        return new Promise(async resolve => {
            try {
                const res = await fetch('http://localhost:3000/api/financeiro');
                const data = await res.json();
                resolve(data);
            } catch (err) {
                console.warn('Banco MySQL Offline: Erro no Financeiro');
                resolve({
                    gross: 0, net: 0, costs: 0, taxesDeducted: 0, taxRate: 0.15,
                    stats: { pending: 0, confirmed: 0, cancelled: 0 },
                    patientStats: { pendente: 0, atendido: 0, concluido: 0 },
                    history: []
                });
            }
        });
    }
};

// Auto inicializa
Api.initDB();
