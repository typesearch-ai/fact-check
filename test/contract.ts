/*
 * The API contract for the tests: test/openapi.json is the API's OpenAPI document (with `countries`
 * and `languages`). Requests the demo builds and the sample responses are validated against it,
 * so the demo cannot drift from what the API accepts and returns.
 */
import fs from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';

export const openapi = JSON.parse(fs.readFileSync(new URL('./openapi.json', import.meta.url), 'utf8'));
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => void;
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ $id: 'https://contract.typesearch.test/openapi', components: openapi.components });

/** Throws with the schema errors if `value` does not match the named schema. */
export function assertSchema(name: string, value: unknown): void {
  const validate = ajv.getSchema(`https://contract.typesearch.test/openapi#/components/schemas/${name}`);
  if (!validate) throw new Error(`No schema ${name}`);
  if (!validate(value)) throw new Error(`${name}: ${ajv.errorsText(validate.errors, { separator: '\n' })}`);
}
