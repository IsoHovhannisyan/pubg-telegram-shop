// tools/addAdmin.js
const bcrypt = require('bcrypt');
const db = require('../../bot/db/connect');


(async () => {
  const username = 'pubgShopManager'; // կարող ես փոխել
  const plainPassword = 'StrongPass6592943'; // փոխիր ավելի ուժեղով
  const hashed = await bcrypt.hash(plainPassword, 10);

  await db.query(
    'INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)',
    [username, hashed, 'admin']
  );

  console.log('✅ Admin created!');
})();
