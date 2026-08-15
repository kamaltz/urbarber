import { describe, expect, it } from 'vitest';
import { config } from '../src/config/index.js';
import { handleCors, isAllowedOrigin, normalizeOrigin, type OriginPolicy } from '../src/lib/cors';

/**
 * The deployed admin app's real origins are supplied per-environment via
 * ADMIN_APP_ORIGIN; these fixtures stand in for that configuration so the policy is
 * exercised without depending on any particular deployment's env vars.
 */
const ADMIN_PRODUCTION_ORIGIN = 'https://urbarber-admin.vercel.app';
const ADMIN_PREVIEW_ORIGIN = 'https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app';

/** Production-shaped policy: explicit origins only, no loose localhost. */
const PRODUCTION_POLICY: OriginPolicy = {
  allowedOrigins: [ADMIN_PRODUCTION_ORIGIN, ADMIN_PREVIEW_ORIGIN],
  allowLocalhostOrigins: false,
};

/** Local-development policy: same explicit origins plus any localhost port. */
const DEV_POLICY: OriginPolicy = {
  allowedOrigins: [ADMIN_PRODUCTION_ORIGIN],
  allowLocalhostOrigins: true,
};

function mockRes() {
  const headers: Record<string, string> = {};
  let statusSent: number | null = null;
  let jsonBody: any = null;
  let ended = false;

  const res: any = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    status: (statusCode: number) => {
      statusSent = statusCode;
      return {
        end: () => {
          ended = true;
        },
        json: (body: any) => {
          jsonBody = body;
          ended = true;
        },
      };
    },
  };

  return {
    res,
    headers,
    get statusSent() {
      return statusSent;
    },
    get jsonBody() {
      return jsonBody;
    },
    get ended() {
      return ended;
    },
  };
}

describe('normalizeOrigin', () => {
  it('1. Compares origins case-insensitively and ignores a trailing slash', () => {
    expect(normalizeOrigin('HTTPS://Urbarber-Admin.Vercel.App/')).toBe(ADMIN_PRODUCTION_ORIGIN);
    expect(normalizeOrigin('  https://urbarber-admin.vercel.app  ')).toBe(ADMIN_PRODUCTION_ORIGIN);
  });
});

describe('isAllowedOrigin — explicitly configured origins', () => {
  it('2. Allows the configured admin production origin', () => {
    expect(isAllowedOrigin(ADMIN_PRODUCTION_ORIGIN, PRODUCTION_POLICY)).toBe(true);
  });

  it('3. Allows a preview origin only because it was configured explicitly', () => {
    expect(isAllowedOrigin(ADMIN_PREVIEW_ORIGIN, PRODUCTION_POLICY)).toBe(true);
    // The same preview URL is NOT trusted under a policy that never listed it --
    // proving nothing about its shape grants access.
    expect(isAllowedOrigin(ADMIN_PREVIEW_ORIGIN, DEV_POLICY)).toBe(false);
  });

  it('4. Matches configured origins case-insensitively and ignoring trailing slash', () => {
    expect(isAllowedOrigin('https://URBARBER-ADMIN.vercel.app/', PRODUCTION_POLICY)).toBe(true);
  });

  it('5. Rejects an empty or whitespace-only origin', () => {
    expect(isAllowedOrigin('', PRODUCTION_POLICY)).toBe(false);
    expect(isAllowedOrigin('   ', PRODUCTION_POLICY)).toBe(false);
  });
});

describe('isAllowedOrigin — lookalike vercel.app hosts are rejected', () => {
  /**
   * Regression guard for the over-broad
   * `^https://urbarber-admin(-[a-z0-9]+)*(-kamaltzs-projects)?\.vercel\.app$`
   * pattern this module used to carry. Names under vercel.app are a public,
   * first-come namespace, so every hostname below is claimable by an outsider and
   * would have been trusted -- with credentials -- by that pattern.
   */
  const LOOKALIKES = [
    'https://urbarber-admin-attacker.vercel.app',
    'https://urbarber-admin-evil-kamaltzs-projects.vercel.app',
    'https://urbarber-admin-4z5n8h6r9-attackers-projects.vercel.app',
    'https://urbarber-admin.attacker.vercel.app',
    'https://urbarber-admin.vercel.app.attacker.com',
    'https://not-urbarber-admin.vercel.app',
    'http://urbarber-admin.vercel.app', // scheme downgrade must not match the https entry
  ];

  it.each(LOOKALIKES)('6. Rejects claimable lookalike origin %s', (origin) => {
    expect(isAllowedOrigin(origin, PRODUCTION_POLICY)).toBe(false);
    expect(isAllowedOrigin(origin, DEV_POLICY)).toBe(false);
  });

  it('7. Rejects unrelated vercel.app and third-party origins', () => {
    expect(isAllowedOrigin('https://vercel.app', PRODUCTION_POLICY)).toBe(false);
    expect(isAllowedOrigin('https://some-other-project.vercel.app', PRODUCTION_POLICY)).toBe(false);
    expect(isAllowedOrigin('https://malicious-site.com', PRODUCTION_POLICY)).toBe(false);
    expect(isAllowedOrigin('https://fake-urbarber.example.com', PRODUCTION_POLICY)).toBe(false);
  });
});

describe('isAllowedOrigin — localhost only where intentionally configured', () => {
  it('8. Allows any localhost/127.0.0.1 port only when the policy opts in', () => {
    for (const origin of ['http://localhost:3000', 'http://localhost:8081', 'http://127.0.0.1:3000']) {
      expect(isAllowedOrigin(origin, DEV_POLICY)).toBe(true);
      expect(isAllowedOrigin(origin, PRODUCTION_POLICY)).toBe(false);
    }
  });

  it('9. Allows a localhost origin under a production policy only when listed verbatim', () => {
    const policy: OriginPolicy = {
      allowedOrigins: ['http://localhost:8081'],
      allowLocalhostOrigins: false,
    };
    expect(isAllowedOrigin('http://localhost:8081', policy)).toBe(true);
    expect(isAllowedOrigin('http://localhost:9999', policy)).toBe(false);
  });

  it('10. Never treats a localhost-prefixed public hostname as local', () => {
    expect(isAllowedOrigin('http://localhost.attacker.com', DEV_POLICY)).toBe(false);
    expect(isAllowedOrigin('https://127.0.0.1.attacker.com', DEV_POLICY)).toBe(false);
  });
});

describe('handleCors', () => {
  // Uses the ambient deployment policy; ALLOWED_ORIGINS defaults to the local dev
  // origins, so this one is trusted in the test environment.
  const CONFIGURED_ORIGIN = config.allowedOrigins[0];

  it('11. Sets CORS headers and short-circuits preflight OPTIONS without authentication', () => {
    const req: any = { method: 'OPTIONS', headers: { origin: CONFIGURED_ORIGIN } };
    const m = mockRes();

    const handled = handleCors(req, m.res, ['GET', 'POST', 'OPTIONS']);

    expect(handled).toBe(false);
    expect(m.statusSent).toBe(204);
    expect(m.ended).toBe(true);
    expect(m.headers['Access-Control-Allow-Origin']).toBe(CONFIGURED_ORIGIN);
    expect(m.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(m.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    expect(m.headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(m.headers['Vary']).toBe('Origin');
  });

  it('12. Attaches CORS headers to the 403 for an unauthorized origin, but never credentials', () => {
    const req: any = { method: 'GET', headers: { origin: 'https://unauthorized-origin.com' } };
    const m = mockRes();

    const handled = handleCors(req, m.res, ['GET', 'OPTIONS']);

    expect(handled).toBe(false);
    expect(m.statusSent).toBe(403);
    expect(m.jsonBody?.error?.code).toBe('CORS_FORBIDDEN');
    // Present so the browser surfaces a readable error rather than an opaque failure...
    expect(m.headers['Access-Control-Allow-Origin']).toBe('https://unauthorized-origin.com');
    // ...but an untrusted origin must never be able to read a credentialed response.
    expect(m.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('13. Rejects a claimable lookalike admin origin end-to-end', () => {
    const req: any = {
      method: 'OPTIONS',
      headers: { origin: 'https://urbarber-admin-attacker.vercel.app' },
    };
    const m = mockRes();

    const handled = handleCors(req, m.res, ['GET', 'POST', 'OPTIONS']);

    expect(handled).toBe(false);
    expect(m.statusSent).toBe(403);
    expect(m.jsonBody?.error?.code).toBe('CORS_FORBIDDEN');
    expect(m.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('14. Never emits a wildcard Access-Control-Allow-Origin', () => {
    for (const origin of [CONFIGURED_ORIGIN, 'https://urbarber-admin-attacker.vercel.app']) {
      const m = mockRes();
      handleCors({ method: 'GET', headers: { origin } } as any, m.res, ['GET', 'OPTIONS']);
      expect(m.headers['Access-Control-Allow-Origin']).not.toBe('*');
    }
  });
});
