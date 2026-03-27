export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const calculateMoneyHealthScore = ({ monthlyIncome, monthlyExpenses, currentSavings }) => {
  if (!monthlyIncome) {
    return 0;
  }

  const savingsRatio = Math.min(currentSavings / (monthlyIncome * 6 || 1), 1);
  const expenseRatio = Math.min(monthlyExpenses / monthlyIncome, 1.4);
  const surplusRatio = Math.max((monthlyIncome - monthlyExpenses) / monthlyIncome, 0);

  const score = Math.round(savingsRatio * 35 + (1 - expenseRatio / 1.4) * 30 + surplusRatio * 35);

  return Math.max(0, Math.min(score, 100));
};

export const getActionPlan = ({ monthlyIncome }, highestCategory) => {
  const emergencyMove = Math.max(Math.round(monthlyIncome * 0.08), 1000);
  const foodTrim = highestCategory.amount ? Math.round(highestCategory.amount * 0.1) : 500;
  const habitCap = Math.max(Math.round(monthlyIncome * 0.05), 1500);

  return [
    `Week 1: Move ${formatCurrency(emergencyMove)} into your emergency fund.`,
    `Month 2: Reduce ${highestCategory.category} spending by ${formatCurrency(foodTrim)} with a weekly cap.`,
    `Month 3: Automate ${formatCurrency(habitCap)} into savings right after salary day.`,
  ];
};
