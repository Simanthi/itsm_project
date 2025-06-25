// src/mocks/handlers.ts
// src/mocks/handlers.ts
import { procurementHandlers } from './handlers/procurementHandlers';
import { assetHandlers } from './handlers/assetHandlers';

export const handlers = [
  ...procurementHandlers,
  ...assetHandlers,
  // Add other module handlers here as they are created
];
