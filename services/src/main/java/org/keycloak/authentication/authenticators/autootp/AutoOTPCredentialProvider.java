/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.authentication.authenticators.autootp;

import org.jboss.logging.Logger;
import org.keycloak.common.util.Time;
import org.keycloak.credential.CredentialInput;
import org.keycloak.credential.CredentialInputValidator;
import org.keycloak.credential.CredentialModel;
import org.keycloak.credential.CredentialProvider;
import org.keycloak.credential.CredentialTypeMetadata;
import org.keycloak.credential.CredentialTypeMetadataContext;
import org.keycloak.authentication.authenticators.autootp.credential.AutoOTPModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserCredentialModel;
import org.keycloak.models.UserModel;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 * @version $Revision: 1 $
 */
public class AutoOTPCredentialProvider implements CredentialProvider<AutoOTPModel>, CredentialInputValidator {
    private static final Logger logger = Logger.getLogger(AutoOTPCredentialProvider.class);

    protected KeycloakSession session;

    public AutoOTPCredentialProvider(KeycloakSession session) {
        this.session = session;
    }

    @Override
    public boolean isValid(RealmModel realm, UserModel user, CredentialInput input) {
    	/*
        if (!(input instanceof UserCredentialModel)) {
            logger.debug("Expected instance of UserCredentialModel for CredentialInput");
            return false;
        }
        if (!input.getType().equals(getType())) {
            return false;
        }
        String challengeResponse = input.getChallengeResponse();
        if (challengeResponse == null) {
            return false;
        }
        CredentialModel credentialModel = user.credentialManager().getStoredCredentialById(input.getCredentialId());
        AutoOTPModel sqcm = getCredentialFromModel(credentialModel);
        return sqcm.getAutoOTPSecretData().getAnswer().equals(challengeResponse);
        */
    	return false;
    }

    @Override
    public boolean supportsCredentialType(String credentialType) {
        return getType().equals(credentialType);
    }

    @Override
    public boolean isConfiguredFor(RealmModel realm, UserModel user, String credentialType) {
        if (!supportsCredentialType(credentialType)) return false;
        return user.credentialManager().getStoredCredentialsByTypeStream(credentialType).findAny().isPresent();
    }

    @Override
    public CredentialModel createCredential(RealmModel realm, UserModel user, AutoOTPModel credentialModel) {
        if (credentialModel.getCreatedDate() == null) {
            credentialModel.setCreatedDate(Time.currentTimeMillis());
        }
        return user.credentialManager().createStoredCredential(credentialModel);
    }

    @Override
    public boolean deleteCredential(RealmModel realm, UserModel user, String credentialId) {
        return user.credentialManager().removeStoredCredentialById(credentialId);
    }

    @Override
    public AutoOTPModel getCredentialFromModel(CredentialModel model) {
        return AutoOTPModel.createFromCredentialModel(model);
    }

    @Override
    public CredentialTypeMetadata getCredentialTypeMetadata(CredentialTypeMetadataContext metadataContext) {
        return CredentialTypeMetadata.builder()
                .type(getType())
                .category(CredentialTypeMetadata.Category.TWO_FACTOR)
                .displayName(AutoOTPCredentialProviderFactory.PROVIDER_ID)
                .helpText("autootp-text")
                .createAction(AutoOTPAuthenticatorFactory.PROVIDER_ID)
                .removeable(false)
                .build(session);
    }

    @Override
    public String getType() {
        return AutoOTPModel.TYPE;
    }
}
