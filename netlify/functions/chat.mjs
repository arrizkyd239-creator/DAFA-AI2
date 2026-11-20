export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method tidak diizinkan" }, { status: 405 });
  }

  try {
    const { message, history = [] } = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY belum diatur di Netlify." }, { status: 500 });
    }
    if (typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "Pesan kosong." }, { status: 400 });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-12) : [];
    const input = [
      ...safeHistory
        .filter(m => m && typeof m.content === "string")
        .map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content.slice(0, 6000)
        })),
      { role: "user", content: message.slice(0, 6000) }
    ];

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        instructions: "Kamu adalah DAFA AI, asisten yang ramah dan membantu. Jawab dalam bahasa yang digunakan pengguna. Jelaskan langkah-langkah dengan jelas dan akurat.",
        input,
        max_output_tokens: 1200
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return Response.json(
        { error: data.error?.message || "Permintaan ke OpenAI gagal." },
        { status: upstream.status }
      );
    }

    const reply = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text || "")
      .join("\n");

    return Response.json({ reply: reply || "Maaf, belum ada jawaban." });
  } catch (error) {
    return Response.json({ error: "Kesalahan server. Coba lagi nanti." }, { status: 500 });
  }
};

export const config = { path: "/api/chat" };
