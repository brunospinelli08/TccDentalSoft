/**
 * FRONTEND MVC LOGIC (Multi-page Architecture)
 * Lida de forma segura com diferentes páginas
 */

const App = {
    state: {
        sched: { service: '', price: 0, date: '', time: '' }
    },

    init: function() {
        if(document.getElementById('sel-date')) {
            this.setupDateLimit();
        }
        
        // Se estamos na pagina admin, checar auth
        if(document.getElementById('admin-login') || document.getElementById('admin-dashboard')) {
            this.checkAuth();
        }
        
        this.initScrollAnimations();
        this.initNavbarScrolled();
    },

    initScrollAnimations: function() {
        const reveals = document.querySelectorAll('.reveal');
        if(!reveals.length) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.15 });

        reveals.forEach(r => observer.observe(r));
        
        // Trigger manual inicial para elementos já visíveis
        setTimeout(() => {
            reveals.forEach(r => {
                const rect = r.getBoundingClientRect();
                if(rect.top < window.innerHeight) r.classList.add('active');
            });
        }, 100);
    },

    initNavbarScrolled: function() {
        const nav = document.getElementById('main-nav');
        if(!nav) return;
        
        window.addEventListener('scroll', () => {
            if(window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            

        });
    },

    // ---- FLUXO DE AGENDAMENTO (PACIENTES) ----
    openModal: function(id) {
        const m = document.getElementById(id);
        if(m) m.classList.remove('hidden');
    },

    closeModal: function(id) {
        const m = document.getElementById(id);
        if(m) m.classList.add('hidden');
        
        const step1 = document.getElementById('sched-step-1');
        const step2 = document.getElementById('sched-step-2');
        const step3 = document.getElementById('sched-step-3');
        
        if(step1) step1.classList.remove('hidden');
        if(step2) step2.classList.add('hidden');
        if(step3) step3.classList.add('hidden');
        
        this.state.sched = {};
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    },

    setupDateLimit: function() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sel-date').setAttribute('min', today);
    },

    selectSlot: function(btnElement) {
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btnElement.classList.add('selected');
        document.getElementById('sel-time').value = btnElement.innerText;
    },

    nextSchedStep: function() {
        const selVal = document.getElementById('sel-service').value.split('|');
        const selDate = document.getElementById('sel-date').value;
        const selTime = document.getElementById('sel-time').value;

        if (!selDate || !selTime) {
            alert("Por favor, escolha uma data e um horário livre.");
            return;
        }

        this.state.sched.service = { name: selVal[0], price: parseFloat(selVal[1]) };
        const d = selDate.split('-');
        this.state.sched.date = `${d[2]}/${d[1]}/${d[0]}`;
        this.state.sched.time = selTime;

        document.getElementById('sched-step-1').classList.add('hidden');
        document.getElementById('sched-step-2').classList.remove('hidden');
    },

    prevSchedStep: function() {
        document.getElementById('sched-step-2').classList.add('hidden');
        document.getElementById('sched-step-1').classList.remove('hidden');
    },

    finishScheduling: async function() {
        const name = document.getElementById('pat-name').value;
        const phone = document.getElementById('pat-phone').value;
        const email = document.getElementById('pat-email').value;

        if (!name || !phone || !email) {
            alert('Preencha todos os dados obrigatórios (*).');
            return;
        }

        const btn = document.getElementById('btn-finish-ag');
        btn.innerText = 'Processando...';
        btn.disabled = true;

        const data = {
            service: this.state.sched.service,
            date: this.state.sched.date,
            time: this.state.sched.time,
            patient: { name, phone, email }
        };

        const res = await Api.addAppointment(data);
        
        if (res.success) {
            document.getElementById('sched-step-2').classList.add('hidden');
            document.getElementById('sched-step-3').classList.remove('hidden');
        } else {
            alert('Falha ao agendar: ' + res.message);
        }

        btn.innerText = 'Finalizar Agendamento';
        btn.disabled = false;
    },

    simularEnvioWhatsappPaciente: function() {
        const msg = `Olá, gostaria de confirmar meu agendamento de ${this.state.sched.service.name} para o dia ${this.state.sched.date} às ${this.state.sched.time}. Meu nome é ${document.getElementById('pat-name').value} e meu telefone é ${document.getElementById('pat-phone').value}.`;
        const clinicPhone = '11983719203'; 
        window.open(`https://wa.me/55${clinicPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    },

    // ---- FLUXO DA DRA. (ADMINISTRAÇÃO/DASHBOARD) ----
    checkAuth: function() {
        const dash = document.getElementById('admin-dashboard');
        const login = document.getElementById('admin-login');
        
        if(!dash || !login) return; // Não está na pagina admin

        if (Api.isAuthenticated()) {
            login.classList.add('hidden');
            dash.classList.remove('hidden');
            this.loadAdminData();
        } else {
            login.classList.remove('hidden');
            dash.classList.add('hidden');
        }
    },

    handleLogin: async function(e) {
        e.preventDefault(); 
        const em = document.getElementById('login-email').value;
        const pw = document.getElementById('login-pass').value;
        const btn = document.getElementById('btn-login-submit');
        const err = document.getElementById('login-error');
        
        err.classList.add('hidden');
        btn.innerText = "Verificando...";
        
        const res = await Api.login(em, pw);
        
        if (res.success) {
            document.getElementById('admin-user-name').innerText = `Olá, ${res.user.name}`;
            this.checkAuth();
        } else {
            err.innerText = res.message;
            err.classList.remove('hidden');
        }
        
        btn.innerText = "Entrar no Sistema";
    },

    logout: function() {
        Api.logout();
        this.checkAuth();
        const p = document.getElementById('login-pass');
        if(p) p.value = '';
    },

    openAdminModal: function() {
        const m = document.getElementById('admin-modal');
        if(m) m.classList.remove('hidden');
    },

    closeAdminModal: function() {
        const m = document.getElementById('admin-modal');
        if(m) m.classList.add('hidden');
        document.getElementById('admin-appt-form').reset();
    },

    adminAddAppointment: async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('admin-pat-name').value;
        const phone = document.getElementById('admin-pat-phone').value;
        const email = document.getElementById('admin-pat-email').value;
        const srvName = document.getElementById('admin-sel-service').value;
        const srvPrice = parseFloat(document.getElementById('admin-sel-price').value || 0);
        const cost = parseFloat(document.getElementById('admin-sel-cost').value || 0);
        const payMethod = document.getElementById('admin-pay-method').value;
        
        const rawDate = document.getElementById('admin-sel-date').value;
        const d = rawDate.split('-');
        const formattedDate = `${d[2]}/${d[1]}/${d[0]}`;
        const time = document.getElementById('admin-sel-time').value;
        const desc = document.getElementById('admin-pat-desc').value;

        const btn = document.getElementById('btn-admin-submit-appt');
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        const data = {
            service: { name: srvName, price: srvPrice },
            date: formattedDate,
            time: time,
            patient: { name, phone, email },
            description: desc,
            financials: { cost: cost, payMethod: payMethod }
        };

        const res = await Api.addAppointment(data);
        
        if (res.success) {
            this.closeAdminModal();
            this.loadAdminData(); // Atualiza a tabela com o novo agendamento
        } else {
            alert('Falha ao agendar: ' + res.message);
        }

        btn.innerText = 'Salvar Agendamento';
        btn.disabled = false;
    },

    loadAdminData: async function() {
        const dashGross = document.getElementById('dash-gross');
        if(!dashGross) return; // Segurança caso a DOM suma

        // Carrega tabela de histórico de clientes
        this.loadPatientsTable();

        const finances = await Api.getFinancialReport();
        dashGross.innerText = `R$ ${finances.gross.toFixed(2).replace('.', ',')}`;
        document.getElementById('dash-net').innerText = `R$ ${finances.net.toFixed(2).replace('.', ',')}`;
        
        const countDash = document.getElementById('dash-count');
        if(countDash) countDash.innerText = finances.stats.pending + finances.stats.confirmed;

        const dashCosts = document.getElementById('dash-costs');
        if(dashCosts) dashCosts.innerText = `R$ ${finances.costs.toFixed(2).replace('.', ',')}`;

        const dashTaxes = document.getElementById('dash-taxes');
        if(dashTaxes) dashTaxes.innerText = `R$ ${finances.taxesDeducted.toFixed(2).replace('.', ',')}`;
        
        // Handle Chart JS rendering safely
        this.renderAdminChart(finances);
        
        const apps = await Api.getAppointments();
        const list = document.getElementById('admin-appointments-list');
        const empty = document.getElementById('admin-empty-state');
        list.innerHTML = '';
        
        if (apps.length === 0) {
            empty.classList.remove('hidden');
            list.parentElement.classList.add('hidden');
        } else {
            empty.classList.add('hidden');
            list.parentElement.classList.remove('hidden');
            
            apps.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${app.patient.name}</strong></td>
                    <td class="text-sm">
                        <a href="https://wa.me/55${app.patient.phone.replace(/\D/g,'')}?text=Olá, somos da Clínica!" target="_blank" class="text-success" title="Chamar Whatsapp"><i class="ri-whatsapp-line text-lg"></i></a>
                        <br>${app.patient.phone}
                    </td>
                    <td>${app.service.name}<br><strong class="text-gray">R$ ${app.service.price.toFixed(2)}</strong>
                        ${app.description ? `<br><span class="text-xs text-gray opacity-70 italic block mt-1"><i class="ri-sticky-note-line"></i> ${app.description}</span>` : ''}
                    </td>
                    <td>${app.date}<br><strong>${app.time}</strong></td>
                    <td><span class="status-badge status-${app.status}">${app.status.toUpperCase()}</span></td>
                    <td>
                        <div class="flex gap-2">
                            <button class="btn btn-sm btn-secondary mb-2 bg-light text-success flex-1" style="border-color: var(--success);" onclick="App.changeStatus('${app.id}', 'confirmada')" title="Confirmar"><i class="ri-check-line"></i></button>
                            <button class="btn btn-sm btn-secondary mb-2 text-danger flex-1" style="border-color: var(--danger)" onclick="App.changeStatus('${app.id}', 'cancelada')" title="Cancelar"><i class="ri-close-line"></i></button>
                            <button class="btn btn-sm mb-2 text-gray flex-1 bg-light border-y border-l border-r" onclick="App.adminDeleteAppointment('${app.id}')" title="Excluir Permanentemente"><i class="ri-delete-bin-line"></i></button>
                        </div>
                        <button class="btn btn-sm bg-dark text-white w-full" onclick="App.changeStatus('${app.id}', 'concluida')">Marcar Paga</button>
                    </td>
                `;
                list.appendChild(tr);
            });
        }
    },

    changeStatus: async function(id, status) {
        if(confirm(`Tem certeza que deseja mudar o status dessa consulta para ${status.toUpperCase()}?`)) {
            const res = await Api.updateAppointmentStatus(id, status);
            if(res.success) {
                this.loadAdminData();
            }
        }
    },

    changePatientStatus: async function(id, status) {
        const res = await Api.updatePatientStatus(id, status);
        if(res.success) {
            this.loadAdminData();
        }
    },

    loadPatientsTable: async function() {
        const patients = await Api.getPatients();
        const list = document.getElementById('admin-patients-list');
        const empty = document.getElementById('admin-patients-empty');
        if(!list || !empty) return;

        list.innerHTML = '';
        
        if (patients.length === 0) {
            empty.classList.remove('hidden');
            list.parentElement.classList.add('hidden');
        } else {
            empty.classList.add('hidden');
            list.parentElement.classList.remove('hidden');
            
            // Sort by recent registration
            patients.sort((a,b) => new Date(b.registeredAt) - new Date(a.registeredAt)).forEach(p => {
                const dateObj = new Date(p.registeredAt);
                const pDate = `${('0'+dateObj.getDate()).slice(-2)}/${('0'+(dateObj.getMonth()+1)).slice(-2)}/${dateObj.getFullYear()}`;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-xs text-gray-400 font-bold">${p.id || '---'}</td>
                    <td><strong class="text-dark">${p.name}</strong></td>
                    <td>
                        <a href="https://wa.me/55${p.phone.replace(/\D/g,'')}?text=Olá ${p.name}, somos da AFA Odontologia!" target="_blank" class="text-success mr-2" title="Chamar Whatsapp"><i class="ri-whatsapp-line text-lg"></i></a>
                        ${p.phone}
                    </td>
                    <td class="text-sm">${p.email || 'Não informado'}</td>
                    <td class="text-sm">${pDate}</td>
                    <td>
                        <select class="input-modern bg-white text-sm py-1" onchange="App.changePatientStatus('${p.id}', this.value)" style="min-width: 120px; padding: 0.5rem;">
                            <option value="pendente" ${(!p.status || p.status === 'pendente') ? 'selected' : ''}>Pendente</option>
                            <option value="atendido" ${p.status === 'atendido' ? 'selected' : ''}>Atendido</option>
                            <option value="concluido" ${p.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                        </select>
                    </td>
                `;
                list.appendChild(tr);
            });
        }
    },

    adminDeleteAppointment: async function(id) {
        if(confirm(`ATENÇÃO: Deseja EXCLUIR permanentemente este agendamento do sistema? Esta ação não pode ser desfeita.`)) {
            const res = await Api.deleteAppointment(id);
            if(res.success) {
                this.loadAdminData();
            } else {
                alert('Erro ao excluir: ' + res.message);
            }
        }
    },

    renderAdminChart: function(finances) {
        if(typeof Chart === 'undefined') return;
        
        const ctx = document.getElementById('appointmentsChart');
        if(!ctx) return;

        if(this.adminChartInst) {
            this.adminChartInst.destroy();
        }

        this.adminChartInst = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Confirmadas', 'Canceladas'],
                datasets: [{
                    data: [finances.stats.pending, finances.stats.confirmed, finances.stats.cancelled],
                    backgroundColor: [
                        '#f59e0b', // warning
                        '#10b981', // success
                        '#ef4444'  // danger
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { family: 'Outfit', size: 12 } }
                    }
                },
                cutout: '70%'
            }
        });

        // Patients Funnel Chart
        const pCtx = document.getElementById('patientsChart');
        if(!pCtx) return;

        if(this.adminPatientsChartInst) {
            this.adminPatientsChartInst.destroy();
        }

        this.adminPatientsChartInst = new Chart(pCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Atendidos', 'Concluídos'],
                datasets: [{
                    data: [finances.patientStats.pendente, finances.patientStats.atendido, finances.patientStats.concluido],
                    backgroundColor: [
                        '#f59e0b', // warning
                        '#38bdf8', // primary-light
                        '#10b981'  // success
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { family: 'Outfit', size: 12 } }
                    }
                },
                cutout: '70%'
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
