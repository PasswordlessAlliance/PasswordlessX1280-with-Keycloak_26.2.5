/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.authentication.authenticators.autootp;

import org.keycloak.Config;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 * @version $Revision: 1 $
 */
public class AutoOTPRequiredActionFactory implements RequiredActionFactory {

    private static final AutoOTPRequiredAction SINGLETON = new AutoOTPRequiredAction();

    @Override
    public RequiredActionProvider create(KeycloakSession session) {
        return SINGLETON;
    }


    @Override
    public String getId() {
        return AutoOTPRequiredAction.PROVIDER_ID;
    }

    @Override
    public String getDisplayText() {
        return "Passwordless X1280 Login";
    }

    @Override
    public void init(Config.Scope config) {

    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {

    }

    @Override
    public void close() {

    }

}
