// Plugin Expo — gestion certificat SSL SAP B1 (prod) + cleartext dev
// Production : embarque le certificat SAP dans l'APK → aucun proxy requis
// Développement : autorise le HTTP sur 10.0.2.2 (émulateur AVD)
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SAP_DOMAIN    = 'ga-sap.safirconsulting.net';
const CERT_SRC_PATH = path.resolve(__dirname, '../assets/certs/sap_cert.cer');
const CERT_RAW_NAME = 'sap_cert'; // nom sans extension dans res/raw/

const withNetworkSecurity = (config) => {
  // 1. Ajouter la référence dans AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const mainApp = cfg.modResults.manifest.application[0];
    mainApp.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  // 2. Copier le certificat SAP dans res/raw/ + écrire le XML de config
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const projectRoot = cfg.modRequest.platformProjectRoot;

      // ── Certificat → res/raw/ ───────────────────────────────────────────────
      const rawDir = path.join(projectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(rawDir, { recursive: true });

      if (fs.existsSync(CERT_SRC_PATH)) {
        fs.copyFileSync(CERT_SRC_PATH, path.join(rawDir, `${CERT_RAW_NAME}.cer`));
        console.log('[withNetworkSecurity] Certificat SAP copié dans res/raw/');
      } else {
        // Avertissement clair si le fichier est absent — le build ne plante pas
        // mais la connexion SAP échouera sur appareil physique en release
        console.warn(
          '[withNetworkSecurity] ⚠ Certificat SAP introuvable :\n' +
          `  Attendu : ${CERT_SRC_PATH}\n` +
          '  → Exporter depuis Chrome (cadenas → Détails → Exporter en Base64 .cer)\n' +
          '  → Placer dans assets/certs/sap_cert.cer'
        );
      }

      // ── network_security_config.xml ─────────────────────────────────────────
      const hasCert = fs.existsSync(CERT_SRC_PATH);

      // Trust-anchors production : certificat SAP embarqué OU fallback user (dev)
      const trustAnchors = hasCert
        ? `<certificates src="@raw/${CERT_RAW_NAME}"/>`
        : `<certificates src="system"/>\n      <certificates src="user"/>`;

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>

  <!-- Production : fait confiance uniquement au certificat SAP embarqué -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">${SAP_DOMAIN}</domain>
    <trust-anchors>
      ${trustAnchors}
    </trust-anchors>
  </domain-config>

  <!-- Développement : HTTP autorisé sur émulateur AVD et localhost -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">localhost</domain>
  </domain-config>

  <!-- Défaut : HTTPS uniquement, CA système -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>

</network-security-config>`;

      const xmlDir = path.join(projectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xmlContent);

      return cfg;
    },
  ]);

  return config;
};

module.exports = withNetworkSecurity;
