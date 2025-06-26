import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation";
import {
  ActionGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  PageSection,
  FormGroup,
  Radio,
  Select,
  SelectOption,
  Popover,
  Text,
  TextContent,
} from "@patternfly/react-core";

// import { useEffect } from "react";

import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SelectControl, TextControl, SelectVariant } from "@keycloak/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import { FormAccess } from "../../components/form/FormAccess";
import { useRealm } from "../../context/realm-context/RealmContext";
import { convertFormValuesToObject, convertToFormValues } from "../../util";
import { convertAttributeNameToForm } from "../../util";

import { QuestionCircleIcon } from "@patternfly/react-icons";

import { useEffect, useState } from "react";
import {
  HelpItem,
  FormPanel,
  PasswordControl,
  useHelp,
  SwitchControl
} from "@keycloak/keycloak-ui-shared";

import { useConfirmDialog } from "../../components/confirm-dialog/ConfirmDialog";

import "./autootp-policy.css";

const CIBA_BACKHANNEL_TOKEN_DELIVERY_MODES = ["poll", "ping"] as const;
const CIBA_EXPIRES_IN_MIN = 10;
const CIBA_EXPIRES_IN_MAX = 600;
const CIBA_INTERVAL_MIN = 0;
const CIBA_INTERVAL_MAX = 600;

const AUTOOTP_AUTHENTICATION_STEP = ["1step", "2step"] as const;
const AUTOOTP_PASSWD_UPDATE = ["true", "false"] as const;


type AutoOTPPolicyProps = {
  realm: RealmRepresentation;
  realmUpdated: (realm: RealmRepresentation) => void;
};

type FormFields = Omit<
  RealmRepresentation,
  "clients" | "components" | "groups"
>;

export const AutoOTPPolicy = ({ realm, realmUpdated }: AutoOTPPolicyProps) => {
  const { adminClient } = useAdminClient();

  const { t } = useTranslation();
  
  const form = useForm<FormFields>({ mode: "onChange" });
  const selectControl = useForm<FormFields>({ mode: "onChange" });

  const { enabled } = useHelp();
  
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isValid, isDirty },
  } = useForm<FormFields>({ mode: "onChange" });
  
  const stepType = useWatch({
    name: convertAttributeNameToForm<FormFields>("attributes.autootpAuthenticationStep"),
    control: form.control,
    defaultValue: AUTOOTP_AUTHENTICATION_STEP[0]
  });
  
  
  const { realm: realmName } = useRealm();
  const { addAlert, addError } = useAlerts();
  
  const [isBtnApplicationSettingSave, setIsBtnApplicationSettingSave] = useState(false);

  const [isBtnserverProgressReload, setIsBtnserverProgressReload] = useState(true);
  const [isBtnresendRegistrationEmail, setIsBtnresendRegistrationEmail] = useState(true);
  const [isBtnresendSetupFileEmail, setIsBtnresendSetupFileEmail] = useState(true);

  const [isTextautootpServerSettingAppServerKey, setIsTextautootpServerSettingAppServerKey] = useState(true);
  const [isTextautootpServerSettingAuthServerDomain, setIsTextautootpServerSettingAuthServerDomain] = useState(true);
  const [isSelectBoxPasswdUpdate, setIsSelectBoxPasswdUpdate] = useState(true);

  const [isBtnApplicationServerSave, setIsBtnApplicationServerSave] = useState(true);
  const [isBtnApplicationServerClear, setIsBtnApplicationServerClear] = useState(true);

  const [autootpAppSettingStepOpen, setAutootpAppSettingStepOpen] = useState(false);

  const setupForm = (realm: RealmRepresentation) =>
    convertToFormValues(realm, form.setValue);

   useEffect(() => {
    setupForm(realm);

    const autootpReturnDomainValidationToken = form.getValues("attributes.autootpReturnDomainValidationToken"); 
    const autootpReturnServerProgressStatus = form.getValues("attributes.autootpReturnServerProgressStatus"); 
  
    if(autootpReturnDomainValidationToken != undefined && autootpReturnDomainValidationToken.length > 0) { 
      setIsBtnApplicationSettingSave(true);
      setIsBtnserverProgressReload(false);
    } else { 
      setIsBtnApplicationSettingSave(false);
      setIsBtnserverProgressReload(true);
    }  
  
    setIsBtnresendRegistrationEmail(true);
    setIsBtnresendSetupFileEmail(true);
    
    setIsTextautootpServerSettingAppServerKey(true);
    setIsTextautootpServerSettingAuthServerDomain(true);
	setIsSelectBoxPasswdUpdate(true);
	    
    setIsBtnApplicationServerSave(true);
    setIsBtnApplicationServerClear(true); 

    if(autootpReturnServerProgressStatus != undefined && autootpReturnServerProgressStatus.length > 0) {
      switch(autootpReturnServerProgressStatus){
        case "01" :
          setIsBtnresendRegistrationEmail(false);
          setIsBtnresendSetupFileEmail(true);
          break;
        
        case "02" :
          setIsBtnresendRegistrationEmail(true);
          setIsBtnresendSetupFileEmail(true);
          break;
  
        case "10" :
          setIsBtnserverProgressReload(true);
          setIsBtnresendRegistrationEmail(true);
          setIsBtnresendSetupFileEmail(false);
          setIsTextautootpServerSettingAppServerKey(false);
          setIsTextautootpServerSettingAuthServerDomain(false);
          setIsSelectBoxPasswdUpdate(false);
          setIsBtnApplicationServerSave(false);
          setIsBtnApplicationServerClear(false); 
          break;
        default :
          setIsBtnresendRegistrationEmail(true);
          setIsBtnresendSetupFileEmail(true);
          break;
                
      } 
  
    } else {
      setIsBtnresendRegistrationEmail(true);
      setIsBtnresendSetupFileEmail(true);
      
    }
  
  

  }, []);




  const onDeleteSubmit = async (formValues: FormFields) => {
    try {

      formValues.attributes = undefined;

      await adminClient.realms.update(
        { realm: realmName },
        convertFormValuesToObject(formValues)
        );
        
        const updatedRealm = await adminClient.realms.findOne({
          realm: realmName,
          
        });
      realmUpdated(updatedRealm!);
      setupForm(updatedRealm!);
      addAlert(t("updateAutoOTPSuccess"), AlertVariant.success);
      window.location.reload();
      
    } catch (error) {
      addError("updateAutoOTPError", error);
    } finally {

    }
  };


  const onDelete = async (formValues: FormFields) => {
    
    try {

      let paramStr = "/auth/realms/master/protocol/openid-connect/autootp-policy-api"; 
      let returnCode = "";

      paramStr = paramStr + "?urlKey=kcAutootpDeleteKey";
      paramStr = paramStr + "&appID="+form.getValues("attributes.autootpAppSettingappID");
      let delkey = "";

      fetch(paramStr, {
          method : "GET"   
      }).then(res=>res.json()).then(res=>{
        let error = "";
        if(res.result != ''){
            let objKey = JSON.parse(res.result);
            let code = objKey.code;
            returnCode = "" + code;
            switch(objKey.code){
              case undefined :
                error = "Server progress Delete error~! ["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "000.0" :
                  delkey = objKey.data.delkey;

                  let paramStr = "/auth/realms/master/protocol/openid-connect/autootp-policy-api"; 
                  let returnCode = "";
                  
                  paramStr = paramStr + "?urlKey=kcAutootpDelete";
                  paramStr = paramStr + "&delkey="+delkey;
									paramStr = paramStr + "&appID="+form.getValues("attributes.autootpAppSettingappID");
                  
                  fetch(paramStr, {
                      method : "GET"   
                  }).then(res=>res.json()).then(res=>{
                      if(res.result != ''){
                        let objDel = JSON.parse(res.result);
                        let code = objDel.code;
                        returnCode = "" + code;
                        switch(objDel.code){
                          case undefined :
                            error = t("autootpApiResponseCodeUndefined")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "000.0" :
                            onDeleteSubmit({...realm});                          
                            break;
                  
                          case "000.1" :
                            error = t("autootpApiResponseCode000.1")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "000.2" :
                            error = t("autootpApiResponseCode000.2")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "100.1" :
                            error = t("autootpApiResponseCode100.1")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "100.2" :
                            error = t("autootpApiResponseCode100.2")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "100.3" :
                            error = t("autootpApiResponseCode100.3")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "100.4" :
                            error = t("autootpApiResponseCode100.4")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "100.5" :
                            error = t("autootpApiResponseCode100.5")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                          case "100.6" :
                            error = t("autootpApiResponseCode100.6")+"["+code+"]";
                            alert(error);
                            onDeleteSubmit({...realm});
                            break;
                          default : 
                            error = t("autootpApiResponseCodeDefault")+"["+code+"]";
                            addError(t("updateAutoOTPError"),error);
                            break;
                        }

                      } else {
                        error = t("autootpApiConnectError");
                        addError(t("updateAutoOTPError"),error);
                      }                    
                    })
                break;

              case "000.1" :
                error = t("autootpApiResponseCode000.1")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "000.2" :
                error = t("autootpApiResponseCode000.2")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.1" :
                error = t("autootpApiResponseCode100.1")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.2" :
                error = t("autootpApiResponseCode100.2")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.3" :
                error = t("autootpApiResponseCode100.3")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.4" :
                error = t("autootpApiResponseCode100.4")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.5" :
                error = t("autootpApiResponseCode100.5")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.6" :
                error = t("autootpApiResponseCode100.6")+"["+code+"]";
                alert(error);
                onDeleteSubmit({...realm});
                break;
              default : 
                error = t("autootpApiResponseCodeDefault")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
            }

          } else {
            error = t("autootpApiConnectError");
            addError(t("updateAutoOTPError"),error);
          }                    

      })
    
    } catch (error) {
      addError(t("updateAutoOTPError"), error);
    }
  };
 


  const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
    titleKey: t("autootpDeleteConfirmTitle"),
    messageKey: t("autootpDeleteConfirmDialog"),
    continueButtonLabel: "delete",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: async () => {
      try {
        onDelete({...realm});
      } catch (error) {
        addError(t("updateAutoOTPError"), error);
      }
    },
  });







  const onSubmit = async (formValues: FormFields) => {
    try {
      await adminClient.realms.update(
        { realm: realmName },
        convertFormValuesToObject(formValues),
      );

      const updatedRealm = await adminClient.realms.findOne({
        realm: realmName,
      });

      realmUpdated(updatedRealm!);
      setupForm(updatedRealm!);
      addAlert(t("updateAutoOTPSuccess"), AlertVariant.success);
    } catch (error) {
      addError(t("updateAutoOTPError"), error);
    }
  };

  const onApplicationSettingSave = async () => {
    try {
      let paramStr = "/auth/realms/master/protocol/openid-connect/autootp-policy-api"; 
      let returnCode = "";
  
      paramStr = paramStr + "?urlKey=kcAutootpAppSave";
      paramStr = paramStr + "&appName="+form.getValues("attributes.autootpAppSettingName");
      paramStr = paramStr + "&appDomain="+form.getValues("attributes.autootpAppSettingDomain");
      paramStr = paramStr + "&appIp="+form.getValues("attributes.autootpAppSettingIpAddress");
      paramStr = paramStr + "&authDomain="+form.getValues("attributes.autootpAppSettingProxyServerDomain");
      paramStr = paramStr + "&mail="+form.getValues("attributes.autootpAppSettingEmail");

      fetch(paramStr, {
          method : "GET"   
      }).then(res=>res.json()).then(res=>{
          let error = "";

          if(res.result != ''){
            let objSave = JSON.parse(res.result);
            let code = objSave.code;

            returnCode = "" + code;

            switch(objSave.code){
              case undefined :
                error = t("autootpApiResponseCodeUndefined")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "000.0" :
                setIsBtnApplicationSettingSave(true);
    
                setIsBtnserverProgressReload(false);
                setIsBtnresendRegistrationEmail(true);
                setIsBtnresendSetupFileEmail(true);
          
                setIsTextautootpServerSettingAppServerKey(true);
                setIsTextautootpServerSettingAuthServerDomain(true);
                setIsSelectBoxPasswdUpdate(true);
          
                setIsBtnApplicationServerSave(true);
                setIsBtnApplicationServerClear(true);

                if(objSave.data.appID == undefined) {
                  error = t("autootpApiResponseCodeAppIDError")+"["+code+"]";
                  addError(t("updateAutoOTPError"),error);
                  return;
                } else {
                  form.setValue("attributes.autootpAppSettingappID",objSave.data.appID);
                }
                
                if(objSave.data.dnsTxt == undefined) {
                  error = t("autootpApiResponseCodednsTxtError")+"["+code+"]";
                  addError(t("updateAutoOTPError"),error);
                  return;
                } else {
                  form.setValue("attributes.autootpReturnDomainValidationToken",objSave.data.dnsTxt);
                }
                              
                form.setValue("attributes.autootpReturnServerProgress",t("autootpReturnServerProgressSave"));

                form.handleSubmit(onSubmit)();

                break;
  
              case "000.1" :
                error = t("autootpApiResponseCode000.1")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "000.2" :
                error = t("autootpApiResponseCode000.2")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.1" :
                error = t("autootpApiResponseCode100.1")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.2" :
                error = t("autootpApiResponseCode100.2")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.3" :
                error = t("autootpApiResponseCode100.3")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.4" :
                error = t("autootpApiResponseCode100.4")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.5" :
                error = t("autootpApiResponseCode100.5")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.6" :
                error = t("autootpApiResponseCode100.6")+"["+code+"]";
                alert(error);
                onDeleteSubmit({...realm});
                break;
              default : 
                error = t("autootpApiResponseCodeDefault")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              }
        
            } else {
              error = t("autootpApiConnectError");
              addError(t("updateAutoOTPError"),error);
            }                    

        });  
    
    } catch (error) {
      addError(t("updateAutoOTPError"), error);
    }
  };

  const onServerProgressReload = async (formValues: FormFields) => {
    try {
      
      let paramStr = "/auth/realms/master/protocol/openid-connect/autootp-policy-api"; 
      let returnCode = "";

      paramStr = paramStr + "?urlKey=kcDevcenterReload";
      paramStr = paramStr + "&appID="+ form.getValues("attributes.autootpAppSettingappID");
      
      fetch(paramStr, {
          method : "GET"   
      }).then(res=>res.json()).then(res=>{
          let error = "";

          if(res.result != ''){
            let objReload = JSON.parse(res.result);
            var code = objReload.code;
            returnCode = "" + code;

            switch(objReload.code){
              case undefined :
                error = t("autootpApiResponseCodeUndefined")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                form.setValue("attributes.autootpReturnServerProgress",error);
                break;
              case "000.0" :
                if(objReload.data.status == undefined || objReload.data.status.length <= 0) {
                  error = t("autootpApiResponseCodeUndefined")+"["+objReload.data.status+"]";
                  addError(t("updateAutoOTPError"),error);
                  form.setValue("attributes.autootpReturnServerProgress",error);
                  break;
                } else {
                  switch(objReload.data.status){
                    case "01" :
                      form.setValue("attributes.autootpReturnServerProgress",t("autootpReturnServerProgress01"));
                      form.setValue("attributes.autootpReturnServerProgressStatus", objReload.data.status);
                      setIsBtnresendRegistrationEmail(false);
                      setIsBtnresendSetupFileEmail(true);
                      break;
                    case "02" :
                      form.setValue("attributes.autootpReturnServerProgress",t("autootpReturnServerProgress02"));
                      form.setValue("attributes.autootpReturnServerProgressStatus", objReload.data.status);
                      setIsBtnresendRegistrationEmail(true);
                      setIsBtnresendSetupFileEmail(true);
                      break;
                    case "10" :
                      form.setValue("attributes.autootpReturnServerProgress",t("autootpReturnServerProgress10"));
                      form.setValue("attributes.autootpReturnServerProgressStatus", objReload.data.status);
                      setIsBtnserverProgressReload(true);
                      setIsBtnresendRegistrationEmail(true);
                      setIsBtnresendSetupFileEmail(false);
                      
                      setIsTextautootpServerSettingAppServerKey(false);
                      setIsTextautootpServerSettingAuthServerDomain(false);
                      setIsSelectBoxPasswdUpdate(false);
                
                      setIsBtnApplicationServerSave(false);
                      setIsBtnApplicationServerClear(false);
                      break;
                    case "11" :
                      form.setValue("attributes.autootpReturnServerProgress",t("autootpReturnServerProgress11"));
                      break;
                    default :
                      form.setValue("attributes.autootpReturnServerProgress","Exception status ["+objReload.data.status+"]");
                      break;
                  }
                  addAlert(t("autootpServerProgressReloadSuccess"), AlertVariant.success);
                }
                form.handleSubmit(onSubmit)();
                break;

              case "000.1" :
                error = t("autootpApiResponseCode000.1")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "000.2" :
                error = t("autootpApiResponseCode000.2")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.1" :
                error = t("autootpApiResponseCode100.1")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.2" :
                error = t("autootpApiResponseCode100.2")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.3" :
                error = t("autootpApiResponseCode100.3")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.4" :
                error = t("autootpApiResponseCode100.4")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.5" :
                error = t("autootpApiResponseCode100.5")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;
              case "100.6" :
                error = t("autootpApiResponseCode100.6")+"["+code+"]";
                alert(error);
                onDeleteSubmit({...realm});
                break;
              default : 
              error = t("autootpApiResponseCodeDefault")+"["+code+"]";
                addError(t("updateAutoOTPError"),error);
                break;

            }

          } else {
            error = t("autootpApiConnectError");
            addError(t("updateAutoOTPError"),error);
          }                    

      });              
      
    } catch (error) {
      addError(t("updateAutoOTPError"), error);
    }
  };

  const onResendRegistrationEmail = async (formValues: FormFields) => {
    try {
    let paramStr = "/auth/realms/master/protocol/openid-connect/autootp-policy-api"; 
    let returnCode = "";

    paramStr = paramStr + "?urlKey=kcDevcenterRemail";
    paramStr = paramStr + "&appID="+ form.getValues("attributes.autootpAppSettingappID");
    
    fetch(paramStr, {
        method : "GET"   
    }).then(res=>res.json()).then(res=>{
        let error = "";

        if(res.result != ''){
        
          let objReload = JSON.parse(res.result);
          let code = objReload.code;
          returnCode = "" + code;
          switch(objReload.code){
            case undefined :
              error = t("autootpApiResponseCodeUndefined")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "000.0" :
              addAlert(t("autootpServerEmailResendSuccess"), AlertVariant.success);
              break;

            case "000.1" :
              error = t("autootpApiResponseCode000.1")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "000.2" :
              error = t("autootpApiResponseCode000.2")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.1" :
              error = t("autootpApiResponseCode100.1")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.2" :
              error = t("autootpApiResponseCode100.2")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.3" :
              error = t("autootpApiResponseCode100.3")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.4" :
              error = t("autootpApiResponseCode100.4")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.5" :
              error = t("autootpApiResponseCode100.5")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.6" :
              error = t("autootpApiResponseCode100.6")+"["+code+"]";
              alert(error);
              onDeleteSubmit({...realm});
              break;
            default : 
              error = t("autootpApiResponseCodeDefault")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            }
          } else {
            error = t("autootpApiConnectError");
            addError(t("updateAutoOTPError"),error);
          }                    
      });  
    
    } catch (error) {
      addError(t("updateAutoOTPError"), error);
    }
  };

  const onResendSettingsEmail = async (formValues: FormFields) => {
    try {
    let paramStr = "/auth/realms/master/protocol/openid-connect/autootp-policy-api"; 
    let returnCode = "";

    paramStr = paramStr + "?urlKey=kcDevcenterRemailSetting";
    paramStr = paramStr + "&appID="+ form.getValues("attributes.autootpAppSettingappID");
    
    fetch(paramStr, {
        method : "GET"   
    }).then(res=>res.json()).then(res=>{
        let error = "";

        if(res.result != ''){
        
          let objReload = JSON.parse(res.result);
          let code = objReload.code;
          returnCode = "" + code;
          switch(objReload.code){
            case undefined :
              error = t("autootpApiResponseCodeUndefined")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "000.0" :
              addAlert(t("autootpResendSettingsEmailSuccess"), AlertVariant.success);
              break;

            case "000.1" :
              error = t("autootpApiResponseCode000.1")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "000.2" :
              error = t("autootpApiResponseCode000.2")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.1" :
              error = t("autootpApiResponseCode100.1")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.2" :
              error = t("autootpApiResponseCode100.2")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.3" :
              error = t("autootpApiResponseCode100.3")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.4" :
              error = t("autootpApiResponseCode100.4")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.5" :
              error = t("autootpApiResponseCode100.5")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            case "100.6" :
              error = t("autootpApiResponseCode100.6")+"["+code+"]";
              alert(error);
              onDeleteSubmit({...realm});
              break;
            default : 
              error = t("autootpApiResponseCodeDefault")+"["+code+"]";
              addError(t("updateAutoOTPError"),error);
              break;
            }
          } else {
            error = t("autootpApiConnectError");
            addError(t("updateAutoOTPError"),error);
          }                    
      });  
    } catch (error) {
      addError(t("updateAutoOTPError"), error);
    }
  };

useEffect(() => {
//    console.log("stepType:", stepType);
//    console.log("isBtnApplicationSettingSave:", isBtnApplicationSettingSave);
},[stepType,isBtnApplicationSettingSave]);


  return (
    <PageSection variant="light">

      <DeleteConfirm />


      <FormProvider {...form}>

	      {enabled && (
	        <Popover bodyContent={t(`autootpPolicyFormHelp`)}>
	          <TextContent className="keycloak__section_intro__help">
	            <Text>
	              <QuestionCircleIcon /> {t("autootpIntro")}
	            </Text>
	          </TextContent>
	        </Popover>
	      )}

          <FormPanel title={t("autootpApplicationRegistration")} className="kc-autootp-template">

		    <FormAccess
		      role="manage-realm"
		      isHorizontal
		      onSubmit={form.handleSubmit(onSubmit)}
		    >
        
	          <TextControl
	            name="attributes.autootpAppSettingName"
	            label={t("autootpAppSettingName")}
	            labelIcon={t("autootpAppSettingNameHelp")}
	            isDisabled={isBtnApplicationSettingSave}
	            placeholder={t("autootpAppSettingNamePlaceholder")}
				rules={{ required: t("required") }}
	          />
	
	          <TextControl
	            name="attributes.autootpAppSettingDomain"
	            label={t("autootpAppSettingDomain")}
	            labelIcon={t("autootpAppSettingDomainHelp")}
	            isDisabled={isBtnApplicationSettingSave}
	            placeholder={t("autootpAppSettingDomainPlaceholder")}
				rules={{ required: t("required") }}
	          />
	          
	          <TextControl
	            name="attributes.autootpAppSettingIpAddress"
	            label={t("autootpAppSettingIpAddress")}
	            labelIcon={t("autootpAppSettingIpAddressHelp")}
	            isDisabled={isBtnApplicationSettingSave}
	            placeholder={t("autootpAppSettingIpAddressPlaceholder")}
				rules={{ required: t("required") }}
	          />
	
	          <TextControl
	            name="attributes.autootpAppSettingProxyServerDomain"
	            label={t("autootpAppSettingProxyServerDomain")}
	            labelIcon={t("autootpAppSettingProxyServerDomainHelp")}
	            isDisabled={isBtnApplicationSettingSave}
	            placeholder={t("autootpAppSettingProxyServerDomainPlaceholder")}
				rules={{ required: t("required") }}
	          />
	
	          <TextControl
	            name="attributes.autootpAppSettingEmail"
	            label={t("autootpAppSettingEmail")}
	            labelIcon={t("autootpAppSettingEmailHelp")}
//				readOnly={isBtnApplicationSettingSave}
	            isDisabled={isBtnApplicationSettingSave}
	            placeholder={t("autootpAppSettingEmailPlaceholder")}
				rules={{ required: t("required") }}
	          />
	          
	        
	          <ActionGroup>
		          <Button
		            data-testid="save"
		            variant="primary"
		            isDisabled={ !form.formState.isValid || !form.formState.isDirty || isBtnApplicationSettingSave} 
		            
		            onClick={() => {
		              onApplicationSettingSave();
		            }}
		          >
		            {t("save")}
		          </Button>
		          <Button
		            data-testid="delete"
		            variant="danger"
		            isDisabled={ !isBtnApplicationSettingSave } 
		            onClick={() => {
		              //onDelete({...realm});
		              toggleDeleteDialog();
		            }}
		          >
		            {t("delete")}
		          </Button>
	          </ActionGroup>

 

            </FormAccess>
          </FormPanel>
        
        
        
       	  <FormPanel title={t("autootpCheckRegistrationProgress")} className="kc-autootp-template">        
		    <FormAccess
		      role="manage-realm"
		      isHorizontal
		      onSubmit={form.handleSubmit(onSubmit)}
		    >
		    
	          <TextControl
	            name="attributes.autootpReturnDomainValidationToken"
	            label={t("autootpReturnDomainValidationToken")}
	            labelIcon={t("autootpReturnDomainValidationTokenHelp")}
	            isDisabled
	          />
	
	          <TextControl
	            name="attributes.autootpReturnServerProgress"
	            label={t("autootpReturnServerProgress")}
	            labelIcon={t("autootpReturnServerProgressHelp")}
	            isDisabled
//	            readOnly
	          />		    
		    
	          <input type="hidden" id="autootpAppSettingappID" data-testid="autootpAppSettingappID" {...register("attributes.autootpAppSettingappID")} />
	          <input type="hidden" id="autootpReturnServerProgressStatus" data-testid="autootpReturnServerProgressStatus" {...register("attributes.autootpReturnServerProgressStatus")} />

	          <ActionGroup>
			  <Button
			    data-testid="serverprogressreload"
			    type="button"
			    variant="secondary"
			    isDisabled={isBtnserverProgressReload}
			    onClick={() => onServerProgressReload({ ...realm })}
			  >
			    {t("autootpServerProgressReload")}
			  </Button>
			  <Button
			    data-testid="resendregistrationemail"
			    type="button"
			    variant="secondary"
			    isDisabled={isBtnresendRegistrationEmail}
			    onClick={() => onResendRegistrationEmail({ ...realm })}
			  >
			    {t("autootpResendRegistrationEmail")}
			  </Button>
			  <Button
			    data-testid="resendsettingsemail"
			    type="button"
			    variant="secondary"
			    isDisabled={isBtnresendSetupFileEmail}
			    onClick={() => onResendSettingsEmail({ ...realm })}
			  >
			    {t("autootpResendSettingEmail")}
			  </Button>		    
	          </ActionGroup>
		    </FormAccess>
          </FormPanel>


          <FormPanel title={t("autootpServerSettingTitle")} className="kc-autootp-template">
		    <FormAccess
		      role="manage-realm"
		      isHorizontal
		      onSubmit={form.handleSubmit(onSubmit)}
		    >
		    


	          <SelectControl
	            name={convertAttributeNameToForm("attributes.autootpAuthenticationStep")}
	            label={t("autootpAuthenticationStep")}
	            labelIcon={t("autootpAuthenticationStepHelp")}
	            options={AUTOOTP_AUTHENTICATION_STEP.map((mode) => ({
	              key: mode,
	              value: t(`autootpAppSettingSteps.${mode}`),
	            }))}
				//rules={{ required: t("required") }}
				control={form.control}
				controller={{ defaultValue: AUTOOTP_AUTHENTICATION_STEP[0] }}

	          />

	          {stepType === AUTOOTP_AUTHENTICATION_STEP[0] && (
		          <SelectControl
		            name={convertAttributeNameToForm("attributes.autootpPasswdUpdate")}
		            label={t("autootpPasswdUpdate")}
		            labelIcon={t("autootpPasswdUpdateHelp")}
		            options={AUTOOTP_PASSWD_UPDATE.map((mode) => ({
		              key: mode,
		              value: t(`autootpPasswdUpdate.${mode}`),
		            }))}
					rules={{ required: t("required") }}
					control={form.control}
					controller={{ defaultValue: AUTOOTP_PASSWD_UPDATE[0] }}
	
		          />
	          )}
	          {stepType === AUTOOTP_AUTHENTICATION_STEP[1] && (
					<></>
	          )}

  		    
	          <TextControl
	            name="attributes.autootpServerSettingAppServerKey"
	            label={t("autootpServerSettingAppServerKey")}
	            labelIcon={t("autootpServerSettingAppServerKeyHelp")}
	            isDisabled={isTextautootpServerSettingAppServerKey}
	          />
	
	          <TextControl
	            name="attributes.autootpServerSettingAuthServerDomain"
	            label={t("autootpServerSettingAuthServerDomain")}
	            labelIcon={t("autootpServerSettingAuthServerDomainHelp")}
	            isDisabled={isTextautootpServerSettingAuthServerDomain}
	          />		    
		    
	          <ActionGroup>
          <Button
            data-testid="save"
            variant="primary"
            type="submit"
            isDisabled={isBtnApplicationServerSave}
          >
            {t("save")}
          </Button>

          <Button
            data-testid="clear"
            type="button"
            variant="secondary"
            isDisabled={isBtnApplicationServerClear}
            onClick={() => setupForm({ ...realm })}
          >
            {t("clear")}
          </Button>		    
	          </ActionGroup>
		    </FormAccess>
          </FormPanel>

        
      </FormProvider>
    </PageSection>
  );
};
