export interface Transaction<A> {
  t: number;
  from_acct: A;
  to_acct: A;
  amt: number;
}

export interface ScheduledTransaction<A> {
  recurrence: "monthly" | "quarterly" | "annually";
  action: (fm: FinancialModel<A>) => Transaction<A>[];
}

export interface FinancialModel<A> {
  t: number;
  txs: Transaction<A>[];
  scheduled: ScheduledTransaction<A>[];
  balance(a: A, t?: number): number;
}

abstract class AbstractFinancialModel<A> implements FinancialModel<A> {
  t: number = 0;

  txs: Transaction<A>[] = [];

  scheduled: ScheduledTransaction<A>[] = [];

  txTotalByPeriod(acct: A): Record<number, number> {
    const result: Record<number, number> = {};
    for (const tx of this.txs) {
      if (tx.to_acct === acct) {
        result[tx.t] = (result[tx.t] ?? 0) + tx.amt;
      }
      if (tx.from_acct === acct) {
        result[tx.t] = (result[tx.t] ?? 0) - tx.amt;
      }
    }
    return result;
  }

  balanceByPeriod(acct: A): Record<number, number> {
    const result = this.txTotalByPeriod(acct);
    for (const t_string of Object.keys(result)) {
      const t = parseInt(t_string);
      if (t === 0) {
        continue;
      }
      result[t]! += result?.[t - 1] ?? 0;
    }
    return result;
  }

  balance(acct: A, t?: number): number {
    return this.balanceByPeriod(acct)[t ?? this.t] ?? 0;
  }

  simulate_until(t: number) {
    if (t < this.t) {
      throw new Error("Cannot simulate backwards");
    }
    while (this.t < t) {
      this.t += 1;
      for (const st of this.scheduled) {
        if (st.recurrence === "quarterly" && this.t % 3 !== 0) {
          continue;
        }
        if (st.recurrence === "annually" && this.t % 12 !== 0) {
          continue;
        }
        const txs = st.action(this);
        this.txs.push(...txs);
      }
    }
  }
}

export function recurringBetweenAccounts<A>(
  recurrence: "monthly" | "quarterly" | "annually",
  debitAccount: A,
  creditAccount: A,
  calculation: (n: number) => number
) {
  return {
    recurrence,
    action: (fm: FinancialModel<A>) => {
      const bal = fm.balance(creditAccount, fm.t - 1);
      const amt = calculation(bal);
      if (amt === 0) {
        return [];
      }
      return [
        {
          t: fm.t,
          from_acct: debitAccount,
          to_acct: creditAccount,
          amt,
          desc: `${debitAccount} ${amt.toFixed(2)} ${creditAccount}`,
        },
      ];
    },
  } as ScheduledTransaction<A>;
}

export interface FinancialModelSpec<A> {
  name: string;
  initialTransactions: Transaction<A>[];
  timeHorizon: number;
  scheduled: ScheduledTransaction<A>[];
}

export function financialModel<A>(spec: FinancialModelSpec<A>) {
  class FinancialModelImpl extends AbstractFinancialModel<A> {
    name: string = spec.name;
    t = 0;
    txs: Transaction<A>[] = spec.initialTransactions;

    constructor() {
      super();
      this.scheduled = spec.scheduled;
    }
  }
  const impl = new FinancialModelImpl();
  impl.simulate_until(spec.timeHorizon);
  return impl;
}
