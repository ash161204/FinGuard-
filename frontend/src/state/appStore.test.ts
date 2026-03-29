import { useAppStore } from './appStore';

describe('appStore', () => {
  it('updates profile values', () => {
    useAppStore.getState().setProfile({
      monthlyIncome: 120000,
      monthlyExpenses: 50000,
    });

    expect(useAppStore.getState().profile).toEqual({
      monthlyIncome: 120000,
      monthlyExpenses: 50000,
    });
  });
});
