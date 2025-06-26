/*
 * Copyright 2016 Red Hat, Inc. and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.keycloak.email.freemarker;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.text.Bidi;
import java.text.MessageFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.Iterator;
import java.net.URLEncoder;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.keycloak.broker.provider.BrokeredIdentityContext;
import org.keycloak.common.util.ObjectUtil;
import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.email.EmailTemplateProvider;
import org.keycloak.email.freemarker.beans.EventBean;
import org.keycloak.email.freemarker.beans.ProfileBean;
import org.keycloak.events.Event;
import org.keycloak.events.EventType;
import org.keycloak.forms.login.freemarker.model.UrlBean;
import org.keycloak.models.ClientModel;
import org.keycloak.models.Constants;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakUriInfo;
import org.keycloak.models.OrganizationModel;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.AuthenticationFlowModel;
import org.keycloak.sessions.AuthenticationSessionModel;
import org.keycloak.theme.FreeMarkerException;
import org.keycloak.theme.Theme;
import org.keycloak.theme.beans.LinkExpirationFormatterMethod;
import org.keycloak.theme.beans.MessageFormatterMethod;
import org.keycloak.theme.freemarker.FreeMarkerProvider;

import org.keycloak.authentication.authenticators.autootp.AutoOTPRequiredAction;

/**
 * @author <a href="mailto:sthorger@redhat.com">Stian Thorgersen</a>
 */
public class FreeMarkerEmailTemplateProvider implements EmailTemplateProvider {

    protected KeycloakSession session;
    /**
     * authenticationSession can be null for some email sendings, it is filled only for email sendings performed as part of the authentication session (email verification, password reset, broker link
     * etc.)!
     */
    protected AuthenticationSessionModel authenticationSession;
    protected FreeMarkerProvider freeMarker;
    protected RealmModel realm;
    protected UserModel user;
    protected final Map<String, Object> attributes = new HashMap<>();

    public FreeMarkerEmailTemplateProvider(KeycloakSession session) {
        this.session = session;
        this.freeMarker = session.getProvider(FreeMarkerProvider.class);
    }

    @Override
    public EmailTemplateProvider setRealm(RealmModel realm) {
        this.realm = realm;
        return this;
    }

    @Override
    public EmailTemplateProvider setUser(UserModel user, ClientModel client) {
        String baseUrl = "";
        String clientId = "";
        String clientClientId = "";
        
    	if(client != null) {
	        baseUrl = client.getBaseUrl();
	        clientId = client.getId();
	        clientClientId = client.getClientId();
    	}
    	
        attributes.put("baseUrl", baseUrl);
        attributes.put("clientId", clientId);
        attributes.put("clientClientId", clientClientId);

        return setUser(user);
    }
    
    @Override
    public EmailTemplateProvider setUser(UserModel user) {
        this.user = user;
        
        boolean isEnabled = user.isEnabled();
        boolean isEmailVerified = user.isEmailVerified();
        String strIsEnabled = "F";
        String strIsEmailVerified = "F";
        if(isEnabled)        strIsEnabled = "T";
        if(isEmailVerified)    strIsEmailVerified = "T";
        
        String userId = user.getId();
        String username = user.getUsername();
        String firstName = user.getFirstName();
        String lastName = user.getLastName();
        String email = user.getEmail();
        
        // Realm, User info
        AuthenticationFlowModel flowModel = realm.getBrowserFlow();
        String dbBrowserFlowAlias = flowModel.getAlias();
        
        String dbFlowBinding = "";
        String dbBrowserFlowId = flowModel.getId();
        String dbBrowserFlowDesc = flowModel.getDescription();
        
        String tmpClientId = (String) attributes.get("clientId");
        String tmpClientClientId = (String) attributes.get("clientClientId");

        ClientModel client = realm.getClientByClientId(tmpClientClientId);

        if(client != null) {
	        Map<String, String> flowBindings = client.getAuthenticationFlowBindingOverrides();
	        if(flowBindings != null) {
	        	Set<String> set = flowBindings.keySet();
	        	Iterator<String> it = set.iterator();
	        	while(it.hasNext()) {
	        		String key = it.next();
	        		dbFlowBinding = key;
	        	}
	        }
        }
        
        if(dbBrowserFlowAlias == null)
            dbBrowserFlowAlias = "";
        
        if(dbBrowserFlowAlias.toUpperCase().indexOf("AUTOOTP") > -1 || dbBrowserFlowAlias.toUpperCase().indexOf("PASSWORDLESS") > -1 || dbBrowserFlowAlias.toUpperCase().indexOf("X1280") > -1)
            dbBrowserFlowAlias = "AUTOOTP";
        
        if(dbBrowserFlowAlias.equals("AUTOOTP") && dbFlowBinding.equals("browser")) {
        	// AutoOTP login --> ID/PASS login
        	dbBrowserFlowAlias = "browser";
        }
        
        String dateTime = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
        
        String dbDomain = realm.getAttribute("autootpAppSettingDomain");
        String dbEmail = realm.getAttribute("autootpAppSettingEmail");
        String dbIpAddr = realm.getAttribute("autootpAppSettingIpAddress");
        String dbName = realm.getAttribute("autootpAppSettingName");
        String dbProxyDomain = realm.getAttribute("autootpAppSettingProxyServerDomain");
        String dbStep = realm.getAttribute("autootpAuthenticationStep");
        String dbDomainValidToken = realm.getAttribute("autootpReturnDomainValidationToken");
        String dbSecretKey = realm.getAttribute("autootpServerSettingAppServerKey");
        String dbAuthDomain = realm.getAttribute("autootpServerSettingAuthServerDomain");
        
        attributes.put("nowDate", dateTime);
        attributes.put("dbBrowserFlowAlias", dbBrowserFlowAlias);
        attributes.put("autootpAppSettingDomain", dbDomain);
        attributes.put("autootpAppSettingEmail", dbEmail);
        attributes.put("autootpAppSettingIpAddress", dbIpAddr);
        attributes.put("autootpAppSettingName", dbName);
        attributes.put("autootpAppSettingProxyServerDomain", dbProxyDomain);
        attributes.put("autootpAuthenticationStep", dbStep);
        attributes.put("autootpReturnDomainValidationToken", dbDomainValidToken);
        attributes.put("autootpServerSettingAppServerKey", dbSecretKey);
        attributes.put("autootpServerSettingAuthServerDomain", dbAuthDomain);

        attributes.put("isEnabled", strIsEnabled);
        attributes.put("isEmailVerified", strIsEmailVerified);
        attributes.put("userId", userId);
        attributes.put("username", username);
        attributes.put("firstName", firstName);
        attributes.put("lastName", lastName);
        attributes.put("email", email);

        String link = "realms/" + realm.getName() + "/login-actions/autootp-regist";
        KeycloakUriInfo uriInfo = session.getContext().getUri();
        link = uriInfo.getBaseUri() + link;
        attributes.put("autootpLink", link);

        String encParam = "";
        String baseUrl = (String) attributes.get("baseUrl");
        long expirationInMinutes = realm.getActionTokenGeneratedByUserLifespan() / 60;    // Action tokens : User-Initiated Action Lifespan

        if(dbBrowserFlowAlias.equals("AUTOOTP")) {
            String clientId = (String) attributes.get("clientId");
            String clientClientId = (String) attributes.get("clientClientId");

        	String autootpRegParam = dateTime + "|||" + expirationInMinutes + "|||" + username + "|||" + URLEncode(dbAuthDomain) + "|||" + URLEncode(baseUrl) + "|||" + clientId + "|||" + URLEncode(clientClientId);
            encParam = getEncryptAES(autootpRegParam, dbSecretKey.getBytes());
            encParam = encParam.replaceAll("\\+", "_");
        }
        else {
            encParam = "";
        }
        attributes.put("autootpRegParam", encParam);
        
        String strExpirationInMinutes = format(expirationInMinutes * 60);
        attributes.put("strExpiration", strExpirationInMinutes);
        
        return this;
    }

    @Override
    public EmailTemplateProvider setAttribute(String name, Object value) {
        attributes.put(name, value);
        return this;
    }

    @Override
    public EmailTemplateProvider setAuthenticationSession(AuthenticationSessionModel authenticationSession) {
        this.authenticationSession = authenticationSession;
        return this;
    }

    protected String getRealmName() {
        if (realm.getDisplayName() != null) {
            return realm.getDisplayName();
        } else {
            return ObjectUtil.capitalize(realm.getName());
        }
    }

    @Override
    public void sendEvent(Event event) throws EmailException {
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        attributes.put("event", new EventBean(event));

        send(toCamelCase(event.getType()) + "Subject", "event-" + event.getType().toString().toLowerCase() + ".ftl", attributes);
    }

    @Override
    public void sendPasswordReset(String link, long expirationInMinutes) throws EmailException {
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);

        send("passwordResetSubject", "password-reset.ftl", attributes);
    }

    @Override
    public void sendSmtpTestEmail(Map<String, String> config, UserModel user) throws EmailException {
        setRealm(session.getContext().getRealm());
        setUser(user);

        Map<String, Object> attributes = new HashMap<>(this.attributes);

        EmailTemplate email = processTemplate("emailTestSubject", Collections.emptyList(), "email-test.ftl", attributes);
        send(config, email.getSubject(), email.getTextBody(), email.getHtmlBody());
    }

    @Override
    public void sendConfirmIdentityBrokerLink(String link, long expirationInMinutes) throws EmailException {
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);

        BrokeredIdentityContext brokerContext = (BrokeredIdentityContext) this.attributes.get(IDENTITY_PROVIDER_BROKER_CONTEXT);
        String idpAlias = brokerContext.getIdpConfig().getAlias();
        String idpDisplayName = brokerContext.getIdpConfig().getDisplayName();
        if (ObjectUtil.isBlank(idpDisplayName)) {
            idpDisplayName = ObjectUtil.capitalize(idpAlias);
        }

        attributes.put("identityProviderContext", brokerContext);
        attributes.put("identityProviderAlias", idpAlias);
        attributes.put("identityProviderDisplayName", idpDisplayName);

        List<Object> subjectAttrs = Collections.singletonList(idpDisplayName);
        send("identityProviderLinkSubject", subjectAttrs, "identity-provider-link.ftl", attributes);
    }

    @Override
    public void sendExecuteActions(String link, long expirationInMinutes) throws EmailException {
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);

        send("executeActionsSubject", "executeActions.ftl", attributes);
    }

    @Override
    public void sendVerifyEmail(String link, long expirationInMinutes) throws EmailException {
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);
        
        AuthenticationFlowModel flowModel = realm.getBrowserFlow();
        String dbBrowserFlowAlias = flowModel.getAlias();
        if(dbBrowserFlowAlias == null)
            dbBrowserFlowAlias = "";
        
        if(dbBrowserFlowAlias.toUpperCase().indexOf("AUTOOTP") > -1 || dbBrowserFlowAlias.toUpperCase().indexOf("PASSWORDLESS") > -1 || dbBrowserFlowAlias.toUpperCase().indexOf("X1280") > -1)
            dbBrowserFlowAlias = "AUTOOTP";

        send("emailVerificationSubject", "email-verification.ftl", attributes);
    }
    
    @Override
    public void sendAutoOTPEmail(String link, String username, String dbSecretKey, String dbAuthDomain, long expirationInMinutes, String addr, String baseUrl, String clientId, String clientClientId) throws EmailException {
        setRealm(session.getContext().getRealm());
        UserModel user = session.users().getUserByUsername(realm, username);
        setUser(user);
        
        KeycloakUriInfo uriInfo = session.getContext().getUri();
        link = uriInfo.getBaseUri() + link;
        attributes.put("autootpLink", link);
        
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);
        attributes.put("addr", addr);
        attributes.put("clientId", clientId);
        attributes.put("clientClientId", clientClientId);
        
        String dateTime = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
        String autootpRegParam = dateTime + "|||" + expirationInMinutes + "|||" + username + "|||" + URLEncode(dbAuthDomain) + "|||" + URLEncode(baseUrl) + "|||" + clientId + "|||" + URLEncode(clientClientId);
        String encParam = getEncryptAES(autootpRegParam, dbSecretKey.getBytes());
        
        encParam = encParam.replaceAll("\\+", "_");
        attributes.put("autootpRegParam", encParam);
        
        String strExpirationInMinutes = format(expirationInMinutes * 60);
        attributes.put("strExpiration", strExpirationInMinutes);
        
        send("emailAutoOTPSubject", Collections.emptyList(), "email-autootp-reg.ftl", attributes, addr);
        
        // Remove "Required user actions" - AutoOTPRequiredAction.PROVIDER_ID
        user.removeRequiredAction(AutoOTPRequiredAction.PROVIDER_ID);
    }

    @Override
    public void sendOrgInviteEmail(OrganizationModel organization, String link, long expirationInMinutes) throws EmailException {
        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);
        attributes.put("organization", organization);
        if (user.getFirstName() != null && user.getLastName() != null) {
            attributes.put("firstName", user.getFirstName());
            attributes.put("lastName", user.getLastName());
        }
        send("orgInviteSubject", List.of(organization.getName()), "org-invite.ftl", attributes);
    }

    @Override
    public void sendEmailUpdateConfirmation(String link, long expirationInMinutes, String newEmail) throws EmailException {
        if (newEmail == null) {
            throw new IllegalArgumentException("The new email is mandatory");
        }

        Map<String, Object> attributes = new HashMap<>(this.attributes);
        addLinkInfoIntoAttributes(link, expirationInMinutes, attributes);
        attributes.put("newEmail", newEmail);

        send("emailUpdateConfirmationSubject", Collections.emptyList(), "email-update-confirmation.ftl", attributes, newEmail);
    }

    /**
     * Add link info into template attributes.
     *
     * @param link to add
     * @param expirationInMinutes to add
     * @param attributes to add link info into
     */
    protected void addLinkInfoIntoAttributes(String link, long expirationInMinutes, Map<String, Object> attributes) throws EmailException {
    	attributes.put("link", URLEncode(link));
        attributes.put("linkExpiration", expirationInMinutes);
        try {
            Locale locale = session.getContext().resolveLocale(user, Boolean.parseBoolean(String.valueOf(attributes.get(Constants.IGNORE_ACCEPT_LANGUAGE_HEADER))));
            attributes.put("linkExpirationFormatter", new LinkExpirationFormatterMethod(getTheme().getMessages(locale), locale));
        } catch (IOException e) {
            throw new EmailException("Failed to template email", e);
        }
    }

    @Override
    public void send(String subjectFormatKey, String bodyTemplate, Map<String, Object> bodyAttributes) throws EmailException {
        send(subjectFormatKey, Collections.emptyList(), bodyTemplate, bodyAttributes);
    }

    protected EmailTemplate processTemplate(String subjectKey, List<Object> subjectAttributes, String template, Map<String, Object> attributes) throws EmailException {
        try {
            Locale locale = session.getContext().resolveLocale(user, Boolean.parseBoolean(String.valueOf(attributes.get(Constants.IGNORE_ACCEPT_LANGUAGE_HEADER))));
            attributes.put("locale", locale);

            Theme theme = getTheme();
            Properties messages = theme.getEnhancedMessages(realm, locale);

            String currentLanguageTag = locale.getLanguage();
            String currentLanguage = messages.getProperty("locale_" + currentLanguageTag, currentLanguageTag);
            boolean isLtr = new Bidi(currentLanguage, Bidi.DIRECTION_DEFAULT_LEFT_TO_RIGHT).isLeftToRight();
            attributes.put("ltr", isLtr);

            attributes.put("msg", new MessageFormatterMethod(locale, messages));

            attributes.put("properties", theme.getProperties());
            attributes.put("realmName", getRealmName());
            
            if(subjectKey.equals("emailAutoOTPSubject")) {
            }
            else {
                attributes.put("user", new ProfileBean(user, session));
            }
            
            attributes.put("user", new ProfileBean(user, session));
            KeycloakUriInfo uriInfo = session.getContext().getUri();
            attributes.put("url", new UrlBean(realm, theme, uriInfo.getBaseUri(), null));

            String subject = new MessageFormat(messages.getProperty(subjectKey, subjectKey), locale).format(subjectAttributes.toArray());
            String textTemplate = String.format("text/%s", template);
            String textBody;
            
            if(subjectKey.equals("emailAutoOTPSubject")) {
                textBody = "";
            }
            else {
                try {
                    textBody = freeMarker.processTemplate(attributes, textTemplate, theme);
                } catch (final FreeMarkerException e) {
                    throw new EmailException("Failed to template plain text email.", e);
                }
            }
            
            String htmlTemplate = String.format("html/%s", template);
            String htmlBody;
            try {
                htmlBody = freeMarker.processTemplate(attributes, htmlTemplate, theme);
            } catch (final FreeMarkerException e) {
                throw new EmailException("Failed to template html email.", e);
            }

            return new EmailTemplate(subject, textBody, htmlBody);
        } catch (Exception e) {
            throw new EmailException("Failed to template email", e);
        }
    }

    protected Theme getTheme() throws IOException {
        return session.theme().getTheme(Theme.Type.EMAIL);
    }

    @Override
    public void send(String subjectFormatKey, List<Object> subjectAttributes, String bodyTemplate, Map<String, Object> bodyAttributes) throws EmailException {
        send(subjectFormatKey, subjectAttributes, bodyTemplate, bodyAttributes, null);
    }

    protected void send(String subjectFormatKey, List<Object> subjectAttributes, String bodyTemplate, Map<String, Object> bodyAttributes, String address) throws EmailException {
        try {
            EmailTemplate email = processTemplate(subjectFormatKey, subjectAttributes, bodyTemplate, bodyAttributes);
            send(email.getSubject(), email.getTextBody(), email.getHtmlBody(), address);
        } catch (EmailException e) {
            throw e;
        } catch (Exception e) {
            throw new EmailException("Failed to template email", e);
        }
    }

    protected void send(String subject, String textBody, String htmlBody, String address) throws EmailException {
        send(realm.getSmtpConfig(), subject, textBody, htmlBody, address);
    }

    protected void send(Map<String, String> config, String subject, String textBody, String htmlBody) throws EmailException {
        send(config, subject, textBody, htmlBody, null);
    }

    protected void send(Map<String, String> config, String subject, String textBody, String htmlBody, String address) throws EmailException {
        EmailSenderProvider emailSender = session.getProvider(EmailSenderProvider.class);
        if (address == null) {
            emailSender.send(config, user, subject, textBody, htmlBody);
        } else {
            emailSender.send(config, address, subject, textBody, htmlBody);
        }
    }

    @Override
    public void close() {
    }

    protected String toCamelCase(EventType event) {
        StringBuilder sb = new StringBuilder("event");
        for (String s : event.name().toLowerCase().split("_")) {
            sb.append(ObjectUtil.capitalize(s));
        }
        return sb.toString();
    }

    protected static class EmailTemplate {

        private String subject;
        private String textBody;
        private String htmlBody;

        public EmailTemplate(String subject, String textBody, String htmlBody) {
            this.subject = subject;
            this.textBody = textBody;
            this.htmlBody = htmlBody;
        }

        public String getSubject() {
            return subject;
        }

        public String getTextBody() {
            return textBody;
        }

        public String getHtmlBody() {
            return htmlBody;
        }
    }

    private static String getEncryptAES(String value, byte[] key) {
        String strRet = null;
        
        byte[]  strIV = key;
        if ( key == null || strIV == null ) return null;
       try {
           SecretKey secureKey = new SecretKeySpec(key, "AES");
            Cipher c = Cipher.getInstance("AES/CBC/PKCS5Padding");
            c.init(Cipher.ENCRYPT_MODE, secureKey, new IvParameterSpec(strIV));
           byte[] byteStr = c.doFinal(value.getBytes());
           strRet = java.util.Base64.getEncoder().encodeToString(byteStr);
       } catch (Exception ex) {
           ex.printStackTrace();
       }
       return strRet;
   }
    
    private static String getDecryptAES(String encrypted, byte[] key) {
        String strRet = null;
        
        byte[]  strIV = key;
        if ( key == null || strIV == null ) return null;
        try {
            SecretKey secureKey = new SecretKeySpec(key, "AES");
            Cipher c = Cipher.getInstance("AES/CBC/PKCS5Padding");
            c.init(Cipher.DECRYPT_MODE, secureKey, new IvParameterSpec(strIV));
            byte[] byteStr = java.util.Base64.getDecoder().decode(encrypted);//Base64Util.getDecData(encrypted);
            strRet = new String(c.doFinal(byteStr), "utf-8");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return strRet;    
    }
    
    public String URLEncode(String param) {
       String retVal = "";
       
       if(param != null) {
           try {
               retVal = URLEncoder.encode(param, "UTF-8");
           } catch (UnsupportedEncodingException e1) {
               e1.printStackTrace();
           }
       }
       
       return retVal;
   }
    
    protected String format(long valueInSeconds) {

       String unitKey = "seconds";
       long value = valueInSeconds;

       if (value > 0 && value % 60 == 0) {
           unitKey = "minutes";
           value = value / 60;
           if (value % 60 == 0) {
               unitKey = "hours";
               value = value / 60;
               if (value % 24 == 0) {
                   unitKey = "days";
                   value = value / 24;
               }
           }
       }

       return value + " " + unitKey;
   }
}
