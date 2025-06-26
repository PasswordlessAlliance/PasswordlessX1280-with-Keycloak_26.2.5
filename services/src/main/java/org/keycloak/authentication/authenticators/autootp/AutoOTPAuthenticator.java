/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.authentication.authenticators.autootp;

import org.keycloak.http.HttpResponse;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.CredentialValidator;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;

import org.keycloak.credential.CredentialProvider;
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserCredentialModel;
import org.keycloak.models.UserModel;

import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.Collections;
import java.util.List;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 * @version $Revision: 1 $
 */
public class AutoOTPAuthenticator implements Authenticator, CredentialValidator<AutoOTPCredentialProvider> {

    protected boolean hasCookie(AuthenticationFlowContext context) {
        Cookie cookie = context.getHttpRequest().getHttpHeaders().getCookies().get("AUTOOTP_ANSWERED");
        boolean result = cookie != null;
        return result;
    }

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        Response challenge = context.form()
        					.createForm("autootp-wait.ftl");
        context.challenge(challenge);
    }

    @Override
    public void action(AuthenticationFlowContext context) {
    }

    protected void setCookie(AuthenticationFlowContext context) {
        AuthenticatorConfigModel config = context.getAuthenticatorConfig();
        int maxCookieAge = 60 * 60 * 24 * 30; // 30 days
        if (config != null) {
            maxCookieAge = Integer.valueOf(config.getConfig().get("cookie.max.age"));

        }
        URI uri = context.getUriInfo().getBaseUriBuilder().path("realms").path(context.getRealm().getName()).build();
        addCookie(context, "AUTOOTP_ANSWERED", "true",
                uri.getRawPath(),
                null, null,
                maxCookieAge,
                false, true);
    }

    public void addCookie(AuthenticationFlowContext context, String name, String value, String path, String domain, String comment, int maxAge, boolean secure, boolean httpOnly) {
        HttpResponse response = context.getSession().getContext().getHttpResponse();
        NewCookie newCookie = new NewCookie.Builder(name)
                .version(1)
                .value(value)
                .path(path)
                .maxAge(maxAge)
                .secure(secure)
                .httpOnly(httpOnly)
                .sameSite(null)
                .build();
        String cookie = newCookie.toString();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie);
    }

    @Override
    public boolean requiresUser() {
        return true;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return getCredentialProvider(session).isConfiguredFor(realm, user, getType(session));
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
    	// Add "Required user actions" - AutoOTPRequiredAction.PROVIDER_ID
        user.addRequiredAction(AutoOTPRequiredAction.PROVIDER_ID);
    }

    public List<RequiredActionFactory> getRequiredActions(KeycloakSession session) {
        return Collections.singletonList((AutoOTPRequiredActionFactory)session.getKeycloakSessionFactory().getProviderFactory(RequiredActionProvider.class, AutoOTPRequiredAction.PROVIDER_ID));
    }

    @Override
    public void close() {

    }

    @Override
    public AutoOTPCredentialProvider getCredentialProvider(KeycloakSession session) {
        return (AutoOTPCredentialProvider)session.getProvider(CredentialProvider.class, AutoOTPCredentialProviderFactory.PROVIDER_ID);
    }
}
