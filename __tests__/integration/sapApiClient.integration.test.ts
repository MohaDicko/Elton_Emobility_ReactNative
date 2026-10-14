// ─── Tests d'Intégration : Client SAP Service Layer & Intercepteurs ─────────────
import { apiClient, setUnauthorizedHandler } from '@core/api/client';
import { sapAuth } from '@core/api/sapAuth';

describe('Intégration — Client API SAP Service Layer', () => {
  it('doit être configuré avec les options de base correctes', () => {
    expect(apiClient.defaults.baseURL).toContain('/b1s/v1');
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    expect(apiClient.defaults.timeout).toBe(15000);
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('doit injecter automatiquement le cookie B1SESSION dans les requêtes lorsqu’une session est active', async () => {
    // Simuler une session SAP active
    const testSessionId = 'SESSION_TOKEN_XYZ_12345';
    jest.spyOn(sapAuth, 'getSession').mockReturnValue(testSessionId);

    // Tester l'intercepteur de requête
    const testConfig: any = { headers: {} };
    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const modifiedConfig = requestInterceptor(testConfig);

    expect(modifiedConfig.headers['Cookie']).toBe(`B1SESSION=${testSessionId}`);
  });

  it('doit déclencher le handler de non-autorisation lors d’une expiration définitive de session (HTTP 401)', async () => {
    const mockUnauthorizedCallback = jest.fn();
    setUnauthorizedHandler(mockUnauthorizedCallback);

    // Simuler un échec du refresh de session
    jest.spyOn(sapAuth, 'refreshSession').mockRejectedValue(new Error('Session expired'));

    const errorResponse = {
      config: { _retry: false },
      response: { status: 401 },
    };

    const responseErrorInterceptor = (apiClient.interceptors.response as any).handlers[0].rejected;

    await expect(responseErrorInterceptor(errorResponse)).rejects.toBeDefined();
    expect(mockUnauthorizedCallback).toHaveBeenCalledTimes(1);
  });
});
