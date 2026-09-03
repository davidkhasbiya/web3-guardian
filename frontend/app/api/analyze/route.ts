type AnalyzeRequest = {
  from: string;
  to: string;
  amount: string;
  asset: string;
  network: string;
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type AnalyzeResponse = {
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  reasons: string[];
  recommendation: string;
};

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function logGeminiFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.error("Gemini API failure", {
      model: GEMINI_MODEL,
      ...details,
      reason,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateAnalyzeRequest(body: unknown): AnalyzeRequest | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const fields = ["from", "to", "amount", "asset", "network"] as const;
  const request: Partial<AnalyzeRequest> = {};

  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      return undefined;
    }

    request[field] = value.trim();
  }

  return request as AnalyzeRequest;
}

function buildPrompt(transaction: AnalyzeRequest) {
  return [
    "You are Web3 Guardian, an AI-assisted transaction risk reviewer.",
    "Analyze the security risk of this prepared native asset transfer before any user signs it.",
    "Do not claim the transaction is guaranteed safe. This is only an AI-assisted risk assessment.",
    "Do not perform blockchain simulation or assume access to live RPC data.",
    "Return only valid JSON with exactly these fields: riskLevel, score, summary, reasons, recommendation.",
    'riskLevel must be one of "LOW", "MEDIUM", or "HIGH". score must be a number from 0 to 100. reasons must be an array of strings.',
    "",
    "Prepared transaction:",
    `From: ${transaction.from}`,
    `To: ${transaction.to}`,
    `Amount: ${transaction.amount}`,
    `Asset: ${transaction.asset}`,
    `Network: ${transaction.network}`,
  ].join("\n");
}

function extractGeminiText(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.candidates)) {
    return undefined;
  }

  const candidate = body.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content)) {
    return undefined;
  }

  const { parts } = candidate.content;
  if (!Array.isArray(parts)) {
    return undefined;
  }

  return parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function parseModelJson(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fencedMatch?.[1] ?? text;

  try {
    return JSON.parse(jsonText);
  } catch {
    return undefined;
  }
}

function normalizeGeminiResponse(body: unknown): AnalyzeResponse | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const { riskLevel, score, summary, reasons, recommendation } = body;

  if (
    typeof riskLevel !== "string" ||
    !RISK_LEVELS.includes(riskLevel as RiskLevel) ||
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    typeof summary !== "string" ||
    !Array.isArray(reasons) ||
    typeof recommendation !== "string"
  ) {
    return undefined;
  }

  const normalizedReasons = reasons.filter(
    (reason): reason is string => typeof reason === "string" && reason.trim().length > 0,
  );

  if (normalizedReasons.length === 0 || summary.trim().length === 0 || recommendation.trim().length === 0) {
    return undefined;
  }

  return {
    riskLevel: riskLevel as RiskLevel,
    score: Math.min(100, Math.max(0, Math.round(score))),
    summary: summary.trim(),
    reasons: normalizedReasons.map((reason) => reason.trim()),
    recommendation: recommendation.trim(),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logGeminiFailure("GEMINI_API_KEY is missing", {
      apiKeyPresent: false,
    });
    return jsonError("Missing GEMINI_API_KEY server environment variable.", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const transaction = validateAnalyzeRequest(body);
  if (!transaction) {
    return jsonError("Invalid request body. Required fields: from, to, amount, asset, network.", 400);
  }

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(transaction) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logGeminiFailure(reason, {
      apiKeyPresent: true,
    });
    return jsonError(`Gemini API request failed: ${reason}`, 502);
  }

  if (!geminiResponse.ok) {
    const responseBody = await geminiResponse.text();
    logGeminiFailure("Gemini returned a non-success HTTP status", {
      apiKeyPresent: true,
      status: geminiResponse.status,
      responseBody,
    });
    return jsonError(
      `Gemini API returned HTTP ${geminiResponse.status}: ${responseBody || "empty response body"}`,
      502,
    );
  }

  let geminiBody: unknown;
  try {
    geminiBody = await geminiResponse.json();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logGeminiFailure("Gemini returned invalid JSON", {
      apiKeyPresent: true,
      reasonDetail: reason,
    });
    return jsonError(`Gemini API returned invalid JSON: ${reason}`, 502);
  }

  const modelText = extractGeminiText(geminiBody);
  if (!modelText) {
    logGeminiFailure("Gemini response did not include analysis text", {
      apiKeyPresent: true,
      responseBody: JSON.stringify(geminiBody),
    });
    return jsonError("Gemini response did not include analysis text.", 502);
  }

  const parsedAnalysis = parseModelJson(modelText);
  const analysis = normalizeGeminiResponse(parsedAnalysis);

  if (!analysis) {
    logGeminiFailure("Gemini response did not match the expected analysis shape", {
      apiKeyPresent: true,
      responseBody: modelText,
    });
    return jsonError("Gemini response did not match the expected analysis shape.", 502);
  }

  return Response.json(analysis);
}
