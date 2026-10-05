export function calculatePortugueseTaxes(grossMonthly: number) {
  // Simplified Portuguese IRS 2024/2025 table estimation for unmarried, 0 dependents
  // Tax is progressive on the whole amount in reality but retention tables use brackets.
  // This is a simplified estimation for illustrative purposes.
  let irsRate = 0;
  if (grossMonthly <= 820) irsRate = 0; // Minimum wage
  else if (grossMonthly <= 935) irsRate = 0.073;
  else if (grossMonthly <= 1000) irsRate = 0.098;
  else if (grossMonthly <= 1111) irsRate = 0.125;
  else if (grossMonthly <= 1250) irsRate = 0.145;
  else if (grossMonthly <= 1400) irsRate = 0.165;
  else if (grossMonthly <= 1600) irsRate = 0.19;
  else if (grossMonthly <= 1800) irsRate = 0.22;
  else if (grossMonthly <= 2000) irsRate = 0.245;
  else irsRate = 0.27; // Simplified cap for typical worker

  const ssRate = 0.11; // 11% Segurança Social for employee

  const irsValue = grossMonthly * irsRate;
  const ssValue = grossMonthly * ssRate;
  const netSalary = grossMonthly - irsValue - ssValue;

  return {
    gross: grossMonthly,
    irsRate: irsRate * 100,
    irsValue,
    ssRate: ssRate * 100,
    ssValue,
    net: netSalary
  };
}
