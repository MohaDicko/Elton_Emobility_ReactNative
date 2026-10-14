// Configuration de base pour l'environnement de test Jest
process.env.EXPO_PUBLIC_SAP_BASE_URL = 'https://ga-sap.safirconsulting.net:50000/b1s/v1';
process.env.EXPO_PUBLIC_SAP_COMPANY_DB = 'BASE_SAP_TEST';
process.env.EXPO_PUBLIC_SAP_USER = 'UTILISATEUR_TEST';
process.env.EXPO_PUBLIC_SAP_PASSWORD = 'TEST_PASSWORD';
process.env.EXPO_PUBLIC_API_TIMEOUT = '15000';
process.env.EXPO_PUBLIC_PRINT_MODE = 'pdf';
process.env.EXPO_PUBLIC_ENV = 'test';

// Global mocks
(globalThis as any).__DEV__ = true;

// Mock expo-secure-store pour l'environnement Jest Node
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-crypto pour l'environnement Jest Node
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mocked_sha256_hash'),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock react-native-toast-message pour l'environnement Jest Node
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));
