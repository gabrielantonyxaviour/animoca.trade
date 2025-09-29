// import { AirService } from "@mocanetwork/airkit";
import { useState } from "react";
import type { EnvironmentConfig } from "../../config/environments";
import { generateJwt, getJwtPayload, EXAMPLE_JWKS_URL } from "../../utils";
import CollapsibleSection from "../CollapsibleSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// environment variables for configuration
const LOCALE = import.meta.env.VITE_LOCALE || "en";

type JsonDocumentObject = Record<string, string | number | boolean>;

interface CredentialField {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "date";
  value: string | number | boolean;
}

interface CredentialIssuanceProps {
  partnerId: string;
  environmentConfig: EnvironmentConfig;
}

const CredentialIssuance = ({
  partnerId,
  environmentConfig,
}: CredentialIssuanceProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedJwt, setGeneratedJwt] = useState<string>("");

  // configuration - these would typically come from environment variables or API
  const [config, setConfig] = useState({
    issuerDid: import.meta.env.VITE_ISSUER_DID || "did:example:issuer123",
    credentialId:
      import.meta.env.VITE_CREDENTIAL_ID || "c21hc0g0joevn0015479aK",
  });

  const [privateKey, setPrivateKey] = useState(
    import.meta.env.VITE_PRIVATE_KEY || ""
  );

  // Dynamic credential subject fields
  const [credentialFields, setCredentialFields] = useState<CredentialField[]>([
    {
      id: "1",
      name: "age",
      type: "number",
      value: 20,
    },
  ]);

  const handleConfigChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const addCredentialField = () => {
    const newField: CredentialField = {
      id: Date.now().toString(),
      name: "",
      type: "string",
      value: "",
    };
    setCredentialFields([...credentialFields, newField]);
  };

  const updateCredentialField = (id: string, field: Partial<CredentialField>) => {
    setCredentialFields(credentialFields.map((f) => (f.id === id ? { ...f, ...field } : f)));
  };

  const removeCredentialField = (id: string) => {
    setCredentialFields(credentialFields.filter((f) => f.id !== id));
  };

  const convertFieldsToCredentialSubject = (): JsonDocumentObject => {
    const subject: JsonDocumentObject = {};
    credentialFields.forEach((field) => {
      if (field.name.trim()) {
        let value: string | number | boolean = field.value;

        // Convert value based on type
        switch (field.type) {
          case "number":
            value = typeof field.value === "string" ? parseFloat(field.value) || 0 : field.value;
            break;
          case "boolean":
            value = typeof field.value === "string" ? field.value === "true" : field.value;
            break;
          case "date":
            if (typeof field.value === "string") {
              // Convert date string to YYYYMMDD format
              const date = new Date(field.value);
              if (!isNaN(date.getTime())) {
                value = parseInt(
                  date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, "0") + date.getDate().toString().padStart(2, "0")
                );
              }
            }
            break;
          default:
            value = field.value;
        }

        subject[field.name] = value;
      }
    });
    return subject;
  };

  const handleIssueCredential = async () => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const jwt =
        generatedJwt ||
        (await generateJwt({
          partnerId,
          privateKey,
        }));

      if (!jwt) {
        setError("Failed to generate JWT");
        setIsLoading(false);
        return;
      }
      // const credentialSubject = convertFieldsToCredentialSubject();

      // if (!airService) {
      //   setError(
      //     "AirService is not initialized. Please check your partner ID."
      //   );
      //   setIsLoading(false);
      //   return;
      // }

      // await airService.issueCredential({
      //   authToken: jwt,
      //   credentialId: config.credentialId,
      //   credentialSubject: credentialSubject,
      //   issuerDid: config.issuerDid,
      // });

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleGenerateJwt = async () => {
    setError(null);
    try {
      const jwt = await generateJwt({ partnerId, privateKey });
      if (!jwt) {
        setError("Failed to generate JWT");
        setGeneratedJwt("");
        return;
      }
      setGeneratedJwt(jwt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGeneratedJwt("");
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setError(null);
  };

  const renderFieldValueInput = (field: CredentialField) => {
    switch (field.type) {
      case "boolean":
        return (
          <select
            value={field.value.toString()}
            onChange={(e) => updateCredentialField(field.id, { value: e.target.value === "true" })}
            className="w-full px-3 py-2 border border-border bg-background"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case "date":
        return (
          <Input
            type="date"
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(e) => updateCredentialField(field.id, { value: e.target.value })}
            className="border-0 bg-background"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={field.value.toString()}
            onChange={(e) => updateCredentialField(field.id, { value: parseFloat(e.target.value) || 0 })}
            className="border-0 bg-background"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={field.value.toString()}
            onChange={(e) =>
              updateCredentialField(field.id, { value: e.target.value })
            }
            className="border-0 bg-background"
            placeholder="enter value"
          />
        );
    }
  };

  const isDisabled =
    isLoading ||
    // !isLoggedIn ||
    !generatedJwt ||
    !config.issuerDid ||
    !config.credentialId ||
    Object.keys(convertFieldsToCredentialSubject()).length === 0;

  return (
    <div className="flex-1 p-2 sm:p-4 lg:p-8">
      <Card className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl sm:mx-auto border-0 shadow-lg">
        <CardHeader className="p-2 sm:p-6 lg:p-8">
          <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">
            credential issuance
          </CardTitle>
          <p className="text-muted-foreground text-sm sm:text-base">
            issue digital credentials to users using the air credential sdk.
            configure the issuance parameters below and start the widget to
            begin the process.
          </p>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 lg:p-8 pt-0">

        {/* JWT generation Section */}
        <CollapsibleSection title="authentication" defaultCollapsed>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2">
                  private key
                </Label>
                <Textarea
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="resize-vertical border-0"
                  placeholder="enter your private key (pem format)"
                  rows={4}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2">
                  jwt payload (readonly)
                </Label>
                <Textarea
                  value={JSON.stringify(getJwtPayload(partnerId), null, 2)}
                  readOnly
                  className="resize-vertical border-0 bg-muted text-muted-foreground"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleGenerateJwt}
                disabled={!privateKey || !partnerId}
                variant="secondary"
                className="border-0"
              >
                generate jwt
              </Button>
              {generatedJwt && (
                <span className="text-xs text-muted-foreground">jwt generated</span>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2">
                auth token
              </Label>
              <Textarea
                value={generatedJwt}
                onChange={(e) => setGeneratedJwt(e.target.value)}
                className="resize-vertical border-0"
                placeholder="enter your jwt"
                rows={6}
              />
            </div>

            <div className="p-3 bg-muted border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>notes:</strong> the default key corresponds to{" "}
                <a
                  href={EXAMPLE_JWKS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  {EXAMPLE_JWKS_URL}
                </a>
                . for production applications, private key management and jwt
                generation should be handled on the backend for security.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* configuration Section */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-4">configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2">issuer did</Label>
              <Input
                type="text"
                value={config.issuerDid}
                onChange={(e) => handleConfigChange("issuerDid", e.target.value)}
                className="border-0"
                placeholder="did:example:issuer123"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">issuance program id</Label>
              <Input
                type="text"
                value={config.credentialId}
                onChange={(e) => handleConfigChange("credentialId", e.target.value)}
                className="border-0"
                placeholder="credential-type-123"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-sm font-medium mb-2">
                partner id (from navbar)
              </Label>
              <Input
                type="text"
                value={partnerId}
                disabled
                className="border-0 bg-muted text-muted-foreground cursor-not-allowed"
                placeholder="partner id from navbar"
              />
            </div>
          </div>
        </div>

        {/* Dynamic credential subject Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 gap-2 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">credential subject</h3>
            <Button
              onClick={addCredentialField}
              className="inline-flex items-center px-3 py-2 border-0 text-xs sm:text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              add field
            </Button>
          </div>

          {credentialFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>no credential fields added yet.</p>
              <p className="text-sm">click "add field" to start building your credential subject.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentialFields.map((field) => (
                <div key={field.id} className="p-4 border border-border bg-muted">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <Label className="text-sm font-medium mb-2">field name</Label>
                      <Input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateCredentialField(field.id, { name: e.target.value })}
                        className="border-0 bg-background"
                        placeholder="e.g., name, email, age"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2">type</Label>
                      <select
                        value={field.type}
                        onChange={(e) => updateCredentialField(field.id, { type: e.target.value as "string" | "number" | "boolean" | "date" })}
                        className="w-full h-[42px] px-3 py-2 border border-border bg-background"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="date">date</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2">value</Label>
                      {renderFieldValueInput(field)}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeCredentialField(field.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Remove field"
                      >
                        <svg
                          className="w-5 h-5 transform group-hover:scale-110 transition-transform duration-200"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* environment Info */}
        <div className="mb-6 sm:mb-8 p-2 sm:p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-2">environment configuration:</h4>
          <div className="text-xs text-gray-700 space-y-1">
            <p>
              <strong>Widget URL:</strong> {environmentConfig.widgetUrl}
            </p>
            <p>
              <strong>API URL:</strong> {environmentConfig.apiUrl}
            </p>
            <p>
              <strong>Theme:</strong> light
            </p>
            <p>
              <strong>Locale:</strong> {LOCALE}
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-xs sm:text-base">{error}</p>
          </div>
        )}

        {isSuccess && (
          <div className="mb-4 sm:mb-6 p-2 sm:p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-xs sm:text-base">✅ Credential issuance completed successfully!</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleIssueCredential}
            disabled={isDisabled}
            className="w-full sm:flex-1 bg-brand-600 text-white px-4 sm:px-6 py-3 rounded-md font-medium hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Launching Widget...
              </span>
            ) : (
              "Start credential issuance Widget"
            )}
          </button>

          {isSuccess && (
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 sm:mt-8 p-2 sm:p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">Instructions:</h4>
          <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
            <li>• Need to whitelist the cross partner domain in Airkit </li>
            <li>• Configure the issuer DID, API key, and credential ID</li>
            <li>• Add credential subject fields using the "Add Field" button</li>
            <li>• Set field name, type (string, number, boolean, date), and value</li>
            <li>• Click "Start credential issuance Widget" to start the process</li>
            <li>• The widget will handle the credential issuance flow</li>
          </ul>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CredentialIssuance;
