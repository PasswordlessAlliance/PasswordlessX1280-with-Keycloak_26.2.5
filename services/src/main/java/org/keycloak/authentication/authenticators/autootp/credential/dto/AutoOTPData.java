/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.authentication.authenticators.autootp.credential.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 * @version $Revision: 1 $
 */
public class AutoOTPData {

    private final String corpId;		// Applicatino ID

    @JsonCreator
    public AutoOTPData(@JsonProperty("corpId") String corpId) {
        this.corpId = corpId;
    }

    public String getCorpId() {
        return corpId;
    }
}
