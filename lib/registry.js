import yaml from "js-yaml";

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive integer.`);
  }
  return value;
}

function nonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

export function normalizeAgreementEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Agreement entry must be an object.");
  }
  return {
    githubId: positiveInteger(value.githubId, "githubId"),
    githubNodeId: nonEmptyString(value.githubNodeId, "githubNodeId"),
    githubLogin: nonEmptyString(value.githubLogin, "githubLogin"),
    agreementVersion: nonEmptyString(value.agreementVersion, "agreementVersion"),
    signedAt: nonEmptyString(value.signedAt, "signedAt"),
    issueNumber: positiveInteger(value.issueNumber, "issueNumber"),
    issueNodeId: nonEmptyString(value.issueNodeId, "issueNodeId"),
  };
}

export function parseRegistry(source) {
  if (source == null || source.trim() === "") {
    return { schemaVersion: 1, agreementVersion: "1.0", agreements: [] };
  }
  const parsed = yaml.load(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Registry must be a YAML mapping.");
  }
  if (parsed.schemaVersion !== 1) throw new TypeError("Unsupported registry schemaVersion.");
  const agreementVersion = nonEmptyString(parsed.agreementVersion, "agreementVersion");
  if (!Array.isArray(parsed.agreements)) throw new TypeError("agreements must be an array.");
  return {
    schemaVersion: 1,
    agreementVersion,
    agreements: parsed.agreements.map(normalizeAgreementEntry),
  };
}

export function serializeRegistry(registry) {
  const normalized = {
    schemaVersion: 1,
    agreementVersion: nonEmptyString(registry.agreementVersion, "agreementVersion"),
    agreements: [...registry.agreements]
      .map(normalizeAgreementEntry)
      .sort((left, right) => left.githubId - right.githubId),
  };
  return yaml.dump(normalized, { noRefs: true, lineWidth: 100, noCompatMode: true });
}

export function findCurrentAgreement(registry, githubId) {
  const id = positiveInteger(githubId, "githubId");
  return (
    registry.agreements.find(
      (entry) => entry.githubId === id && entry.agreementVersion === registry.agreementVersion,
    ) ?? null
  );
}

export function addAgreement(registry, entry) {
  const normalized = normalizeAgreementEntry(entry);
  const withoutSameVersion = registry.agreements.filter(
    (candidate) =>
      !(
        candidate.githubId === normalized.githubId &&
        candidate.agreementVersion === normalized.agreementVersion
      ),
  );
  return { ...registry, agreements: [...withoutSameVersion, normalized] };
}
