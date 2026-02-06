
## Environment variables

| ENV                             |     type |                        default | required |                                               notes |
| ------------------------------- | -------- | ------------------------------ | -------- | --------------------------------------------------- |
| APP_${appName}_ROLES            | string[] |                                |          |                          roles to assign to appName |
| APP_KEY_${appName}              |   string |                                |          |                        pre shared token for appName |
| FW_APP_DEFAULT_ROLES            | string[] |                          admin |          |                                                     |
| FW_MS_ADDRESS                   |   string |                                |          |                                                     |
| FW_MS_ADDRESSES                 | string[] |                                |          |                                                     |
| FW_MS_CERT                      |   string |                                |          |     full cert for https (wins over FW_MS_CERT_FILE) |
| FW_MS_CERT_FILE                 |   string |                                |          |         path to file containing full cert for https |
| FW_MS_FORWARD_UNKNOWN_BEARER    |  boolean |                          false |          | forward unknown bearer token to the next middleware |
| FW_MS_HOSTNAME                  |   string |                     _function_ |          |                               default to hostname() |
| FW_MS_JWT_PUBLIC_KEY            |   string |                                |          |                                                     |
| FW_MS_KEY                       |   string |                                |          |       full key for https (wins over FW_MS_KEY_FILE) |
| FW_MS_KEY_FILE                  |   string |                                |          |          path to file containing full key for https |
| FW_MS_LOG_404                   |  boolean |                          false |          |                                                     |
| FW_MS_MAX_UPLOAD_SIZE           |   string |                          128kb |          |                                                     |
| FW_MS_OPENAPI_CONTROLLERS_PATH  |   string |                                |          |                                                     |
| FW_MS_OPENAPI_SPEC_FILE         |   string |                                |          |                                                     |
| FW_MS_OPENAPI_VALIDATE_RESPONSE |  boolean |                           true |          |                                                     |
| FW_MS_PORT                      |  integer |                           8080 |          |                                                     |
| FW_MS_PRE_SHARED_TOKEN_PREFIX   |   string |                                |          |                                                     |
| FW_MS_TRUST_PROXY               |   string | loopback,linklocal,uniquelocal |          |                                                     |

## @fluidware-it/saddlebag@0.3.0

| ENV                          |     type |                 default | required |    notes |
| ---------------------------- | -------- | ----------------------- | -------- | -------- |
| FW_LOGGER_ISO_TIMESTAMP      |  boolean |                   false |          |          |
| FW_LOGGER_LEVEL              |   string |                    info |          |          |
| FW_LOGGER_NAME               |   string |              _function_ |          |          |
| FW_LOGGER_REDACT_KEYS        | string[] |                         |          |          |
| FW_LOGGER_SEVERITY_AS_STRING |  boolean |                   false |          |          |
| npm_package_name             |   string | @fluidware-it/saddlebag |          |          |
