/**
 * Reading an import file in the prototype (BR-IMPORT-01). CSV is parsed for real. Excel needs a spreadsheet library the
 * prototype does not include, so an .xlsx/.xls file is read as the sample test set (docs/fixtures/qcfixer-tests-seed.csv),
 * as screens/04-suites.md 3.3 allows ("Parsing can be simulated with the seed CSV"). Developers replace this file.
 */
import seedCsv from '../../../docs/fixtures/qcfixer-tests-seed.csv?raw';

export class UnsupportedImportFileError extends Error {
  constructor() {
    super('Choose a .csv or .xlsx file.');
    this.name = 'UnsupportedImportFileError';
  }
}

export async function readImportFile(file: File | { name: string; text: () => Promise<string> }): Promise<{ text: string; simulatedExcel: boolean }> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return { text: await file.text(), simulatedExcel: false };
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return { text: seedCsv, simulatedExcel: true };
  throw new UnsupportedImportFileError();
}

/** Prototype-only: the sample file, to try Import without a file of your own. */
export function sampleImportFile(): File {
  return new File([seedCsv], 'qcfixer-tests-seed.csv', { type: 'text/csv' });
}
