// Minimal type declarations for Google Maps Places Autocomplete
declare namespace google.maps {
  namespace places {
    class Autocomplete {
      constructor(
        input: HTMLInputElement,
        opts?: {
          componentRestrictions?: { country: string | string[] };
          fields?: string[];
          types?: string[];
        }
      );
      addListener(event: string, handler: () => void): void;
      getPlace(): PlaceResult;
    }

    interface PlaceResult {
      formatted_address?: string;
      address_components?: AddressComponent[];
      geometry?: {
        location?: {
          lat(): number;
          lng(): number;
        };
      };
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
  }
}
