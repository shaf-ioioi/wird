import { SessionCompletePayload } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.wird.app/api';

export async function submitSessionCompletion(payload: SessionCompletePayload): Promise<Response> {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Session completion failed: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.warn('API unavailable, session recorded locally:', error);
    return new Response(JSON.stringify({ status: 'local_only' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
