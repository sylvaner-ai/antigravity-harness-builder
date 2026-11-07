import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { LoginThrottle, clientIp } from '../src/modules/auth/login-throttle';
import { isRegistrationAllowed } from '../src/modules/auth/registration';
import { POST as register } from '../src/app/api/auth/register/route';
import { GET as authConfig } from '../src/app/api/auth/config/route';

describe('inscriptions fermées par défaut', () => {
  const original = process.env.ALLOW_REGISTRATION;
  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_REGISTRATION;
    else process.env.ALLOW_REGISTRATION = original;
  });

  it("n'autorise l'inscription que si ALLOW_REGISTRATION vaut exactement true", () => {
    expect(isRegistrationAllowed({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isRegistrationAllowed({ ALLOW_REGISTRATION: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isRegistrationAllowed({ ALLOW_REGISTRATION: '1' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isRegistrationAllowed({ ALLOW_REGISTRATION: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('la route /api/auth/register répond 403 sans toucher à la base', async () => {
    delete process.env.ALLOW_REGISTRATION;
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@y.fr', password: 'MotDePasse12345' }),
    });
    const res = await register(req);
    expect(res.status).toBe(403);
  });

  it("l'endpoint de configuration reflète le réglage", async () => {
    delete process.env.ALLOW_REGISTRATION;
    expect((await (await authConfig()).json()).registrationAllowed).toBe(false);
    process.env.ALLOW_REGISTRATION = 'true';
    expect((await (await authConfig()).json()).registrationAllowed).toBe(true);
  });
});

describe('LoginThrottle', () => {
  it("bloque un e-mail après 5 échecs puis le libère après la fenêtre", () => {
    let now = 1_000_000;
    const t = new LoginThrottle({ now: () => now });
    for (let i = 0; i < 4; i++) t.recordFailure('Admin@X.fr', '1.1.1.1');
    expect(t.retryAfterSeconds('admin@x.fr', '9.9.9.9')).toBe(0);
    t.recordFailure('admin@x.fr', '1.1.1.1');
    expect(t.retryAfterSeconds('ADMIN@x.fr', '9.9.9.9')).toBeGreaterThan(0);
    now += 15 * 60 * 1000 + 1000;
    expect(t.retryAfterSeconds('admin@x.fr', '9.9.9.9')).toBe(0);
  });

  it('une connexion réussie remet le compteur de l\'e-mail à zéro', () => {
    const t = new LoginThrottle();
    for (let i = 0; i < 4; i++) t.recordFailure('a@x.fr', '1.1.1.1');
    t.recordSuccess('a@x.fr');
    t.recordFailure('a@x.fr', '1.1.1.1');
    expect(t.retryAfterSeconds('a@x.fr', '2.2.2.2')).toBe(0);
  });

  it("bloque une adresse IP après 20 échecs sur des e-mails différents", () => {
    const t = new LoginThrottle();
    for (let i = 0; i < 20; i++) t.recordFailure(`u${i}@x.fr`, '5.5.5.5');
    expect(t.retryAfterSeconds('nouveau@x.fr', '5.5.5.5')).toBeGreaterThan(0);
    expect(t.retryAfterSeconds('nouveau@x.fr', '6.6.6.6')).toBe(0);
  });

  it("utilise la dernière entrée de X-Forwarded-For comme IP client", () => {
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1' });
    expect(clientIp(h)).toBe('10.0.0.1');
    expect(clientIp(new Headers())).toBe('inconnue');
  });
});
