/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.admin.client.autootp;

import jakarta.ws.rs.client.WebTarget;
import org.jboss.resteasy.client.jaxrs.ResteasyClient;
import org.jboss.resteasy.client.jaxrs.ResteasyWebTarget;
import org.keycloak.admin.client.Config;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.BasicAuthFilter;
import org.keycloak.common.util.Time;
import org.keycloak.representations.AccessTokenResponse;

import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.core.Form;

import static org.keycloak.OAuth2Constants.CLIENT_CREDENTIALS;
import static org.keycloak.OAuth2Constants.CLIENT_ID;
import static org.keycloak.OAuth2Constants.GRANT_TYPE;
import static org.keycloak.OAuth2Constants.PASSWORD;
import static org.keycloak.OAuth2Constants.REFRESH_TOKEN;
import static org.keycloak.OAuth2Constants.SCOPE;
import static org.keycloak.OAuth2Constants.USERNAME;

import org.keycloak.admin.client.autootp.AutoOTPService;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 */
public class AutoOTPManager {
    private static final long DEFAULT_MIN_VALIDITY = 30;

    private AccessTokenResponse currentToken;
    private long expirationTime;
    private long refreshExpirationTime;
    private long minTokenValidity = DEFAULT_MIN_VALIDITY;
    private final Config config;
    private final AutoOTPService autoOTPService;
    private final String accessTokenGrantType;

    public AutoOTPManager(Config config, Client client) {
        this.config = config;
        WebTarget target = client.target(config.getServerUrl());
        if (!config.isPublicClient()) {
            target.register(new BasicAuthFilter(config.getClientId(), config.getClientSecret()));
        }
        this.autoOTPService = Keycloak.getClientProvider().targetProxy(target, AutoOTPService.class);
        this.accessTokenGrantType = config.getGrantType();

        if (CLIENT_CREDENTIALS.equals(accessTokenGrantType) && config.isPublicClient()) {
            throw new IllegalArgumentException("Can't use " + GRANT_TYPE + "=" + CLIENT_CREDENTIALS + " with public client");
        }
    }

    public String getAccessTokenString() {
        return getAccessToken().getToken();
    }

    public synchronized AccessTokenResponse getAccessToken() {
        if (currentToken == null) {
            grantToken();
        } else if (tokenExpired()) {
            refreshToken();
        }
        return currentToken;
    }

    public AccessTokenResponse grantToken() {
    	/*
        Form form = new Form().param(GRANT_TYPE, accessTokenGrantType);
        if (PASSWORD.equals(accessTokenGrantType)) {
            form.param(USERNAME, config.getUsername())
                .param(PASSWORD, config.getPassword());
        }

        if (config.getScope() != null) {
            form.param(SCOPE, config.getScope());
        }

        if (config.isPublicClient()) {
            form.param(CLIENT_ID, config.getClientId());
        }

        int requestTime = Time.currentTime();
        synchronized (this) {
            currentToken = autoOTPService.grantToken(config.getRealm(), form.asMap());
            expirationTime = requestTime + currentToken.getExpiresIn();
            refreshExpirationTime = requestTime + currentToken.getRefreshExpiresIn();
        }
        */
        return currentToken;
    }

    public synchronized AccessTokenResponse refreshToken() {
        if (currentToken.getRefreshToken() == null || refreshTokenExpired()) {
            return grantToken();
        }

        Form form = new Form().param(GRANT_TYPE, REFRESH_TOKEN)
                              .param(REFRESH_TOKEN, currentToken.getRefreshToken());

        if (config.isPublicClient()) {
            form.param(CLIENT_ID, config.getClientId());
        }

        try {
            int requestTime = Time.currentTime();

            currentToken = autoOTPService.refreshToken(config.getRealm(), form.asMap());
            expirationTime = requestTime + currentToken.getExpiresIn();
            return currentToken;
        } catch (BadRequestException e) {
            return grantToken();
        }
    }

    public synchronized void logout() {
    }

    public synchronized void setMinTokenValidity(long minTokenValidity) {
        this.minTokenValidity = minTokenValidity;
    }

    private synchronized boolean tokenExpired() {
        return (Time.currentTime() + minTokenValidity) >= expirationTime;
    }

    private synchronized boolean refreshTokenExpired() { return (Time.currentTime() + minTokenValidity) >= refreshExpirationTime; }

    /**
     * Invalidates the current token, but only when it is equal to the token passed as an argument.
     *
     * @param token the token to invalidate (cannot be null).
     */
    public synchronized void invalidate(String token) {
        if (currentToken == null) {
            return; // There's nothing to invalidate.
        }
        if (token.equals(currentToken.getToken())) {
            // When used next, this cause a refresh attempt, that in turn will cause a grant attempt if refreshing fails.
            expirationTime = -1;
        }
    }
}
