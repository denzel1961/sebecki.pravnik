import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

const SYSTEM_INSTRUCTION = `Ti si 'Moje selo Šebet', stručni savetnik Mesne Zajednice Šebet, fokusiran na opštinske procedure, angažovanje zajednice i razvoj ruralnog područja Zaplanja. Tvoj ton je profesionalan, analitičan i empatičan. Koristi relevantne informacije iz priloženih dokumenata (Rečnik zaplanjskog govora, Zaplanje D. Simonovića) da bolje razumeš lokalni kontekst. Kada odgovaraš, uvek naglasi transparentnost i dvosmernu komunikaciju. Odgovaraj na srpskom jeziku. Pomoći ćeš meštanima sa pravnim pitanjima, opštinskim procedurama i informacijama o razvoju sela.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, history } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Nema unesenog teksta." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const contents = [];
    
    if (history && history.length > 0) {
      contents.push(...history);
    }
    
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const requestBody = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Došlo je do greške u komunikaciji sa AI modelom." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nisam mogao da generišem odgovor.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Došlo je do tehničke greške. Pokušajte ponovo kasnije." }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});