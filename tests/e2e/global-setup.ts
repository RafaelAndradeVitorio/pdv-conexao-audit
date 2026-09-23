import { seedMockAudits } from '../../scripts/seed-mock-audits';

export default async function globalSetup() {
  console.log('Executando setup global dos dados mockados para E2E...');
  await seedMockAudits();
}
