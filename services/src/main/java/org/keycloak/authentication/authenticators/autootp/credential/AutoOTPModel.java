/*
 * Copyright 2023 eStorm Inc
 */

package org.keycloak.authentication.authenticators.autootp.credential;

import org.keycloak.common.util.Time;
import org.keycloak.credential.CredentialModel;
import org.keycloak.authentication.authenticators.autootp.credential.dto.AutoOTPData;
import org.keycloak.util.JsonSerialization;

import java.io.IOException;

/**
 * @author <a href="mailto:aaa@bbb.ccc">xXx xxXXxx</a>
 * @version $Revision: 1 $
 */
public class AutoOTPModel extends CredentialModel {
    public static final String TYPE = "AUTOOTP";

    private final AutoOTPData autoOTPData;

    private AutoOTPModel(AutoOTPData autoOTPData) {
        this.autoOTPData = autoOTPData;
    }
    
    public static AutoOTPModel createFromCredentialModel(CredentialModel credentialModel){
        try {
            AutoOTPData autoOTPData = JsonSerialization.readValue(credentialModel.getCredentialData(), AutoOTPData.class);

            AutoOTPModel autoOTPModel = new AutoOTPModel(autoOTPData);
            /*
            autoOTPModel.setUserLabel(credentialModel.getUserLabel());
            autoOTPModel.setCreatedDate(credentialModel.getCreatedDate());
            autoOTPModel.setType(TYPE);
            autoOTPModel.setId(credentialModel.getId());
            autoOTPModel.setSecretData(credentialModel.getSecretData());
            autoOTPModel.setCredentialData(credentialModel.getCredentialData());
            */
            
            return autoOTPModel;
        } catch (IOException e){
            throw new RuntimeException(e);
        }
    }

    public AutoOTPData getAutoOTPData() {
        return autoOTPData;
    }

    private void fillCredentialModelFields(){
    	/*
        try {
            setCredentialData(JsonSerialization.writeValueAsString(credentialData));
            setSecretData(JsonSerialization.writeValueAsString(secretData));
            setType(TYPE);
            setCreatedDate(Time.currentTimeMillis());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        */
    }

}
