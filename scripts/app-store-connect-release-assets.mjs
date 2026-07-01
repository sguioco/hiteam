import { createHash, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const apiBaseUrl = "https://api.appstoreconnect.apple.com/v1";
const appId = process.env.ASC_APP_ID ?? "6769683295";
const issuerId =
  process.env.ASC_ISSUER_ID ?? "d73c6b25-08b0-4bc6-8ab1-254102404792";
const keyId = process.env.ASC_KEY_ID ?? "QNGS4QB2U4";
const keyPath =
  process.env.ASC_KEY_PATH ?? path.join("Apple", "AuthKey_QNGS4QB2U4.p8");

const metadata = {
  promotionalText:
    "Manage employee attendance, tasks, checklists, and company updates in one secure app. Real-time tracking, GPS check-ins, and powerful team management.",
  description: [
    "HiTeam is an employee management platform designed for businesses that need a simple and reliable way to manage teams, attendance, and daily operations.",
    "",
    "Whether you run a beauty salon, restaurant, clinic, warehouse, cleaning company, retail store, or service business, HiTeam helps your employees stay organized while giving managers complete visibility.",
    "",
    "Features",
    "",
    "- Employee check-in & check-out",
    "- GPS location verification",
    "- Face verification (optional)",
    "- Daily tasks and assignments",
    "- Interactive checklists",
    "- Company news and announcements",
    "- Attendance history",
    "- Team management dashboard",
    "- Real-time updates",
    "- Secure cloud synchronization",
    "",
    "Perfect for",
    "",
    "- Beauty salons & spas",
    "- Medical clinics",
    "- Restaurants & cafes",
    "- Cleaning companies",
    "- Warehouses",
    "- Security companies",
    "- Retail stores",
    "- Fitness centers",
    "- Education centers",
    "- Service businesses",
    "",
    "HiTeam helps improve employee accountability, reduce manual work, and keep your entire team connected.",
  ].join("\n"),
  keywords:
    "employee,attendance,staff,team,checklist,task,workforce,gps,manager,business",
  supportUrl: "https://hiteam.net/support",
  marketingUrl: "https://hiteam.net",
  whatsNew:
    "Initial App Store release with employee attendance, tasks, checklists, company updates, GPS check-ins, and team management tools.",
};

const ageRatingAttributes = {
  advertising: false,
  ageAssurance: false,
  alcoholTobaccoOrDrugUseOrReferences: "NONE",
  contests: "NONE",
  gambling: false,
  gamblingSimulated: "NONE",
  gunsOrOtherWeapons: "NONE",
  healthOrWellnessTopics: false,
  horrorOrFearThemes: "NONE",
  kidsAgeBand: null,
  lootBox: false,
  matureOrSuggestiveThemes: "NONE",
  medicalOrTreatmentInformation: "NONE",
  messagingAndChat: true,
  parentalControls: false,
  profanityOrCrudeHumor: "NONE",
  sexualContentGraphicAndNudity: "NONE",
  sexualContentOrNudity: "NONE",
  unrestrictedWebAccess: false,
  userGeneratedContent: true,
  violenceCartoonOrFantasy: "NONE",
  violenceRealistic: "NONE",
  violenceRealisticProlongedGraphicOrSadistic: "NONE",
  ageRatingOverrideV2: "NONE",
  koreaAgeRatingOverride: "NONE",
  developerAgeRatingInfoUrl: "https://hiteam.net/support",
};

const screenshotPlans = [
  {
    displayType: "APP_IPHONE_65",
    dir: path.join(
      "apps",
      "mobile",
      "store-assets",
      "screenshots",
      "APP_IPHONE_65",
    ),
    required: true,
  },
  {
    displayType: "APP_IPHONE_67",
    dir: path.join(
      "apps",
      "mobile",
      "store-assets",
      "screenshots",
      "APP_IPHONE_67",
    ),
    required: false,
  },
  {
    displayType: "APP_IPHONE_55",
    dir: path.join(
      "apps",
      "mobile",
      "store-assets",
      "screenshots",
      "APP_IPHONE_55",
    ),
    required: true,
  },
];

let key;

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }),
  );
  const payload = base64Url(
    JSON.stringify({
      aud: "appstoreconnect-v1",
      exp: now + 900,
      iat: now,
      iss: issuerId,
    }),
  );
  const data = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(data), {
    dsaEncoding: "ieee-p1363",
    key,
  });

  return `${data}.${base64Url(signature)}`;
}

async function api(pathname, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${createToken()}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...init,
    headers,
  });
  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const detail =
      body?.errors
        ?.map((error) => `${error.title}: ${error.detail}`)
        .join("; ") ?? response.statusText;
    throw new Error(`${response.status} ${detail}`);
  }

  return body;
}

async function patchResource(type, id, attributes) {
  return api(`/${type}/${id}`, {
    body: JSON.stringify({
      data: {
        attributes,
        id,
        type,
      },
    }),
    method: "PATCH",
  });
}

async function getEditableVersion() {
  const response = await api(
    `/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=10`,
  );
  const version =
    response.data.find(
      (item) => item.attributes.appStoreState === "PREPARE_FOR_SUBMISSION",
    ) ?? response.data[0];

  if (!version) {
    throw new Error("No iOS App Store version found.");
  }

  return version;
}

async function getOrCreateLocalization(versionId) {
  const response = await api(
    `/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=20`,
  );
  const existing =
    response.data.find((item) => item.attributes.locale === "en-US") ??
    response.data[0];

  if (existing) {
    return existing;
  }

  return api("/appStoreVersionLocalizations", {
    body: JSON.stringify({
      data: {
        attributes: { locale: "en-US" },
        relationships: {
          appStoreVersion: {
            data: { id: versionId, type: "appStoreVersions" },
          },
        },
        type: "appStoreVersionLocalizations",
      },
    }),
    method: "POST",
  }).then((result) => result.data);
}

async function updateLocalization(localizationId) {
  try {
    await patchResource(
      "appStoreVersionLocalizations",
      localizationId,
      metadata,
    );
  } catch (error) {
    if (!String(error.message).includes("whatsNew")) {
      throw error;
    }

    const { whatsNew, ...initialReleaseMetadata } = metadata;
    await patchResource(
      "appStoreVersionLocalizations",
      localizationId,
      initialReleaseMetadata,
    );
    console.log("whatsNew skipped: initial release does not allow it");
  }

  console.log("metadata updated");
}

async function updateAgeRating() {
  const response = await api(`/apps/${appId}/appInfos?limit=20`);
  const appInfo =
    response.data.find(
      (item) => item.attributes.appStoreState === "PREPARE_FOR_SUBMISSION",
    ) ?? response.data[0];

  if (!appInfo) {
    console.log("age rating skipped: app info not found");
    return;
  }

  await patchResource("ageRatingDeclarations", appInfo.id, ageRatingAttributes);
  console.log("age rating updated");
}

async function selectLatestBuild(versionId) {
  const current = await api(`/appStoreVersions/${versionId}/relationships/build`);

  if (current.data?.id) {
    console.log(`build already selected: ${current.data.id}`);
    return;
  }

  const response = await api(`/apps/${appId}/builds?limit=50`);
  const builds = response.data
    .filter(
      (build) =>
        build.attributes.processingState === "VALID" &&
        build.attributes.expired !== true,
    )
    .sort(
      (left, right) =>
        new Date(right.attributes.uploadedDate).getTime() -
        new Date(left.attributes.uploadedDate).getTime(),
    );
  const latest = builds[0];

  if (!latest) {
    console.log("build selection skipped: no valid build found");
    return;
  }

  await api(`/appStoreVersions/${versionId}/relationships/build`, {
    body: JSON.stringify({
      data: {
        id: latest.id,
        type: "builds",
      },
    }),
    method: "PATCH",
  });
  console.log(
    `build selected: ${latest.attributes.version} (${latest.attributes.uploadedDate})`,
  );
}

async function getScreenshotSet(localizationId, displayType, required) {
  const response = await api(
    `/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?limit=50`,
  );
  const existing = response.data.find(
    (item) => item.attributes.screenshotDisplayType === displayType,
  );

  if (existing) {
    return existing;
  }

  try {
    const created = await api("/appScreenshotSets", {
      body: JSON.stringify({
        data: {
          attributes: { screenshotDisplayType: displayType },
          relationships: {
            appStoreVersionLocalization: {
              data: {
                id: localizationId,
                type: "appStoreVersionLocalizations",
              },
            },
          },
          type: "appScreenshotSets",
        },
      }),
      method: "POST",
    });

    return created.data;
  } catch (error) {
    if (!required) {
      console.log(`${displayType} skipped: ${error.message}`);
      return null;
    }

    throw error;
  }
}

async function listScreenshots(screenshotSetId) {
  const response = await api(
    `/appScreenshotSets/${screenshotSetId}/appScreenshots?limit=200`,
  );

  return response.data;
}

async function deleteExistingScreenshots(screenshotSetId) {
  const screenshots = await listScreenshots(screenshotSetId);

  for (const screenshot of screenshots) {
    await api(`/appScreenshots/${screenshot.id}`, { method: "DELETE" });
  }
}

async function uploadScreenshot(screenshotSetId, filePath) {
  const file = await readFile(filePath);
  const fileName = path.basename(filePath);
  const checksum = createHash("md5").update(file).digest("hex");
  const created = await api("/appScreenshots", {
    body: JSON.stringify({
      data: {
        attributes: {
          fileName,
          fileSize: file.byteLength,
        },
        relationships: {
          appScreenshotSet: {
            data: {
              id: screenshotSetId,
              type: "appScreenshotSets",
            },
          },
        },
        type: "appScreenshots",
      },
    }),
    method: "POST",
  });
  const screenshot = created.data;
  const operations = screenshot.attributes.uploadOperations ?? [];

  for (const operation of operations) {
    const headers = new Headers();

    for (const header of operation.requestHeaders ?? []) {
      headers.set(header.name, header.value);
    }

    const offset = operation.offset ?? 0;
    const length = operation.length ?? file.byteLength;
    const chunk = file.subarray(offset, offset + length);
    const response = await fetch(operation.url, {
      body: chunk,
      headers,
      method: operation.method,
    });

    if (!response.ok) {
      throw new Error(
        `asset upload failed for ${fileName}: ${response.status} ${response.statusText}`,
      );
    }
  }

  try {
    await patchResource("appScreenshots", screenshot.id, {
      sourceFileChecksum: checksum,
      uploaded: true,
    });
  } catch (error) {
    await patchResource("appScreenshots", screenshot.id, {
      sourceFileChecksum: checksum,
      isUploaded: true,
    });
  }
}

async function uploadScreenshots(localizationId) {
  for (const plan of screenshotPlans) {
    const set = await getScreenshotSet(
      localizationId,
      plan.displayType,
      plan.required,
    );

    if (!set) {
      continue;
    }

    await deleteExistingScreenshots(set.id);

    const files = [
      "01-control-your-team.png",
      "02-track-employee-performance.png",
      "03-plan-work-ahead.png",
      "04-assign-tasks-easily.png",
      "05-require-photo-proof.png",
      "06-attendance-made-simple.png",
    ].map((fileName) => path.join(plan.dir, fileName));

    for (const file of files) {
      await uploadScreenshot(set.id, file);
    }

    console.log(`${plan.displayType} screenshots uploaded`);
  }
}

async function main() {
  key = await readFile(keyPath, "utf8");
  const version = await getEditableVersion();
  const localization = await getOrCreateLocalization(version.id);

  console.log(
    `version: ${version.attributes.versionString} ${version.attributes.appStoreState}`,
  );
  console.log(`localization: ${localization.attributes.locale}`);

  await updateLocalization(localization.id);
  await updateAgeRating();
  await selectLatestBuild(version.id);
  await uploadScreenshots(localization.id);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
