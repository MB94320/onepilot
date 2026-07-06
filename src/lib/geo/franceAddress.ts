export type FranceAddressSuggestion = {
  label: string;
  postalCode: string;
  city: string;
  region: string;
  countryCode: string;
};

type GeoApiCommune = {
  nom?: string;
  codesPostaux?: string[];
  codeRegion?: string;
  region?: {
    nom?: string;
  };
};

export async function searchFrenchCitiesByPostalCode(
  postalCode: string,
): Promise<FranceAddressSuggestion[]> {
  const normalizedPostalCode =
    postalCode.trim();

  if (
    !/^\d{5}$/.test(
      normalizedPostalCode,
    )
  ) {
    return [];
  }

  const response = await fetch(
    `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(
      normalizedPostalCode,
    )}&fields=nom,codesPostaux,region&format=json`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  const communes =
    (await response.json()) as GeoApiCommune[];

  return communes
    .filter((commune) =>
      Boolean(commune.nom),
    )
    .map((commune) => ({
      label: `${commune.nom} — ${normalizedPostalCode}`,
      postalCode:
        normalizedPostalCode,
      city: commune.nom ?? "",
      region:
        commune.region?.nom ??
        "",
      countryCode: "FR",
    }));
}