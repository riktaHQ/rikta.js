/** Swagger metadata keys. Using Symbol.for() for cross-package sharing. */

export const API_TAGS_METADATA = Symbol.for('rikta:swagger:apiTags');
export const API_OPERATION_METADATA = Symbol.for('rikta:swagger:apiOperation');
export const API_RESPONSE_METADATA = Symbol.for('rikta:swagger:apiResponse');
export const API_PROPERTY_METADATA = Symbol.for('rikta:swagger:apiProperty');
export const API_BODY_METADATA = Symbol.for('rikta:swagger:apiBody');
export const API_PARAM_METADATA = Symbol.for('rikta:swagger:apiParam');
export const API_QUERY_METADATA = Symbol.for('rikta:swagger:apiQuery');
export const API_HEADER_METADATA = Symbol.for('rikta:swagger:apiHeader');
export const API_SECURITY_METADATA = Symbol.for('rikta:swagger:apiSecurity');
export const API_EXCLUDE_METADATA = Symbol.for('rikta:swagger:apiExclude');
export const API_DEPRECATED_METADATA = Symbol.for('rikta:swagger:apiDeprecated');
