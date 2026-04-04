const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateAnomalyInsight(anomaly) {
  try {
    const prompt = `You are an operations analyst for a gym chain. An anomaly was detected:

Gym: ${anomaly.gym_name}
Type: ${anomaly.type}
Severity: ${anomaly.severity}
Message: ${anomaly.message}
Detected at: ${anomaly.detected_at}

Give a 2-3 line insight explaining why this might be happening and one specific suggested action for the gym manager. Be concise and practical.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI insight error:", err.message);
    return null;
  }
}

module.exports = { generateAnomalyInsight };
