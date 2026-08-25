export interface AuthenticatedPrincipal {
  readonly subject: string;
  readonly personId: string;
  readonly roles: readonly string[];
}
