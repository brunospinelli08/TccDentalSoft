require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || 'Administrador';

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('Defina JWT_SECRET com pelo menos 16 caracteres no arquivo backend/.env (copie .env.example).');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
  console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD_HASH no arquivo backend/.env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD != null ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'AFA',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function dbFail(res, err) {
  console.error('[MySQL]', err);
  return res.status(500).json({ success: false, error: 'Erro ao processar solicitação.' });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string' || !h.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Não autorizado' });
  }
  const token = h.slice('Bearer '.length).trim();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const em = (email || '').trim().toLowerCase();
  if (!em || !password) {
    return res.status(400).json({ success: false, message: 'Informe e-mail e senha' });
  }
  if (em !== ADMIN_EMAIL || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
  }
  const token = jwt.sign(
    { role: 'admin', name: ADMIN_DISPLAY_NAME },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({
    success: true,
    token,
    user: { name: ADMIN_DISPLAY_NAME, role: 'admin' }
  });
});

// ---- PACIENTES (protegido) ----
app.get('/api/pacientes', authMiddleware, (req, res) => {
  db.query('SELECT * FROM pacientes ORDER BY criado_em DESC', (err, results) => {
    if (err) return dbFail(res, err);
    res.json(results);
  });
});

app.put('/api/pacientes/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.query('UPDATE pacientes SET status = ? WHERE id = ?', [status, id], (err, results) => {
    if (err) return dbFail(res, err);
    res.json({ success: true });
  });
});

// ---- CONSULTAS ----
function formatDate(brDate) {
  if (!brDate) return null;
  const parts = brDate.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return brDate;
}

app.get('/api/consultas', authMiddleware, (req, res) => {
  const query = `
    SELECT 
      c.id, c.data, c.status, c.observacoes as description, c.servico_nome as service_name, c.servico_preco as service_price,
      p.nome as paciente_nome, p.telefone as paciente_telefone, p.email as paciente_email
    FROM consultas c
    JOIN pacientes p ON c.pacientes_id = p.id
    ORDER BY c.data DESC
  `;
  db.query(query, (err, results) => {
    if (err) return dbFail(res, err);

    const mapped = results.map(r => ({
      id: String(r.id),
      date: new Date(r.data).toLocaleDateString('pt-BR'),
      time: new Date(r.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: r.status || 'pendente',
      description: r.description,
      service: { name: r.service_name, price: Number(r.service_price) },
      patient: { name: r.paciente_nome, phone: r.paciente_telefone, email: r.paciente_email },
      financials: { cost: 0 }
    }));

    res.json(mapped);
  });
});

app.post('/api/consultas', (req, res) => {
  const { service, date, time, patient, description, financials } = req.body;

  db.query(
    'SELECT id FROM pacientes WHERE telefone = ? OR email = ? LIMIT 1',
    [patient.phone, patient.email],
    (err, results) => {
      if (err) return dbFail(res, err);

      let pacienteId = results.length > 0 ? results[0].id : null;

      const finishInsert = (pId) => {
        const cost = financials?.cost || 0;
        const dataSQL = time ? `${formatDate(date)} ${time}:00` : new Date();
        const q =
          'INSERT INTO consultas (pacientes_id, servico_nome, servico_preco, custo_equipamento, data, status, observacoes) VALUES (?, ?, ?, ?, ?, \'pendente\', ?)';
        db.query(
          q,
          [pId, service?.name || 'Consulta', service?.price || 0, cost, dataSQL, description || ''],
          (err2, res2) => {
            if (err2) return dbFail(res, err2);
            res.json({ success: true, id: res2.insertId });
          }
        );
      };

      if (pacienteId) {
        finishInsert(pacienteId);
      } else {
        db.query(
          'INSERT INTO pacientes (nome, telefone, email, data_nascimento) VALUES (?, ?, ?, ?)',
          [patient.name, patient.phone, patient.email || '', '1900-01-01'],
          (err3, res3) => {
            if (err3) return dbFail(res, err3);
            finishInsert(res3.insertId);
          }
        );
      }
    }
  );
});

app.put('/api/consultas/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.query('UPDATE consultas SET status = ? WHERE id = ?', [status, id], (err, results) => {
    if (err) return dbFail(res, err);
    res.json({ success: true });
  });
});

app.delete('/api/consultas/:id', authMiddleware, (req, res) => {
  db.query('DELETE FROM consultas WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return dbFail(res, err);
    res.json({ success: true });
  });
});

// ---- FINANCEIRO / DASHBOARD ----
app.get('/api/financeiro', authMiddleware, (req, res) => {
  db.query(
    'SELECT status, COUNT(*) as qtd, SUM(servico_preco) as valor, SUM(custo_equipamento) as custo_eq FROM consultas GROUP BY status',
    (err1, consStats) => {
      if (err1) return dbFail(res, err1);
      db.query('SELECT status, COUNT(*) as qtd FROM pacientes GROUP BY status', (err2, pacStats) => {
        if (err2) return dbFail(res, err2);

        let gross = 0;
        let costs = 0;
        const stats = { pending: 0, confirmed: 0, cancelled: 0 };

        consStats.forEach(c => {
          if (c.status === 'pendente') stats.pending = c.qtd;
          if (c.status === 'confirmada' || c.status === 'concluida') {
            stats.confirmed += c.qtd;
            gross += parseFloat(c.valor || 0);
            costs += parseFloat(c.custo_eq || 0);
          }
          if (c.status === 'cancelada') stats.cancelled = c.qtd;
        });

        const patientStats = { pendente: 0, atendido: 0, concluido: 0 };
        pacStats.forEach(p => {
          const st = p.status || 'pendente';
          if (st === 'pendente') patientStats.pendente = p.qtd;
          if (st === 'atendido') patientStats.atendido = p.qtd;
          if (st === 'concluido') patientStats.concluido = p.qtd;
        });

        res.json({
          gross,
          costs,
          stats,
          patientStats
        });
      });
    }
  );
});

app.listen(3000, () => {
  console.log('Servidor Back-end rodando na porta 3000');
});
