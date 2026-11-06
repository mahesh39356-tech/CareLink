import { MediaController } from '../src/controllers/media.controller.js';
import { Writable } from 'stream';

class MockStreamResponse extends Writable {
  statusCode: number = 200;
  headers: Record<string, any> = {};
  chunks: Buffer[] = [];

  writeHead(statusCode: number, headers?: any) {
    this.statusCode = statusCode;
    if (headers) Object.assign(this.headers, headers);
    return this;
  }

  setHeader(name: string, value: any) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    return this;
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  get body(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

async function verifyStreaming() {
  const req: any = {
    params: { audioId: '3c130343-89b2-43f6-8372-73bcaefaf306' },
    headers: {},
  };
  const res = new MockStreamResponse();

  await new Promise<void>((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    MediaController.getAudioFile(req, res as any, reject);
  });

  console.log('HTTP 200 Streaming Verification:');
  console.log('StatusCode:', res.statusCode);
  console.log('Content-Type:', res.headers['Content-Type']);
  console.log('Content-Length:', res.headers['Content-Length']);
  console.log('Streamed Bytes:', res.body.length);
  console.log('Magic Bytes:', res.body.slice(0, 4).toString('hex'));

  // Test Range
  const rangeReq: any = {
    params: { audioId: '3c130343-89b2-43f6-8372-73bcaefaf306' },
    headers: { range: 'bytes=0-1023' },
  };
  const rangeRes = new MockStreamResponse();

  await new Promise<void>((resolve, reject) => {
    rangeRes.on('finish', resolve);
    rangeRes.on('error', reject);
    MediaController.getAudioFile(rangeReq, rangeRes as any, reject);
  });

  console.log('\nHTTP 206 Range Verification:');
  console.log('StatusCode:', rangeRes.statusCode);
  console.log('Content-Range:', rangeRes.headers['Content-Range']);
  console.log('Content-Length:', rangeRes.headers['Content-Length']);
  console.log('Range Bytes:', rangeRes.body.length);
}

verifyStreaming().catch(console.error);
