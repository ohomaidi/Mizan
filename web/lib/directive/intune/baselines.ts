import "server-only";
import type { IntuneBaseline } from "./types";
import { intuneDisplayName, intuneIdempotencyKey } from "./types";

/**
 * Phase 5 Intune baselines — the seven that give a regulator the biggest
 * posture lift for the smallest per-entity configuration cost. Each one:
 *
 *   - Targets a single platform (iOS / Android / Windows / macOS) so the
 *     @odata.type discriminator and the compliance settings stay clean.
 *   - Ships un-assigned by default (the Intune equivalent of report-only).
 *     The policy exists in the entity's tenant; the operator decides
 *     which users/devices it applies to. This is the safe default, and
 *     matches Graph's behaviour for newly-created policies.
 *   - Is cross-tenant-safe — no tenant-local group IDs or app identifiers.
 *
 * Microsoft Graph reference:
 *   https://learn.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-devicecompliancepolicy
 *   https://learn.microsoft.com/en-us/graph/api/resources/intune-mam-iosmanagedappprotection
 *   https://learn.microsoft.com/en-us/graph/api/resources/intune-shared-androidmanagedappprotection
 *   https://learn.microsoft.com/en-us/graph/api/resources/intune-deviceconfig-deviceconfiguration
 */

// -------------------------------------------------------------------
// Compliance baselines — one per platform
// -------------------------------------------------------------------

const iosComplianceBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-ios-compliance-min-v1",
    kind: "intune-compliance",
    titleKey: "intune.baseline.iosCompliance.title",
    bodyKey: "intune.baseline.iosCompliance.body",
    riskTier: "medium",
    targetSummary:
      "iOS / iPadOS devices enrolled in Intune.",
    effectSummary:
      "Require 6-digit passcode, data encryption, block jailbroken, minimum iOS 16.",
    whyKey: "intune.baseline.iosCompliance.why",
    impactKey: "intune.baseline.iosCompliance.impact",
    prerequisitesKey: "intune.baseline.iosCompliance.prerequisites",
    rolloutAdviceKey: "intune.baseline.iosCompliance.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/protect/compliance-policy-create-ios",
    platform: "iOS",
  },
  idempotencyKey: intuneIdempotencyKey("ios-compliance-min-v1"),
};
export const intuneIosCompliance: IntuneBaseline = {
  ...iosComplianceBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.iosCompliancePolicy",
    displayName: intuneDisplayName(iosComplianceBase as IntuneBaseline),
    description:
      "Minimum iOS posture — passcode, encryption, jailbreak block, OS floor.",
    passcodeRequired: true,
    passcodeBlockSimple: true,
    passcodeMinimumLength: 6,
    passcodeRequiredType: "numeric",
    passcodeMinutesOfInactivityBeforeLock: 5,
    securityBlockJailbrokenDevices: true,
    deviceThreatProtectionEnabled: false, // enable when Mobile Threat Defence is in scope
    osMinimumVersion: "16.0",
  }),
};

const androidComplianceBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-android-compliance-min-v1",
    kind: "intune-compliance",
    titleKey: "intune.baseline.androidCompliance.title",
    bodyKey: "intune.baseline.androidCompliance.body",
    riskTier: "medium",
    targetSummary: "Android work-profile devices enrolled in Intune.",
    effectSummary:
      "Require passcode, device encryption, block rooted, minimum Android 12, Google Play Protect verified.",
    whyKey: "intune.baseline.androidCompliance.why",
    impactKey: "intune.baseline.androidCompliance.impact",
    prerequisitesKey: "intune.baseline.androidCompliance.prerequisites",
    rolloutAdviceKey: "intune.baseline.androidCompliance.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/protect/compliance-policy-create-android-for-work",
    platform: "Android",
  },
  idempotencyKey: intuneIdempotencyKey("android-compliance-min-v1"),
};
export const intuneAndroidCompliance: IntuneBaseline = {
  ...androidComplianceBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.androidWorkProfileCompliancePolicy",
    displayName: intuneDisplayName(androidComplianceBase as IntuneBaseline),
    description:
      "Minimum Android posture — passcode, encryption, root block, Play Protect, OS floor.",
    passwordRequired: true,
    passwordMinimumLength: 6,
    passwordRequiredType: "numeric",
    passwordMinutesOfInactivityBeforeLock: 5,
    securityBlockJailbrokenDevices: true,
    securityRequireVerifyApps: true,
    securityRequireGooglePlayServices: true,
    securityRequireSafetyNetAttestationBasicIntegrity: true,
    securityRequireSafetyNetAttestationCertifiedDevice: true,
    storageRequireEncryption: true,
    osMinimumVersion: "12.0",
  }),
};

const windowsComplianceBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-windows-compliance-min-v1",
    kind: "intune-compliance",
    titleKey: "intune.baseline.windowsCompliance.title",
    bodyKey: "intune.baseline.windowsCompliance.body",
    riskTier: "high",
    targetSummary: "Windows 10/11 devices enrolled in Intune.",
    effectSummary:
      "Require BitLocker, Secure Boot, TPM present, Windows Defender real-time, minimum build Windows 10.0.19045 (22H2).",
    whyKey: "intune.baseline.windowsCompliance.why",
    impactKey: "intune.baseline.windowsCompliance.impact",
    prerequisitesKey: "intune.baseline.windowsCompliance.prerequisites",
    rolloutAdviceKey: "intune.baseline.windowsCompliance.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/protect/compliance-policy-create-windows",
    platform: "Windows",
  },
  idempotencyKey: intuneIdempotencyKey("windows-compliance-min-v1"),
};
export const intuneWindowsCompliance: IntuneBaseline = {
  ...windowsComplianceBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.windows10CompliancePolicy",
    displayName: intuneDisplayName(windowsComplianceBase as IntuneBaseline),
    description:
      "Minimum Windows posture — BitLocker, Secure Boot, TPM, Defender, OS floor.",
    passwordRequired: true,
    passwordMinimumLength: 8,
    passwordRequiredType: "alphanumeric",
    passwordMinutesOfInactivityBeforeLock: 15,
    bitLockerEnabled: true,
    secureBootEnabled: true,
    tpmRequired: true,
    activeFirewallRequired: true,
    defenderEnabled: true,
    rtpEnabled: true, // real-time protection
    antivirusRequired: true,
    antiSpywareRequired: true,
    storageRequireEncryption: true,
    osMinimumVersion: "10.0.19045.0",
  }),
};

const macosComplianceBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-macos-compliance-min-v1",
    kind: "intune-compliance",
    titleKey: "intune.baseline.macosCompliance.title",
    bodyKey: "intune.baseline.macosCompliance.body",
    riskTier: "medium",
    targetSummary: "macOS devices enrolled in Intune (user-approved enrolment).",
    effectSummary:
      "Require FileVault, passcode (8+ chars), Gatekeeper, firewall, minimum macOS Ventura 13.0.",
    whyKey: "intune.baseline.macosCompliance.why",
    impactKey: "intune.baseline.macosCompliance.impact",
    prerequisitesKey: "intune.baseline.macosCompliance.prerequisites",
    rolloutAdviceKey: "intune.baseline.macosCompliance.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/protect/compliance-policy-create-mac-os",
    platform: "macOS",
  },
  idempotencyKey: intuneIdempotencyKey("macos-compliance-min-v1"),
};
export const intuneMacosCompliance: IntuneBaseline = {
  ...macosComplianceBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.macOSCompliancePolicy",
    displayName: intuneDisplayName(macosComplianceBase as IntuneBaseline),
    description:
      "Minimum macOS posture — passcode, FileVault, Gatekeeper, firewall, OS floor.",
    passwordRequired: true,
    passwordMinimumLength: 8,
    passwordRequiredType: "alphanumeric",
    passwordMinutesOfInactivityBeforeLock: 15,
    storageRequireEncryption: true, // FileVault
    systemIntegrityProtectionEnabled: true,
    firewallEnabled: true,
    firewallBlockAllIncoming: false,
    firewallEnableStealthMode: true,
    gatekeeperAllowedAppSource: "macAppStoreAndIdentifiedDevelopers",
    osMinimumVersion: "13.0",
  }),
};

// -------------------------------------------------------------------
// MAM (App Protection) baselines — one per mobile platform
// -------------------------------------------------------------------

const iosMamBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-mam-ios-basic-v1",
    kind: "intune-mam-ios",
    titleKey: "intune.baseline.iosMam.title",
    bodyKey: "intune.baseline.iosMam.body",
    riskTier: "medium",
    targetSummary:
      "iOS corporate apps (Outlook, Teams, Word, Excel, PowerPoint, OneDrive, SharePoint, Edge, etc.) — no enrolment required.",
    effectSummary:
      "Block copy/paste and Save-As to personal apps, require 6-digit PIN, wipe on jailbreak, 30-min offline timer.",
    whyKey: "intune.baseline.iosMam.why",
    impactKey: "intune.baseline.iosMam.impact",
    prerequisitesKey: "intune.baseline.iosMam.prerequisites",
    rolloutAdviceKey: "intune.baseline.iosMam.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/apps/app-protection-policy",
    platform: "iOS",
  },
  idempotencyKey: intuneIdempotencyKey("mam-ios-basic-v1"),
};
export const intuneIosMam: IntuneBaseline = {
  ...iosMamBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.iosManagedAppProtection",
    displayName: intuneDisplayName(iosMamBase as IntuneBaseline),
    description:
      "iOS app protection — block exfil to personal apps, PIN, jailbreak wipe.",
    allowedOutboundDataTransferDestinations: "managedApps",
    allowedInboundDataTransferSources: "managedApps",
    allowedOutboundClipboardSharingLevel: "managedAppsWithPasteIn",
    allowedOutboundClipboardSharingExceptionLength: 0,
    saveAsBlocked: true,
    pinRequired: true,
    pinNumRetry: 5,
    simplePinBlocked: true,
    minimumPinLength: 6,
    pinCharacterSet: "numeric",
    periodOfflineBeforeAccessCheck: "PT30M",
    periodOfflineBeforeWipeIsEnforced: "P90D",
    contactSyncBlocked: false,
    printBlocked: true,
    disableAppPinIfDevicePinIsSet: false,
    managedBrowser: "microsoftEdge",
    managedBrowserToOpenLinksRequired: true,
    deviceComplianceRequired: false, // MAM works without enrolment
    faceIdBlocked: false,
    customBrowserProtocol: "",
    appActionIfDeviceComplianceRequired: "block",
    appActionIfMaximumPinRetriesExceeded: "wipe",
  }),
};

const androidMamBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-mam-android-basic-v1",
    kind: "intune-mam-android",
    titleKey: "intune.baseline.androidMam.title",
    bodyKey: "intune.baseline.androidMam.body",
    riskTier: "medium",
    targetSummary: "Android corporate apps — no enrolment required.",
    effectSummary:
      "Block copy/paste and Save-As to personal apps, require 6-digit PIN, wipe on rooted device, 30-min offline timer.",
    whyKey: "intune.baseline.androidMam.why",
    impactKey: "intune.baseline.androidMam.impact",
    prerequisitesKey: "intune.baseline.androidMam.prerequisites",
    rolloutAdviceKey: "intune.baseline.androidMam.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/apps/app-protection-policy",
    platform: "Android",
  },
  idempotencyKey: intuneIdempotencyKey("mam-android-basic-v1"),
};
export const intuneAndroidMam: IntuneBaseline = {
  ...androidMamBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.androidManagedAppProtection",
    displayName: intuneDisplayName(androidMamBase as IntuneBaseline),
    description:
      "Android app protection — block exfil to personal apps, PIN, root wipe.",
    allowedOutboundDataTransferDestinations: "managedApps",
    allowedInboundDataTransferSources: "managedApps",
    allowedOutboundClipboardSharingLevel: "managedAppsWithPasteIn",
    saveAsBlocked: true,
    pinRequired: true,
    pinNumRetry: 5,
    simplePinBlocked: true,
    minimumPinLength: 6,
    pinCharacterSet: "numeric",
    periodOfflineBeforeAccessCheck: "PT30M",
    periodOfflineBeforeWipeIsEnforced: "P90D",
    printBlocked: true,
    screenCaptureBlocked: true,
    encryptAppData: true,
    disableAppEncryptionIfDeviceEncryptionIsEnabled: false,
    managedBrowser: "microsoftEdge",
    managedBrowserToOpenLinksRequired: true,
    deviceComplianceRequired: false,
    appActionIfDeviceComplianceRequired: "block",
    appActionIfMaximumPinRetriesExceeded: "wipe",
  }),
};

// -------------------------------------------------------------------
// Device configuration profile — Windows BitLocker baseline
// -------------------------------------------------------------------

const windowsBitLockerBase: Omit<IntuneBaseline, "buildPolicyBody"> = {
  descriptor: {
    id: "intune-windows-bitlocker-v1",
    kind: "intune-config",
    titleKey: "intune.baseline.windowsBitlocker.title",
    bodyKey: "intune.baseline.windowsBitlocker.body",
    riskTier: "high",
    targetSummary: "Windows 10/11 devices enrolled in Intune.",
    effectSummary:
      "Turn on BitLocker on OS drive + fixed data drives, XTS-AES 256-bit, TPM required, recovery key escrow to Entra.",
    whyKey: "intune.baseline.windowsBitlocker.why",
    impactKey: "intune.baseline.windowsBitlocker.impact",
    prerequisitesKey: "intune.baseline.windowsBitlocker.prerequisites",
    rolloutAdviceKey: "intune.baseline.windowsBitlocker.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/mem/intune/protect/encrypt-devices",
    platform: "Windows",
  },
  idempotencyKey: intuneIdempotencyKey("windows-bitlocker-v1"),
};
export const intuneWindowsBitLocker: IntuneBaseline = {
  ...windowsBitLockerBase,
  buildPolicyBody: () => ({
    "@odata.type": "#microsoft.graph.windows10EndpointProtectionConfiguration",
    displayName: intuneDisplayName(windowsBitLockerBase as IntuneBaseline),
    description:
      "BitLocker enforcement — OS + fixed drives, XTS-AES 256, TPM, Entra recovery escrow.",
    bitLockerAllowStandardUserEncryption: true,
    bitLockerDisableWarningForOtherDiskEncryption: true,
    bitLockerEnableStorageCardEncryptionOnMobile: false,
    bitLockerEncryptDevice: true,
    bitLockerSystemDrivePolicy: {
      "@odata.type": "#microsoft.graph.bitLockerSystemDrivePolicy",
      encryptionMethod: "xtsAes256",
      startupAuthenticationRequired: true,
      startupAuthenticationBlockWithoutTpmChip: true,
      startupAuthenticationTpmUsage: "required",
      startupAuthenticationTpmPinUsage: "allowed",
      startupAuthenticationTpmKeyUsage: "blocked",
      startupAuthenticationTpmPinAndKeyUsage: "blocked",
      minimumPinLength: 6,
      recoveryOptions: {
        "@odata.type":
          "#microsoft.graph.bitLockerRecoveryOptions",
        blockDataRecoveryAgent: true,
        recoveryPasswordUsage: "allowed",
        recoveryKeyUsage: "allowed",
        hideRecoveryOptions: true,
        enableRecoveryInformationSaveToStore: true,
        recoveryInformationToStore: "passwordAndKey",
        enableBitLockerAfterRecoveryInformationToStore: true,
      },
      prebootRecoveryEnableMessageAndUrl: false,
    },
    bitLockerFixedDrivePolicy: {
      "@odata.type": "#microsoft.graph.bitLockerFixedDrivePolicy",
      encryptionMethod: "xtsAes256",
      requireEncryptionForWriteAccess: true,
      recoveryOptions: {
        "@odata.type": "#microsoft.graph.bitLockerRecoveryOptions",
        blockDataRecoveryAgent: true,
        recoveryPasswordUsage: "allowed",
        recoveryKeyUsage: "allowed",
        hideRecoveryOptions: true,
        enableRecoveryInformationSaveToStore: true,
        recoveryInformationToStore: "passwordAndKey",
        enableBitLockerAfterRecoveryInformationToStore: true,
      },
    },
    bitLockerRemovableDrivePolicy: {
      "@odata.type": "#microsoft.graph.bitLockerRemovableDrivePolicy",
      encryptionMethod: "aesCbc256",
      requireEncryptionForWriteAccess: true,
      blockCrossOrganizationWriteAccess: true,
    },
  }),
};
