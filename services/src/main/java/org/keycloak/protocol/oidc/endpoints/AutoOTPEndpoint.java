/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.protocol.oidc.endpoints;

import org.apache.commons.codec.binary.Hex;
import org.apache.http.HttpEntity;
//import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.jboss.logging.Logger;
import org.keycloak.http.HttpRequest;
import org.keycloak.http.HttpResponse;
import org.keycloak.OAuth2Constants;
import org.keycloak.OAuthErrorException;
import org.keycloak.authentication.AuthenticationProcessor;
import org.keycloak.authorization.AuthorizationProvider;
import org.keycloak.common.ClientConnection;
import org.keycloak.common.Profile;
import org.keycloak.common.constants.ServiceAccountConstants;
import org.keycloak.common.util.KeycloakUriBuilder;
import org.keycloak.constants.AdapterConstants;
import org.keycloak.events.Details;
import org.keycloak.events.Errors;
import org.keycloak.events.EventBuilder;
import org.keycloak.events.EventType;
import org.keycloak.jose.jws.JWSInput;
import org.keycloak.jose.jws.JWSInputException;
import org.keycloak.models.AuthenticatedClientSessionModel;
import org.keycloak.models.AuthenticationFlowModel;
import org.keycloak.models.ClientModel;
import org.keycloak.models.ClientScopeModel;
import org.keycloak.models.ClientSessionContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.UserCredentialModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.models.utils.AuthenticationFlowResolver;
import org.keycloak.models.utils.KeycloakModelUtils;
import org.keycloak.protocol.oidc.OIDCAdvancedConfigWrapper;
import org.keycloak.protocol.oidc.OIDCLoginProtocol;
import org.keycloak.protocol.oidc.grants.OAuth2GrantType;
import org.keycloak.protocol.oidc.grants.PreAuthorizedCodeGrantTypeFactory;
import org.keycloak.protocol.oidc.grants.ciba.CibaGrantType;
import org.keycloak.protocol.oidc.grants.device.DeviceGrantType;
import org.keycloak.protocol.oidc.utils.AuthorizeClientUtil;
import org.keycloak.protocol.oidc.utils.OAuth2Code;
import org.keycloak.protocol.oidc.utils.OAuth2CodeParser;
import org.keycloak.protocol.oidc.utils.PkceUtils;
import org.keycloak.protocol.saml.JaxrsSAML2BindingBuilder;
import org.keycloak.protocol.saml.SamlClient;
import org.keycloak.protocol.saml.SamlProtocol;
import org.keycloak.rar.AuthorizationRequestContext;
import org.keycloak.representations.idm.authorization.AuthorizationRequest.Metadata;
import org.keycloak.saml.common.constants.JBossSAMLConstants;
import org.keycloak.saml.common.constants.JBossSAMLURIConstants;
import org.keycloak.saml.common.exceptions.ConfigurationException;
import org.keycloak.saml.common.exceptions.ProcessingException;
import org.keycloak.saml.common.util.DocumentUtil;
import org.keycloak.services.CorsErrorResponseException;
import org.keycloak.services.ServicesLogger;
import org.keycloak.services.Urls;
import org.keycloak.services.clientpolicy.ClientPolicyContext;
import org.keycloak.services.clientpolicy.ClientPolicyException;
import org.keycloak.services.clientpolicy.context.ResourceOwnerPasswordCredentialsContext;
import org.keycloak.services.clientpolicy.context.ResourceOwnerPasswordCredentialsResponseContext;
import org.keycloak.services.managers.AppAuthManager;
import org.keycloak.services.managers.AuthenticationManager;
import org.keycloak.services.managers.AuthenticationSessionManager;
import org.keycloak.services.managers.ClientManager;
import org.keycloak.services.managers.RealmManager;
import org.keycloak.services.cors.Cors;
import org.keycloak.services.util.DPoPUtil;
import org.keycloak.services.util.AuthorizationContextUtil;
import org.keycloak.services.util.DefaultClientSessionContext;
import org.keycloak.sessions.AuthenticationSessionModel;
import org.keycloak.sessions.RootAuthenticationSessionModel;
import org.keycloak.utils.ProfileHelper;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.OPTIONS;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Stream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Properties;

//import static org.keycloak.utils.LockObjectsForModification.lockUserSessionsForModification;

import org.keycloak.email.EmailTemplateProvider;
import org.keycloak.email.EmailException;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 */
public class AutoOTPEndpoint {

    private static final Logger logger = Logger.getLogger(AutoOTPEndpoint.class);
    private MultivaluedMap<String, String> formParams;
    private ClientModel client;
    private Map<String, String> clientAuthAttributes;
    private OIDCAdvancedConfigWrapper clientConfig;

    private final KeycloakSession session;

    private final HttpRequest request;

    private final org.keycloak.http.HttpResponse httpResponse;

    private final HttpHeaders headers;

    private final ClientConnection clientConnection;

    private final RealmModel realm;
    private final EventBuilder event;

    private String grantType;
    private OAuth2GrantType grant;
    
    private Cors cors;

    public AutoOTPEndpoint(KeycloakSession session, EventBuilder event) {
        this.session = session;
        this.clientConnection = session.getContext().getConnection();
        this.realm = session.getContext().getRealm();
        this.event = event;
        this.request = session.getContext().getHttpRequest();
        this.httpResponse = session.getContext().getHttpResponse();
        this.headers = session.getContext().getRequestHeaders();
    }
    
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @POST
    public Response processGrantRequest() {
        cors = Cors.builder().auth().allowedMethods("POST").auth().exposedHeaders(Cors.ACCESS_CONTROL_ALLOW_METHODS);

        MultivaluedMap<String, String> formParameters = request.getDecodedFormParameters();

        if (formParameters == null) {
            formParameters = new MultivaluedHashMap<>();
        }

        formParams = formParameters;
        
        try (InputStream is = AutootpPolicyEndpoint.class.getResourceAsStream("/org/keycloak/autootp.properties")) {
            Properties props = new Properties();
            props.load(is);
            grantType = props.getProperty("grantType");

        } catch (IOException e) {
        	e.printStackTrace();
        }

    	List<String> listUrl = (List<String>) formParams.get("url");
    	List<String> listParams = (List<String>) formParams.get("params");
    	
    	String[] arrUrl = listUrl.toArray(new String[listUrl.size()]);
    	String[] arrParams = listParams.toArray(new String[listParams.size()]);
        
        // Check whether to use Realm
        boolean isRealmEnabled = realm.isEnabled();

        String msg = "OK";
        String code = "000";
        
    	String url = "";
    	String params = "";
    	String ip = "";
    	
    	url = arrUrl[0];
    	params = arrParams[0];

    	Map<String, Object> callResult = null;

		String targetUser = "";
		String baseUrl = "";
		String strClientId = "";
		String clientId = "";
		String clientClientId = "";

		Map<String, String> mapParams = getParamsKeyValue(params);
		Set<String> set = mapParams.keySet();
		Iterator<String> keyset = set.iterator();
		while(keyset.hasNext()) {
			String key = keyset.next();
			String value = mapParams.get(key);
			
			if(key.equals("userId"))
				targetUser = value;
			
			if(key.equals("base_url"))
				baseUrl = value;
			
			if(key.equals("clientId"))
				strClientId = value;
		}

        // https://tools.ietf.org/html/rfc6749#section-5.1
        // The authorization server MUST include the HTTP "Cache-Control" response header field
        // with a value of "no-store" as well as the "Pragma" response header field with a value of "no-cache".
        httpResponse.setHeader("Cache-Control", "no-store");
        httpResponse.setHeader("Pragma", "no-cache");

        checkSsl();
        checkRealm();
        checkGrantType();
        
        // DB info
        String dbDomain = realm.getAttribute("autootpAppSettingDomain");
        String dbEmail = realm.getAttribute("autootpAppSettingEmail");
        String dbIpAddr = realm.getAttribute("autootpAppSettingIpAddress");
        String dbName = realm.getAttribute("autootpAppSettingName");
        String dbProxyDomain = realm.getAttribute("autootpAppSettingProxyServerDomain");
        String dbStep = realm.getAttribute("autootpAuthenticationStep");
        String dbDomainValidToken = realm.getAttribute("autootpReturnDomainValidationToken");
        String dbSecretKey = realm.getAttribute("autootpServerSettingAppServerKey");
        String dbPasswdUpdate = realm.getAttribute("autootpPasswdUpdate");
        String dbAuthDomain = realm.getAttribute("autootpServerSettingAuthServerDomain");
        
        if(dbDomain == null)			dbDomain = "";
        if(dbEmail == null)				dbEmail = "";
        if(dbIpAddr == null)			dbIpAddr = "";
        if(dbName == null)				dbName = "";
        if(dbProxyDomain == null)		dbProxyDomain = "";
        if(dbStep == null)				dbStep = "";
        if(dbDomainValidToken == null)	dbDomainValidToken = "";
        if(dbSecretKey == null)			dbSecretKey = "";
        if(dbPasswdUpdate == null)		dbPasswdUpdate = "";
        if(dbAuthDomain == null)		dbAuthDomain = "";
        
    	if(url.equals("sendEmail")) {
 			UserModel user = session.users().getUserByUsername(realm, targetUser);
 			
    		String addr = user.getEmail();
    		String link = "realms/" + realm.getName() + "/login-actions/autootp-regist";
    		
    		ClientModel client = realm.getClientByClientId(strClientId);
    		clientId = client.getId();
    		clientClientId = client.getClientId();
    		
    		long expirationInMinutes = realm.getActionTokenGeneratedByUserLifespan() / 60;
    		
    		try {
				UserModel userModel = null;
    			session.getProvider(EmailTemplateProvider.class).sendAutoOTPEmail(link, targetUser, dbSecretKey, dbAuthDomain, expirationInMinutes, addr, baseUrl, clientId, clientClientId);
    		} catch (EmailException ee) {
    			msg = ee.toString();
    			code = "998";
    		} catch (Exception e) {
    			msg = e.toString();
    			code = "999";
    		}
    		
    		Map<String, String> result = new HashMap<String, String>();
    		result.put("msg", msg);
    		result.put("code", code);
    		
    		callResult = new HashMap<String, Object>();
    		callResult.put("result", result);
    	}
    	else {
	        String secretKey = dbSecretKey;
	    	
	    	// AutoOTP auth server URL
	    	String auth_url = dbAuthDomain;
	    	
	    	checkParameterDuplicated();
	    	
	    	callResult = callAutoOTPReq(secretKey, dbPasswdUpdate, dbStep, auth_url, url, params);
    	}

        /*
         * To request an access token that is bound to a public key using DPoP, the client MUST provide a valid DPoP
         * proof JWT in a DPoP header when making an access token request to the authorization server's token endpoint.
         * This is applicable for all access token requests regardless of grant type (e.g., the common
         * authorization_code and refresh_token grant types and extension grants such as the JWT
         * authorization grant [RFC7523])
         */
    	/*
        DPoPUtil.retrieveDPoPHeaderIfPresent(session, clientConfig, event, cors).ifPresent(dPoP -> {
            session.setAttribute(DPoPUtil.DPOP_SESSION_ATTRIBUTE, dPoP);
        });

        OAuth2GrantType.Context context = new OAuth2GrantType.Context(session, clientConfig, callResult,
                                                                      formParams, event, cors, null);
        return grant.process(context);
        */
    	
    	Response.ResponseBuilder responseBuilder;
    	responseBuilder = Response.ok(callResult).header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON);
    	return cors.add(responseBuilder);
    }

    @OPTIONS
    public Response preflight() {
        if (logger.isDebugEnabled()) {
            logger.debugv("CORS preflight from: {0}", headers.getRequestHeaders().getFirst("Origin"));
        }
        return Cors.builder().auth().preflight().allowedMethods("POST", "OPTIONS").add(Response.ok());
    }

    private void checkSsl() {
        if (!session.getContext().getUri().getBaseUri().getScheme().equals("https") && realm.getSslRequired().isRequired(clientConnection)) {
            throw new CorsErrorResponseException(cors.allowAllOrigins(), OAuthErrorException.INVALID_REQUEST, "HTTPS required", Response.Status.FORBIDDEN);
        }
    }

    private void checkRealm() {
        if (!realm.isEnabled()) {
            throw new CorsErrorResponseException(cors.allowAllOrigins(), "access_denied", "Realm not enabled", Response.Status.FORBIDDEN);
        }
    }
    
    private void checkClient() {
        AuthorizeClientUtil.ClientAuthResult clientAuth = AuthorizeClientUtil.authorizeClient(session, event, cors);
        client = clientAuth.getClient();
        clientAuthAttributes = clientAuth.getClientAuthAttributes();
        clientConfig = OIDCAdvancedConfigWrapper.fromClientModel(client);

        cors.allowedOrigins(session, client);

        if (client.isBearerOnly()) {
            throw new CorsErrorResponseException(cors, OAuthErrorException.INVALID_CLIENT, "Bearer-only not allowed", Response.Status.BAD_REQUEST);
        }


    }

    private void checkGrantType() {
        if (grantType == null) {
            throw new CorsErrorResponseException(cors, OAuthErrorException.INVALID_REQUEST, "Missing form parameter: " + OIDCLoginProtocol.GRANT_TYPE_PARAM, Response.Status.BAD_REQUEST);
        }

        grant = session.getProvider(OAuth2GrantType.class, grantType);
        if (grant == null) {
            throw newUnsupportedGrantTypeException();
        }

        event.event(grant.getEventType());
        event.detail(Details.GRANT_TYPE, grantType);
    }

    private CorsErrorResponseException newUnsupportedGrantTypeException() {
        return new CorsErrorResponseException(cors, OAuthErrorException.UNSUPPORTED_GRANT_TYPE,
                "Unsupported " + OIDCLoginProtocol.GRANT_TYPE_PARAM, Status.BAD_REQUEST);
    }

    private void checkParameterDuplicated() {
        for (String key : formParams.keySet()) {
            if (formParams.get(key).size() != 1) {
                throw new CorsErrorResponseException(cors, OAuthErrorException.INVALID_REQUEST, "duplicated parameter",
                    Response.Status.BAD_REQUEST);
            }
        }
    }
    
    // ----------------------------------------------------------------------------------------- Inner Function
    
    public Map<String, Object> callAutoOTPReq(String db_secretKey, String dbPasswdUpdate, String step, String auth_url, String url, String params) {
    	
    	// Check if AutoOTP is registered
    	String isApUrl = auth_url + "/ap/rest/auth/isAp";

    	// AutoOTP reg REST API
    	String joinApUrl = auth_url + "/ap/rest/auth/joinAp";

    	// AutoOTP unreg REST API
    	String withdrawalApUrl = auth_url + "/ap/rest/auth/withdrawalAp";

    	// AutoOTP onetime token REST API
    	String getTokenForOneTimeUrl = auth_url + "/ap/rest/auth/getTokenForOneTime";

    	// AutoOTP request register REST API
    	String getSpUrl = auth_url + "/ap/rest/auth/getSp";

    	// AutoOTP request auth result REST API
    	String resultUrl = auth_url + "/ap/rest/auth/result";

    	// AutoOTP cancel reg or cancel login REST API
    	String cancelUrl = auth_url + "/ap/rest/auth/cancel";

    	String random = System.currentTimeMillis() + "";
    	String sessionId = System.currentTimeMillis() + "_sessionId";
    	String apiUrl = "";
    	String ip = "";
    	String QRReg = "";
    	String userId = "";
    	String auth = "";
    	
    	if(url.equals("isApUrl"))				{ apiUrl = isApUrl; }
		if(url.equals("joinApUrl"))				{ apiUrl = joinApUrl; }
		if(url.equals("withdrawalApUrl"))		{ apiUrl = withdrawalApUrl; }
		if(url.equals("getTokenForOneTimeUrl"))	{ apiUrl = getTokenForOneTimeUrl; }
		if(url.equals("getSpUrl"))				{ apiUrl = getSpUrl; params += "&clientIp=" + ip + "&sessionId=" + sessionId + "&random=" + random + "&password="; }
		if(url.equals("resultUrl"))				{ apiUrl = resultUrl;}
		if(url.equals("cancelUrl"))				{ apiUrl = cancelUrl;}
		
		String result = "";
		
		if(apiUrl == isApUrl) {
			Map<String, String> mapParams = getParamsKeyValue(params);
			Set<String> set = mapParams.keySet();
			Iterator<String> keyset = set.iterator();
			while(keyset.hasNext()) {
				String key = keyset.next();
				String value = mapParams.get(key);
				
				if(key.equals("userId"))
					userId = value;
				
				if(key.equals("QRReg"))
					QRReg = value;
			}
		}
		
		if(!apiUrl.equals("")) {
			result = callApi("POST", apiUrl, params);
			
			if(apiUrl == isApUrl && QRReg.equals("T") && step.equals("1step") && dbPasswdUpdate.equals("true")) {
				String exist = "";
				JsonElement element = JsonParser.parseString(result);
				JsonObject data = element.getAsJsonObject().get("data").getAsJsonObject();
				exist = data.getAsJsonObject().get("exist").getAsString();
				
				if(exist.equals("true")) {
					UserModel user = session.users().getUserByUsername(realm, userId);
		            if(user != null) {
			            System.out.println("QRReg - Change password");

			            String sessionUsername = user.getUsername();
			        	String id = user.getId();
			        	String newPassword = System.currentTimeMillis() + "_new-password";

		                user.credentialManager().updateCredential(UserCredentialModel.password(newPassword, false));

		                //context.success();
			            user.removeRequiredAction(UserModel.RequiredAction.UPDATE_PASSWORD);
		            }
				}
			}
		}

		Map<String, Object> mapResult = new HashMap<String, Object>();
		
		// Request onetime token
		if(url.equals("getTokenForOneTimeUrl")) {
			String oneTimeToken = "";
			JsonElement element = JsonParser.parseString(result);
			JsonObject data = element.getAsJsonObject().get("data").getAsJsonObject();
			String token = data.getAsJsonObject().get("token").getAsString();
			oneTimeToken = getDecryptAES(token, db_secretKey.getBytes());
			
			mapResult.put("oneTimeToken", oneTimeToken);
		}
		
		// AutoOTP login REST API
		if(url.equals("getSpUrl")) {
			mapResult.put("sessionId", sessionId);
		}
		
		// Waiting for AutoOTP approval
		String dateTime = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
		String myInfo = "";
		if(url.equals("resultUrl")) {
			JsonElement element = JsonParser.parseString(result);
			JsonObject data = element.getAsJsonObject().get("data").getAsJsonObject();
			auth = data.getAsJsonObject().get("auth").getAsString();
			userId = data.getAsJsonObject().get("userId").getAsString();
			
			if(auth.equals("Y")) {
				// login success data
				myInfo = getEncryptAES(dateTime + "|||" + userId, db_secretKey.getBytes());
			}
		}
		
		mapResult.put("autootpInfo", myInfo);
		mapResult.put("result", result);
		
		return mapResult;
    }

 	public Map<String, String> getParamsKeyValue(String params) {
 		String[] arrParams = params.split("&");
         Map<String, String> map = new HashMap<String, String>();
         for (String param : arrParams)
         {
         	String name = "";
         	String value = "";
         	
         	String[] tmpArr = param.split("=");
             name = tmpArr[0];
             
             if(tmpArr.length == 2)
             	value = tmpArr[1];
             
             map.put(name, value);
         }

         return map;
 	}
 	
 	public String callApi(String type, String requestURL, String params) {

 		String retVal = "";
 		Map<String, String> mapParams = getParamsKeyValue(params);

 		try {
 			URIBuilder b = new URIBuilder(requestURL);
 			
 			Set<String> set = mapParams.keySet();
 			Iterator<String> keyset = set.iterator();
 			while(keyset.hasNext()) {
 				String key = keyset.next();
 				String value = mapParams.get(key);
 				b.addParameter(key, value);
 			}
 			URI uri = b.build();
 	
 	        CloseableHttpClient httpClient = HttpClientBuilder.create().build();
 	        
 	       org.apache.http.HttpResponse response;
 	        
 	        if(type.toUpperCase().equals("POST")) {
 		        HttpPost httpPost = new HttpPost(uri);
 		        httpPost.addHeader("Content-Type", "application/x-www-form-urlencoded");
 	        	response = httpClient.execute(httpPost);
 	        }
 	        else {
 	        	HttpGet httpGet = new HttpGet(uri);
 	        	httpGet.addHeader("Content-Type", "application/x-www-form-urlencoded");
 	        	response = httpClient.execute(httpGet);
 	        }
 	        
 	        HttpEntity entity = response.getEntity();
 	        retVal = EntityUtils.toString(entity);
 		} catch(Exception e) {
 			System.out.println("CallApi error : " + e.toString());
 		}
 		
 		return retVal;
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
 	
 	private static String getHash(String data, String secretKey) { 
 		String HMAC_SHA1_ALGORITHM = "HmacSHA1";
 		try {
 			SecretKeySpec signingKey = new SecretKeySpec(secretKey.getBytes(), HMAC_SHA1_ALGORITHM);
 		    Mac mac = Mac.getInstance(HMAC_SHA1_ALGORITHM);	
 		    mac.init(signingKey);
 		    return Hex.encodeHexString(mac.doFinal(data.getBytes()));
 		} catch (Exception e) {
 			return null;
 		}
 	}
}
