## ADDED Requirements

### Requirement: Provide OCR proxy endpoint for document layout parsing
The system SHALL provide an HTTP endpoint that accepts a single uploaded document (PDF or image) and returns the layout parsing result produced by an external OCR API.

#### Scenario: Successful OCR for PDF upload
- **WHEN** a client sends `POST /api/ocr/layout-parsing` with a PDF file uploaded as `multipart/form-data` field `file`
- **THEN** the system MUST call the external OCR API with `fileType` set to `0` and return the external API `result` payload to the client

#### Scenario: Successful OCR for image upload
- **WHEN** a client sends `POST /api/ocr/layout-parsing` with an image file uploaded as `multipart/form-data` field `file`
- **THEN** the system MUST call the external OCR API with `fileType` set to `1` and return the external API `result` payload to the client

### Requirement: External API authentication and configuration
The system MUST read the external OCR API base URL and token from configuration and MUST NOT expose the token to the client.

#### Scenario: Token is applied to outbound request
- **WHEN** the system calls the external OCR API
- **THEN** it MUST set the outbound HTTP header `Authorization: token <configured-token>`

#### Scenario: Missing token configuration
- **WHEN** the system starts without the external OCR API token configured
- **THEN** it MUST fail fast with a clear error (or reject requests with a clear error response) indicating the token is required

### Requirement: Request payload construction
The system MUST base64-encode the uploaded file and construct a JSON payload compatible with the external OCR API.

#### Scenario: Payload contains required fields
- **WHEN** the system prepares an outbound request to the external OCR API
- **THEN** the JSON payload MUST include `file` (base64 string) and `fileType` (0 for PDF, 1 for image)

#### Scenario: Payload contains supported optional fields
- **WHEN** the client does not specify optional processing flags
- **THEN** the system MUST send default values for `useDocOrientationClassify`, `useDocUnwarping`, and `useChartRecognition`

### Requirement: Error handling for upstream failures
The system MUST return a stable error response when the external OCR API request fails.

#### Scenario: Upstream timeout
- **WHEN** the external OCR API does not respond within the configured timeout
- **THEN** the system MUST return an error indicating a gateway timeout

#### Scenario: Upstream non-200 response
- **WHEN** the external OCR API responds with a non-200 status
- **THEN** the system MUST return an error indicating a bad gateway and include enough detail for debugging (without leaking secrets)

### Requirement: File validation
The system MUST validate the uploaded file is present and is a supported type.

#### Scenario: Missing file field
- **WHEN** the client sends a request without a `file` upload
- **THEN** the system MUST respond with a client error indicating the file is required

#### Scenario: Unsupported file type
- **WHEN** the client uploads a file that is not a PDF or supported image type
- **THEN** the system MUST respond with a client error indicating the file type is unsupported
