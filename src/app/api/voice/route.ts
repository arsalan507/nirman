/**
 * POST /api/voice
 * Receives audio blob, sends to Sarvam.ai for Kannada/Hindi/English
 * speech-to-text + parses into entry fields.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'SARVAM_API_KEY not set' },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob | null;
    if (!audio) {
      return NextResponse.json({ error: 'No audio uploaded' }, { status: 400 });
    }

    // Forward to Sarvam.ai
    const sarvamForm = new FormData();
    sarvamForm.append('file', audio, 'audio.webm');
    sarvamForm.append('model', 'saarika:v2');
    sarvamForm.append('language_code', 'unknown'); // auto-detect Hi/Kn/En

    const res = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: sarvamForm,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'Sarvam STT failed', detail: text },
        { status: res.status }
      );
    }

    const data = (await res.json()) as { transcript?: string };
    return NextResponse.json({ transcript: data.transcript ?? '' });
  } catch (e) {
    return NextResponse.json(
      { error: 'Voice processing failed', detail: String(e) },
      { status: 500 }
    );
  }
}
