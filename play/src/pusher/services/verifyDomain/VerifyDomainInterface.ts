/**
 * Verify if the domain is an allowed domain.
 * Used to validate the requested redirection after a OAuth login.
 */
export interface VerifyDomainInterface {
    verifyDomain(uri: string): Promise<boolean>;
}
