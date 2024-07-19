import { financialModel, recurringBetweenAccounts } from ".";

export const GROWTH = "Growth" as const;
export const CONTRIBUTIONS = "Contributions" as const;
export const BALANCE = "Balance" as const;
export const FEES = "Fees" as const;

export type Account = typeof CONTRIBUTIONS | typeof BALANCE | typeof GROWTH | typeof FEES;

const monthlyGrowth = (apr: number) =>
  recurringBetweenAccounts<Account>("monthly", BALANCE, GROWTH, (bal) => (bal * apr) / 12);
const monthlyContributions = (monhtlyAmount: number) =>
  recurringBetweenAccounts<Account>("monthly", CONTRIBUTIONS, BALANCE, () => monhtlyAmount);
const assetFee = (n: number) =>
  recurringBetweenAccounts<Account>("quarterly", BALANCE, FEES, (bal) => (bal * n) / 4);
const expenseRatio = (n: number) =>
  recurringBetweenAccounts<Account>("monthly", BALANCE, FEES, (bal) => (bal * n) / 12);
const flatMonthlyFee = (n: number) =>
  recurringBetweenAccounts<Account>("monthly", BALANCE, FEES, () => n);

export function retirementProviderFinancialModel({
  name,
  monthlyContribution,
  annualGrowth,
  annualAssetFee,
  annualExpenseRatio,
  monthlyFee,
}: {
  name: string;
  monthlyContribution: number;
  annualGrowth: number;
  annualAssetFee: number;
  annualExpenseRatio: number;
  monthlyFee: number;
}) {
  return financialModel<Account>({
    name,
    initialTransactions: [
      {
        t: 0,
        from_acct: CONTRIBUTIONS,
        to_acct: BALANCE,
        amt: monthlyContribution,
      },
    ],
    timeHorizon: 30 * 12,
    scheduled: [
      monthlyGrowth(annualGrowth),
      monthlyContributions(monthlyContribution),
      assetFee(annualAssetFee),
      expenseRatio(annualExpenseRatio),
      flatMonthlyFee(monthlyFee),
    ],
  });
}
