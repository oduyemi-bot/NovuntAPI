export const WITHDRAWAL_FEE_PERCENTAGE = 3;

export function calculateWithdrawalFee(amount: number): number {
  return parseFloat((amount * (WITHDRAWAL_FEE_PERCENTAGE / 100)).toFixed(2));
}
