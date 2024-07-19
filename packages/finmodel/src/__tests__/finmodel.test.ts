import { financialModel, recurringBetweenAccounts } from "..";

jest.spyOn(global.console, "log");

const INTEREST = "Interest" as const;
const CONTRIBUTIONS = "Contributions" as const;
const BALANCE = "Balance" as const;

type Account = typeof CONTRIBUTIONS | typeof BALANCE | typeof INTEREST;

const monthlyInterest = recurringBetweenAccounts<Account>(
  "monthly",
  INTEREST,
  BALANCE,
  (bal) => (bal * 10) / 100 / 12
);

const monthlyDeposit = recurringBetweenAccounts<Account>(
  "monthly",
  CONTRIBUTIONS,
  BALANCE,
  () => 500
);

describe("finmodel", () => {
  it("calculates balance for 10 years of $500 monthly deposits", () => {
    const savingsSimulation = financialModel<Account>({
      name: "savings",
      initialTransactions: [],
      timeHorizon: 120,
      scheduled: [monthlyDeposit],
    });
    const balance = savingsSimulation.balance(BALANCE);
    expect(balance).toBeCloseTo(60000, 2);
  });

  it("calculates balance for 10 years of $500 monthly deposits with 10% APR accrued monthly", () => {
    const savingsSimulation = financialModel<Account>({
      name: "savings",
      initialTransactions: [],
      timeHorizon: 120,
      scheduled: [monthlyDeposit, monthlyInterest],
    });

    const balance = savingsSimulation.balance(BALANCE);
    expect(balance).toBeCloseTo(102422.49, 2);
    const interest = savingsSimulation.balance(INTEREST);
    expect(interest).toBeCloseTo(-42422.49, 2);
  });
});
