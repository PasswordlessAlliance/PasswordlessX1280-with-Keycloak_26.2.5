<#import "template.ftl" as layout>
<@layout.emailLayout>
<#if (dbBrowserFlowAlias?contains("AUTOOTP") || dbBrowserFlowAlias?contains("PASSWORDLESS"))>
After setting Passwordless X1280, proceed with email authentication.
<br>
Click <a href='${autootpLink}?movehome=F&oneclick=T&link=${link}&param=${autootpRegParam}' target='_blank'>this link</a> to set Passwordless X1280.
<br>This link will expire within ${strExpiration}.
<br>If you didn't request to send this email, just ignore this message.
<#else>
${kcSanitize(msg("emailVerificationBodyHtml",link, linkExpiration, realmName, linkExpirationFormatter(linkExpiration)))?no_esc}
</#if>
</@layout.emailLayout>