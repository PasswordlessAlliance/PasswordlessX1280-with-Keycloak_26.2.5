// js/libs/ui-shared/src/keycloak/CustomKeycloak.ts
import Keycloak, { KeycloakConfig } from "keycloak-js";

export default class CustomKeycloak extends Keycloak {
  public endpoints: { [key: string]: () => string } = {};
	
  constructor(config: KeycloakConfig) {
    super(config);

    this.endpoints.autootp = () => {
      if (!this.authServerUrl || !this.realm) {
        throw new Error("Keycloak config 오류: authServerUrl 또는 realm 누락");
      }

      const base = this.authServerUrl.endsWith("/")
        ? this.authServerUrl
        : this.authServerUrl + "/";

      return `${base}realms/${encodeURIComponent(
        this.realm
      )}/protocol/openid-connect/autootp`;
    };
  }
}
