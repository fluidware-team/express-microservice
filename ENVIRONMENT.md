
## Environment variables

| ENV                           |     type |                        default | required |                        notes |
| ----------------------------- | -------- | ------------------------------ | -------- | ---------------------------- |
| APP_${appName}_ROLES          | string[] |                                |          |   roles to assign to appName |
| APP_KEY_${appName}            |   string |                                |          | pre shared token for appName |
| FW_APP_DEFAULT_ROLES          | string[] |                          admin |          |                              |
| FW_MS_ADDRESS                 |   string |                                |          |                              |
| FW_MS_ADDRESSES               | string[] |                                |          |                              |
| FW_MS_CERT                    |   string |                                |          |                              |
| FW_MS_HOSTNAME                |   string |                     _function_ |          |        default to hostname() |
| FW_MS_JWT_PUBLIC_KEY          |   string |                                |          |                              |
| FW_MS_KEY                     |   string |                                |          |                              |
| FW_MS_LOG_404                 |  boolean |                          false |          |                              |
| FW_MS_MAX_UPLOAD_SIZE         |   string |                          128kb |          |                              |
| FW_MS_PORT                    |  integer |                           8080 |          |                              |
| FW_MS_PRE_SHARED_TOKEN_PREFIX |   string |                                |          |                              |
| FW_MS_TRUST_PROXY             | string[] | loopback,linklocal,uniquelocal |          |                              |
