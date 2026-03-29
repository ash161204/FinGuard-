export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Upload: undefined;
  FeatureDetail:
    | { kind: 'review'; documentType: 'form16' | 'cams' }
    | { kind: 'report'; feature: 'tax' | 'mf' | 'score' | 'fire' };
};

export type MainTabParamList = {
  Home: undefined;
  Tax: undefined;
  MF: undefined;
  FIRE: undefined;
  Profile: undefined;
};
