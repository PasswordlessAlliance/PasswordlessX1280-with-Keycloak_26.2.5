/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.admin.client.autootp;

import org.keycloak.representations.AccessTokenResponse;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.MultivaluedMap;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 */
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_FORM_URLENCODED)
public interface AutoOTPService {

    @POST
    @Path("/realms/{realm}/protocol/openid-connect/autootp")
    AccessTokenResponse grantToken(@PathParam("realm") String realm, MultivaluedMap<String, String> map);

    @POST
    @Path("/realms/{realm}/protocol/openid-connect/autootp")
    AccessTokenResponse refreshToken(@PathParam("realm") String realm, MultivaluedMap<String, String> map);

}
