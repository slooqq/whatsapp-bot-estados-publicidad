const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Utils.js');
const oldCode = `                    cannotBeRanked: window
                        .require('WAWebStatusGatingUtils')
                        .canCheckStatusRankingPosterGating(),`;
const newCode = `                    cannotBeRanked: (() => {
                        try {
                            return window.require('WAWebStatusGatingUtils').canCheckStatusRankingPosterGating();
                        } catch {
                            return false;
                        }
                    })(),`;

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldCode)) {
        content = content.replace(oldCode, newCode);
        fs.writeFileSync(file, 'utf8');
        console.log('✓ Parche aplicado: WAWebStatusGatingUtils.canCheckStatusRankingPosterGating');
    } else if (content.includes('try')) {
        console.log('✓ Parche ya aplicado');
    } else {
        console.log('⚠ No se encontró el código a parchear (posible versión diferente)');
    }
} else {
    console.log('⚠ Archivo no encontrado:', file);
}
