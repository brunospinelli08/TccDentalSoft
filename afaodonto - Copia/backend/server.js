const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'AFA',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// FUNÇÃO AUXILIAR: Formatar data DD/MM/YYYY para YYYY-MM-DD
function formatDate(brDate) {
  if(!brDate) return null;
  const parts = brDate.split('/');
  if(parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return brDate;
}

// ---- PACIENTES ----
app.get('/api/pacientes', (req, res) => {
  db.query('SELECT * FROM pacientes ORDER BY criado_em DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.put('/api/pacientes/:id/status', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.query('UPDATE pacientes SET status = ? WHERE id = ?', [status, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ---- CONSULTAS ----
app.get('/api/consultas', (req, res) => {
  const query = `
    SELECT 
      c.id, c.data, c.status, c.observacoes as description, c.servico_nome as service_name, c.servico_preco as service_price,
      p.nome as paciente_nome, p.telefone as paciente_telefone, p.email as paciente_email
    FROM consultas c
    JOIN pacientes p ON c.pacientes_id = p.id
    ORDER BY c.data DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Mapear para o formato do frontend
    const mapped = results.map(r => ({
      id: String(r.id),
      date: new Date(r.data).toLocaleDateString('pt-BR'),
      time: new Date(r.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
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
  
  // 1. Procurar paciente por telefone ou criar novo
  db.query('SELECT id FROM pacientes WHERE telefone = ? OR email = ? LIMIT 1', [patient.phone, patient.email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let pacienteId = results.length > 0 ? results[0].id : null;
    
    const finishInsert = (pId) => {
       const cost = financials?.cost || 0;
       const dataSQL = time ? `${formatDate(date)} ${time}:00` : new Date();
       const q = `INSERT INTO consultas (pacientes_id, servico_nome, servico_preco, custo_equipamento, data, status, observacoes) VALUES (?, ?, ?, ?, ?, 'pendente', ?)`;
       db.query(q, [pId, service?.name || 'Consulta', service?.price || 0, cost, dataSQL, description || ''], (err2, res2) => {
         if (err2) return res.status(500).json({ error: err2.message });
         res.json({ success: true, id: res2.insertId });
       });
    };
    
    if (pacienteId) {
       finishInsert(pacienteId);
    } else {
       db.query('INSERT INTO pacientes (nome, telefone, email, data_nascimento) VALUES (?, ?, ?, ?)', 
         [patient.name, patient.phone, patient.email || '', '1900-01-01'], (err3, res3) => {
         if (err3) return res.status(500).json({ error: err3.message });
         finishInsert(res3.insertId);
       });
    }
  });
});

app.put('/api/consultas/:id/status', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.query('UPDATE consultas SET status = ? WHERE id = ?', [status, id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/consultas/:id', (req, res) => {
  db.query('DELETE FROM consultas WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ---- FINANCEIRO / DASHBOARD ----
app.get('/api/financeiro', (req, res) => {
  const taxRate = 0.15; // 15% 
  
  // Contagens de Consultas
  db.query("SELECT status, COUNT(*) as qtd, SUM(servico_preco) as valor, SUM(custo_equipamento) as custo_eq FROM consultas GROUP BY status", (err1, consStats) => {
      // Contagens de Pacientes
      db.query("SELECT status, COUNT(*) as qtd FROM pacientes GROUP BY status", (err2, pacStats) => {
          let gross = 0;
          let costs = 0;
          let stats = { pending: 0, confirmed: 0, cancelled: 0 };
          
          consStats.forEach(c => {
             if(c.status === 'pendente') stats.pending = c.qtd;
             if(c.status === 'confirmada' || c.status === 'concluida') {
                 stats.confirmed += c.qtd;
                 gross += parseFloat(c.valor || 0);
                 costs += parseFloat(c.custo_eq || 0);
             }
             if(c.status === 'cancelada') stats.cancelled = c.qtd;
          });
          
          let patientStats = { pendente: 0, atendido: 0, concluido: 0 };
          pacStats.forEach(p => {
             const st = p.status || 'pendente';
             if(st === 'pendente') patientStats.pendente = p.qtd;
             if(st === 'atendido') patientStats.atendido = p.qtd;
             if(st === 'concluido') patientStats.concluido = p.qtd;
          });
          
          res.json({
              gross, costs, stats, patientStats
          });
      });
  });
});

app.listen(3000, () => {
  console.log('Servidor Back-end Inteligente rodando na porta 3000!');
});
