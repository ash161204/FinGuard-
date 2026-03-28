import { createContext, useCallback, useContext, useMemo, useState } from "react";

const createDefaultSwipedTotals = () => ({
  food: 0,
  shopping: 0,
  bills: 0,
  transport: 0,
});

const AppContext = createContext(null);

const sanitizeNumber = (value, fallback = 0) => {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return fallback;
  }

  return nextValue;
};

const toTitleCase = (value) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function AppProvider({ children }) {
  const [income, setIncomeState] = useState(50000);
  const [needsSliderAmount, setNeedsSliderAmountState] = useState(25000);
  const [primaryGoal, setPrimaryGoalState] = useState("Emergency");
  const [riskVibe, setRiskVibeState] = useState("Balanced");
  const [swipedTotals, setSwipedTotals] = useState(createDefaultSwipedTotals);
  const [documentResults, setDocumentResultsState] = useState([]);

  // ── TOOL 3: Money Health Score inputs ──
  const [healthInputs, setHealthInputsState] = useState({
    emergencyFund: 0,
    healthInsuranceCover: 0,
    termLifeCover: 0,
    hasDependents: false,
    totalMonthlyEMI: 0,
    hasRevolvingCCDebt: false,
    monthlyRetirementSaving: 0,
  });

  const setIncome = useCallback((value) => {
    const nextIncome = sanitizeNumber(value, 0);

    setIncomeState(nextIncome);
    setNeedsSliderAmountState((current) => Math.min(current, nextIncome || current));
  }, []);

  const setNeedsSliderAmount = useCallback(
    (value) => {
      const nextNeeds = sanitizeNumber(value, 0);

      setNeedsSliderAmountState(Math.min(nextNeeds, income || nextNeeds));
    },
    [income],
  );

  const setPrimaryGoal = useCallback((value) => {
    setPrimaryGoalState(value || "Emergency");
  }, []);

  const setRiskVibe = useCallback((value) => {
    setRiskVibeState(value || "Balanced");
  }, []);

  const setHealthInputs = useCallback((updates) => {
    setHealthInputsState((current) => ({ ...current, ...updates }));
  }, []);

  const saveOnboarding = useCallback(
    (payload = {}) => {
      const nextIncome = sanitizeNumber(payload.income ?? income, income);
      const rawNeeds = sanitizeNumber(
        payload.needsSliderAmount ?? needsSliderAmount,
        needsSliderAmount,
      );
      const nextNeeds = Math.min(rawNeeds, nextIncome || rawNeeds);

      setIncomeState(nextIncome);
      setNeedsSliderAmountState(nextNeeds);
      setPrimaryGoalState(payload.primaryGoal || primaryGoal);
      setRiskVibeState(payload.riskVibe || riskVibe);

      if (payload.healthInputs) {
        setHealthInputsState((current) => ({ ...current, ...payload.healthInputs }));
      }
    },
    [income, needsSliderAmount, primaryGoal, riskVibe],
  );

  const resetSwipedTotals = useCallback(() => {
    setSwipedTotals(createDefaultSwipedTotals());
  }, []);

  const addSwipeToCategory = useCallback((category, amount) => {
    const normalizedCategory = String(category || "").toLowerCase();

    if (!(normalizedCategory in createDefaultSwipedTotals())) {
      return;
    }

    const nextAmount = sanitizeNumber(amount, 0);

    setSwipedTotals((current) => ({
      ...current,
      [normalizedCategory]: current[normalizedCategory] + nextAmount,
    }));
  }, []);

  const removeSwipeFromCategory = useCallback((category, amount) => {
    const normalizedCategory = String(category || "").toLowerCase();

    if (!(normalizedCategory in createDefaultSwipedTotals())) {
      return;
    }

    const nextAmount = sanitizeNumber(amount, 0);

    setSwipedTotals((current) => ({
      ...current,
      [normalizedCategory]: Math.max(current[normalizedCategory] - nextAmount, 0),
    }));
  }, []);

  const setDocumentResults = useCallback((results) => {
    setDocumentResultsState(Array.isArray(results) ? results : []);
  }, []);

  const clearDocumentResults = useCallback(() => {
    setDocumentResultsState([]);
  }, []);

  const topLeak = useMemo(() => {
    const entries = Object.entries(swipedTotals);
    const [key, amount] = entries.reduce(
      (highest, entry) => (entry[1] > highest[1] ? entry : highest),
      entries[0],
    );

    return {
      key,
      name: toTitleCase(key),
      amount,
    };
  }, [swipedTotals]);

  const totalSwipedAmount = useMemo(
    () => Object.values(swipedTotals).reduce((sum, value) => sum + value, 0),
    [swipedTotals],
  );

  const value = useMemo(
    () => ({
      income,
      needsSliderAmount,
      primaryGoal,
      riskVibe,
      swipedTotals,
      documentResults,
      healthInputs,
      topLeak,
      totalSwipedAmount,
      setIncome,
      setNeedsSliderAmount,
      setPrimaryGoal,
      setRiskVibe,
      setHealthInputs,
      saveOnboarding,
      resetSwipedTotals,
      addSwipeToCategory,
      removeSwipeFromCategory,
      setDocumentResults,
      clearDocumentResults,
    }),
    [
      income,
      needsSliderAmount,
      primaryGoal,
      riskVibe,
      swipedTotals,
      documentResults,
      healthInputs,
      topLeak,
      totalSwipedAmount,
      setIncome,
      setNeedsSliderAmount,
      setPrimaryGoal,
      setRiskVibe,
      setHealthInputs,
      saveOnboarding,
      resetSwipedTotals,
      addSwipeToCategory,
      removeSwipeFromCategory,
      setDocumentResults,
      clearDocumentResults,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return context;
}
