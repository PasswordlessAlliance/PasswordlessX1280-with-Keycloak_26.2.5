<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<#import "social-providers.ftl" as identityProviders>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <div id="kc-form">
          <div id="kc-form-wrapper">
            <#if realm.password>
                <input type="hidden" id="browser_flow_id" name="browser_flow_id" value="${realm.browserFlowAlias!''}">
                <input type="hidden" id="submit_url" name="submit_url" value="${url.loginAction}">
                <form id="kc-form-login" name="kc-form-login" onsubmit="" action="" method="post">
                    <input type="hidden" id="base_url" name="base_url" value="${client.baseUrl!''}">
                    <input type="hidden" id="page_set" name="page_set" value="login">
                    <input type="hidden" id="page_config" name="page_config" value="">
                    <input type="hidden" id="login_realm" name="login_realm" value="${realm.name!''}">
                    <input type="hidden" id="login_client" name="login_client" value="${client.name!''}">
                    <input type="hidden" id="login_clientId" name="login_clientId" value="${client.clientId!''}">
                    <input type="hidden" id="login_step" name="login_step" value="${realm.attributeautootpAuthenticationStep!''}">
                    <input type="hidden" id="login_flow" name="login_flow" value="">
                    <input type="hidden" id="autootp_info" name="autootp_info" value="">

					<!-- message -->
                    <input type="hidden" id="backToLogin" name="backToLogin" value='${msg("backToLogin")}'>
                    <input type="hidden" id="backToApplication" name="backToApplication" value='${msg("backToApplication")}'>
                    
                    <input type="hidden" id="AutoOTPSignIn" name="AutoOTPSignIn" value='${msg("AutoOTPSignIn")}'>
                    <input type="hidden" id="HomeURLnotRegistered" name="HomeURLnotRegistered" value='${msg("HomeURLnotRegistered")}'>
                    <input type="hidden" id="AutoOTPEmailSent" name="AutoOTPEmailSent" value='${msg("AutoOTPEmailSent")}'>
                    <input type="hidden" id="doTryAgain" name="doTryAgain" value='${msg("doTryAgain")}'>
                    <input type="hidden" id="FailedUnregister" name="FailedUnregister" value='${msg("FailedUnregister")}'>
                    <input type="hidden" id="AutoOTPQRExpired" name="AutoOTPQRExpired" value='${msg("AutoOTPQRExpired")}'>
                    <input type="hidden" id="RegistrationCompleted" name="RegistrationCompleted" value='${msg("RegistrationCompleted")}'>
                    <input type="hidden" id="UnregistratedCompleted" name="UnregistratedCompleted" value='${msg("UnregistratedCompleted")}'>
                    <input type="hidden" id="AutoOTPAccountStopped" name="AutoOTPAccountStopped" value='${msg("AutoOTPAccountStopped")}'>
                    <input type="hidden" id="ContactYourAccountManager" name="ContactYourAccountManager" value='${msg("ContactYourAccountManager")}'>
                    <input type="hidden" id="ThisAccountNotRegistered" name="ThisAccountNotRegistered" value='${msg("ThisAccountNotRegistered")}'>
                    <input type="hidden" id="RegisterAutoOTPAccountFirst" name="RegisterAutoOTPAccountFirst" value='${msg("RegisterAutoOTPAccountFirst")}'>
                    <input type="hidden" id="CancelAutoOTPSignIn" name="CancelAutoOTPSignIn" value='${msg("CancelAutoOTPSignIn")}'>
                    <input type="hidden" id="YourAutoOTPAccountNotRegistered" name="YourAutoOTPAccountNotRegistered" value='${msg("YourAutoOTPAccountNotRegistered")}'>
                    <input type="hidden" id="AuthenticationDenied" name="AuthenticationDenied" value='${msg("AuthenticationDenied")}'>
                    <input type="hidden" id="AreYouSureYouWantToUnregisterAutoOTP" name="AreYouSureYouWantToUnregisterAutoOTP" value='${msg("AreYouSureYouWantToUnregisterAutoOTP")}'>
                    <input type="hidden" id="SendAutootpSettingEmail" name="SendAutootpSettingEmail" value='${msg("SendAutootpSettingEmail")}'>
                    
                    <#if !usernameHidden??>
                        <div class="${properties.kcFormGroupClass!}">
                            <label for="username" class="${properties.kcLabelClass!}"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>
    
                            <input tabindex="1" id="username" class="${properties.kcInputClass!}" name="username" value="${(login.username!'')}"  type="text" autofocus autocomplete="off"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                            />
    
                            <#if messagesPerField.existsError('username','password')>
                                <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </span>
                            </#if>
    
                        </div>
                    </#if>

                    <div id="login_password">
    
                        <div class="${properties.kcFormGroupClass!}">
                            <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
        
                            <input tabindex="2" id="password" class="${properties.kcInputClass!}" name="password" type="password" autocomplete="off"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                            />
        
                            <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                                <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </span>
                            </#if>
        
                        </div>
        
                        <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                            <div id="kc-form-options">
                            <#if realm.rememberMe && !usernameHidden??>
                                <div class="checkbox">
                                    <label>
                                        <#if login.rememberMe??>
                                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                        <#else>
                                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                        </#if>
                                    </label>
                                </div>
                            </#if>
                                </div>
                                <div class="${properties.kcFormOptionsWrapperClass!}">
                                    <#if realm.resetPasswordAllowed>
                                        <span><a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                                    </#if>
                                </div>
                        </div>
        
                        <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}" style="margin: 10px 0 0 0;">
                            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                            <input tabindex="4" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
                        </div>
                    </div>
                    
                    <div id="login_autootp" class="${properties.kcFormGroupClass!}">
                        <div class="sign_section">
                            <div class="timer" style="position: relative; margin:10px 0 10px 0; background: url('${url.resourcesPath}/img/timerBG.png') no-repeat center right; height: 38px; border-radius: 8px; margin-bottom:0px;">
                                <div class="pbar" id="autootp_bar" style="background: rgb(55 138 239 / 70%); height: 38px;width: 100%;border-radius: 8px; animation-duration: 0ms; width:100%;"></div>
                                <div class="OTP_num" id="autootp_num" style="text-shadow:2px 2px 3px rgba(0,0,0,0.7); top: 0; position: absolute; font-size: 22px; color: #ffffff; text-align: center; height:38px; width: 100%; line-height: 39px; font-weight: 800; letter-spacing: 1px;">
                                    --- ---
                                </div>
                            </div>
                        </div>
                        <br>
                        <div id="autootp_login" class="${properties.kcFormGroupClass!}">                
                            <input tabindex="4" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" name="autootp_login_btn" id="autootp_login_btn" value="${msg("AutoOTPSignIn")}" onclick="AutoOTPLogin()"/>
                        </div>
                        <div style="width:100%;text-align:right;">
                            <a href="#" onclick="loginAutoOTPconfigure();" style="display:inline-block;">${msg("SendAutootpSettingEmail")}</a>
                        </div>
                    </div>
                    <div id="cancel_config_autootp" name="cancel_config_autootp" style="width:100%;text-align:right;display:none;">
                        <br>
                        <a href="#" onclick="cancelLoginAutoOTPconfigure();" style="display:inline-block;">${msg("BackToLogin")}</a>
                    </div>
                        
                    <div id="move_home_btn" name="move_home_btn" style="width:100%;text-align:right;display:none;">
                        <br>
                        <a href="#" onclick="moveHome();" style="display:inline-block;">${msg("BackToApplication")}</a>
                    </div>

			        <script type="text/javascript" src="${url.resourcesPath}/js/jquery-3.7.1.min.js"></script>
					<script type="text/javascript" src="${url.resourcesPath}/js/autootp_login.js"></script>
                    <script type="text/javascript">
                        $(document).ready(function() {
                            AutoOtpLoginRestAPI();
                        });
                    </script>
                    
                </form>
                
            </#if>
            </div>
        </div>
    <#elseif section = "info" >
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container" class="${properties.kcLoginFooterBand!}">
                <div id="kc-registration" class="${properties.kcLoginFooterBandItem!}">
                    <span>${msg("noAccount")} <a href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    <#elseif section = "socialProviders" >
        <#if realm.password && social.providers?? && social.providers?has_content>
            <@identityProviders.show social=social/>
        </#if>
    </#if>

</@layout.registrationLayout>
