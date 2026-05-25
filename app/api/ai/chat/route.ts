export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model } = body;
    const groqKey = process.env.GROQ_API_KEY || '';
    if (!groqKey) {
      console.error('[AI CHAT] GROQ_API_KEY no configurada en producción');
      return Response.json({ error: 'GROQ_API_KEY no está configurada en el servidor', details: 'Configuración incompleta en producción. Contacta al administrador.' }, { status: 400 });
    }
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({ model: model || 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 1024 })
    });
    
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return Response.json({ response: data.choices?.[0]?.message?.content || 'No response' });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}