import crypto from 'crypto';

export interface ACRIdentifyResult {
  title?: string;
  artist?: string;
  album?: string;
  duration?: string;
  albumArt?: string;
}

function buildStringToSign(method: string, uri: string, accessKey: string, dataType: string, signatureVersion: string, timestamp: number): string {
  return [method, uri, accessKey, dataType, signatureVersion, String(timestamp)].join('\n');
}

function signString(stringToSign: string, accessSecret: string): string {
  return crypto.createHmac('sha1', accessSecret).update(Buffer.from(stringToSign, 'utf-8')).digest('base64');
}

export async function identifyByBuffer(audioBuffer: Buffer): Promise<ACRIdentifyResult | null> {
  const host = process.env.ACR_HOST;
  const accessKey = process.env.ACR_ACCESS_KEY;
  const accessSecret = process.env.ACR_ACCESS_SECRET;

  if (!host || !accessKey || !accessSecret) {
    return null;
  }

  const endpoint = `https://${host}/v1/identify`;
  const method = 'POST';
  const httpUri = '/v1/identify';
  const dataType = 'audio';
  const signatureVersion = '1';
  const timestamp = Math.floor(Date.now() / 1000);

  const stringToSign = buildStringToSign(method, httpUri, accessKey, dataType, signatureVersion, timestamp);
  const signature = signString(stringToSign, accessSecret);

  // use native fetch
  const form = new FormData();
  form.append('access_key', accessKey);
  form.append('sample', new Blob([audioBuffer]), 'audio.wav');
  form.append('sample_bytes', String(audioBuffer.length));
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('data_type', dataType);
  form.append('signature_version', signatureVersion);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form as any
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`acrcloud identify failed: ${response.status} ${text}`);
  }

  const json: any = await response.json();
  const music = json?.metadata?.music?.[0];
  if (!music) return null;

  const title: string | undefined = music.title;
  const artist: string | undefined = music.artists?.[0]?.name || music?.artist?.name;
  const album: string | undefined = music.album?.name;
  const albumArt: string | undefined = music.album?.coverart || music.external_metadata?.spotify?.album?.images?.[0]?.url;

  return {
    title,
    artist,
    album,
    duration: undefined,
    albumArt
  };
}

