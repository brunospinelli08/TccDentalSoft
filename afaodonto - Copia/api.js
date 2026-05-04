/**
 * Cliente HTTP da API Node (MySQL). Login autentica no servidor via JWT.
 */

const Api = {
  API_BASE: 'http://localhost:3000',

  initDB: function () {
    if (!localStorage.getItem('settings')) {
      localStorage.setItem('settings', JSON.stringify({ taxRate: 0.15 }));
    }
  },

  async _fetchJson(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = localStorage.getItem('auth_token');
    if (token && options.auth !== false) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && options.auth !== false) {
      localStorage.removeItem('auth_token');
      if (typeof App !== 'undefined' && App.checkAuth) {
        App.checkAuth();
      }
    }
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  },

  login: async function (email, password) {
    try {
      const data = await this._fetchJson(`${this.API_BASE}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        auth: false
      });
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        return { success: true, user: data.user };
      }
      return {
        success: false,
        message: data.message || 'E-mail ou senha incorretos'
      };
    } catch (error) {
      return { success: false, message: 'Servidor indisponível. Inicie o backend (porta 3000).' };
    }
  },

  logout: function () {
    localStorage.removeItem('auth_token');
  },

  isAuthenticated: function () {
    return !!localStorage.getItem('auth_token');
  },

  getAppointments: async function () {
    try {
      const res = await fetch(`${this.API_BASE}/api/consultas`, {
        headers: this._authHeadersOnly()
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof App !== 'undefined' && App.checkAuth) App.checkAuth();
        return [];
      }
      return await res.json();
    } catch (error) {
      console.warn('Banco MySQL Offline: Falha ao buscar consultas.');
      return [];
    }
  },

  _authHeadersOnly: function () {
    const token = localStorage.getItem('auth_token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },

  addAppointment: async function (appointmentData) {
    try {
      const res = await fetch(`${this.API_BASE}/api/consultas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });
      return await res.json();
    } catch (error) {
      console.error('Erro ao salvar no banco:', error);
      return { success: false, message: 'Erro de conexão com o Banco.' };
    }
  },

  updateAppointmentStatus: async function (id, newStatus) {
    try {
      const res = await fetch(`${this.API_BASE}/api/consultas/${id}/status`, {
        method: 'PUT',
        headers: this._authHeadersOnly(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof App !== 'undefined' && App.checkAuth) App.checkAuth();
        return { success: false, message: 'Sessão expirada.' };
      }
      return await res.json();
    } catch (error) {
      return { success: false, message: 'Erro de conexão.' };
    }
  },

  deleteAppointment: async function (id) {
    try {
      const res = await fetch(`${this.API_BASE}/api/consultas/${id}`, {
        method: 'DELETE',
        headers: this._authHeadersOnly()
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof App !== 'undefined' && App.checkAuth) App.checkAuth();
        return { success: false, message: 'Sessão expirada.' };
      }
      return await res.json();
    } catch (error) {
      return { success: false, message: 'Erro de conexão.' };
    }
  },

  getPatients: async function () {
    try {
      const res = await fetch(`${this.API_BASE}/api/pacientes`, {
        headers: this._authHeadersOnly()
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof App !== 'undefined' && App.checkAuth) App.checkAuth();
        return [];
      }
      const bdData = await res.json();

      return bdData.map(p => ({
        id: p.id,
        name: p.nome,
        phone: p.telefone,
        email: p.email,
        cpf: p.cpf,
        registeredAt: p.criado_em || new Date().toISOString(),
        status: p.status || 'pendente'
      }));
    } catch (err) {
      console.warn('Banco MySQL Offline.');
      return [];
    }
  },

  updatePatientStatus: async function (id, newStatus) {
    try {
      const res = await fetch(`${this.API_BASE}/api/pacientes/${id}/status`, {
        method: 'PUT',
        headers: this._authHeadersOnly(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof App !== 'undefined' && App.checkAuth) App.checkAuth();
        return { success: false, message: 'Sessão expirada.' };
      }
      return await res.json();
    } catch (error) {
      return { success: false, message: 'Erro de conexão.' };
    }
  },

  getFinancialReport: async function () {
    try {
      const res = await fetch(`${this.API_BASE}/api/financeiro`, {
        headers: this._authHeadersOnly()
      });
      if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof App !== 'undefined' && App.checkAuth) App.checkAuth();
        return {
          gross: 0,
          costs: 0,
          stats: { pending: 0, confirmed: 0, cancelled: 0 },
          patientStats: { pendente: 0, atendido: 0, concluido: 0 },
          history: []
        };
      }
      return await res.json();
    } catch (err) {
      console.warn('Banco MySQL Offline: Erro no Financeiro');
      return {
        gross: 0,
        costs: 0,
        stats: { pending: 0, confirmed: 0, cancelled: 0 },
        patientStats: { pendente: 0, atendido: 0, concluido: 0 },
        history: []
      };
    }
  }
};

Api.initDB();
