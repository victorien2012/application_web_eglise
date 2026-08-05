// Charge les matchers DOM (toBeInTheDocument, toBeDisabled, ...) et nettoie
// le DOM entre chaque test pour eviter toute fuite d'etat d'un test a l'autre.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
