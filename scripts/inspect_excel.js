const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('J:\\Meu Drive\\Planilhas\\Relatorio - Copia.xlsm');
    console.log("Planilhas encontradas:", workbook.SheetNames);
    
    // Ler a primeira aba para ver as colunas
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converter para JSON, apenas as 5 primeiras linhas para entender a estrutura
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\nColunas da aba '${firstSheetName}':`);
    for (let i = 0; i < Math.min(5, data.length); i++) {
        console.log(data[i]);
    }
} catch (e) {
    console.error("Erro ao ler planilha:", e.message);
}
