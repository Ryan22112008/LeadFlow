import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
describe('Health Route', () => {
    const app = buildApp();
    beforeAll(async () => {
        await app.ready();
    });
    afterAll(async () => {
        await app.close();
    });
    it('deve retornar status 200 e confirmar que a API está funcionando', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/health',
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
            status: 'ok',
            application: 'LeadFlow API',
        });
    });
    it('deve permitir a origem configurada no CORS', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/health',
            headers: {
                origin: 'http://localhost:5173',
            },
        });
        expect(response.headers['access-control-allow-origin'])
            .toBe('http://localhost:5173');
        expect(response.headers['access-control-allow-credentials'])
            .toBe('true');
    });
});
//# sourceMappingURL=health.test.js.map