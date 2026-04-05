// Type declarations for Google Maps Places API (client-side JS SDK)
interface Window {
  google?: typeof google;
}

declare namespace google.maps {
  class LatLng {
    lat(): number;
    lng(): number;
  }

  namespace places {
    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
      addListener(event: string, handler: () => void): void;
      getPlace(): PlaceResult;
    }

    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletionRequest,
        callback: (results: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
      ): void;
    }

    class PlacesService {
      constructor(attrContainer: HTMLElement);
      getDetails(
        request: { placeId: string; fields: string[] },
        callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
      ): void;
    }

    interface AutocompleteOptions {
      componentRestrictions?: { country: string | string[] };
      fields?: string[];
      types?: string[];
    }

    interface AutocompletionRequest {
      input: string;
      componentRestrictions?: { country: string | string[] };
    }

    interface AutocompletePrediction {
      place_id: string;
      description: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
    }

    interface PlaceResult {
      formatted_address?: string;
      address_components?: AddressComponent[];
      geometry?: {
        location?: LatLng;
      };
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    type PlacesServiceStatus = string;
  }
}
