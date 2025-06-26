/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.authentication.authenticators.autootp;

import org.keycloak.credential.CredentialProvider;
import org.keycloak.credential.CredentialProviderFactory;
import org.keycloak.models.KeycloakSession;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 * @version $Revision: 1 $
 */
public class AutoOTPCredentialProviderFactory implements CredentialProviderFactory<AutoOTPCredentialProvider> {

    public static final String PROVIDER_ID = "autootp";

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public CredentialProvider create(KeycloakSession session) {
        return new AutoOTPCredentialProvider(session);
    }
}
