export type OAuthProvider = 'github' | 'gitlab' | 'bitbucket';

export interface OAuthConfig {
  provider: OAuthProvider;
  scopes: string;
  label: string;
  icon?: string; // We can add icon paths or component names later if needed
}

export const OAUTH_CONFIG: Record<OAuthProvider, OAuthConfig> = {
  github: {
    provider: 'github',
    scopes: 'read:org repo',
    label: 'GitHub',
  },
  gitlab: {
    provider: 'gitlab',
    scopes: 'read_user read_api read_repository',
    label: 'GitLab',
  },
  bitbucket: {
    provider: 'bitbucket',
    scopes: 'account repository',
    label: 'Bitbucket',
  },
};

export function getOAuthConfig(provider: string): OAuthConfig | null {
  return OAUTH_CONFIG[provider as OAuthProvider] || null;
}
