const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'elton_test.sqlite');

if (fs.existsSync(DB_PATH)) {
  try {
    fs.unlinkSync(DB_PATH);
    console.log('✅ Base de test SQLite elton_test.sqlite SUPPRIMÉE avec succès !');
  } catch (err) {
    console.error('❌ Impossible de supprimer la base (vérifiez si le serveur tourne) :', err.message);
  }
} else {
  console.log('ℹ️ Aucune base elton_test.sqlite trouvée (déjà supprimée).');
}
