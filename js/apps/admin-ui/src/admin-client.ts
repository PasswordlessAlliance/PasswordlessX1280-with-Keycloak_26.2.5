import KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import {
  createNamedContext,
  useRequiredContext,
} from "@keycloak/keycloak-ui-shared";
//import type Keycloak from "keycloak-js";
//import type CustomKeycloak from "/libs/ui-shared/src/autootp/Keycloak-js-autootp.js";
import CustomKeycloak from "../../../libs/ui-shared/src/autootp/Keycloak-js-autootp.js";
import type { Environment } from "./environment";

export type AdminClientProps = {
  keycloak: CustomKeycloak;
  adminClient: KeycloakAdminClient;
};

export const AdminClientContext = createNamedContext<
  AdminClientProps | undefined
>("AdminClientContext", undefined);

export const useAdminClient = () => useRequiredContext(AdminClientContext);

export async function initAdminClient(
  keycloak: CustomKeycloak,
  environment: Environment,
) {
  const adminClient = new KeycloakAdminClient();

  adminClient.setConfig({ realmName: environment.realm });
  adminClient.baseUrl = environment.adminBaseUrl;
  adminClient.registerTokenProvider({
    async getAccessToken() {
      try {
        await keycloak.updateToken(5);
      } catch {
        await keycloak.login();
      }

      return keycloak.token;
    },
  });

  return adminClient;
}
