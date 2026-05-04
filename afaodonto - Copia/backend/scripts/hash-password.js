const bcrypt = require('bcryptjs');
const pwd = process.argv[2];
if (!pwd) {
  console.error('Uso: node scripts/hash-password.js "<sua_senha>"');
  process.exit(1);
}
console.log(bcrypt.hashSync(pwd, 10));
